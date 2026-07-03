#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAMESPACE="${NAMESPACE:-channel-connect}"
PVC_NAME="${PVC_NAME:-channel-connect-data}"
WORKLOAD_ONLY="${WORKLOAD_ONLY:-}"
DELETE_IMAGES="${DELETE_IMAGES:-}"
IMAGE_NAME="${IMAGE_NAME:-channel-connect}"

usage() {
  cat <<EOF
Tear down Channel Connect from a local Kubernetes cluster.

Usage:
  ./scripts/k8s-cleanup.sh              Remove all manifests (deployment, service, PVC, config, namespace)
  WORKLOAD_ONLY=1 ./scripts/k8s-cleanup.sh   Stop the app only; keep namespace, PVC, and config
  DELETE_IMAGES=1 ./scripts/k8s-cleanup.sh Also remove local Docker images tagged $IMAGE_NAME

Environment:
  NAMESPACE       Kubernetes namespace (default: channel-connect)
  WORKLOAD_ONLY   If set, delete deployment + service only
  DELETE_IMAGES   If set, remove local $IMAGE_NAME:* Docker images after cleanup
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

cd "$ROOT"

if [ -n "$WORKLOAD_ONLY" ]; then
  echo "==> Removing workload only (keeping namespace, PVC, and config)"
  kubectl delete deployment/channel-connect -n "$NAMESPACE" --ignore-not-found --wait=true
  kubectl delete service/channel-connect -n "$NAMESPACE" --ignore-not-found --wait=true
else
  echo "==> Removing all Channel Connect Kubernetes resources"
  kubectl delete -k k8s/overlays/local/ --ignore-not-found --wait=true
fi

if [ -n "$DELETE_IMAGES" ]; then
  echo "==> Removing local Docker images: $IMAGE_NAME"
  docker images "$IMAGE_NAME" --format '{{.Repository}}:{{.Tag}}' | while read -r img; do
    [ -n "$img" ] && docker rmi "$img" 2>/dev/null || true
  done
fi

echo ""
echo "Channel Connect Kubernetes cleanup complete."
if [ -n "$WORKLOAD_ONLY" ]; then
  echo "  Namespace $NAMESPACE and PVC $PVC_NAME were left in place."
  echo "  Redeploy: ./scripts/k8s-deploy.sh"
else
  echo "  Redeploy: ./scripts/k8s-deploy.sh"
fi
