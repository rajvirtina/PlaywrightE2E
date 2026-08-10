/**
 * k6 Load Test — Voyix POS nvpos-cart API
 *
 * Targets: nvpos-cart (Go backend) on port 8081
 * Namespace: nvpos-services
 *
 * ── CONFIRMED ROUTES (from pod logs 2026-07-02) ──────────────────────────────
 *   GET  /v1/health                          ~20-100µs
 *   POST /v1/carts                           ~463µs    (create/start transaction)
 *   POST /v1/carts/{id}/items               ~28-156ms  (scan item — DB lookup)
 *   POST /v1/carts/{id}/close               ~20ms      (complete transaction)
 *   GET  /v1/carts/{id}/events              SSE 90s    (React UI long-poll)
 *
 * ── TAX MODEL (from TLOG) ────────────────────────────────────────────────────
 *   TAX_INCLUSIVE (内税) @ 10% — tax is embedded in item price
 *   taxableAmount = price / 1.1 (net)
 *   taxAmount     = price - taxableAmount
 *
 * ── ITEM SCAN LATENCY PATTERN ────────────────────────────────────────────────
 *   Cold (first scan): ~156ms  — PostgreSQL product lookup, no cache
 *   Warm (subsequent): ~28ms   — cached or plan-cached
 *   SLO: p95 < 500ms (matches SLO_SCAN_MS in .env)
 *
 * Run locally (port-forward first):
 *   kubectl port-forward svc/nvpos-cart 8081:8081 -n nvpos-services
 *   k6 run k6/load-test.js
 *
 * Run as K8s Job:
 *   kubectl create configmap voyix-pos-k6-scripts \
 *     --from-file=load-test.js=k6/load-test.js \
 *     -n nvposs --dry-run=client -o yaml | kubectl apply -f -
 *   JOB_FILE=k6-job.yaml ./k8s/deploy.sh
 *
 * Env vars:
 *   CART_URL  — base URL (default: http://localhost:8081)
 *   STAGE     — smoke | load | stress | soak  (default: load)
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ── Custom metrics ───────────────────────────────────────────────────────────
const errorRate        = new Rate('pos_errors');
const scanLatency      = new Trend('pos_scan_latency_ms',     true);
const checkoutLatency  = new Trend('pos_checkout_latency_ms', true);
const transactionCount = new Counter('pos_transactions_total');

const BASE_URL = __ENV.CART_URL || 'http://localhost:8081';

// Host header required — nvpos-cart matches routes against the Host header.
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept':       'application/json',
  'Host':         'nvpos.store.local',
};

// ── Confirmed endpoints ───────────────────────────────────────────────────────
const EP = {
  health:     `${BASE_URL}/v1/health`,
  createCart: `${BASE_URL}/v1/carts`,
  addItem:    (id) => `${BASE_URL}/v1/carts/${id}/items`,
  closeCart:  (id) => `${BASE_URL}/v1/carts/${id}/close`,
};

// ── Product barcodes from acceptance test seed data ───────────────────────────
// These match the barcodes in acceptance/data/transaction.json
const ITEMS = [
  { barcode: '4901234000001', name: 'Onigiri Ume',    price: 111 },
  { barcode: '4901234000002', name: 'Ocha 500ml',     price: 139 },
  { barcode: '4901234000003', name: 'Sandwich',       price: 351 },
  { barcode: '4901234000004', name: 'Coffee Can',     price: 120 },
];

// ── Load profiles ─────────────────────────────────────────────────────────────
const PROFILES = {
  smoke: {
    vus: 1, duration: '1m',
    thresholds: {
      http_req_failed:   ['rate<0.01'],
      http_req_duration: ['p(95)<1000'],
    },
  },
  load: {
    // Realistic store: ramp to 10 concurrent cashiers
    stages: [
      { duration: '1m',  target: 3  },  // warm-up
      { duration: '5m',  target: 10 },  // sustained — 10 cashiers
      { duration: '2m',  target: 10 },  // hold
      { duration: '1m',  target: 0  },  // ramp down
    ],
    thresholds: {
      http_req_failed:         ['rate<0.01'],
      http_req_duration:       ['p(95)<500'],    // SLO_SCAN_MS
      pos_scan_latency_ms:     ['p(95)<500', 'p(99)<1000'],
      pos_checkout_latency_ms: ['p(95)<4000'],   // SLO_CHECKOUT_MS
      pos_errors:              ['rate<0.01'],
    },
  },
  stress: {
    // Find breaking point — watch postgres CPU during this
    stages: [
      { duration: '2m',  target: 10 },
      { duration: '3m',  target: 25 },
      { duration: '3m',  target: 50 },
      { duration: '2m',  target: 0  },
    ],
    thresholds: {
      http_req_failed:   ['rate<0.05'],
      http_req_duration: ['p(95)<2000'],
    },
  },
  soak: {
    // 1-hour endurance — detect Go memory leaks and Postgres connection exhaustion
    stages: [
      { duration: '2m',  target: 10 },
      { duration: '56m', target: 10 },
      { duration: '2m',  target: 0  },
    ],
    thresholds: {
      http_req_failed:   ['rate<0.01'],
      http_req_duration: ['p(95)<500'],
    },
  },
};

const stage = __ENV.STAGE || 'load';
export const options = PROFILES[stage] || PROFILES.load;

// ── Pre-flight health check ───────────────────────────────────────────────────
export function setup() {
  const res = http.get(EP.health, { headers: HEADERS });
  if (res.status !== 200) {
    console.error(`[k6] Health check failed: ${res.status} at ${BASE_URL}/v1/health`);
  } else {
    console.log(`[k6] Health OK (${res.timings.duration.toFixed(2)}ms) — starting load test`);
    console.log(`[k6] Stage: ${stage}`);
  }
}

// ── Main VU: one cashier doing a full transaction ─────────────────────────────
export default function () {
  // Each VU picks a random item from the confirmed product list
  const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  let cartId;

  group('create_cart', () => {
    const res = http.post(EP.createCart, JSON.stringify({}), { headers: HEADERS });
    const ok = check(res, {
      'create cart 201': r => r.status === 201,
      'has cartId':      r => {
        try { return !!JSON.parse(r.body)?.id; } catch { return false; }
      },
    });
    errorRate.add(!ok);
    if (ok) {
      try { cartId = JSON.parse(res.body).id; } catch { /* */ }
    }
  });

  if (!cartId) {
    console.warn('[k6] Failed to get cartId — skipping transaction');
    sleep(1);
    return;
  }

  // Scan item — primary SLO: p95 < 500ms
  // Note: first scan per cart is ~156ms (cold DB lookup), subsequent ~28ms
  group('scan_item', () => {
    const start = Date.now();
    const res = http.post(
      EP.addItem(cartId),
      JSON.stringify({ itemCode: item.barcode, quantity: 1 }),
      { headers: HEADERS }
    );
    scanLatency.add(Date.now() - start);
    const ok = check(res, {
      'scan item 200': r => r.status === 200,
    });
    errorRate.add(!ok);
    if (!ok) console.warn(`[k6] scan failed: ${res.status} itemCode=${item.barcode} body=${res.body ? res.body.substring(0, 100) : ''}}`);
  });

  sleep(0.5);  // cashier think time

  // Close transaction — SLO: p95 < 4000ms
  group('close_cart', () => {
    const start = Date.now();
    const res = http.post(
      EP.closeCart(cartId),
      JSON.stringify({
        tenders: [{ type: 'CASH', tenderAmount: { amount: item.price + 100 } }],
      }),
      { headers: HEADERS }
    );
    checkoutLatency.add(Date.now() - start);
    const ok = check(res, {
      'close cart 200': r => r.status === 200,
    });
    errorRate.add(!ok);
    if (ok) transactionCount.add(1);
  });

  sleep(1);  // think time between transactions
}

// -- Summary ------------------------------------------------------------------
export function handleSummary(data) {
  var s = data.metrics;
  var p95scan     = s.pos_scan_latency_ms     ? s.pos_scan_latency_ms.values['p(95)'].toFixed(1)     : 'n/a';
  var p95checkout = s.pos_checkout_latency_ms ? s.pos_checkout_latency_ms.values['p(95)'].toFixed(1) : 'n/a';
  var p95http     = s.http_req_duration       ? s.http_req_duration.values['p(95)'].toFixed(1)       : 'n/a';
  var errRate     = s.pos_errors              ? (s.pos_errors.values.rate * 100).toFixed(2)          : '0.00';
  var txCount     = s.pos_transactions_total  ? s.pos_transactions_total.values.count                : 0;
  var totalReqs   = s.http_reqs               ? s.http_reqs.values.count                             : 0;
  var checkPass   = s.checks                  ? s.checks.values.passes                               : 0;
  var checkFail   = s.checks                  ? s.checks.values.fails                                : 0;
  var durationMs  = data.state               ? data.state.testRunDurationMs                          : 0;
  var durationSec = (durationMs / 1000).toFixed(0);
  var allPass     = parseFloat(errRate) === 0 && p95scan !== 'n/a' && parseFloat(p95scan) <= 500 && parseFloat(p95checkout) <= 4000;
  var statusBadge = allPass
    ? '<div class="badge green">&#10003; All Thresholds Passed</div>'
    : '<div class="badge red">&#x26A0; Some Thresholds Failed</div>';

  // SLO bar: percentage of budget consumed (capped at 100 for display)
  var scanPct     = p95scan     !== 'n/a' ? Math.min(100, (parseFloat(p95scan)     / 500  * 100)).toFixed(0) : 0;
  var checkoutPct = p95checkout !== 'n/a' ? Math.min(100, (parseFloat(p95checkout) / 4000 * 100)).toFixed(0) : 0;
  var httpPct     = p95http     !== 'n/a' ? Math.min(100, (parseFloat(p95http)     / 500  * 100)).toFixed(0) : 0;
  var errPct      = Math.min(100, (parseFloat(errRate) / 1 * 100)).toFixed(0);
  var scanColor   = parseFloat(p95scan)     <= 500  ? '#48bb78' : '#e53e3e';
  var checkColor  = parseFloat(p95checkout) <= 4000 ? '#48bb78' : '#e53e3e';
  var httpColor   = parseFloat(p95http)     <= 500  ? '#48bb78' : '#e53e3e';
  var errColor    = parseFloat(errRate)     < 1     ? '#48bb78' : '#e53e3e';

  var stageDesc = { smoke: '1 VU &middot; 1 minute', load: 'ramp 3&rarr;10 VUs &middot; 9 minutes', stress: 'ramp to 50 VUs &middot; 10 minutes', soak: '10 VUs &middot; 60 minutes' };
  var stageLabel = stageDesc[stage] || stage;

  var now = new Date().toUTCString();

  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
    + '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>Voyix POS &mdash; API Load Test Report</title>\n'
    + '<style>'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f6f9;color:#2d3748}'
    + 'header{background:linear-gradient(135deg,#1a365d 0%,#2b6cb0 100%);color:white;padding:32px 40px}'
    + 'header h1{font-size:28px;font-weight:700}'
    + 'header p{margin-top:6px;opacity:.8;font-size:15px}'
    + '.badge{display:inline-block;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin-top:12px}'
    + '.badge.green{background:#48bb78;color:white}'
    + '.badge.red{background:#e53e3e;color:white}'
    + '.content{max-width:960px;margin:0 auto;padding:32px 24px}'
    + '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:28px}'
    + '.card{background:white;border-radius:10px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.08)}'
    + '.card .label{font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:.05em}'
    + '.card .value{font-size:30px;font-weight:700;margin-top:6px}'
    + '.card .sub{font-size:12px;color:#718096;margin-top:4px}'
    + '.card.green .value{color:#38a169}.card.blue .value{color:#3182ce}.card.purple .value{color:#805ad5}'
    + 'h2{font-size:17px;font-weight:600;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}'
    + '.section{background:white;border-radius:10px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:22px}'
    + 'table{width:100%;border-collapse:collapse}'
    + 'th{text-align:left;font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:.05em;padding:8px 12px;border-bottom:2px solid #e2e8f0}'
    + 'td{padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px}'
    + 'tr:last-child td{border-bottom:none}'
    + '.pass{color:#38a169;font-weight:600}.fail{color:#e53e3e;font-weight:600}'
    + '.slo-bar{height:8px;border-radius:4px;background:#e2e8f0;overflow:hidden;margin-top:4px}'
    + '.slo-fill{height:100%;border-radius:4px}'
    + 'code{background:#f7fafc;padding:2px 6px;border-radius:3px;font-size:13px}'
    + '.info{background:#ebf8ff;border-left:4px solid #3182ce;border-radius:6px;padding:14px 18px;margin-bottom:22px;font-size:14px;line-height:1.7}'
    + '.cmd{background:#1a202c;color:#e2e8f0;border-radius:6px;padding:14px 18px;font-family:monospace;font-size:13px;margin-top:10px;line-height:1.8}'
    + '.footer{text-align:center;color:#a0aec0;font-size:13px;padding:24px}'
    + '</style></head><body>\n'
    + '<header><h1>Voyix POS &mdash; API Load Test Report</h1>'
    + '<p>nvpos-cart backend &middot; Generated ' + now + '</p>'
    + statusBadge
    + '</header>\n<div class="content">\n'

    // info box
    + '<div class="info"><strong>What does this test?</strong> Simulates ' + txCount + ' full cashier transaction loops '
    + '(create cart &rarr; scan item &rarr; close cart) against the nvpos-cart Go backend API over ' + durationSec + ' seconds '
    + 'using the <strong>' + stage + '</strong> profile (' + stageLabel + ').</div>\n'

    // metric cards
    + '<div class="cards">'
    + '<div class="card green"><div class="label">Transactions</div><div class="value">' + txCount + '</div><div class="sub">completed</div></div>'
    + '<div class="card green"><div class="label">Error Rate</div><div class="value">' + errRate + '%</div><div class="sub">SLO: &lt;1%</div></div>'
    + '<div class="card blue"><div class="label">HTTP Requests</div><div class="value">' + totalReqs + '</div><div class="sub">total calls</div></div>'
    + '<div class="card green"><div class="label">Checks</div><div class="value">' + checkPass + '</div><div class="sub">' + checkFail + ' failed</div></div>'
    + '<div class="card purple"><div class="label">Duration</div><div class="value" style="font-size:22px">' + durationSec + 's</div><div class="sub">' + stage + ' stage</div></div>'
    + '</div>\n'

    // SLO table
    + '<div class="section"><h2>Service Level Objectives</h2><table>'
    + '<thead><tr><th>Metric</th><th>Endpoint</th><th>Result (p95)</th><th>SLO Limit</th><th>Status</th><th>Budget Used</th></tr></thead><tbody>'
    + '<tr><td><strong>Item Scan</strong></td><td><code>POST /v1/carts/{id}/items</code></td><td><strong>' + p95scan + ' ms</strong></td><td>500 ms</td>'
    + '<td class="' + (parseFloat(p95scan) <= 500 ? 'pass">&#10003; PASS' : 'fail">&#x2717; FAIL') + '</td>'
    + '<td>' + scanPct + '%<div class="slo-bar"><div class="slo-fill" style="width:' + scanPct + '%;background:' + scanColor + '"></div></div></td></tr>'
    + '<tr><td><strong>Checkout</strong></td><td><code>POST /v1/carts/{id}/close</code></td><td><strong>' + p95checkout + ' ms</strong></td><td>4000 ms</td>'
    + '<td class="' + (parseFloat(p95checkout) <= 4000 ? 'pass">&#10003; PASS' : 'fail">&#x2717; FAIL') + '</td>'
    + '<td>' + checkoutPct + '%<div class="slo-bar"><div class="slo-fill" style="width:' + checkoutPct + '%;background:' + checkColor + '"></div></div></td></tr>'
    + '<tr><td><strong>Overall HTTP</strong></td><td><code>All endpoints</code></td><td><strong>' + p95http + ' ms</strong></td><td>500 ms</td>'
    + '<td class="' + (parseFloat(p95http) <= 500 ? 'pass">&#10003; PASS' : 'fail">&#x2717; FAIL') + '</td>'
    + '<td>' + httpPct + '%<div class="slo-bar"><div class="slo-fill" style="width:' + httpPct + '%;background:' + httpColor + '"></div></div></td></tr>'
    + '<tr><td><strong>Error Rate</strong></td><td><code>HTTP failures</code></td><td><strong>' + errRate + '%</strong></td><td>1%</td>'
    + '<td class="' + (parseFloat(errRate) < 1 ? 'pass">&#10003; PASS' : 'fail">&#x2717; FAIL') + '</td>'
    + '<td>' + errPct + '%<div class="slo-bar"><div class="slo-fill" style="width:' + errPct + '%;background:' + errColor + '"></div></div></td></tr>'
    + '</tbody></table></div>\n'

    // how to run next stage
    + '<div class="section"><h2>Run Next Stage</h2>'
    + '<table><thead><tr><th>Stage</th><th>VUs</th><th>Duration</th><th>Purpose</th></tr></thead><tbody>'
    + '<tr style="background:#f0fff4"><td><strong>smoke</strong></td><td>1</td><td>1 min</td><td>Quick sanity check</td></tr>'
    + '<tr><td><strong>load</strong></td><td>3&rarr;10</td><td>9 min</td><td>Realistic: 10 cashiers simultaneously</td></tr>'
    + '<tr><td><strong>stress</strong></td><td>up to 50</td><td>10 min</td><td>Find the breaking point</td></tr>'
    + '<tr><td><strong>soak</strong></td><td>10</td><td>60 min</td><td>Detect memory leaks over time</td></tr>'
    + '</tbody></table>'
    + '<div class="cmd">'
    + 'cd "C:\\Resmex\\specit with playwright\\Voyix-POS"<br>'
    + '$env:STAGE="load" ; $env:CART_URL="http://localhost:8081"<br>'
    + '&amp; "C:\\Program Files\\k6\\k6.exe" run k6/load-test.js'
    + '</div>'
    + '<p style="font-size:13px;color:#718096;margin-top:10px">This report is regenerated automatically after every run &rarr; <code>reports/k6-report.html</code></p>'
    + '</div>\n'

    + '</div>\n<div class="footer">Voyix POS Performance Testing &mdash; nvpos-cart Go backend</div>\n</body></html>';

  console.log('\n=== VOYIX POS LOAD TEST SUMMARY ===');
  console.log('Stage              : ' + stage);
  console.log('Transactions total : ' + txCount);
  console.log('Error rate         : ' + errRate + '%');
  console.log('HTTP p95           : ' + p95http + 'ms');
  console.log('Scan p95           : ' + p95scan + 'ms  (SLO: <=500ms)');
  console.log('Checkout p95       : ' + p95checkout + 'ms  (SLO: <=4000ms)');
  console.log('Report             : reports/k6-report.html');
  console.log('');

  return {
    'reports/k6-summary.json': JSON.stringify(data, null, 2),
    'reports/k6-report.html':  html,
  };
}