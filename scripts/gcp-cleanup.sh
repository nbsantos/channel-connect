#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KUSTOMIZE_DIR="$ROOT/k8s/overlays/gcp"

GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
GCP_REGION="${GCP_REGION:-us-central1}"
GKE_CLUSTER="${GKE_CLUSTER:-channel-connect}"
NAMESPACE="${NAMESPACE:-channel-connect}"
WORKLOAD_ONLY="${WORKLOAD_ONLY:-}"
DELETE_CLUSTER="${DELETE_CLUSTER:-}"
DELETE_REGISTRY="${DELETE_REGISTRY:-}"
ARTIFACT_REPO="${ARTIFACT_REPO:-channel-connect}"

usage() {
  cat <<EOF
Remove Channel Connect from Google Kubernetes Engine.

Usage:
  GCP_PROJECT_ID=my-project ./scripts/gcp-cleanup.sh
  WORKLOAD_ONLY=1 GCP_PROJECT_ID=my-project ./scripts/gcp-cleanup.sh
  DELETE_CLUSTER=1 GCP_PROJECT_ID=my-project ./scripts/gcp-cleanup.sh

Environment:
  GCP_PROJECT_ID   Google Cloud project ID (required for cluster/registry cleanup)
  GCP_REGION       Region (default: us-central1)
  GKE_CLUSTER      Cluster name (default: channel-connect)
  WORKLOAD_ONLY    Delete deployment + service only; keep PVC and config
  DELETE_CLUSTER   Also delete the GKE Autopilot cluster
  DELETE_REGISTRY  Also delete the Artifact Registry repository
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

cd "$ROOT"

if [ -n "$WORKLOAD_ONLY" ]; then
  echo "==> Removing workload only"
  kubectl delete deployment/channel-connect -n "$NAMESPACE" --ignore-not-found --wait=true
  kubectl delete service/channel-connect -n "$NAMESPACE" --ignore-not-found --wait=true
else
  echo "==> Removing all Channel Connect Kubernetes resources"
  kubectl delete -k "$KUSTOMIZE_DIR" --ignore-not-found --wait=true
fi

if [ -n "$DELETE_CLUSTER" ]; then
  if [ -z "$GCP_PROJECT_ID" ]; then
    echo "Error: GCP_PROJECT_ID required for DELETE_CLUSTER" >&2
    exit 1
  fi
  echo "==> Deleting GKE cluster $GKE_CLUSTER"
  gcloud container clusters delete "$GKE_CLUSTER" \
    --region="$GCP_REGION" \
    --project="$GCP_PROJECT_ID" \
    --quiet
fi

if [ -n "$DELETE_REGISTRY" ]; then
  if [ -z "$GCP_PROJECT_ID" ]; then
    echo "Error: GCP_PROJECT_ID required for DELETE_REGISTRY" >&2
    exit 1
  fi
  echo "==> Deleting Artifact Registry repository $ARTIFACT_REPO"
  gcloud artifacts repositories delete "$ARTIFACT_REPO" \
    --location="$GCP_REGION" \
    --project="$GCP_PROJECT_ID" \
    --quiet
fi

echo ""
echo "GCP cleanup complete."
