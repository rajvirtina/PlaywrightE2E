<#
.SYNOPSIS
    Run k6 load test while capturing live CPU and memory.
    Auto-detects whether to use docker stats (local) or kubectl top pod (CX7 hardware).
    Generates a combined HTML report at reports\k6-report.html automatically.

.PARAMETER Stage
    smoke | load | stress | soak  (default: load)

.PARAMETER CartUrl
    Base URL for nvpos-cart.
    Local  : http://localhost:8081  (default, or use port-forward)
    Hardware: http://192.168.1.11:30081  (CX7 NodePort)

.PARAMETER Container
    Docker container name for local monitoring (default: nvpos-cart-dev).
    Set to empty string "" to force kubectl mode.

.PARAMETER Namespace
    Kubernetes namespace for kubectl top (default: nvpos-services).
    Only used when Container is empty or not found.

.PARAMETER PodFilter
    Pod name filter for kubectl top (default: nvpos-cart).
    Only used in kubectl mode.

.EXAMPLE
    # Local Docker
    .\k6\run-with-stats.ps1 -Stage smoke
    .\k6\run-with-stats.ps1 -Stage load

    # CX7 hardware via port-forward (kubectl port-forward svc/nvpos-cart 8081:8081 -n nvpos-services)
    .\k6\run-with-stats.ps1 -Stage load -Container ""

    # CX7 hardware direct NodePort
    .\k6\run-with-stats.ps1 -Stage load -CartUrl "http://192.168.1.11:30081" -Container ""
#>
param(
    [string]$Stage       = $(if ($env:STAGE)     { $env:STAGE }     else { 'load' }),
    [string]$CartUrl     = $(if ($env:CART_URL)  { $env:CART_URL }  else { 'http://localhost:8081' }),
    [string]$Container   = 'nvpos-cart-dev',
    [string]$Namespace   = 'nvpos-services',
    [string]$PodFilter   = 'nvpos-cart'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
New-Item -ItemType Directory -Force -Path 'reports' | Out-Null

# ── Auto-detect monitoring mode ───────────────────────────────────────────────
# docker mode  : Container name is set AND the container is running locally
# kubectl mode : Container is empty OR not found in docker ps
$useDocker = $false
$monitorLabel = ''
if ($Container) {
    $running = docker ps --format '{{.Names}}' 2>$null | Where-Object { $_ -eq $Container }
    if ($running) { $useDocker = $true }
}

if ($useDocker) {
    $monitorLabel = "docker: $Container"
} else {
    $monitorLabel = "kubectl: $PodFilter pods in $Namespace"
    if (-not $Container) {
        Write-Host "  [auto] Container not specified -> using kubectl top pod" -ForegroundColor DarkYellow
    } else {
        Write-Host "  [auto] Container '$Container' not found locally -> using kubectl top pod" -ForegroundColor DarkYellow
    }
}

Write-Host ''
Write-Host '=== Voyix POS -- Load Test + CPU Monitor ===' -ForegroundColor Cyan
Write-Host "  Stage     : $Stage"          -ForegroundColor White
Write-Host "  Target    : $CartUrl"        -ForegroundColor White
Write-Host "  Monitor   : $monitorLabel"   -ForegroundColor White
Write-Host ''

# ── 1. Start CPU/memory sampler in a background job ───────────────────────────
# Writes one CSV row every 2 seconds: elapsed_sec,cpu_pct,mem_pct
$csvPath = Join-Path $root 'reports\k6-cpu-samples.csv'
Remove-Item $csvPath -ErrorAction SilentlyContinue

if ($useDocker) {
    # ── Local: docker stats ──────────────────────────────────────────────────
    $samplerJob = Start-Job -ScriptBlock {
        param($container, $csvPath)
        $start = [datetime]::UtcNow
        while ($true) {
            try {
                $raw = docker stats $container --no-stream --format '{{.CPUPerc}}|{{.MemPerc}}' 2>$null
                if ($raw -and $raw -notmatch 'error') {
                    $elapsed = [math]::Round(([datetime]::UtcNow - $start).TotalSeconds, 1)
                    $parts   = $raw -split '\|'
                    $cpu     = [math]::Round([double]($parts[0] -replace '[^0-9\.]', ''), 2)
                    $memPct  = [math]::Round([double]($parts[1] -replace '[^0-9\.]', ''), 2)
                    "$elapsed,$cpu,$memPct" | Add-Content $csvPath -Encoding UTF8
                }
            } catch {}
            Start-Sleep -Seconds 2
        }
    } -ArgumentList $Container, $csvPath
    Write-Host "[monitor] docker stats: $Container (every 2s) ..." -ForegroundColor Yellow
} else {
    # ── Hardware: kubectl top pod ────────────────────────────────────────────
    # Sums CPU (millicores) and memory across all matching pods, converts to %
    # Assumes CX7 nodes have 4 cores (4000m). Adjust $nodeCores if needed.
    $samplerJob = Start-Job -ScriptBlock {
        param($namespace, $podFilter, $csvPath)
        $start     = [datetime]::UtcNow
        $nodeCores = 4   # CX7 has 4 CPU cores -> 4000m total
        while ($true) {
            try {
                $lines = kubectl top pod -n $namespace --no-headers 2>$null |
                         Where-Object { $_ -match $podFilter }
                if ($lines) {
                    $totalCpuM  = 0
                    $totalMemMi = 0
                    foreach ($line in $lines) {
                        $cols = $line -split '\s+' | Where-Object { $_ }
                        if ($cols.Count -ge 3) {
                            $totalCpuM  += [int]($cols[1] -replace 'm', '')
                            $totalMemMi += [int]($cols[2] -replace 'Mi', '')
                        }
                    }
                    $elapsed = [math]::Round(([datetime]::UtcNow - $start).TotalSeconds, 1)
                    $cpuPct  = [math]::Round($totalCpuM  / ($nodeCores * 1000) * 100, 2)
                    # Memory %: express as % of 1024Mi (1GiB) as a reasonable baseline
                    $memPct  = [math]::Round($totalMemMi / 1024 * 100, 2)
                    "$elapsed,$cpuPct,$memPct" | Add-Content $csvPath -Encoding UTF8
                }
            } catch {}
            Start-Sleep -Seconds 2
        }
    } -ArgumentList $Namespace, $PodFilter, $csvPath
    Write-Host "[monitor] kubectl top pod -n $Namespace (filter: $PodFilter, every 2s) ..." -ForegroundColor Yellow
}

# ── 2. Run k6 ─────────────────────────────────────────────────────────────────
$env:STAGE    = $Stage
$env:CART_URL = $CartUrl
& 'C:\Program Files\k6\k6.exe' run 'k6\load-test.js'
$k6Exit = $LASTEXITCODE

# ── 3. Stop sampler ───────────────────────────────────────────────────────────
Stop-Job   $samplerJob -ErrorAction SilentlyContinue
Remove-Job $samplerJob -ErrorAction SilentlyContinue
Write-Host '[monitor] Stopped. Building report...' -ForegroundColor Yellow

# ── 4. Read k6 summary ────────────────────────────────────────────────────────
$k6Json  = Get-Content 'reports\k6-summary.json' -Raw | ConvertFrom-Json
$m       = $k6Json.metrics
$p95scan = if ($m.pos_scan_latency_ms)     { [math]::Round($m.pos_scan_latency_ms.values.'p(95)', 1)     } else { 'n/a' }
$p95chk  = if ($m.pos_checkout_latency_ms) { [math]::Round($m.pos_checkout_latency_ms.values.'p(95)', 1) } else { 'n/a' }
$p95http = if ($m.http_req_duration)       { [math]::Round($m.http_req_duration.values.'p(95)', 1)       } else { 'n/a' }
$errRate = if ($m.pos_errors)              { [math]::Round($m.pos_errors.values.rate * 100, 2)           } else { 0 }
$txCount = if ($m.pos_transactions_total)  { $m.pos_transactions_total.values.count                      } else { 0 }
$totReqs = if ($m.http_reqs)               { $m.http_reqs.values.count                                   } else { 0 }
$chkPass = if ($m.checks)                  { $m.checks.values.passes                                     } else { 0 }
$chkFail = if ($m.checks)                  { $m.checks.values.fails                                      } else { 0 }
$durSec  = if ($k6Json.state)              { [math]::Round($k6Json.state.testRunDurationMs / 1000, 0)    } else { 0 }

# ── 5. Parse CPU/memory samples ───────────────────────────────────────────────
$cpuPoints = @()
$memPoints = @()
$peakCpu   = 0
$avgCpu    = 0
$peakMem   = 0

if (Test-Path $csvPath) {
    $rows = Get-Content $csvPath | Where-Object { $_ -match '^\d' } | ForEach-Object {
        $p = $_ -split ','
        if ($p.Count -ge 3) {
            [PSCustomObject]@{ t=[double]$p[0]; cpu=[double]$p[1]; mem=[double]$p[2] }
        }
    }
    foreach ($r in $rows) {
        $cpuPoints += [PSCustomObject]@{ t=$r.t; v=$r.cpu }
        $memPoints += [PSCustomObject]@{ t=$r.t; v=$r.mem }
        if ($r.cpu -gt $peakCpu) { $peakCpu = $r.cpu }
        if ($r.mem -gt $peakMem) { $peakMem = $r.mem }
    }
    if ($cpuPoints.Count -gt 0) {
        $avgCpu = [math]::Round(($cpuPoints | Measure-Object -Property v -Average).Average, 1)
    }
    $peakCpu = [math]::Round($peakCpu, 1)
    $peakMem = [math]::Round($peakMem, 1)
}

# ── 6. Build SVG line chart ───────────────────────────────────────────────────
function Build-SvgChart {
    param($cpuPts, $memPts, $durationSec)
    $W    = 740
    $H    = 150
    $tMax = [math]::Max([double]$durationSec, 1)

    function Get-SvgPath($pts) {
        if (-not $pts -or $pts.Count -lt 2) { return '' }
        $coords = $pts | ForEach-Object {
            $x = [math]::Round($_.t / $tMax * $W, 1)
            $y = [math]::Round($H - ($_.v / 100.0 * $H), 1)
            "$x $y"
        }
        'M ' + ($coords -join ' L ')
    }

    $cpuPath = Get-SvgPath $cpuPts
    $memPath = Get-SvgPath $memPts

    # Grid lines at 25 / 50 / 75 / 100 %
    $gridLines = @(25, 50, 75, 100) | ForEach-Object {
        $y = [math]::Round($H - ($_ / 100.0 * $H), 0)
        "<line x1='0' y1='$y' x2='$W' y2='$y' stroke='#e2e8f0' stroke-width='1'/>
         <text x='-6' y='$($y+4)' text-anchor='end' font-size='10' fill='#a0aec0'>$_%</text>"
    }

    # X-axis time labels (up to 7 ticks)
    $ticks = [math]::Min(7, [int]$tMax)
    $xLabels = 0..$ticks | ForEach-Object {
        $t = [math]::Round($tMax * $_ / $ticks, 0)
        $x = [math]::Round($W * $_ / $ticks, 1)
        "<text x='$x' y='$($H+16)' text-anchor='middle' font-size='10' fill='#a0aec0'>${t}s</text>"
    }

    $cpuLine = if ($cpuPath) { "<path d='$cpuPath' fill='none' stroke='#3182ce' stroke-width='2.5'/>" } else { '' }
    $memLine = if ($memPath) { "<path d='$memPath' fill='none' stroke='#38a169' stroke-width='2' stroke-dasharray='6,3'/>" } else { '' }

    @"
<svg viewBox="-45 -10 $($W+70) $($H+40)" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:220px;display:block">
  $($gridLines -join "`n  ")
  $($xLabels  -join "`n  ")
  $cpuLine
  $memLine
  <line x1="0" y1="0" x2="0" y2="$H" stroke="#cbd5e0" stroke-width="1"/>
  <line x1="0" y1="$H" x2="$W" y2="$H" stroke="#cbd5e0" stroke-width="1"/>
</svg>
"@
}

$svgChart = Build-SvgChart $cpuPoints $memPoints $durSec

# ── 7. Helpers for SLO table ──────────────────────────────────────────────────
function Pct($val, $limit) {
    if ($val -eq 'n/a') { return 0 }
    [math]::Min(100, [math]::Round([double]$val / [double]$limit * 100, 0))
}
function StatusBadge($ok) {
    if ($ok) { '<span class="pass">&#10003; PASS</span>' }
    else      { '<span class="fail">&#x2717; FAIL</span>' }
}
function SloBar($pct, $ok) {
    $color = if ($ok) { '#48bb78' } else { '#e53e3e' }
    "${pct}%<div class='slo-bar'><div class='slo-fill' style='width:${pct}%;background:${color}'></div></div>"
}

$scanOk  = ($p95scan -ne 'n/a') -and ([double]$p95scan -le 500)
$chkOk   = ($p95chk  -ne 'n/a') -and ([double]$p95chk  -le 4000)
$httpOk  = ($p95http -ne 'n/a') -and ([double]$p95http -le 500)
$errOk   = [double]$errRate -lt 1
$allPass = $scanOk -and $chkOk -and $httpOk -and $errOk

$headerBadge = if ($allPass) {
    '<div class="badge green">&#10003; All Thresholds Passed</div>'
} else {
    '<div class="badge red">&#x26A0; Some Thresholds Failed</div>'
}

$nowStr    = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss UTC')
$stageDesc = @{ smoke='1 VU, 1 minute'; load='ramp 3 to 10 VUs, 9 minutes'; stress='ramp to 50 VUs, 10 minutes'; soak='10 VUs, 60 minutes' }
$stageLbl  = if ($stageDesc[$Stage]) { $stageDesc[$Stage] } else { $Stage }

$cpuNote  = if ($peakCpu -lt 50) { 'Low — plenty of headroom' }
             elseif ($peakCpu -lt 80) { 'Moderate — acceptable' }
             else                     { 'High — monitor carefully' }
$cpuColor = if ($peakCpu -lt 50) { '#38a169' } elseif ($peakCpu -lt 80) { '#d69e2e' } else { '#e53e3e' }

$cpuSection = if ($cpuPoints.Count -gt 0) {
@"
  <div class="section">
    <h2>CPU &amp; Memory Usage During Test ($monitorLabel)</h2>
    <div class="cards" style="margin-bottom:20px">
      <div class="card">
        <div class="label">Peak CPU</div>
        <div class="value" style="color:$cpuColor">$peakCpu%</div>
        <div class="sub">$cpuNote</div>
      </div>
      <div class="card">
        <div class="label">Avg CPU</div>
        <div class="value" style="color:#3182ce">$avgCpu%</div>
        <div class="sub">during $durSec s test</div>
      </div>
      <div class="card">
        <div class="label">Peak Memory</div>
        <div class="value" style="color:#805ad5">$peakMem%</div>
        <div class="sub">of container limit</div>
      </div>
      <div class="card">
        <div class="label">Samples</div>
        <div class="value" style="font-size:22px;color:#718096">$($cpuPoints.Count)</div>
        <div class="sub">every 2 seconds</div>
      </div>
    </div>
    <div style="margin-bottom:10px;font-size:13px">
      <span style="color:#3182ce;margin-right:16px">&#9644;&#9644; CPU %</span>
      <span style="color:#38a169">- - - Memory %</span>
    </div>
    $svgChart
  </div>
"@
} else {
@"
  <div class="section">
    <h2>CPU &amp; Memory</h2>
    <p style="color:#718096;font-size:14px;padding:8px 0">
      No samples collected. Make sure <code>$Container</code> is running before starting the test.
    </p>
  </div>
"@
}

# ── 8. Assemble HTML ──────────────────────────────────────────────────────────
$html = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Voyix POS -- Load Test Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f6f9;color:#2d3748}
header{background:linear-gradient(135deg,#1a365d 0%,#2b6cb0 100%);color:white;padding:32px 40px}
header h1{font-size:26px;font-weight:700}
header p{margin-top:6px;opacity:.8;font-size:14px}
.badge{display:inline-block;border-radius:20px;padding:4px 14px;font-size:13px;font-weight:600;margin-top:12px}
.badge.green{background:#48bb78;color:white}
.badge.red{background:#e53e3e;color:white}
.content{max-width:980px;margin:0 auto;padding:28px 20px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-bottom:24px}
.card{background:white;border-radius:10px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.card .label{font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:.05em}
.card .value{font-size:28px;font-weight:700;margin-top:5px}
.card .sub{font-size:11px;color:#718096;margin-top:5px}
.section{background:white;border-radius:10px;padding:22px;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:20px}
h2{font-size:16px;font-weight:600;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;border-bottom:2px solid #e2e8f0}
td{padding:10px;border-bottom:1px solid #f0f0f0;font-size:14px}
tr:last-child td{border-bottom:none}
.pass{color:#38a169;font-weight:600}
.fail{color:#e53e3e;font-weight:600}
.slo-bar{height:7px;border-radius:3px;background:#e2e8f0;overflow:hidden;margin-top:5px}
.slo-fill{height:100%;border-radius:3px}
code{background:#f7fafc;padding:2px 5px;border-radius:3px;font-size:12px}
.cmd{background:#1a202c;color:#e2e8f0;border-radius:6px;padding:14px 18px;font-family:monospace;font-size:13px;line-height:1.9;margin-top:10px}
.cmd .comment{color:#68d391}
.footer{text-align:center;color:#a0aec0;font-size:12px;padding:24px}
</style>
</head>
<body>

<header>
  <h1>Voyix POS -- API Load Test Report</h1>
  <p>nvpos-cart backend &nbsp;&middot;&nbsp; Stage: <strong>$Stage</strong> ($stageLbl) &nbsp;&middot;&nbsp; $nowStr</p>
  $headerBadge
</header>

<div class="content">

  <!-- Summary cards -->
  <div class="cards">
    <div class="card">
      <div class="label">Transactions</div>
      <div class="value" style="color:#38a169">$txCount</div>
      <div class="sub">completed</div>
    </div>
    <div class="card">
      <div class="label">Error Rate</div>
      <div class="value" style="color:$(if ($errOk) { '#38a169' } else { '#e53e3e' })">$errRate%</div>
      <div class="sub">SLO: &lt;1%</div>
    </div>
    <div class="card">
      <div class="label">HTTP Requests</div>
      <div class="value" style="color:#3182ce">$totReqs</div>
      <div class="sub">total API calls</div>
    </div>
    <div class="card">
      <div class="label">Checks</div>
      <div class="value" style="color:$(if ($chkFail -eq 0) { '#38a169' } else { '#e53e3e' })">$chkPass</div>
      <div class="sub">$chkFail failed</div>
    </div>
    <div class="card">
      <div class="label">Duration</div>
      <div class="value" style="color:#805ad5;font-size:20px">${durSec}s</div>
      <div class="sub">$Stage profile</div>
    </div>
  </div>

  <!-- SLO table -->
  <div class="section">
    <h2>Response Time SLOs (p95)</h2>
    <table>
      <thead>
        <tr>
          <th>What</th>
          <th>Endpoint</th>
          <th>Measured p95</th>
          <th>SLO Limit</th>
          <th>Status</th>
          <th>Budget Used</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Item Scan</strong></td>
          <td><code>POST /v1/carts/{id}/items</code></td>
          <td><strong>$p95scan ms</strong></td>
          <td>500 ms</td>
          <td>$(StatusBadge $scanOk)</td>
          <td>$(SloBar (Pct $p95scan 500) $scanOk)</td>
        </tr>
        <tr>
          <td><strong>Checkout</strong></td>
          <td><code>POST /v1/carts/{id}/close</code></td>
          <td><strong>$p95chk ms</strong></td>
          <td>4000 ms</td>
          <td>$(StatusBadge $chkOk)</td>
          <td>$(SloBar (Pct $p95chk 4000) $chkOk)</td>
        </tr>
        <tr>
          <td><strong>HTTP Overall</strong></td>
          <td><code>All endpoints</code></td>
          <td><strong>$p95http ms</strong></td>
          <td>500 ms</td>
          <td>$(StatusBadge $httpOk)</td>
          <td>$(SloBar (Pct $p95http 500) $httpOk)</td>
        </tr>
        <tr>
          <td><strong>Error Rate</strong></td>
          <td><code>All endpoints</code></td>
          <td><strong>$errRate%</strong></td>
          <td>1%</td>
          <td>$(StatusBadge $errOk)</td>
          <td>$(SloBar (Pct $errRate 1) $errOk)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- CPU / Memory chart -->
  $cpuSection

  <!-- How to run -->
  <div class="section">
    <h2>How to Run</h2>
    <table>
      <thead><tr><th>Stage</th><th>VUs</th><th>Duration</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr style="background:#f0fff4"><td><strong>smoke</strong></td><td>1</td><td>1 min</td><td>Quick sanity check</td></tr>
        <tr><td><strong>load</strong></td><td>3 to 10</td><td>9 min</td><td>Realistic: 10 cashiers working simultaneously</td></tr>
        <tr><td><strong>stress</strong></td><td>up to 50</td><td>10 min</td><td>Find the breaking point</td></tr>
        <tr><td><strong>soak</strong></td><td>10</td><td>60 min</td><td>Detect memory leaks over time</td></tr>
      </tbody>
    </table>
    <div class="cmd">
      <span class="comment"># Local (Docker)</span><br>
      cd "C:\Resmex\specit with playwright\Voyix-POS"<br>
      .\k6\run-with-stats.ps1 -Stage load<br>
      <br>
      <span class="comment"># CX7 hardware via port-forward (auto-detects kubectl)</span><br>
      kubectl port-forward svc/nvpos-cart 8081:8081 -n nvpos-services<br>
      .\k6\run-with-stats.ps1 -Stage load -Container ""<br>
      <br>
      <span class="comment"># CX7 hardware direct (no port-forward needed)</span><br>
      .\k6\run-with-stats.ps1 -Stage load -CartUrl "http://192.168.1.11:30081" -Container ""<br>
      <br>
      <span class="comment"># Report auto-saved to: reports\k6-report.html</span>
    </div>
  </div>

</div>

<div class="footer">
  Voyix POS Performance Testing &mdash; nvpos-cart Go backend &mdash; $nowStr
</div>

</body>
</html>
"@

# ── 9. Write report ───────────────────────────────────────────────────────────
$reportPath = Join-Path $root 'reports\k6-report.html'
[System.IO.File]::WriteAllText($reportPath, $html, [System.Text.Encoding]::UTF8)

Write-Host ''
Write-Host "=== Report saved: reports\k6-report.html ===" -ForegroundColor Green
Write-Host "  Peak CPU : $peakCpu%   Avg CPU: $avgCpu%   Peak Mem: $peakMem%" -ForegroundColor White
Write-Host ''

Start-Process $reportPath
exit $k6Exit
