#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# k8s/deploy.sh
#
# Deploys the Voyix POS E2E test Job to a Kubernetes cluster.
# Namespace, app service name, and credentials are all configurable here —
# no need to edit the YAML files directly.
#
# Usage:
#   ./k8s/deploy.sh                        # use defaults
#   NS=my-ns APP_NS=nvpos-services ./k8s/deploy.sh
#
# ── Configuration ─────────────────────────────────────────────────────────────
#   NS          Namespace where the TEST JOB runs          (default: nvposs)
#   APP_NS      Namespace where nvpos-ui Service lives     (default: nvpos-services)
#   APP_SVC     K8s Service name for the POS app           (default: nvpos-ui)
#   APP_PORT    Port the Service listens on                (default: 80)
#   JOB_FILE    Which Job YAML to deploy                   (default: edge-job.yaml)
#   POS_USER    POS operator username                      (default: 0000)
#   POS_PASS    POS operator password                      (default: 0000)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

NS="${NS:-nvposs}"
APP_NS="${APP_NS:-nvpos-services}"
APP_SVC="${APP_SVC:-nvpos-ui}"
APP_PORT="${APP_PORT:-80}"
JOB_FILE="${JOB_FILE:-edge-job.yaml}"
POS_USER="${POS_USER:-0000}"
POS_PASS="${POS_PASS:-0000}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
YAML_TEMPLATE="${SCRIPT_DIR}/${JOB_FILE}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Voyix POS E2E — Deploying to Kubernetes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Job namespace : ${NS}"
echo "  App namespace : ${APP_NS}"
echo "  App URL       : http://${APP_SVC}.${APP_NS}.svc.cluster.local:${APP_PORT}/"
echo "  Job file      : ${JOB_FILE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Create namespace if it doesn't exist ───────────────────────────
kubectl get namespace "${NS}" > /dev/null 2>&1 || {
  echo "[deploy] Creating namespace: ${NS}"
  kubectl create namespace "${NS}"
}

# ── Step 2: Create credentials Secret if it doesn't exist ─────────────────
if kubectl get secret voyix-pos-credentials -n "${NS}" > /dev/null 2>&1; then
  echo "[deploy] Secret voyix-pos-credentials already exists — skipping"
else
  echo "[deploy] Creating Secret: voyix-pos-credentials"
  kubectl create secret generic voyix-pos-credentials \
    --from-literal=POS_USERNAME="${POS_USER}" \
    --from-literal=POS_PASSWORD="${POS_PASS}" \
    --namespace "${NS}"
fi

# ── Step 3: Delete any previous Job with the same name (K8s Jobs are immutable)
JOB_NAME=$(grep '^  name:' "${YAML_TEMPLATE}" | head -1 | awk '{print $2}')
if kubectl get job "${JOB_NAME}" -n "${NS}" > /dev/null 2>&1; then
  echo "[deploy] Deleting previous job: ${JOB_NAME}"
  kubectl delete job "${JOB_NAME}" -n "${NS}" --wait=false
fi

# ── Step 4: Substitute namespace + service name into YAML and apply ─────────
# envsubst replaces ${NS}, ${APP_NS}, ${APP_SVC}, ${APP_PORT} in a temp copy.
echo "[deploy] Applying ${JOB_FILE} with NS=${NS}, APP_NS=${APP_NS} ..."
export NS APP_NS APP_SVC APP_PORT
envsubst '${NS} ${APP_NS} ${APP_SVC} ${APP_PORT}' < "${YAML_TEMPLATE}" | kubectl apply -f -

# ── Step 5: Wait for the Job pod to start, then stream logs ─────────────────
echo "[deploy] Waiting for pod to start..."
kubectl wait --for=condition=ready pod \
  -l "app=voyix-pos-tests" \
  -n "${NS}" \
  --timeout=120s 2>/dev/null || true

echo "[deploy] Streaming logs (Ctrl+C to detach — Job continues running):"
echo ""
kubectl logs -f "job/${JOB_NAME}" -n "${NS}" || true

# ── Step 6: Print final Job status ─────────────────────────────────────────
echo ""
echo "[deploy] Final Job status:"
kubectl get job "${JOB_NAME}" -n "${NS}"
