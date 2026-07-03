#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KUSTOMIZE_DIR="$ROOT/k8s/overlays/gcp"

# Required
GCP_PROJECT_ID="${GCP_PROJECT_ID:-}"
GCP_REGION="${GCP_REGION:-us-central1}"

# Optional
GKE_CLUSTER="${GKE_CLUSTER:-channel-connect}"
ARTIFACT_REPO="${ARTIFACT_REPO:-channel-connect}"
IMAGE_NAME="${IMAGE_NAME:-app}"
NAMESPACE="${NAMESPACE:-channel-connect}"
CREATE_CLUSTER="${CREATE_CLUSTER:-}"
SEED_DATABASE="${SEED_DATABASE:-false}"
NO_CACHE="${NO_CACHE:-}"
SESSION_SECRET="${SESSION_SECRET:-}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
APP_DOMAIN="${APP_DOMAIN:-app.channel-connect.com}"
STATIC_IP_NAME="${STATIC_IP_NAME:-channel-connect-ip}"

# buildx --platform linux/amd64 with --provenance=false pushes a single-platform
# manifest (manifest.v2+json), not a multi-arch index. Only fail when an index
# exists and lists platforms other than linux/amd64.
image_is_gke_compatible() {
  local img="$1"
  local attempt output platforms
  for attempt in $(seq 1 10); do
    output="$(docker buildx imagetools inspect "$img" 2>/dev/null || true)"
    if [ -z "$output" ]; then
      [ "$attempt" -lt 10 ] && sleep 3
      continue
    fi

    platforms="$(printf '%s\n' "$output" | sed -n 's/^[[:space:]]*Platform:[[:space:]]*//p' | grep -v '^unknown/unknown$' || true)"
    if printf '%s\n' "$platforms" | grep -qx 'linux/amd64'; then
      return 0
    fi

    # Single-platform image (no Platform lines / no Manifests list)
    if printf '%s\n' "$output" | grep -qE 'manifest\.(v2\+json|v1\+json)|oci\.image\.manifest'; then
      if ! printf '%s\n' "$output" | grep -q '^Manifests:'; then
        return 0
      fi
    fi

    # Index present but only wrong platforms (e.g. arm64-only)
    if [ -n "$platforms" ]; then
      return 1
    fi

    [ "$attempt" -lt 10 ] && sleep 3
  done
  return 1
}

usage() {
  cat <<EOF
Build, push, and deploy Channel Connect to Google Kubernetes Engine (GKE).

Prerequisites:
  gcloud CLI (authenticated), Docker with buildx, kubectl

Required environment:
  GCP_PROJECT_ID    Google Cloud project ID

Optional environment:
  GCP_REGION        Region (default: us-central1)
  GKE_CLUSTER       GKE cluster name (default: channel-connect)
  ARTIFACT_REPO     Artifact Registry repo name (default: channel-connect)
  IMAGE_NAME        Image name inside the repo (default: app)
  DOCKER_PLATFORM   Image platform for GKE nodes (default: linux/amd64)
  APP_DOMAIN        Public hostname (default: app.channel-connect.com)
  STATIC_IP_NAME    Global static IP resource name (default: channel-connect-ip)
  SESSION_SECRET    Session signing secret (auto-generated if unset)
  SEED_DATABASE     Seed demo data on first boot: true|false (default: false)
  CREATE_CLUSTER=1  Create a GKE Autopilot cluster if it does not exist
  NO_CACHE=1        Docker build without cache

Examples:
  GCP_PROJECT_ID=my-project ./scripts/gcp-deploy.sh
  CREATE_CLUSTER=1 GCP_PROJECT_ID=my-project ./scripts/gcp-deploy.sh
  SEED_DATABASE=true SESSION_SECRET=\$(openssl rand -hex 32) GCP_PROJECT_ID=my-project ./scripts/gcp-deploy.sh
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ -z "$GCP_PROJECT_ID" ]; then
  echo "Error: GCP_PROJECT_ID is required." >&2
  usage >&2
  exit 1
fi

for cmd in gcloud docker kubectl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: $cmd is not installed." >&2
    exit 1
  fi
done

ARTIFACT_HOST="${GCP_REGION}-docker.pkg.dev"
FULL_IMAGE="${ARTIFACT_HOST}/${GCP_PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

cd "$ROOT"

echo "==> Configuring gcloud project: $GCP_PROJECT_ID"
gcloud config set project "$GCP_PROJECT_ID" >/dev/null

echo "==> Enabling required Google Cloud APIs"
gcloud services enable \
  artifactregistry.googleapis.com \
  container.googleapis.com \
  compute.googleapis.com \
  --project="$GCP_PROJECT_ID"

if ! gcloud compute addresses describe "$STATIC_IP_NAME" --global --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Reserving global static IP: $STATIC_IP_NAME"
  gcloud compute addresses create "$STATIC_IP_NAME" \
    --global \
    --project="$GCP_PROJECT_ID"
fi
INGRESS_IP="$(gcloud compute addresses describe "$STATIC_IP_NAME" --global --project="$GCP_PROJECT_ID" --format='get(address)')"
echo "==> Ingress IP for $APP_DOMAIN: $INGRESS_IP"

if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Creating Artifact Registry repository: $ARTIFACT_REPO"
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --description="Channel Connect container images" \
    --project="$GCP_PROJECT_ID"
fi

echo "==> Configuring Docker for Artifact Registry"
gcloud auth configure-docker "$ARTIFACT_HOST" --quiet

BUILDER_NAME="channel-connect-builder"
if ! docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
  echo "==> Creating buildx builder: $BUILDER_NAME"
  docker buildx create --name "$BUILDER_NAME" --driver docker-container --use
else
  docker buildx use "$BUILDER_NAME"
fi
docker buildx inspect --bootstrap >/dev/null

BUILD_ARGS=(buildx build --platform "$DOCKER_PLATFORM" -t "$FULL_IMAGE" --push --provenance=false --sbom=false .)
if [ -n "$NO_CACHE" ]; then
  BUILD_ARGS+=(--no-cache)
fi

echo "==> Building and pushing image ($DOCKER_PLATFORM): $FULL_IMAGE"
docker "${BUILD_ARGS[@]}"

echo "==> Verifying image is pullable from Artifact Registry"
if ! image_is_gke_compatible "$FULL_IMAGE"; then
  echo "Error: $FULL_IMAGE is not GKE-compatible (need linux/amd64)." >&2
  echo "Re-run with: NO_CACHE=1 DOCKER_PLATFORM=linux/amd64 ./scripts/gcp-deploy.sh" >&2
  docker buildx imagetools inspect "$FULL_IMAGE" 2>/dev/null || true
  exit 1
fi
echo "==> Image is ready for GKE ($DOCKER_PLATFORM)"

PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
GKE_AGENT="serviceAccount:service-${PROJECT_NUMBER}@container-engine-robot.iam.gserviceaccount.com"
echo "==> Granting Artifact Registry read access to GKE service agent"
gcloud artifacts repositories add-iam-policy-binding "$ARTIFACT_REPO" \
  --location="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --member="$GKE_AGENT" \
  --role="roles/artifactregistry.reader" \
  --quiet >/dev/null 2>&1 || true

if [ -n "$CREATE_CLUSTER" ]; then
  if ! gcloud container clusters describe "$GKE_CLUSTER" \
    --region="$GCP_REGION" \
    --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
    echo "==> Creating GKE Autopilot cluster: $GKE_CLUSTER"
    gcloud container clusters create-auto "$GKE_CLUSTER" \
      --region="$GCP_REGION" \
      --project="$GCP_PROJECT_ID" \
      --release-channel=regular
  else
    echo "==> GKE cluster $GKE_CLUSTER already exists"
  fi
fi

echo "==> Fetching kubectl credentials for $GKE_CLUSTER"
gcloud container clusters get-credentials "$GKE_CLUSTER" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"

if [ -z "$SESSION_SECRET" ]; then
  SESSION_SECRET="$(openssl rand -hex 32)"
  echo "==> Generated SESSION_SECRET (store this for future deploys)"
fi

echo "==> Applying Kubernetes manifests (GCP overlay) with image $FULL_IMAGE"
kubectl kustomize "$KUSTOMIZE_DIR" \
  | sed "s|image: channel-connect:[^ \"']*|image: ${FULL_IMAGE}|g" \
  | kubectl apply -f -

echo "==> Updating session secret"
kubectl create secret generic channel-connect-secrets \
  --namespace="$NAMESPACE" \
  --from-literal=SESSION_SECRET="$SESSION_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

if [ "$SEED_DATABASE" = "true" ]; then
  echo "==> Enabling demo seed on first boot"
  kubectl patch configmap channel-connect-config -n "$NAMESPACE" \
    --type merge -p '{"data":{"SEED_DATABASE":"true"}}'
fi

kubectl annotate deployment/channel-connect \
  -n "$NAMESPACE" \
  channel-connect.io/deployed-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  channel-connect.io/image-tag="$IMAGE_TAG" \
  --overwrite

echo "==> Waiting for rollout"
if ! kubectl rollout status deployment/channel-connect -n "$NAMESPACE" --timeout=600s; then
  echo "==> Rollout failed — pod status:" >&2
  kubectl get pods -n "$NAMESPACE" -l app=channel-connect -o wide >&2 || true
  kubectl describe pods -n "$NAMESPACE" -l app=channel-connect 2>&1 | tail -50 >&2 || true
  kubectl logs -n "$NAMESPACE" -l app=channel-connect --tail=80 --all-containers=true 2>&1 | tail -80 >&2 || true
  exit 1
fi

echo "==> Waiting for Ingress external IP"
for _ in $(seq 1 30); do
  INGRESS_STATUS_IP="$(kubectl get ingress channel-connect -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
  if [ -n "$INGRESS_STATUS_IP" ]; then
    INGRESS_IP="$INGRESS_STATUS_IP"
    break
  fi
  sleep 10
done

CERT_STATUS="$(kubectl get managedcertificate channel-connect-cert -n "$NAMESPACE" -o jsonpath='{.status.certificateStatus}' 2>/dev/null || echo "Unknown")"

echo ""
echo "Channel Connect deployed to GKE."
echo "  Project:  $GCP_PROJECT_ID"
echo "  Cluster:  $GKE_CLUSTER ($GCP_REGION)"
echo "  Image:    $FULL_IMAGE"
echo "  Domain:   https://$APP_DOMAIN"
echo "  Ingress:  $INGRESS_IP"
echo "  Cert:     $CERT_STATUS (Active once DNS propagates)"
echo ""
echo "DNS records (at your domain registrar or Cloud DNS):"
echo "  A    $APP_DOMAIN    -> $INGRESS_IP"
echo ""
echo "HTTPS provisioning usually takes 15-60 minutes after DNS is correct."
echo "Check cert: kubectl describe managedcertificate channel-connect-cert -n $NAMESPACE"
echo ""
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Demo logins (seeded on first pod start):"
  echo "  vendor@ionix.io / password123"
  echo "  admin@guidepoint.com / password123"
  echo "  rep@guidepoint.com / password123"
else
  echo "SEED_DATABASE=false — register users at /register or redeploy with SEED_DATABASE=true"
fi
echo ""
echo "Teardown:  ./scripts/gcp-cleanup.sh"
echo "Redeploy:  GCP_PROJECT_ID=$GCP_PROJECT_ID ./scripts/gcp-deploy.sh"
