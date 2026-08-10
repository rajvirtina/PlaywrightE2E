# ─────────────────────────────────────────────────────────────────────────────
# Makefile  —  Voyix POS E2E Test shortcuts
#
# Works on Linux/macOS/WSL. On Windows use:  make <target>  in Git Bash/WSL,
# or run the docker / kubectl commands directly from the docs below each target.
# ─────────────────────────────────────────────────────────────────────────────

IMAGE   ?= voyix-pos-tests:latest
REGISTRY ?= us-east1-docker.pkg.dev/ret-edge-pltf-infra/workloads
TAGS    ?= # e.g. @smoke or @NVPOS-42

# Auto-read EDGE_APP_URL / POS_USERNAME / POS_PASSWORD from .env.edge if present
-include .env.edge

.PHONY: help build push \
        test-local test-edge test-local-tag test-edge-tag \
        k8s-apply-edge k8s-logs-edge k8s-delete-edge \
        clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── Image ─────────────────────────────────────────────────────────────────────

build: ## Build the Docker image
	docker build -t $(IMAGE) .

push: build ## Build and push to registry (set REGISTRY=your-registry)
	@test -n "$(REGISTRY)" || (echo "ERROR: Set REGISTRY=your-registry.io/your-repo"; exit 1)
	docker tag $(IMAGE) $(REGISTRY)/$(IMAGE)
	docker push $(REGISTRY)/$(IMAGE)

# ── Local (Windows dev machine, POS app on host) ──────────────────────────────

test-local: build ## Run all tests against local POS app (host.docker.internal:5173)
	docker compose --profile local up --build --abort-on-container-exit --exit-code-from e2e-local

test-local-tag: build ## Run tagged tests locally: make test-local-tag TAGS="@smoke"
	@test -n "$(TAGS)" || (echo "ERROR: Set TAGS, e.g.  make test-local-tag TAGS='@smoke'"; exit 1)
	docker compose --profile local run --rm e2e-local \
	  npm run test:e2e -- --tags "$(TAGS)"

# ── Edge (remote hardware / Linux edge server) ────────────────────────────────

test-edge: build ## Run all tests against edge server: make test-edge EDGE_APP_URL=http://192.168.1.100:5173
	@test -n "$(EDGE_APP_URL)" || (echo "ERROR: Set EDGE_APP_URL=http://<device-ip>:5173"; exit 1)
	docker compose --env-file .env.edge --profile edge up --build --abort-on-container-exit --exit-code-from e2e-edge

test-edge-tag: build ## Run tagged tests on edge: make test-edge-tag TAGS="@NVPOS-42" EDGE_APP_URL=http://...
	@test -n "$(EDGE_APP_URL)" || (echo "ERROR: Set EDGE_APP_URL=http://<device-ip>:5173"; exit 1)
	@test -n "$(TAGS)"         || (echo "ERROR: Set TAGS, e.g.  make test-edge-tag TAGS='@NVPOS-42'"; exit 1)
	docker compose --env-file .env.edge --profile edge run --rm e2e-edge \
	  npm run test:e2e -- --tags "$(TAGS)"

# ── Kubernetes (edge cluster) ─────────────────────────────────────────────────

k8s-apply-edge: ## Deploy the K8s Job to the edge cluster
	kubectl apply -f k8s/edge-job.yaml

k8s-logs-edge: ## Stream logs from the running edge Job
	kubectl logs -f job/voyix-pos-e2e-edge

k8s-delete-edge: ## Delete the edge Job (clean up)
	kubectl delete job voyix-pos-e2e-edge --ignore-not-found

# ── Utility ───────────────────────────────────────────────────────────────────

clean: ## Remove stopped test containers and dangling images
	docker compose down --remove-orphans
	docker image prune -f
