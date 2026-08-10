# ─────────────────────────────────────────────────────────────────────────────
# Voyix POS – E2E Test Automation Image
#
# Base image: mcr.microsoft.com/playwright:v1.61.1-noble
#   ✓  Ubuntu 24.04 LTS (Noble)
#   ✓  Node.js 20 pre-installed
#   ✓  Chromium, Firefox, WebKit browsers pre-installed with all OS deps
#
# Build:
#   docker build -t voyix-pos-tests:latest .
#
# Run (pass env vars inline):
#   docker run --rm \
#     -e APP_URL=http://pos-app:5173 \
#     -e POS_USERNAME=0000 \
#     -e POS_PASSWORD=0000 \
#     -v "$(pwd)/reports:/home/pwuser/app/reports" \
#     voyix-pos-tests:latest
#
# Run with a pre-built .env file (mount as secret/configmap in K8s):
#   docker run --rm \
#     -v /path/to/.env:/home/pwuser/app/.env:ro \
#     -v "$(pwd)/reports:/home/pwuser/app/reports" \
#     voyix-pos-tests:latest
#
# Run only tagged scenarios (e.g. a Jira ticket):
#   docker run --rm ... voyix-pos-tests:latest \
#     npm run test:e2e -- --tags "@NVPOS-42"
# ─────────────────────────────────────────────────────────────────────────────

FROM mcr.microsoft.com/playwright:v1.61.1-noble

# ── Environment ───────────────────────────────────────────────────────────────
# Skip browser download during npm install — browsers are in the base image
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Force headless in Linux (also set by world.ts via IS_LINUX, but explicit here)
ENV HEADLESS=true

# No artificial slow-down inside containers
ENV SLOW_MO=0

ENV ENVIRONMENT=kubernetes

# ── Directory setup ───────────────────────────────────────────────────────────
# pwuser is the non-root user created by the Playwright base image
RUN mkdir -p /home/pwuser/app && chown pwuser:pwuser /home/pwuser/app

WORKDIR /home/pwuser/app

# Use the non-root user for all subsequent build steps and at runtime
USER pwuser

# ── Install Node dependencies ─────────────────────────────────────────────────
# Copy manifests before source so Docker layer cache is reused on source-only changes
COPY --chown=pwuser:pwuser package.json package-lock.json ./

# --ignore-scripts prevents husky from failing (no .git in image)
RUN npm ci --ignore-scripts

# ── Copy project source ───────────────────────────────────────────────────────
COPY --chown=pwuser:pwuser . .

# ── Verify feature files and .env are present ────────────────────────────────
RUN ls -la acceptance/features/ && \
    grep -c "@smoke" acceptance/features/*.feature && \
    echo "Feature files verified ✓"

# ── Pre-create report output directories ─────────────────────────────────────
# Mount a PersistentVolumeClaim at /home/pwuser/app/reports in K8s to persist reports
RUN mkdir -p \
      reports/cucumber-json \
      reports/metrics \
      reports/rich-report/features

# ── Entrypoint ────────────────────────────────────────────────────────────────
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]

# Default command — override in K8s Job spec to pass --tags or other flags
CMD ["npm", "run", "test:e2e"]
