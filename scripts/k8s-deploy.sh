#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-channel-connect}"
IMAGE_TAG="${IMAGE_TAG:-local-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
NO_CACHE="${NO_CACHE:-}"
RESEED="${RESEED:-}"
CLUSTER_TYPE="${CLUSTER_TYPE:-auto}"
NAMESPACE="${NAMESPACE:-channel-connect}"
PVC_NAME="${PVC_NAME:-channel-connect-data}"

cd "$ROOT"

if [ -n "$RESEED" ]; then
  echo "==> RESEED=1: removing PVC $PVC_NAME (fresh demo data on next pod start)"
  kubectl delete pvc "$PVC_NAME" -n "$NAMESPACE" --ignore-not-found
fi

BUILD_FLAGS=()
if [ -n "$NO_CACHE" ]; then
  BUILD_FLAGS+=(--no-cache)
  echo "==> Building Docker image (no cache): $FULL_IMAGE"
else
  echo "==> Building Docker image: $FULL_IMAGE"
fi

if [ "${#BUILD_FLAGS[@]}" -gt 0 ]; then
  docker build "${BUILD_FLAGS[@]}" -t "$FULL_IMAGE" -t "${IMAGE_NAME}:local" .
else
  docker build -t "$FULL_IMAGE" -t "${IMAGE_NAME}:local" .
fi

load_image() {
  local img="$1"
  if command -v kind >/dev/null 2>&1 && kind get clusters 2>/dev/null | grep -q .; then
    echo "==> Loading $img into kind"
    kind load docker-image "$img" --name "$(kind get clusters | head -1)"
    return
  fi

  if command -v minikube >/dev/null 2>&1 && minikube status >/dev/null 2>&1; then
    echo "==> Loading $img into minikube"
    minikube image load "$img"
    return
  fi

  echo "==> Using local image (Docker Desktop Kubernetes shares the local daemon)"
}

if [ "$CLUSTER_TYPE" != "skip-load" ]; then
  load_image "$FULL_IMAGE"
  load_image "${IMAGE_NAME}:local"
fi

echo "==> Applying Kubernetes manifests"
kubectl apply -k k8s/

echo "==> Updating deployment to image $FULL_IMAGE"
kubectl set image deployment/channel-connect \
  channel-connect="$FULL_IMAGE" \
  -n "$NAMESPACE"

kubectl annotate deployment/channel-connect \
  -n "$NAMESPACE" \
  channel-connect.io/deployed-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  channel-connect.io/image-tag="$IMAGE_TAG" \
  --overwrite

echo "==> Rolling out new pods"
kubectl rollout restart deployment/channel-connect -n "$NAMESPACE"
kubectl rollout status deployment/channel-connect -n "$NAMESPACE" --timeout=180s

echo ""
echo "Channel Connect is deployed."
echo "  Image: $FULL_IMAGE"
echo ""
echo "Access:"
echo "  NodePort:       http://localhost:30080"
echo "  Port-forward:   kubectl port-forward -n $NAMESPACE svc/channel-connect 3000:80"
echo "                  → http://localhost:3000"
echo ""
echo "Demo logins (seeded on first boot when SEED_DATABASE=true in k8s/configmap.yaml):"
echo "  Vendor admin (Ionix)          vendor@ionix.io / password123"
echo "  Reseller admin (Guidepoint)   admin@guidepoint.com / password123"
echo "  Reseller rep (Guidepoint)     rep@guidepoint.com / password123"
echo ""
echo "Seeded state includes Ionix annual fee + contract signed; Ionix ↔ Guidepoint approved partner."
echo ""
echo "Try other flows at /register:"
echo "  Individual user  — work email + LinkedIn URL; auto-joins company when domain matches"
echo "  Vendor admin     — security-space vendors; then /vendor/onboarding (\$5k/year + \$500/deal contract)"
echo "  Reseller admin   — free; LinkedIn-verified company setup"
echo ""
echo "Tips:"
echo "  Hard refresh the browser after deploy (Cmd+Shift+R)."
echo "  Fresh demo data after seed/schema changes:  RESEED=1 ./scripts/k8s-deploy.sh"
echo "  Force clean Docker build:                   NO_CACHE=1 ./scripts/k8s-deploy.sh"
