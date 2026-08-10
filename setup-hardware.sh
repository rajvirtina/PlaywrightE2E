#!/bin/bash
# =============================================================================
# setup-hardware.sh — One-time setup script for CX7 (Linux) device
# Run this once after copying the project to the CX7 via MobaXterm SFTP
#
# Usage:
#   chmod +x setup-hardware.sh
#   ./setup-hardware.sh
# =============================================================================

set -e

echo ""
echo "======================================================"
echo " Voyix POS Automation — CX7 Hardware Setup"
echo "======================================================"
echo ""

# ── 1. Check Node.js ──────────────────────────────────────────────────────────
echo "[1/5] Checking Node.js version..."
NODE_VERSION=$(node --version 2>/dev/null || echo "none")
if [ "$NODE_VERSION" = "none" ]; then
  echo "     Node.js not found. Installing v20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
  sudo apt-get install -y nodejs
else
  echo "     Found: $NODE_VERSION"
  MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1 | tr -d 'v')
  if [ "$MAJOR" -lt 20 ]; then
    echo "     WARNING: Node.js v20+ required. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt-get install -y nodejs
  fi
fi

# ── 2. Install npm dependencies ───────────────────────────────────────────────
echo ""
echo "[2/5] Installing npm dependencies..."
npm install
echo "     Done."

# ── 3. Install Playwright browsers ────────────────────────────────────────────
echo ""
echo "[3/5] Installing Playwright browsers (Chromium + WebKit)..."
npx playwright install chromium webkit
echo "     Done."

# ── 4. Install Playwright system dependencies ─────────────────────────────────
echo ""
echo "[4/5] Installing Playwright system dependencies (Chromium + WebKit)..."
npx playwright install-deps chromium webkit
echo "     Done."

# ── 5. Verify .env.hardware ───────────────────────────────────────────────────
echo ""
echo "[5/5] Checking .env.hardware..."
if [ ! -f ".env.hardware" ]; then
  echo "     .env.hardware not found — creating from defaults..."
  cat > .env.hardware << 'EOF'
ENVIRONMENT=hardware
APP_URL=http://127.0.0.1:5173/
POS_USERNAME=0000
POS_PASSWORD=0000

# ── Browser mode ───────────────────────────────────────────────────────────────────
# chromium  ─ default, works with Electron (set CDP_URL below for Electron mode)
# webkit    ─ Playwright’s bundled WebKit, use for Tauri on Linux (no CDP needed)
BROWSER=chromium

# ── Electron / CDP mode (leave blank for WebKit or plain Chromium mode) ─────
# Set CDP_URL to connect Playwright directly to a running Electron app.
# Launch Electron with: --remote-debugging-port=9222
# CDP_URL=http://localhost:9222
EOF
fi
echo "     .env.hardware is ready."

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo " Setup complete! You can now run:"
echo ""
echo "   Electron mode (CDP):"
echo "     Set CDP_URL=http://localhost:9222 in .env.hardware"
echo "     npm run test:hardware              — run all tests"
echo ""
echo "   WebKit mode (Tauri / plain URL):"
echo "     Set BROWSER=webkit in .env.hardware"
echo "     npm run test:hardware              — run all tests"
echo ""
echo "   Tag filters (both modes):"
echo "     npm run test:hardware -- --tags \"@nvpos-e2e\"  — run by tag"
echo "     npm run test:hardware -- --tags \"@TC-20001\"   — run one test"
echo ""
echo " Reports saved to: reports/rich-report/index.html"
echo "======================================================"
echo ""
