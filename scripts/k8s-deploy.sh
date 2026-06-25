#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${IMAGE:-channel-connect:local}"
CLUSTER_TYPE="${CLUSTER_TYPE:-auto}"

cd "$ROOT"

echo "==> Building Docker image: $IMAGE"
docker build -t "$IMAGE" .

load_image() {
  if command -v kind >/dev/null 2>&1 && kind get clusters 2>/dev/null | grep -q .; then
    echo "==> Loading image into kind"
    kind load docker-image "$IMAGE" --name "$(kind get clusters | head -1)"
    return
  fi

  if command -v minikube >/dev/null 2>&1 && minikube status >/dev/null 2>&1; then
    echo "==> Loading image into minikube"
    minikube image load "$IMAGE"
    return
  fi

  echo "==> Using local image (Docker Desktop Kubernetes or image already present)"
}

if [ "$CLUSTER_TYPE" != "skip-load" ]; then
  load_image
fi

echo "==> Applying Kubernetes manifests"
kubectl apply -k k8s/

echo "==> Waiting for deployment"
kubectl rollout status deployment/channel-connect -n channel-connect --timeout=120s

echo ""
echo "Channel Connect is deployed."
echo ""
echo "Access:"
echo "  NodePort:  http://localhost:30080"
echo "  Port-forward: kubectl port-forward -n channel-connect svc/channel-connect 3000:80"
echo ""
echo "Demo logins (after seed):"
echo "  vendor@ionix.io / password123"
echo "  rep@guidepoint.com / password123"
