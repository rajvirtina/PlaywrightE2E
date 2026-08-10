import { Before, After, BeforeAll, AfterAll, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, webkit, type Browser, type CDPSession } from '@playwright/test';
import { AppWorld, HEADLESS, SLOW_MO, IS_LINUX } from './world.js';
import { t, T } from '../helpers/PlaywrightUtils.js';
import { cpus, totalmem, freemem } from 'os';
import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'fs';

// Base step timeout from config, scaled by TIMEOUT_SCALE for slow hardware
setDefaultTimeout(T[60000]);

// ── CPU/Memory collection ─────────────────────────────────────────────────────

interface CpuSnapshot { idle: number; total: number; }

function cpuSnapshot(): CpuSnapshot[] {
  return cpus().map(c => {
    const t = Object.values(c.times).reduce((a, b) => a + b, 0);
    return { idle: c.times.idle, total: t };
  });
}

function cpuPercent(before: CpuSnapshot[], after: CpuSnapshot[]): number {
  const pcts = before.map((b, i) => {
    const idleDiff  = after[i].idle  - b.idle;
    const totalDiff = after[i].total - b.total;
    return totalDiff === 0 ? 0 : (1 - idleDiff / totalDiff) * 100;
  });
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

/**
 * Reads the RSS memory of the POS Electron app process on Linux via /proc.
 * Matches any process whose cmdline contains 'electron' or 'nvpos'.
 * Returns 0 on non-Linux platforms or when the process cannot be found.
 */
function findPosProcessRssMb(): number {
  if (process.platform !== 'linux') return 0;
  try {
    const pids = readdirSync('/proc').filter(d => /^\d+$/.test(d));
    for (const pid of pids) {
      try {
        const cmdline = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
        if (cmdline.includes('electron') || cmdline.includes('nvpos') || cmdline.includes('tauri')) {
          const status = readFileSync(`/proc/${pid}/status`, 'utf8');
          const m = status.match(/VmRSS:\s+(\d+)/);
          if (m) return Math.round(parseInt(m[1]) / 1024);
        }
      } catch { /* skip unreadable pids */ }
    }
  } catch { /* /proc not available */ }
  return 0;
}

// ── Module-level state (shared across BeforeAll / Before / After / AfterAll) ──

interface CpuSample { t: number; cpu: number; memUsedMb: number; processRssMb: number; }

interface ScenarioMetric {
  name: string;
  startMs: number;
  endMs: number;
  durationSec: number;
  avgCpu: number;
  peakCpu: number;
  /** CPU % consumed by the Node.js test-runner process only (excludes VS Code, OS, etc.) */
  processCpuPct: number;
  /** RSS of the Node.js test-runner process in MB */
  processRssMb: number;
  /** Browser JS heap used at end of scenario in MB (via CDP) */
  browserJsHeapMb: number;
  /** Browser main-thread task time in ms (via CDP) */
  browserTaskMs: number;
  /** RSS of the POS Electron app process in MB (Linux only, 0 on other platforms) */
  posProcessRssMb: number;
  status: string;
}

let cpuBefore: CpuSnapshot[]       = [];
let runStartTime                    = 0;
const cpuSamples: CpuSample[]       = [];
let sampleInterval: ReturnType<typeof setInterval>;
const scenarioMetrics: ScenarioMetric[] = [];
let scenarioStartMs                 = 0;
let scenarioStartSnapshot: CpuSnapshot[] = [];
let currentScenarioName             = '';
/** process.cpuUsage() snapshot taken at the start of each scenario */
let procCpuStart: NodeJS.CpuUsage   = { user: 0, system: 0 };
/** CDP session open for the current scenario — null if unavailable */
let cdpSession: CDPSession | null   = null;
/** CDP Performance metric values captured at scenario start */
let cdpInitMetrics: Record<string, number> = {};

/** Shared browser instance — launched once, reused across all scenarios. */
let sharedBrowser: Browser;

// ── Hooks ─────────────────────────────────────────────────────────────────────

BeforeAll(async function () {
  const CDP_URL    = process.env.CDP_URL;
  const BROWSER    = (process.env.BROWSER ?? 'chromium').toLowerCase();

  if (CDP_URL) {
    // ── CDP mode: connect to an already-running Electron app ─────────────────
    // Works for BOTH hardware (CX7) and local development:
    //   Hardware : set CDP_URL=http://localhost:<PORT> in your deployment .env
    //   Local dev: launch Electron with --remote-debugging-port=9222, then set
    //              CDP_URL=http://localhost:9222 in your local .env
    // A new browser is NOT launched — Playwright attaches to the existing one.
    console.log(`[hooks] CDP mode: connecting to Electron app at ${CDP_URL}`);
    sharedBrowser = await chromium.connectOverCDP(CDP_URL);
  } else if (BROWSER === 'webkit') {
    // ── WebKit mode: Playwright's bundled WebKit browser ─────────────────────
    // Used for Tauri on Linux — WebKitGTK does not expose CDP so we launch
    // Playwright's own WebKit and navigate to APP_URL instead.
    // Set BROWSER=webkit in .env (or .env.hardware) to activate this mode.
    // CDP_URL must NOT be set — this mode is incompatible with CDP.
    console.log('[hooks] WebKit mode: launching Playwright WebKit browser (Tauri/Linux)');
    sharedBrowser = await webkit.launch({
      headless: HEADLESS,
      slowMo:   SLOW_MO,
    });
  } else {
    // ── Default mode: launch a new Chromium browser ───────────────────────────
    // Used when CDP_URL is not set (e.g. running against a local Vite dev server).
    sharedBrowser = await chromium.launch({
      headless: HEADLESS,
      slowMo:   SLOW_MO,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        // Required on Linux/CX7 to run Chromium without root sandbox issues
        ...(IS_LINUX ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
      ],
    });
  }

  cpuBefore    = cpuSnapshot();
  runStartTime = Date.now();
  sampleInterval = setInterval(() => {
    const now = cpuSnapshot();
    const pct = cpuPercent(cpuBefore, now);
    cpuSamples.push({
      t:            Math.round((Date.now() - runStartTime) / 1000),
      cpu:          pct,
      memUsedMb:    Math.round((totalmem() - freemem()) / 1024 / 1024),
      processRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
    cpuBefore = now;
  }, 2000);
});

AfterAll(async function () {
  clearInterval(sampleInterval);
  const finalCpu = cpuSnapshot();
  cpuSamples.push({
    t:            Math.round((Date.now() - runStartTime) / 1000),
    cpu:          cpuPercent(cpuBefore, finalCpu),
    memUsedMb:    Math.round((totalmem() - freemem()) / 1024 / 1024),
    processRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  });

  const allPcts    = cpuSamples.map(s => s.cpu);
  const avgCpu     = Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length);
  const peakCpu    = Math.max(...allPcts);
  const minCpu     = Math.min(...allPcts);
  const totalMb    = Math.round(totalmem() / 1024 / 1024);
  const usedMb     = cpuSamples[cpuSamples.length - 1]?.memUsedMb ?? Math.round((totalmem() - freemem()) / 1024 / 1024);
  const peakMemMb  = Math.max(...cpuSamples.map(s => s.memUsedMb));
  const memPct     = Math.round((usedMb / totalMb) * 100);
  const durationSec = Math.round((Date.now() - runStartTime) / 1000);

  const metrics = {
    avgCpu, peakCpu, minCpu,
    usedMb, peakMemMb, totalMb, memPct,
    durationSec,
    runStartMs: runStartTime,   // absolute epoch ms at t=0 — used by report to align time-series windows
    coreCount: cpus().length,
    cpuModel:  cpus()[0]?.model ?? 'unknown',
    timeSeries: cpuSamples,
    scenarios:  scenarioMetrics,
  };

  mkdirSync('reports/metrics', { recursive: true });
  writeFileSync('reports/metrics/run-metrics.json', JSON.stringify(metrics, null, 2));

  await sharedBrowser?.close();
});

// ── Browser lifecycle ─────────────────────────────────────────────────────────

Before(async function (this: AppWorld, scenario) {
  scenarioStartMs       = Date.now();
  scenarioStartSnapshot = cpuSnapshot();
  procCpuStart          = process.cpuUsage();
  currentScenarioName   = scenario.pickle.name;

  if (process.env.CDP_URL) {
    // CDP mode: reuse the existing page from the connected browser
    await this.initCdp(sharedBrowser);
  } else {
    await this.init(sharedBrowser);
  }

  // Open a CDP session so we can read browser-process metrics in After
  try {
    cdpSession = await this.context.newCDPSession(this.page);
    await cdpSession.send('Performance.enable');
    const init = await cdpSession.send('Performance.getMetrics') as { metrics: Array<{ name: string; value: number }> };
    cdpInitMetrics = Object.fromEntries(init.metrics.map(m => [m.name, m.value]));
  } catch {
    cdpSession = null;
    cdpInitMetrics = {};
  }

  // ── Console log capture: collect browser errors/warnings for the report ──
  this.consoleLogs = [];
  this.page.on('console', msg => {
    if (['error', 'warning', 'warn'].includes(msg.type())) {
      this.consoleLogs.push({ type: msg.type(), text: msg.text() });
    }
  });

  // ── Playwright tracing: start recording for failure diagnostics ──────────
  // On failure the trace zip is saved to reports/traces/ — open with:
  //   npx playwright show-trace reports/traces/<file>.zip
  // Includes screenshots, DOM snapshots and network activity per step.
  try {
    await this.context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  } catch { /* tracing not supported in this context (e.g. some CDP modes) */ }
});

After(async function (this: AppWorld, scenario) {
  if (scenario.result?.status === Status.FAILED) {
    const screenshot = await this.page.screenshot({ fullPage: true, type: 'jpeg', quality: 40 });
    await this.attach(screenshot, 'image/jpeg');

    // ── Playwright trace: save on failure for deep diagnostics ────────────────────
    const safeName = currentScenarioName.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60);
    const tracePath = `reports/traces/${safeName}-${Date.now()}.zip`;
    try {
      mkdirSync('reports/traces', { recursive: true });
      await this.context.tracing.stop({ path: tracePath });
      await this.attach(`Trace saved → ${tracePath}\nView: npx playwright show-trace ${tracePath}`, 'text/plain');
    } catch { /* tracing not available in this context */ }
  } else {
    // Discard trace on pass — saves disk space
    try { await this.context.tracing.stop(); } catch {}
  }

  const endMs       = Date.now();
  const endSnap     = cpuSnapshot();
  const scenarioCpu = cpuPercent(scenarioStartSnapshot, endSnap);

  // ── Process-specific CPU (Node.js test runner only, excludes VS Code / OS) ─
  const procCpuDiff   = process.cpuUsage(procCpuStart);
  const elapsedUs     = (endMs - scenarioStartMs) * 1000;   // ms → μs
  const processCpuPct = Math.min(100, Math.round((procCpuDiff.user + procCpuDiff.system) / elapsedUs * 100));
  const processRssMb  = Math.round(process.memoryUsage().rss / 1024 / 1024);

  // ── Browser-process metrics via CDP ─────────────────────────────────────
  let browserJsHeapMb = 0;
  let browserTaskMs   = 0;
  if (cdpSession) {
    try {
      const final = await cdpSession.send('Performance.getMetrics') as { metrics: Array<{ name: string; value: number }> };
      const finalMap = Object.fromEntries(final.metrics.map(m => [m.name, m.value]));
      browserJsHeapMb = Math.round((finalMap['JSHeapUsedSize'] ?? 0) / 1024 / 1024);
      // TaskDuration is cumulative seconds on main thread; delta = work done this scenario
      const taskDeltaSec = (finalMap['TaskDuration'] ?? 0) - (cdpInitMetrics['TaskDuration'] ?? 0);
      browserTaskMs = Math.round(taskDeltaSec * 1000);
    } catch { /* ignore CDP errors */ }
    cdpSession = null;
  }

  // Narrow down time-series to this scenario's window for avg/peak
  const startSec = Math.round((scenarioStartMs - runStartTime) / 1000);
  const endSec   = Math.round((endMs - runStartTime) / 1000);
  const window   = cpuSamples.filter(s => s.t >= startSec && s.t <= endSec).map(s => s.cpu);
  const scenarioAvg  = window.length > 0
    ? Math.round(window.reduce((a, b) => a + b, 0) / window.length)
    : scenarioCpu;
  const scenarioPeak = window.length > 0 ? Math.max(...window) : scenarioCpu;

  const durationMs  = endMs - scenarioStartMs;
  const durationSec = (durationMs / 1000).toFixed(1);

  // ── Read SLO thresholds from .env (with defaults matching QCOE targets) ───
  const SLO_SCAN     = Number(process.env.SLO_SCAN_MS            ?? 500);
  const SLO_DIALOG   = Number(process.env.SLO_DISCOUNT_DIALOG_MS ?? 1000);
  const SLO_CHECKOUT = Number(process.env.SLO_CHECKOUT_MS        ?? 4000);

  // ── POS app process workload (Linux only — reads RSS from /proc) ─────────
  const posProcessRssMb = findPosProcessRssMb();

  // ── Scenario summary card — visible without clicking into steps ──────────
  const lines: string[] = [
    '╔══════════════════════════════════════════════════╗',
    '║           SCENARIO PERFORMANCE SUMMARY           ║',
    '╚══════════════════════════════════════════════════╝',
    `  Status        : ${scenario.result?.status?.toUpperCase() ?? 'UNKNOWN'}`,
    `  Duration       : ${durationSec}s  (${durationMs} ms)`,
    `  System CPU Avg/Peak : ${scenarioAvg}% / ${scenarioPeak}%  (all processes)`,
    `  Process CPU          : ${processCpuPct}%  (test runner only)`,
    `  Process Memory (RSS) : ${processRssMb} MB  (test runner only)`,
    `  Browser JS Heap      : ${browserJsHeapMb} MB`,
    ...(browserTaskMs > 0 ? [`  Browser Task Time    : ${browserTaskMs}ms  (main thread)`] : []),
    ...(posProcessRssMb > 0 ? [`  POS App Memory (RSS) : ${posProcessRssMb} MB  (Electron process)`] : []),
  ];

  // Scan timings (populated by cycling scan step)
  if (this.scanTimings && this.scanTimings.length > 0) {
    const avg = Math.round(this.scanTimings.reduce((a, b) => a + b, 0) / this.scanTimings.length);
    const max = Math.max(...this.scanTimings);
    const min = Math.min(...this.scanTimings);
    const slowCount = this.scanTimings.filter(t => t > SLO_SCAN).length;
    lines.push(`  Items scanned  : ${this.scanTimings.length}`);
    lines.push(`  Scan avg/min/max: ${avg}ms / ${min}ms / ${max}ms  (SLO: ${SLO_SCAN}ms)`);
    lines.push(`  Scans > SLO    : ${slowCount} / ${this.scanTimings.length}  ${slowCount === 0 ? '✅' : '⚠️'}`);
  }

  // Discount dialog timing
  if (this.discountDialogStart > 0 && this.discountDialogEnd > 0) {
    const dialogMs = this.discountDialogEnd - this.discountDialogStart;
    lines.push(`  Discount dialog: ${dialogMs}ms  (SLO: ${SLO_DIALOG}ms)  ${dialogMs <= SLO_DIALOG ? '✅' : '⚠️ exceeded'}`);
  }

  // Total perf timer (if explicitly started in perf scenarios)
  if (this.perfTimerStart > 0) {
    const perfMs = endMs - this.perfTimerStart;
    lines.push(`  Perf timer     : ${(perfMs / 1000).toFixed(1)}s  (${perfMs} ms)`);
  }

  // Only show SLOs in use when this scenario actually measured performance
  const isPerfScenario = (this.scanTimings && this.scanTimings.length > 0)
    || this.perfTimerStart > 0
    || (this.discountDialogStart > 0 && this.discountDialogEnd > 0);
  if (isPerfScenario) {
    lines.push(`  SLOs in use    : scan=${SLO_SCAN}ms  dialog=${SLO_DIALOG}ms  checkout=${SLO_CHECKOUT}ms`);
  }

  lines.push('──────────────────────────────────────────────────');
  await this.attach(lines.join('\n'), 'text/plain');

  // ── Browser console logs (errors/warnings only) ───────────────────────
  if (this.consoleLogs.length > 0) {
    const logText = this.consoleLogs
      .map(l => `[${l.type.toUpperCase()}] ${l.text}`)
      .join('\n');
    await this.attach(`Browser Console Logs (${this.consoleLogs.length} entries):\n${logText}`, 'text/plain');
  }

  scenarioMetrics.push({
    name:           currentScenarioName,
    startMs:        scenarioStartMs,
    endMs,
    durationSec:    Math.round((endMs - scenarioStartMs) / 1000),
    avgCpu:         scenarioAvg,
    peakCpu:        scenarioPeak,
    processCpuPct,
    processRssMb,
    browserJsHeapMb,
    browserTaskMs,
    posProcessRssMb,
    status:         scenario.result?.status ?? 'unknown',
  });

  await this.teardown();
});

