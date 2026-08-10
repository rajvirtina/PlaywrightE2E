// Rich HTML report generator using multiple-cucumber-html-reporter
// Run after tests: node generate-report.js
// Output: reports/rich-report/index.html

import { generate } from 'multiple-cucumber-html-reporter';
import { rmSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve as _res, dirname as _dir, extname as _ext } from 'path';

// Always regenerate from scratch so stale data never hides scenarios
try { rmSync('reports/rich-report', { recursive: true, force: true }); } catch {}

// Read CPU/memory metrics written by AfterAll hook
let metrics = {
  avgCpu: 'N/A', peakCpu: 'N/A', minCpu: 'N/A',
  usedMb: 'N/A', peakMemMb: 'N/A', totalMb: 'N/A', memPct: 'N/A',
  durationSec: 'N/A', coreCount: 'N/A', cpuModel: 'N/A',
  timeSeries: [], scenarios: [],
};
try {
  metrics = JSON.parse(readFileSync('reports/metrics/run-metrics.json', 'utf8'));
} catch { /* metrics file not yet written — skip */ }

// Pre-compute column maxima for bar scaling
const _scens = metrics.scenarios ?? [];
const _maxSysCpuAvg  = Math.max(..._scens.map(s => s.avgCpu   ?? 0), 1);
const _maxSysCpuPeak = Math.max(..._scens.map(s => s.peakCpu  ?? 0), 1);
const _maxProcCpu    = Math.max(..._scens.map(s => s.processCpuPct ?? 0), 1);
const _maxProcRss    = Math.max(..._scens.map(s => s.processRssMb  ?? 0), 1);
const _maxHeap       = Math.max(..._scens.map(s => s.browserJsHeapMb ?? 0), 1);
const _maxTask       = Math.max(..._scens.map(s => s.browserTaskMs   ?? 0), 1);

// Use the stored runStartMs (absolute epoch ms for t=0) to map scenario timestamps → time-series seconds.
// Falls back to a best-effort estimate when running against an older metrics file that lacks runStartMs.
const runStartEpoch = metrics.runStartMs
  ?? (metrics.timeSeries.length > 0 && _scens.length > 0
      ? _scens[0].startMs - (_scens[0].startMs % 1000) - (metrics.timeSeries[0].t ?? 0) * 1000
      : 0);

const scenarioWindows = _scens.map(s => {
  const relStart = (s.startMs - runStartEpoch) / 1000;
  const relEnd   = (s.endMs   - runStartEpoch) / 1000;
  return metrics.timeSeries.filter(p => p.t >= relStart && p.t <= relEnd);
});

// Compute overall process-level averages across all scenarios
const allProcCpu  = _scens.map(s => s.processCpuPct ?? 0).filter(v => v > 0);
const avgProcCpu  = allProcCpu.length ? Math.round(allProcCpu.reduce((a,b)=>a+b,0)/allProcCpu.length) : 'N/A';
const peakProcCpu = allProcCpu.length ? Math.max(...allProcCpu) : 'N/A';
const allRss      = _scens.map(s => s.processRssMb ?? 0).filter(v => v > 0);
const peakRss     = allRss.length ? Math.max(...allRss) : 'N/A';
const avgRss      = allRss.length ? Math.round(allRss.reduce((a,b)=>a+b,0)/allRss.length) : 'N/A';
const allHeap     = _scens.map(s => s.browserJsHeapMb ?? 0).filter(v => v > 0);
const peakHeap    = allHeap.length ? Math.max(...allHeap) : 'N/A';
const allTask     = _scens.map(s => s.browserTaskMs ?? 0).filter(v => v > 0);
const totalTaskMs = allTask.length ? allTask.reduce((a,b)=>a+b,0) : 0;

// Inline bar helper for table cells
const _tbar = (val, max, color) => val == null
  ? '<span style="color:#475569">N/A</span>'
  : `<div style="white-space:nowrap;font-weight:600">${typeof val === 'number' && val >= 1000 ? val + ' ms' : typeof val === 'number' ? val + (color === '#f59e0b' || color === '#818cf8' ? ' MB' : '%') : val}</div>
     <div class="bar-bg"><div class="bar-fg" style="width:${Math.round((val/max)*100)}%;background:${color}"></div></div>`;

// Build per-scenario CPU table rows (10 columns)
const scenarioRows = _scens.map((s, i) => {
  const w = scenarioWindows[i] ?? [];
  const sysRamAvg = w.length ? Math.round(w.reduce((a,b)=>a+b.memUsedMb,0)/w.length) : (metrics.usedMb ?? 0);
  const st = (s.status ?? '').toLowerCase();
  return `<tr>
    <td style="max-width:280px;word-break:break-word;font-size:.78rem">${s.name}</td>
    <td><span class="badge ${st}">${s.status}</span></td>
    <td>${s.durationSec}s</td>
    <td class="bar-cell">${_tbar(s.avgCpu,  _maxSysCpuAvg,  '#3b82f6')}</td>
    <td class="bar-cell">${_tbar(s.peakCpu, _maxSysCpuPeak, '#ef4444')}</td>
    <td class="bar-cell">${_tbar(s.processCpuPct ?? null, _maxProcCpu, '#a78bfa')}</td>
    <td class="bar-cell">${_tbar(s.processRssMb  ?? null, _maxProcRss, '#818cf8')}</td>
    <td class="bar-cell">${_tbar(s.browserJsHeapMb ?? null, _maxHeap, '#f59e0b')}</td>
    <td class="bar-cell">${_tbar(s.browserTaskMs   ?? null, _maxTask, '#10b981')}</td>
    <td>${sysRamAvg} MB</td>
  </tr>`;
}).join('');

// Status badge HTML
const badge = (status) =>
  `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:.75rem;font-weight:700;background:${status==='PASSED'?'#d1fae5':'#fee2e2'};color:${status==='PASSED'?'#065f46':'#991b1b'}">${status}</span>`;

// Progress bar HTML
const pbar = (pct, color) =>
  `<div style="height:6px;border-radius:3px;background:#e5e7eb;margin-top:4px"><div style="height:6px;border-radius:3px;background:${color};width:${Math.min(100,pct)}%"></div></div>`;

// Scenario card HTML
const scenarioCards = (metrics.scenarios ?? []).map((s, i) => {
  const w = scenarioWindows[i] ?? [];
  // Always read CPU/memory stats from the scenario object (same source as comparison table)
  // Window is only used for chart sample slices
  const sysCpuAvg  = s.avgCpu;   // written by hooks.ts using the correct runStartTime
  const sysCpuPeak = s.peakCpu;
  const rssAvg     = w.length ? Math.round(w.reduce((a,b)=>a+(b.processRssMb??0),0)/w.length) : (s.processRssMb ?? 0);
  const sysRamAvg  = w.length ? Math.round(w.reduce((a,b)=>a+b.memUsedMb,0)/w.length) : (metrics.usedMb ?? 0);
  const chartId = `sc-chart-${i}`;
  const chartData = JSON.stringify({
    labels:  w.map(p => `t+${p.t}s`),
    cpu:     w.map(p => p.cpu),
    procCpu: w.map(() => s.processCpuPct ?? null),  // flat reference line across the scenario window
    rss:     w.map(p => p.processRssMb ?? null),
    sysRam:  w.map(p => p.memUsedMb),
  });

  // Bar widths for inline progress bars (scaled to run-wide max for consistency with comparison table)
  const cpuBarW  = Math.min(100, Math.round((sysCpuPeak / _maxSysCpuPeak) * 100));
  const procBarW = Math.min(100, Math.round(((s.processCpuPct ?? 0) / _maxProcCpu) * 100));
  const heapBarW = Math.min(100, Math.round(((s.browserJsHeapMb ?? 0) / Math.max(peakHeap, 1)) * 100));

  return `
  <div class="sc-card" id="sc-${i}">
    <!-- ── Accordion header: click to expand/collapse ── -->
    <div class="sc-header" onclick="toggleScenario(${i})" role="button" aria-expanded="false" aria-controls="sc-body-${i}">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <span class="sc-chevron" id="sc-chev-${i}">▶</span>
        <span class="sc-title">${s.name}</span>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-shrink:0;margin-left:12px">
        ${badge(s.status)}
        <span class="sc-dur">⏱ ${s.durationSec}s</span>
        <!-- Quick-stat pills always visible in header -->
        <span class="hdr-pill cpu-pill" title="System CPU Peak">🖥 ${sysCpuPeak}%</span>
        <span class="hdr-pill proc-pill" title="Process CPU (runner only)">⚙️ ${s.processCpuPct ?? 'N/A'}%</span>
        <span class="hdr-pill ram-pill" title="Browser JS Heap">🌐 ${s.browserJsHeapMb ?? 'N/A'} MB</span>
      </div>
    </div>

    <!-- ── Collapsible body ── -->
    <div class="sc-body" id="sc-body-${i}" style="display:none">

      <!-- ── Metric summary strip ── -->
      <div class="sc-stats-strip">

        <div class="stat-group">
          <div class="stat-group-title">🖥 System CPU</div>
          <div class="stat-row">
            <div class="stat-box">
              <span class="stat-val">${sysCpuAvg}%</span>
              <span class="stat-lbl">Avg</span>
              <div class="stat-bar"><div class="stat-bar-fill" style="width:${Math.min(100,Math.round((sysCpuAvg/_maxSysCpuAvg)*100))}%;background:#3b82f6"></div></div>
            </div>
            <div class="stat-box">
              <span class="stat-val" style="color:#f87171">${sysCpuPeak}%</span>
              <span class="stat-lbl">Peak</span>
              <div class="stat-bar"><div class="stat-bar-fill" style="width:${cpuBarW}%;background:#ef4444"></div></div>
            </div>
            <div class="stat-box">
              <span class="stat-val" style="color:#6b7280">${metrics.minCpu}%</span>
              <span class="stat-lbl">Run Min</span>
            </div>
          </div>
        </div>

        <div class="stat-group">
          <div class="stat-group-title">⚙️ Process CPU <span class="runner-badge">runner only ⭐</span></div>
          <div class="stat-row">
            <div class="stat-box">
              <span class="stat-val" style="color:#a78bfa">${s.processCpuPct ?? 'N/A'}%</span>
              <span class="stat-lbl">CPU %</span>
              <div class="stat-bar"><div class="stat-bar-fill" style="width:${procBarW}%;background:#8b5cf6"></div></div>
            </div>
            <div class="stat-box">
              <span class="stat-val" style="color:#818cf8">${rssAvg} MB</span>
              <span class="stat-lbl">RSS Avg</span>
            </div>
            <div class="stat-box">
              <span class="stat-val" style="color:#a5b4fc">${s.processRssMb ?? 'N/A'} MB</span>
              <span class="stat-lbl">RSS End</span>
            </div>
          </div>
        </div>

        <div class="stat-group">
          <div class="stat-group-title">🌐 Browser <span class="runner-badge">Chromium CDP ⭐</span></div>
          <div class="stat-row">
            <div class="stat-box">
              <span class="stat-val" style="color:#fbbf24">${s.browserJsHeapMb ?? 'N/A'} MB</span>
              <span class="stat-lbl">JS Heap</span>
              <div class="stat-bar"><div class="stat-bar-fill" style="width:${heapBarW}%;background:#f59e0b"></div></div>
            </div>
            <div class="stat-box">
              <span class="stat-val" style="color:#34d399">${s.browserTaskMs ?? 'N/A'} ms</span>
              <span class="stat-lbl">Main Thread</span>
            </div>
          </div>
        </div>

        <div class="stat-group">
          <div class="stat-group-title">🏠 System RAM</div>
          <div class="stat-row">
            <div class="stat-box">
              <span class="stat-val">${sysRamAvg} MB</span>
              <span class="stat-lbl">Avg Used</span>
            </div>
            <div class="stat-box">
              <span class="stat-val" style="color:#6b7280">${metrics.totalMb} MB</span>
              <span class="stat-lbl">Total</span>
            </div>
            <div class="stat-box">
              <span class="stat-val" style="color:#6b7280">${metrics.memPct}%</span>
              <span class="stat-lbl">Used %</span>
            </div>
          </div>
        </div>

      </div><!-- /sc-stats-strip -->

      <!-- ── Two charts side by side ── -->
      ${w.length ? `
      <div class="sc-charts-row">

        <div class="sc-chart-card">
          <div class="sc-chart-title">📈 CPU % — System vs Process</div>
          <div class="sc-chart-container">
            <canvas id="${chartId}-cpu"></canvas>
          </div>
        </div>

        <div class="sc-chart-card">
          <div class="sc-chart-title">🧠 Memory MB — System RAM vs Process RSS</div>
          <div class="sc-chart-container">
            <canvas id="${chartId}-mem"></canvas>
          </div>
        </div>

      </div>
      <script>
      (function(){
        var d=${chartData};
        if(!d.labels || !d.labels.length) return;
        var baseOpts = {
          responsive:true, maintainAspectRatio:false, animation:false,
          interaction:{mode:'index',intersect:false},
          plugins:{legend:{position:'bottom',labels:{color:'#9ca3af',font:{size:10},boxWidth:10,padding:10}}}
        };
        var xAxis = {ticks:{color:'#6b7280',font:{size:9},maxTicksLimit:7},grid:{color:'rgba(255,255,255,.04)'}};

        // Chart 1 — CPU
        new Chart(document.getElementById('${chartId}-cpu'), {
          type:'line',
          data:{
            labels: d.labels,
            datasets:[
              {
                label:'System CPU %',
                data: d.cpu,
                borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.15)',
                tension:0.4, fill:true, pointRadius:3, pointHoverRadius:5, borderWidth:2
              },
              {
                label:'Process CPU % (runner only)',
                data: d.procCpu,
                borderColor:'#a78bfa', backgroundColor:'rgba(167,139,250,.12)',
                tension:0, fill:true, pointRadius:0, borderWidth:2, borderDash:[6,3]
              }
            ]
          },
          options: Object.assign({}, baseOpts, {
            scales:{
              x: xAxis,
              y: {
                min:0, max:100,
                ticks:{color:'#6b7280',font:{size:9},callback:v=>v+'%'},
                grid:{color:'rgba(255,255,255,.05)'},
                title:{display:true,text:'CPU %',color:'#64748b',font:{size:9}}
              }
            }
          })
        });

        // Chart 2 — Memory
        new Chart(document.getElementById('${chartId}-mem'), {
          type:'line',
          data:{
            labels: d.labels,
            datasets:[
              {
                label:'System RAM MB',
                data: d.sysRam,
                borderColor:'#f97316', backgroundColor:'rgba(249,115,22,.15)',
                tension:0.4, fill:true, pointRadius:3, pointHoverRadius:5, borderWidth:2
              },
              {
                label:'Process RSS MB (runner only)',
                data: d.rss,
                borderColor:'#818cf8', backgroundColor:'rgba(129,140,248,.15)',
                tension:0.4, fill:true, pointRadius:3, pointHoverRadius:5, borderWidth:2
              }
            ]
          },
          options: Object.assign({}, baseOpts, {
            scales:{
              x: xAxis,
              y: {
                ticks:{color:'#6b7280',font:{size:9},callback:v=>v+' MB'},
                grid:{color:'rgba(255,255,255,.05)'},
                title:{display:true,text:'MB',color:'#64748b',font:{size:9}}
              }
            }
          })
        });
      })();
      </script>` : '<div class="no-window">No time-series samples captured inside this scenario window</div>'}

    </div><!-- /sc-body -->
  </div>`;
}).join('');

// Write a standalone CPU detail HTML page
const detailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CPU &amp; Memory Metrics — Voyix POS</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
    body { font-family: 'Inter', system-ui, sans-serif; background:#0f172a; color:#e2e8f0; padding:0; }

    /* ── Top bar ── */
    .topbar { background:#1e293b; border-bottom:1px solid #334155; padding:14px 28px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
    .topbar h1 { font-size:1.1rem; font-weight:700; color:#f1f5f9; }
    .topbar .meta { font-size:.78rem; color:#94a3b8; }

    /* ── Nav tabs ── */
    .tabs { display:flex; gap:4px; padding:16px 28px 0; border-bottom:1px solid #1e293b; }
    .tab  { padding:8px 20px; border-radius:6px 6px 0 0; font-size:.85rem; font-weight:600; cursor:pointer; color:#94a3b8; background:transparent; border:none; transition:all .15s; }
    .tab.active { background:#1e293b; color:#f1f5f9; }
    .tab:hover:not(.active) { color:#cbd5e1; }

    /* ── Sections ── */
    .section { display:none; padding:24px 28px; }
    .section.active { display:block; }

    /* ── KPI cards ── */
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:12px; margin-bottom:24px; }
    .kpi { background:#1e293b; border:1px solid #334155; border-radius:10px; padding:14px 16px; }
    .kpi .kv { font-size:1.6rem; font-weight:800; }
    .kpi .kl { font-size:.72rem; color:#94a3b8; margin-top:2px; }
    .kpi .ks { font-size:.7rem; color:#64748b; margin-top:1px; }

    /* ── Section headings ── */
    .sec-title { font-size:.95rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.07em; margin:28px 0 12px; }
    .sec-title:first-child { margin-top:0; }

    /* ── Full-run chart ── */
    .chart-card { background:#1e293b; border:1px solid #334155; border-radius:10px; padding:18px 20px; margin-bottom:24px; }
    .chart-card h3 { font-size:.85rem; font-weight:600; color:#94a3b8; margin-bottom:12px; }

    /* ── Comparison table ── */
    .tbl-wrap { overflow-x:auto; }
    table { border-collapse:collapse; width:100%; font-size:.8rem; }
    thead th { background:#1e3a5f; color:#93c5fd; padding:9px 12px; text-align:left; white-space:nowrap; position:sticky; top:0; }
    thead th .th-sub { font-size:.68rem; color:#60a5fa; font-weight:400; }
    tbody td { padding:8px 12px; border-bottom:1px solid #1e293b; color:#cbd5e1; }
    tbody tr:hover td { background:#1e293b; }
    .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:.72rem; font-weight:700; }
    .badge.passed { background:#d1fae5; color:#065f46; }
    .badge.failed { background:#fee2e2; color:#991b1b; }
    .bar-cell { min-width:80px; }
    .bar-bg { height:5px; border-radius:3px; background:#334155; }
    .bar-fg { height:5px; border-radius:3px; }

    /* ── Per-scenario cards — accordion ── */
    .sc-card { background:#1e293b; border:1px solid #334155; border-radius:12px; margin-bottom:14px; overflow:hidden; }
    .sc-header { display:flex; align-items:center; justify-content:space-between; padding:13px 18px; gap:12px; cursor:pointer; user-select:none; transition:background .15s; }
    .sc-header:hover { background:#263248; }
    .sc-chevron { font-size:.65rem; color:#475569; transition:transform .2s; flex-shrink:0; }
    .sc-chevron.open { transform:rotate(90deg); color:#94a3b8; }
    .sc-title { font-size:.88rem; font-weight:600; color:#f1f5f9; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:420px; }
    .sc-dur   { font-size:.78rem; color:#64748b; white-space:nowrap; }
    .hdr-pill { font-size:.72rem; font-weight:600; padding:2px 8px; border-radius:6px; white-space:nowrap; }
    .cpu-pill  { background:rgba(59,130,246,.15);  color:#60a5fa;  border:1px solid rgba(59,130,246,.25); }
    .proc-pill { background:rgba(139,92,246,.15);  color:#a78bfa;  border:1px solid rgba(139,92,246,.25); }
    .ram-pill  { background:rgba(245,158,11,.15);  color:#fbbf24;  border:1px solid rgba(245,158,11,.25); }

    /* ── Accordion body ── */
    .sc-body { border-top:1px solid #334155; }

    /* ── Stats strip ── */
    .sc-stats-strip { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:0; border-bottom:1px solid #1e293b; }
    .stat-group { padding:14px 18px; border-right:1px solid #1e293b; }
    .stat-group:last-child { border-right:none; }
    .stat-group-title { font-size:.7rem; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.06em; margin-bottom:10px; }
    .runner-badge { background:rgba(167,139,250,.15); color:#a78bfa; border-radius:4px; padding:1px 5px; font-size:.65rem; text-transform:none; letter-spacing:0; }
    .stat-row { display:flex; gap:12px; flex-wrap:wrap; }
    .stat-box { display:flex; flex-direction:column; gap:1px; min-width:60px; }
    .stat-val { font-size:1.1rem; font-weight:800; color:#f1f5f9; line-height:1; }
    .stat-lbl { font-size:.65rem; color:#64748b; }
    .stat-bar { height:4px; border-radius:2px; background:#334155; margin-top:5px; width:100%; max-width:80px; }
    .stat-bar-fill { height:4px; border-radius:2px; }

    /* ── Charts row: 2 side-by-side ── */
    .sc-charts-row { display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid #1e293b; }
    @media(max-width:860px){ .sc-charts-row { grid-template-columns:1fr; } }
    .sc-chart-card { padding:16px 18px; }
    .sc-chart-card:first-child { border-right:1px solid #1e293b; }
    .sc-chart-title { font-size:.75rem; font-weight:600; color:#64748b; margin-bottom:10px; }
    .sc-chart-container { position:relative; height:200px; width:100%; }

    .no-window { color:#475569; font-size:.8rem; padding:32px; text-align:center; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width:6px; height:6px; }
    ::-webkit-scrollbar-track { background:#0f172a; }
    ::-webkit-scrollbar-thumb { background:#334155; border-radius:3px; }
  </style>
</head>
<body>

<div class="topbar">
  <div>
    <h1>⚡ CPU &amp; Memory Metrics — Voyix POS Japan E2E</h1>
    <div class="meta">Run: ${new Date().toLocaleString('ja-JP')} &nbsp;·&nbsp; ${metrics.durationSec}s total &nbsp;·&nbsp; ${metrics.coreCount} cores &nbsp;·&nbsp; ${metrics.cpuModel}</div>
  </div>
  <div class="meta">${(metrics.scenarios ?? []).length} scenario(s) &nbsp;·&nbsp; ${(metrics.scenarios ?? []).filter(s=>s.status==='PASSED').length} passed &nbsp;·&nbsp; ${(metrics.scenarios ?? []).filter(s=>s.status!=='PASSED').length} failed</div>
</div>

<div class="tabs">
  <button class="tab active" onclick="switchTab('overall',this)">📊 Overall Run</button>
  <button class="tab" onclick="switchTab('scenarios',this)">🔬 Per-Scenario Detail</button>
  <button class="tab" onclick="switchTab('table',this)">📋 Comparison Table</button>
</div>

<!-- ════════ TAB 1: OVERALL ════════ -->
<div id="tab-overall" class="section active">

  <div class="sec-title">Run-level Summary</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kv" style="color:#22d3ee">${metrics.avgCpu}%</div><div class="kl">System CPU Avg</div><div class="ks">all processes</div></div>
    <div class="kpi"><div class="kv" style="color:#ef4444">${metrics.peakCpu}%</div><div class="kl">System CPU Peak</div><div class="ks">all processes</div></div>
    <div class="kpi"><div class="kv" style="color:#6b7280">${metrics.minCpu}%</div><div class="kl">System CPU Min</div></div>
    <div class="kpi"><div class="kv" style="color:#a78bfa">${avgProcCpu}${typeof avgProcCpu==='number'?'%':''}</div><div class="kl">Process CPU Avg</div><div class="ks">test runner only</div></div>
    <div class="kpi"><div class="kv" style="color:#c084fc">${peakProcCpu}${typeof peakProcCpu==='number'?'%':''}</div><div class="kl">Process CPU Peak</div><div class="ks">test runner only</div></div>
    <div class="kpi"><div class="kv" style="color:#3b82f6">${metrics.peakMemMb} MB</div><div class="kl">System RAM Peak</div></div>
    <div class="kpi"><div class="kv" style="color:#60a5fa">${metrics.usedMb} MB</div><div class="kl">System RAM End</div></div>
    <div class="kpi"><div class="kv">${metrics.totalMb} MB</div><div class="kl">System RAM Total</div></div>
    <div class="kpi"><div class="kv" style="color:#6b7280">${metrics.memPct}%</div><div class="kl">RAM Used %</div></div>
    <div class="kpi"><div class="kv" style="color:#818cf8">${peakRss}${typeof peakRss==='number'?' MB':''}</div><div class="kl">Process RSS Peak</div><div class="ks">test runner only</div></div>
    <div class="kpi"><div class="kv" style="color:#a78bfa">${avgRss}${typeof avgRss==='number'?' MB':''}</div><div class="kl">Process RSS Avg</div></div>
    <div class="kpi"><div class="kv" style="color:#f59e0b">${peakHeap}${typeof peakHeap==='number'?' MB':''}</div><div class="kl">Browser JS Heap Peak</div><div class="ks">Chromium V8</div></div>
    <div class="kpi"><div class="kv" style="color:#10b981">${totalTaskMs} ms</div><div class="kl">Browser Task Total</div><div class="ks">main thread time</div></div>
    <div class="kpi"><div class="kv">${metrics.durationSec}s</div><div class="kl">Total Duration</div></div>
  </div>

  <div class="sec-title">System CPU &amp; RAM Over Time (all 4 series)</div>
  <div class="chart-card">
    <h3>Sampling interval: 2s &nbsp;·&nbsp; Blue = System CPU &nbsp;·&nbsp; Purple dashed = Process RSS (test runner) &nbsp;·&nbsp; Orange = System RAM &nbsp;·&nbsp; Green dashed = Process CPU est.</h3>
    <canvas id="mainChart" height="110"></canvas>
  </div>

  <div class="sec-title">Process vs System CPU — Side-by-Side</div>
  <div class="chart-card">
    <h3>Lower Process CPU relative to System CPU means other apps (VS Code, OS, etc.) account for the difference.</h3>
    <canvas id="cpuCompareChart" height="80"></canvas>
  </div>

  <div class="sec-title">Memory Breakdown Over Time</div>
  <div class="chart-card">
    <h3>System RAM (all processes) vs Process RSS (test runner only) — helps isolate test memory footprint.</h3>
    <canvas id="memChart" height="80"></canvas>
  </div>

</div>

<!-- ════════ TAB 2: PER-SCENARIO ════════ -->
<div id="tab-scenarios" class="section">
  <div class="sec-title">Per-Scenario Detail</div>
  ${scenarioCards || '<p style="color:#475569;padding:40px;text-align:center">No scenario data available</p>'}
</div>

<!-- ════════ TAB 3: COMPARISON TABLE ════════ -->
<div id="tab-table" class="section">
  <div class="sec-title">All Scenarios — Comparison Table</div>
  <p style="font-size:.8rem;color:#64748b;margin-bottom:14px">Hover column headers for explanations. Colored bars show utilization relative to the highest value in each column.</p>
  <div class="tbl-wrap">
  <table>
    <thead><tr>
      <th>Scenario</th>
      <th>Status</th>
      <th>Duration</th>
      <th title="System CPU average during this scenario window (all processes)">Sys CPU Avg<br><span class="th-sub">all procs</span></th>
      <th title="System CPU peak during this scenario window (all processes)">Sys CPU Peak<br><span class="th-sub">all procs</span></th>
      <th title="CPU % consumed by the Node.js test runner process only — excludes VS Code, OS, etc.">Process CPU %<br><span class="th-sub">runner only ⭐</span></th>
      <th title="Resident Set Size of Node.js test runner at end of scenario">Process RSS<br><span class="th-sub">runner only ⭐</span></th>
      <th title="Chromium V8 JavaScript heap used at end of scenario (via CDP)">Browser JS Heap<br><span class="th-sub">chromium ⭐</span></th>
      <th title="Total time the browser main thread was busy during this scenario (via CDP)">Browser Task Time<br><span class="th-sub">main thread ⭐</span></th>
      <th title="System-wide RAM average during this scenario window">Sys RAM Avg<br><span class="th-sub">all procs</span></th>
    </tr></thead>
    <tbody>${scenarioRows || '<tr><td colspan="10" style="text-align:center;color:#475569;padding:28px">No scenario data</td></tr>'}</tbody>
  </table>
  </div>
  <p style="font-size:.75rem;color:#475569;margin-top:10px">⭐ = scoped to test process / browser only — unaffected by VS Code, OS daemons, or other background apps.</p>
</div>

<script>
function switchTab(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

function toggleScenario(idx) {
  var body  = document.getElementById('sc-body-' + idx);
  var chev  = document.getElementById('sc-chev-' + idx);
  var hdr   = body ? body.previousElementSibling : null;
  if (!body) return;
  var isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chev) chev.classList.toggle('open', !isOpen);
  if (hdr)  hdr.setAttribute('aria-expanded', String(!isOpen));
  // Trigger Chart.js resize so canvas fills container correctly after reveal
  if (!isOpen) {
    setTimeout(function() {
      (window.Chart ? Chart.instances : []).forEach && Object.values(Chart.instances || {}).forEach(function(c) {
        try { c.resize(); } catch(e){}
      });
    }, 50);
  }
}

const ts = ${JSON.stringify(metrics.timeSeries ?? [])};

// ── Main 4-series chart ──────────────────────────────────────────────────────
if (ts.length) {
  new Chart(document.getElementById('mainChart'), {
    type: 'line',
    data: {
      labels: ts.map(d => 't+' + d.t + 's'),
      datasets: [
        { label: 'System CPU %',       data: ts.map(d => d.cpu),          borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.12)', tension: 0.3, fill: true,  pointRadius: 2, borderWidth: 2 },
        { label: 'System RAM MB',      data: ts.map(d => d.memUsedMb),    borderColor: '#f97316', backgroundColor: 'transparent',           tension: 0.3, fill: false, pointRadius: 1, borderWidth: 1.5, yAxisID: 'y2' },
        { label: 'Process RSS MB',     data: ts.map(d => d.processRssMb ?? null), borderColor: '#a78bfa', backgroundColor: 'transparent', tension: 0.3, fill: false, pointRadius: 2, borderWidth: 2, borderDash: [5,3], yAxisID: 'y2' },
      ]
    },
    options: {
      responsive: true, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
      scales: {
        x:  { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } },
        y:  { min: 0, max: 100, title: { display: true, text: 'CPU %', color: '#64748b', font: { size: 10 } }, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.06)' } },
        y2: { position: 'right', title: { display: true, text: 'RAM MB', color: '#64748b', font: { size: 10 } }, ticks: { color: '#64748b' }, grid: { drawOnChartArea: false } },
      }
    }
  });

  // ── Process vs System CPU compare ─────────────────────────────────────────
  // Estimate per-sample process CPU by distributing processCpuPct across its window
  const scen = ${JSON.stringify(metrics.scenarios ?? [])};
  const procCpuSeries = ts.map(p => {
    const runStartEp = ${runStartEpoch || 0};
    const matchedScen = scen.find(s => {
      const rs = (s.startMs - runStartEp) / 1000;
      const re = (s.endMs   - runStartEp) / 1000;
      return p.t >= rs && p.t <= re;
    });
    return matchedScen ? (matchedScen.processCpuPct ?? null) : null;
  });

  new Chart(document.getElementById('cpuCompareChart'), {
    type: 'line',
    data: {
      labels: ts.map(d => 't+' + d.t + 's'),
      datasets: [
        { label: 'System CPU % (all procs)',    data: ts.map(d => d.cpu),    borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.1)',  tension: 0.3, fill: true,  pointRadius: 2, borderWidth: 2 },
        { label: 'Process CPU % (runner only)', data: procCpuSeries,          borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,.12)', tension: 0.3, fill: true,  pointRadius: 2, borderWidth: 2, borderDash: [6,3] },
      ]
    },
    options: {
      responsive: true, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { min: 0, max: 100, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.06)' }, title: { display: true, text: 'CPU %', color: '#64748b', font: { size: 10 } } },
      }
    }
  });

  // ── Memory breakdown ───────────────────────────────────────────────────────
  new Chart(document.getElementById('memChart'), {
    type: 'line',
    data: {
      labels: ts.map(d => 't+' + d.t + 's'),
      datasets: [
        { label: 'System RAM Used MB (all procs)', data: ts.map(d => d.memUsedMb),           borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,.1)',  tension: 0.3, fill: true,  pointRadius: 2, borderWidth: 2 },
        { label: 'Process RSS MB (runner only)',   data: ts.map(d => d.processRssMb ?? null), borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,.12)', tension: 0.3, fill: true,  pointRadius: 2, borderWidth: 2 },
      ]
    },
    options: {
      responsive: true, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.04)' } },
        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,.06)' }, title: { display: true, text: 'MB', color: '#64748b', font: { size: 10 } } },
      }
    }
  });
}
</script>
</body>
</html>`;

try {
  const { mkdirSync } = await import('fs');
  mkdirSync('reports/rich-report', { recursive: true });
} catch {}
writeFileSync('reports/rich-report/cpu-metrics.html', detailHtml);

await generate({
  jsonDir: 'reports/cucumber-json',
  reportPath: 'reports/rich-report',
  metadata: {
    browser:  { name: 'chrome', version: 'latest' },
    device:   'Desktop',
    platform: { name: 'Windows', version: '11' },
  },
  customData: {
    title: 'Voyix POS Japan — E2E Test Run',
    data: [
      { label: 'Project',              value: 'Voyix POS' },
      { label: 'Release',              value: 'Step2 End to End Flow' },
      { label: 'Test Suite',           value: '@step2-e2e' },
      { label: 'Environment',          value: process.env.ENVIRONMENT ?? 'local' },
      { label: 'App URL',              value: process.env.APP_URL ?? 'http://127.0.0.1:5173/' },
      { label: 'CPU Detail Report',    value: 'reports/rich-report/cpu-metrics.html' },
    ],
  },
  pageTitle:    'Voyix POS E2E Test Report',
  reportName:   'Step2 End to End Flow — Test Results',
  displayDuration: true,
  durationInMS: false,
});

console.log('Rich HTML report generated at: reports/rich-report/index.html');
console.log('CPU detail report at:          reports/rich-report/cpu-metrics.html');

// ── Patch charts.js: hide unused sections, fix Top 10 Slowest Steps labels ────
let chartsJs = readFileSync('reports/rich-report/scripts/charts.js', 'utf8');
// Hide Execution Summary (line chart)
chartsJs = chartsJs.replace(
  "toggleChart('#feature-execution-chart', hasDurations);",
  "toggleChart('#feature-execution-chart', false);"
);
// Hide Features Status Trend
chartsJs = chartsJs.replace(
  "toggleChart('#status-trend-chart', hasTrend);",
  "toggleChart('#status-trend-chart', false);"
);
// Hide Scenario Step Time Trend
chartsJs = chartsJs.replace(
  "toggleChart('#feature-step-trend-chart', hasStepTrend);",
  "toggleChart('#feature-step-trend-chart', false);"
);
// Top 10 Slowest Steps: show full label in y-axis (remove truncation + increase maxWidth)
chartsJs = chartsJs.replace(
  "maxWidth: 140,\n            formatter: (v) => (v.length > 25 ? v.substring(0, 22) + '...' : v),",
  "maxWidth: 320,"
);
// Top 10 Slowest Steps: custom tooltip showing full step name
chartsJs = chartsJs.replace(
  `tooltip: {\n          theme,\n          shared: true,\n          intersect: false,\n          y: {\n            formatter: (v) => v.toFixed(3) + 's',\n          },\n        },`,
  `tooltip: {\n          theme,\n          custom: ({ seriesIndex, dataPointIndex, w }) => {\n            const label = (w.globals.labels || [])[dataPointIndex] || '';\n            const val = (w.globals.series[seriesIndex] || [])[dataPointIndex];\n            const dur = typeof val === 'number' ? val.toFixed(3) + 's' : '';\n            return '<div style="padding:8px 12px;max-width:420px;white-space:normal;word-break:break-word;line-height:1.5;font-size:12px;background:#1e293b;border:1px solid #334155;border-radius:6px;color:#e2e8f0"><div style="font-weight:600;margin-bottom:4px;color:#f1f5f9">' + label + '</div><div style="color:#ef4444">\u23f1 Duration: ' + dur + '</div></div>';\n          },\n        },`
);
writeFileSync('reports/rich-report/scripts/charts.js', chartsJs, 'utf8');

// ── Post-process index.html ────────────────────────────────────────────────────
import { readFileSync as _read } from 'fs';
let reportHtml = _read('reports/rich-report/index.html', 'utf8');

// Helper: remove content between two fixed tokens (inclusive of endToken occurrence after startToken)
const removeBlock = (html, startToken, endToken) => {
  const s = html.indexOf(startToken);
  if (s === -1) return html;
  const e = html.indexOf(endToken, s);
  if (e === -1) return html;
  return html.slice(0, s) + html.slice(e + endToken.length);
};

// 1. Remove the "Execution Date" custom-data row — "Execution Period" already shows it
reportHtml = removeBlock(
  reportHtml,
  '>Execution Date</p>',
  '</div>\n                </div>'
);

// 2. Make "CPU Detail Report" value a clickable link
reportHtml = reportHtml.replace(
  '>reports/rich-report/cpu-metrics.html</p>',
  '><a href="cpu-metrics.html" target="_blank" style="color:#3b82f6;text-decoration:underline;font-weight:700">📊 Open CPU &amp; Memory Detail →</a></p>'
);

// 3. Replace "Top 10 Tags" card with a compact CPU summary (mini chart + KPI badges)
const tagSectionOld = '>Top 10 Tags</h3>\n            <div id="tag-distribution-chart" class="h-64"></div>';
const _procCpuSeriesJson = JSON.stringify(
  (metrics.timeSeries ?? []).map(p => {
    const rs2 = runStartEpoch;
    const matched = _scens.find(s => {
      const rs = (s.startMs - rs2) / 1000;
      const re = (s.endMs   - rs2) / 1000;
      return p.t >= rs && p.t <= re;
    });
    return matched ? (matched.processCpuPct ?? null) : null;
  })
);
const tagSectionNew = `>CPU &amp; Memory Utilization</h3>
            <div style="font-size:11px;margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap">
              <span style="background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.3);border-radius:6px;padding:3px 8px">Sys CPU Avg <strong style="color:#60a5fa">${metrics.avgCpu}%</strong></span>
              <span style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);border-radius:6px;padding:3px 8px">Peak <strong style="color:#f87171">${metrics.peakCpu}%</strong></span>
              <span style="background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.3);border-radius:6px;padding:3px 8px">Process CPU <strong style="color:#a78bfa">${avgProcCpu}${typeof avgProcCpu==='number'?'%':''}</strong></span>
              <span style="background:rgba(249,115,22,.15);border:1px solid rgba(249,115,22,.3);border-radius:6px;padding:3px 8px">RAM Peak <strong style="color:#fb923c">${metrics.peakMemMb} MB</strong></span>
              <span style="background:rgba(129,140,248,.15);border:1px solid rgba(129,140,248,.3);border-radius:6px;padding:3px 8px">RSS Peak <strong style="color:#818cf8">${peakRss}${typeof peakRss==='number'?' MB':''}</strong></span>
              <span style="background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:6px;padding:3px 8px">JS Heap <strong style="color:#fbbf24">${peakHeap}${typeof peakHeap==='number'?' MB':''}</strong></span>
            </div>
            <canvas id="inline-cpu-chart" style="width:100%;height:150px"></canvas>
            <div style="margin-top:8px;font-size:.72rem;color:#475569">
              <a href="cpu-metrics.html" target="_blank" style="color:#3b82f6;text-decoration:none;font-weight:600">📊 Full CPU &amp; Memory Detail →</a>
            </div>
            <script>
            (function(){
              if(typeof Chart==='undefined'){setTimeout(arguments.callee,200);return;}
              var d=${JSON.stringify(metrics.timeSeries??[])};
              var pc=${_procCpuSeriesJson};
              if(!d.length)return;
              new Chart(document.getElementById('inline-cpu-chart'),{
                type:'line',
                data:{
                  labels:d.map(function(x){return 't+'+x.t+'s';}),
                  datasets:[
                    {label:'Sys CPU %',data:d.map(function(x){return x.cpu;}),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.12)',tension:0.3,fill:true,pointRadius:2,pointHoverRadius:4,borderWidth:2},
                    {label:'Process CPU %',data:pc,borderColor:'#a78bfa',backgroundColor:'rgba(167,139,250,.1)',tension:0,fill:false,pointRadius:0,borderWidth:2,borderDash:[5,3]},
                    {label:'RSS MB',data:d.map(function(x){return x.processRssMb??null;}),borderColor:'#818cf8',backgroundColor:'transparent',tension:0.3,fill:false,pointRadius:0,borderWidth:1.5,borderDash:[3,2],yAxisID:'y2'}
                  ]
                },
                options:{
                  responsive:true,maintainAspectRatio:false,animation:false,
                  plugins:{legend:{position:'bottom',labels:{color:'#9ca3af',font:{size:9},boxWidth:10,padding:8}}},
                  interaction:{mode:'index',intersect:false},
                  scales:{
                    x:{ticks:{color:'#6b7280',font:{size:9},maxTicksLimit:8},grid:{color:'rgba(128,128,128,.06)'}},
                    y:{min:0,max:100,ticks:{color:'#6b7280',font:{size:9},callback:function(v){return v+'%';}},grid:{color:'rgba(128,128,128,.06)'},title:{display:true,text:'CPU %',color:'#6b7280',font:{size:9}}},
                    y2:{position:'right',ticks:{color:'#6b7280',font:{size:9},callback:function(v){return v+' MB';}},grid:{drawOnChartArea:false},title:{display:true,text:'RSS MB',color:'#6b7280',font:{size:9}}}
                  }
                }
              });
            })();
            </script>`;

if (reportHtml.includes(tagSectionOld)) {
  reportHtml = reportHtml.replace(tagSectionOld, tagSectionNew);
} else {
  reportHtml = reportHtml.replace('>Top 10 Tags</h3>', '>CPU &amp; Memory Utilization</h3>');
}

// 3. (full-width section not injected — detail lives in cpu-metrics.html)
if (!reportHtml.includes('Chart.min.js') && !reportHtml.includes('chart.umd')) {
  reportHtml = reportHtml.replace('</body>', '<script src="./assets/js/Chart.min.js"></script>\n</body>');
}

// ── Self-contained: inline all local CSS / JS / fonts into the HTML ─────────
const REPORT_DIR = _res('reports/rich-report');

// Map file extension → MIME type
const _mime = (ext) => ({ woff2:'font/woff2', woff:'font/woff', ttf:'font/truetype',
  png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif' }[ext] || 'application/octet-stream');

// Read a file and return a base64 data URI (null on error)
const _b64 = (abs, mime) => {
  try { return `data:${mime};base64,${readFileSync(abs).toString('base64')}`; } catch { return null; }
};

// Replace url(...) in CSS with base64 data URIs — only woff2 and images to save space
const _urlsInCss = (css, cssDir) => css.replace(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g, (m, u) => {
  if (/^(data:|https?:|\/\/)/.test(u)) return m;
  const p = u.split('?')[0];
  const ext = _ext(p).slice(1).toLowerCase();
  if (!['woff2','png','jpg','jpeg','gif'].includes(ext)) return m;
  const d = _b64(_res(cssDir, p), _mime(ext));
  return d ? `url('${d}')` : m;
});

// Inline all local <link> stylesheets, favicon, and <script src> tags
const _inlineAll = (html, base) => {
  // <link> tags: stylesheets and favicon
  html = html.replace(/<link([^>]+)>/gi, (m, attrs) => {
    const hm = attrs.match(/href=["']([^"']+)["']/);
    if (!hm || /^(data:|https?:|\/\/)/.test(hm[1])) return m;
    const href = hm[1], abs = _res(base, href);
    if (/rel=["']stylesheet["']/.test(attrs)) {
      try { return `<style>/* ${href} */\n${_urlsInCss(readFileSync(abs,'utf8'),_dir(abs))}\n</style>`; }
      catch { return m; }
    }
    if (/rel=["']icon["']/.test(attrs)) {
      const d = _b64(abs, _mime(_ext(href).slice(1)));
      return d ? m.replace(href, d) : m;
    }
    return m;
  });
  // <script src="..."> tags (skip CDN)
  html = html.replace(/<script\s+src=["']([^"']+)["']([^>]*)><\/script>/gi, (m, src, attrs) => {
    if (/^(https?:|\/\/)/.test(src)) return m;
    const abs = _res(base, src);
    try { return `<script${attrs}>\n/* inlined: ${src} */\n${readFileSync(abs,'utf8')}\n</script>`; }
    catch { return m; }
  });
  return html;
};

reportHtml = _inlineAll(reportHtml, REPORT_DIR);

// ── Prevent browser caching so the file always loads fresh when opened manually ──
reportHtml = reportHtml.replace(
  '<head>',
  `<head>
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <!-- Report generated: ${new Date().toISOString()} -->`
);

// Default to dark mode — localStorage saves any manual toggle for next open
reportHtml = reportHtml.replace(
  /localStorage\.getItem\('theme'\)\s*\|\|\s*\(window\.matchMedia[^)]+\)[^:]+:\s*'light'\)/,
  "localStorage.getItem('theme') || 'dark'"
);

// ── Embed ALL feature pages so every link works from a standalone file ────────
const _featHrefs = [...new Set([
  // Features referenced in the current index.html
  ...[...reportHtml.matchAll(/href=["'](features\/[^"']+\.html)["']/g)].map(m => m[1]).filter(h => !h.includes('${')),
  // Any extra HTML files on disk from previous runs (e.g. old UUIDs not in this report)
  ...(() => { try { return readdirSync(_res(REPORT_DIR, 'features')).filter(f => f.endsWith('.html')).map(f => `features/${f}`); } catch { return []; } })(),
])];

const _featHrefsProcessed = new Set();
// Reusable: extract a full card block (from its opening <div class="rounded-xl..."> to matching </div>)
const _extractCard = (html, chartId) => {
  const anchor = `id="${chartId}"`;
  const pos = html.indexOf(anchor);
  if (pos === -1) return null;
  // Walk backwards to find the card's outermost opening div (the one with rounded-xl)
  let start = pos;
  while (start > 0 && !html.slice(Math.max(0, start - 5), start + 1).includes('>')) start--;
  // Find the <div class="rounded-xl that directly contains this chart
  const searchBack = html.slice(0, pos);
  const cardStart = searchBack.lastIndexOf('<div class="rounded-xl');
  if (cardStart === -1) return null;
  // Match the closing </div> — count nested divs
  let depth = 0, i = cardStart;
  while (i < html.length) {
    if (html.slice(i, i + 4) === '<div') depth++;
    else if (html.slice(i, i + 6) === '</div>') { depth--; if (depth === 0) { return html.slice(cardStart, i + 6); } }
    i++;
  }
  return null;
};

for (const featRel of _featHrefs) {
  try {
    const featAbs = _res(REPORT_DIR, featRel);
    const featDir = _dir(featAbs);
    let featHtml = readFileSync(featAbs, 'utf8');

    // ── Rearrange chart layout ──────────────────────────────────────────────
    // Target: replace the two existing 3-col grid rows with:
    //   Row 1 (3 cols): Scenario Distribution | Steps per Scenarios | Top 10 Tags
    //   Row 2 (full-width, col-span-3): Top 10 Slowest Steps (taller)
    const scenarioCard = _extractCard(featHtml, 'feature-scenarios-chart');
    const stepsPerCard = _extractCard(featHtml, 'feature-steps-per-scenario-chart');
    const tagsCard     = _extractCard(featHtml, 'tag-distribution-chart');
    const slowestCard  = _extractCard(featHtml, 'feature-time-dist-chart');

    if (scenarioCard && stepsPerCard && tagsCard && slowestCard) {
      // Build new layout — slowest steps gets full width and taller chart container
      const slowestCardWide = slowestCard.replace('class="h-64"', 'class="h-96"');
      const newLayout = `\n    <!-- Charts Rows -->\n    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">\n         ${scenarioCard}\n        ${stepsPerCard}\n        ${tagsCard}\n    </div>\n    <div class="grid grid-cols-1 gap-6">\n        ${slowestCardWide}\n    </div>`;

      // Remove both original grid rows and replace
      const gridStart = featHtml.indexOf('<!-- Charts Rows -->');
      const scenariosSection = featHtml.indexOf('<!-- Scenarios -->');
      if (gridStart !== -1 && scenariosSection !== -1) {
        featHtml = featHtml.slice(0, gridStart) + newLayout + '\n\n    ' + featHtml.slice(scenariosSection);
      }
    }

    featHtml = _inlineAll(featHtml, featDir);
    // Inject back-nav: clicking "Dashboard" breadcrumb sends a postMessage to the parent
    // (window.parent direct access is blocked by file:// cross-origin restrictions in Chrome)
    featHtml = featHtml.replace('</body>',
      `<script>(function(){
  // Dashboard breadcrumb → close overlay via postMessage
  document.addEventListener('click',function(e){var a=e.target;while(a&&a.tagName!=='A'){a=a.parentElement;}if(!a)return;var href=a.getAttribute('href')||'';if(!href||href.charAt(0)==='#'||/^https?:/.test(href))return;if(href.indexOf('features/')===0&&href.slice(-5)==='.html')return;e.preventDefault();try{window.parent.postMessage({type:'__closeFeatOv'},'*');}catch(x){}});
  // Scroll-to-top button inside the feature page — calls window.scrollTo directly,
  // avoids cross-origin postMessage issues on file:// in Chrome
  var _b=document.createElement('button');
  _b.title='Scroll to top';
  _b.innerHTML='&#8679;';
  _b.style.cssText='position:fixed;bottom:28px;right:28px;z-index:9999;width:44px;height:44px;border-radius:50%;background:#1e40af;color:#fff;border:none;font-size:24px;line-height:44px;text-align:center;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.5);';
  _b.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};
  document.body.appendChild(_b);
})();</script></body>`
    );
    writeFileSync(featAbs, featHtml, 'utf8');
    _featHrefsProcessed.add(featRel);
    console.log(`Feature page processed: ${featRel}`);
  } catch(e) { console.warn(`Feature embed skipped (${featRel}):`, e.message); }
}

if (_featHrefsProcessed.size > 0) {
  reportHtml = reportHtml.replace(
    '</body>',
    `<script>(function(){
  function closeFeatOv(){
    var ov=document.getElementById('__feat-ov');
    if(ov)document.body.removeChild(ov);
  }
  window.__closeFeatOv=closeFeatOv;
  window.addEventListener('message',function(e){
    if(!e.data||typeof e.data!=='object')return;
    if(e.data.type==='__closeFeatOv')closeFeatOv();
  });
  document.addEventListener('click',function(e){
    var a=e.target;
    while(a&&a.tagName!=='A'){a=a.parentElement;}
    if(!a)return;
    var href=a.getAttribute('href')||'';
    if(href.indexOf('features/')===0&&href.slice(-5)==='.html'){
      e.preventDefault();
      var existing=document.getElementById('__feat-ov');
      if(existing)document.body.removeChild(existing);
      // Overlay container
      var ov=document.createElement('div');
      ov.id='__feat-ov';
      ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:9998;background:#0f172a;';
      // Top bar: Dashboard button + scroll-to-top button — always visible, never overlaps content
      var bar=document.createElement('div');
      bar.style.cssText='position:absolute;top:0;left:0;width:100%;height:44px;background:#0f172a;border-bottom:1px solid #1e293b;z-index:9999;display:flex;align-items:center;padding:0 12px;box-sizing:border-box;gap:8px;';
      var dashBtn=document.createElement('button');
      dashBtn.innerHTML='&#8592; Dashboard';
      dashBtn.onclick=closeFeatOv;
      dashBtn.style.cssText='padding:5px 14px;background:#1e40af;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;';
      bar.appendChild(dashBtn);
      ov.appendChild(bar);
      // iframe — starts below the top bar
      var ifr=document.createElement('iframe');
      ifr.id='__feat-ifr';
      ifr.style.cssText='position:absolute;top:44px;left:0;width:100%;height:calc(100% - 44px);border:none;';
      ifr.src=href;
      ov.appendChild(ifr);
      document.body.appendChild(ov);
    }
  });
  // Scroll-to-top for the dashboard page itself
  var _stb=document.createElement('button');
  _stb.title='Back to top';
  _stb.innerHTML='&#8679;';
  _stb.style.cssText='display:none;position:fixed;bottom:28px;right:28px;z-index:9000;width:42px;height:42px;border-radius:50%;background:#1e40af;color:#fff;border:none;font-size:22px;line-height:42px;text-align:center;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.4);';
  _stb.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};
  document.body.appendChild(_stb);
  window.addEventListener('scroll',function(){
    _stb.style.display=window.scrollY>300?'block':'none';
  },{passive:true});
})();</script>\n</body>`
  );
}

writeFileSync('reports/rich-report/index.html', reportHtml, 'utf8');
console.log('Post-processed: dark mode default, Execution Date removed, CPU chart injected, assets inlined, feature pages updated in-place.');

// ── Email notification ────────────────────────────────────────────────────────
if ((process.env.SEND_EMAIL ?? 'false').toLowerCase() === 'true') {
  const { createTransport } = await import('nodemailer');
  const { readFileSync: _rs } = await import('fs');

  // Summarise results from the cucumber JSON for the email body
  let passed = 0, failed = 0, skipped = 0;
  try {
    const results = JSON.parse(_rs('reports/cucumber-json/cucumber-report.json', 'utf8'));
    for (const feature of results) {
      for (const scenario of (feature.elements ?? [])) {
        const steps = scenario.steps ?? [];
        const statuses = steps.map(s => s.result?.status);
        if (statuses.some(s => s === 'failed'))       failed++;
        else if (statuses.some(s => s === 'skipped')) skipped++;
        else                                           passed++;
      }
    }
  } catch { /* report JSON not available */ }

  const total = passed + failed + skipped;
  const emoji = failed > 0 ? '❌' : '✅';
  const subject = `${emoji} ${process.env.EMAIL_SUBJECT ?? 'Voyix POS Test Results'} — ${failed > 0 ? 'FAILED' : 'PASSED'} (${passed}/${total})`;

  const html = `
    <h2 style="font-family:sans-serif;color:#1a237e">Voyix POS E2E Test Results</h2>
    <table style="font-family:sans-serif;border-collapse:collapse;width:100%;max-width:480px">
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Environment</strong></td><td style="padding:6px 12px">${process.env.ENVIRONMENT ?? 'local'}</td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>App URL</strong></td><td style="padding:6px 12px">${process.env.APP_URL ?? '-'}</td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Run Date</strong></td><td style="padding:6px 12px">${new Date().toLocaleString()}</td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Total Scenarios</strong></td><td style="padding:6px 12px">${total}</td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Passed</strong></td><td style="padding:6px 12px;color:#1cc17b"><strong>${passed}</strong></td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Failed</strong></td><td style="padding:6px 12px;color:#dd1708"><strong>${failed}</strong></td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Skipped</strong></td><td style="padding:6px 12px;color:#f59e0b"><strong>${skipped}</strong></td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>CPU Avg / Peak</strong></td><td style="padding:6px 12px">${metrics.avgCpu}% / ${metrics.peakCpu}%</td></tr>
      <tr><td style="padding:6px 12px;background:#f3f4f6"><strong>Duration</strong></td><td style="padding:6px 12px">${metrics.durationSec}s</td></tr>
    </table>
    <p style="font-family:sans-serif;margin-top:16px;font-size:13px;color:#666">Full HTML report is attached.</p>
  `;

  const transporter = createTransport({
    host:   process.env.EMAIL_HOST   ?? 'smtp.gmail.com',
    port:   Number(process.env.EMAIL_PORT ?? 587),
    secure: (process.env.EMAIL_SECURE ?? 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const toList = (process.env.EMAIL_TO ?? '').split(',').map(e => e.trim()).filter(Boolean);

  try {
    await transporter.sendMail({
      from:        process.env.EMAIL_FROM ?? process.env.EMAIL_USER,
      to:          toList.join(', '),
      subject,
      html,
      attachments: [{ filename: 'voyix-pos-test-report.html', path: 'reports/rich-report/index.html' }],
    });
    console.log(`Email sent to: ${toList.join(', ')}`);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
} else {
  console.log('Email notification skipped (SEND_EMAIL is not true).');
}
