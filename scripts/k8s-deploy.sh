#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-channel-connect}"
IMAGE_TAG="${IMAGE_TAG:-local-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
NO_CACHE="${NO_CACHE:-}"
CLUSTER_TYPE="${CLUSTER_TYPE:-auto}"

cd "$ROOT"

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
  -n channel-connect

kubectl annotate deployment/channel-connect \
  -n channel-connect \
  channel-connect.io/deployed-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  channel-connect.io/image-tag="$IMAGE_TAG" \
  --overwrite

echo "==> Rolling out new pods"
kubectl rollout restart deployment/channel-connect -n channel-connect
kubectl rollout status deployment/channel-connect -n channel-connect --timeout=180s

echo ""
echo "Channel Connect is deployed."
echo "  Image: $FULL_IMAGE"
echo ""
echo "Access:"
echo "  NodePort:  http://localhost:30080"
echo "  Port-forward: kubectl port-forward -n channel-connect svc/channel-connect 3000:80"
echo ""
echo "Demo logins (after seed):"
echo "  vendor@ionix.io / password123"
echo "  rep@guidepoint.com / password123"
echo ""
echo "Tip: hard refresh the browser (Cmd+Shift+R) after deploy."
