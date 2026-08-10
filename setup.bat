@echo off
setlocal enabledelayedexpansion

:: ─────────────────────────────────────────────────────────────────────────────
::  setup.bat  —  Voyix POS Test Automation Framework Setup
::  Installs all prerequisites and configures the environment for local testing.
::
::  Usage: setup.bat
:: ─────────────────────────────────────────────────────────────────────────────

title Voyix POS Test Automation - Setup

echo.
echo =========================================================
echo   Voyix POS Test Automation Framework  ^|  Setup Script
echo =========================================================
echo.

:: ─── 1. Check Node.js ────────────────────────────────────────────────────────
echo [1/6] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Node.js is not installed or not on PATH.
    echo  Required version: 20.19.0 or higher.
    echo.
    echo  Download from: https://nodejs.org/en/download
    echo  Choose the LTS version ^(v20 or later^).
    echo.
    pause
    exit /b 1
)

:: Check minimum version (major must be >= 20)
for /f "tokens=1 delims=." %%v in ('node -e "process.stdout.write(process.versions.node)"') do set NODE_MAJOR=%%v
if !NODE_MAJOR! LSS 20 (
    echo.
    echo  ERROR: Node.js version is too old.
    echo  Found:    v!NODE_MAJOR!.x
    echo  Required: v20.19.0 or higher
    echo.
    echo  Download the latest LTS from: https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)
for /f %%v in ('node -e "process.stdout.write(process.versions.node)"') do echo  OK  Node.js v%%v

:: ─── 2. Check npm ────────────────────────────────────────────────────────────
echo.
echo [2/6] Checking npm...
where npm >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: npm is not found. It should be bundled with Node.js.
    echo  Try reinstalling Node.js from https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)
for /f %%v in ('npm -v') do echo  OK  npm v%%v

:: ─── 3. Install Node.js dependencies ────────────────────────────────────────
echo.
echo [3/6] Installing npm packages (Playwright, Cucumber, TypeScript...)
echo  Running: npm install
echo.
npm install
if errorlevel 1 (
    echo.
    echo  ERROR: npm install failed. Check the output above.
    pause
    exit /b 1
)
echo.
echo  OK  npm packages installed.

:: ─── 4. Install Playwright browsers ─────────────────────────────────────────
echo.
echo [4/6] Installing Playwright browser (Chromium)...
echo  Running: npx playwright install chromium
echo.
npx playwright install chromium
if errorlevel 1 (
    echo.
    echo  WARNING: Playwright browser install may have had issues.
    echo  You can retry manually with: npx playwright install chromium
    echo.
) else (
    echo.
    echo  OK  Chromium browser installed.
)

:: ─── 5. Set up .env file ─────────────────────────────────────────────────────
echo.
echo [5/6] Configuring environment file...
if exist ".env" (
    echo  SKIP  .env already exists - not overwriting.
) else (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  OK  Created .env from .env.example
        echo.
        echo  NOTE: Open .env and review the settings before running tests:
        echo        APP_URL      - URL of the running Voyix POS app
        echo        POS_USERNAME - POS login username  ^(default: 0000^)
        echo        POS_PASSWORD - POS login password  ^(default: 0000^)
        echo        HEADLESS     - Set "true" to run without browser window
        echo        SLOW_MO      - Milliseconds to slow down actions ^(0-200^)
    ) else (
        echo  WARNING: .env.example not found - skipping .env creation.
        echo           Create a .env file manually before running tests.
    )
)

:: ─── 6. Create reports directory ─────────────────────────────────────────────
echo.
echo [6/6] Ensuring reports directories exist...
if not exist "reports"        mkdir reports
if not exist "reports\traces" mkdir reports\traces
echo  OK  reports\ and reports\traces\ ready.

:: ─── Summary ─────────────────────────────────────────────────────────────────
echo.
echo =========================================================
echo   Setup Complete!
echo =========================================================
echo.
echo  Useful commands:
echo.
echo    Run all tests:
echo      npm run test:e2e -- --tags "@nvpos"
echo.
echo    Run a specific scenario by tag:
echo      npm run test:e2e -- --tags "@TC-20010"
echo.
echo    Run hardware tests (uses .env.hardware):
echo      npm run test:hardware
echo.
echo    Generate HTML report:
echo      npm run report
echo.
echo  Before running tests, make sure:
echo    1. .env is configured  ^(edit APP_URL, POS_USERNAME, POS_PASSWORD^)
echo    2. The Voyix POS app is running at the URL in APP_URL
echo.
pause
endlocal
