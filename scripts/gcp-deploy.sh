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
FORCE_SEED="${FORCE_SEED:-}"
NO_CACHE="${NO_CACHE:-}"
SESSION_SECRET="${SESSION_SECRET:-}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
APP_DOMAIN="${APP_DOMAIN:-app.channel-connect.com}"
STATIC_IP_NAME="${STATIC_IP_NAME:-channel-connect-ip}"

CLOUDSQL_INSTANCE="${CLOUDSQL_INSTANCE:-channel-connect-db}"
# Enterprise edition supports shared-core tiers (db-f1-micro). Enterprise Plus requires db-perf-optimized-N-*.
CLOUDSQL_EDITION="${CLOUDSQL_EDITION:-ENTERPRISE}"
CLOUDSQL_TIER="${CLOUDSQL_TIER:-db-f1-micro}"
DB_NAME="${DB_NAME:-channel_connect}"
DB_USER="${DB_USER:-channel_connect}"
DB_PASSWORD="${DB_PASSWORD:-}"
GSA_NAME="${GSA_NAME:-channel-connect-gsa}"

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

    if printf '%s\n' "$output" | grep -qE 'manifest\.(v2\+json|v1\+json)|oci\.image\.manifest'; then
      if ! printf '%s\n' "$output" | grep -q '^Manifests:'; then
        return 0
      fi
    fi

    if [ -n "$platforms" ]; then
      return 1
    fi

    [ "$attempt" -lt 10 ] && sleep 3
  done
  return 1
}

usage() {
  cat <<EOF
Build, push, and deploy Channel Connect to GKE with Cloud SQL (PostgreSQL).

Prerequisites:
  gcloud CLI (authenticated), Docker with buildx, kubectl

Required environment:
  GCP_PROJECT_ID    Google Cloud project ID

Optional environment:
  GCP_REGION          Region (default: us-central1)
  GKE_CLUSTER         GKE cluster name (default: channel-connect)
  CLOUDSQL_INSTANCE   Cloud SQL instance id (default: channel-connect-db)
  CLOUDSQL_EDITION    ENTERPRISE or ENTERPRISE_PLUS (default: ENTERPRISE)
  CLOUDSQL_TIER       Cloud SQL tier (default: db-f1-micro; use db-perf-optimized-N-* for ENTERPRISE_PLUS)
  DB_NAME             Database name (default: channel_connect)
  DB_USER             Database user (default: channel_connect)
  DB_PASSWORD         Database password (reused from secret or generated)
  APP_DOMAIN          Public hostname (default: app.channel-connect.com)
  SESSION_SECRET      Session signing secret (auto-generated if unset)
  SEED_DATABASE       Seed demo data if empty: true|false (default: false)
  FORCE_SEED=1        Reset and re-seed even when data exists
  CREATE_CLUSTER=1    Create a GKE Autopilot cluster if it does not exist
  NO_CACHE=1          Docker build without cache

Examples:
  GCP_PROJECT_ID=my-project ./scripts/gcp-deploy.sh
  CREATE_CLUSTER=1 SEED_DATABASE=true GCP_PROJECT_ID=my-project ./scripts/gcp-deploy.sh
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

for cmd in gcloud docker kubectl openssl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: $cmd is not installed." >&2
    exit 1
  fi
done

ARTIFACT_HOST="${GCP_REGION}-docker.pkg.dev"
FULL_IMAGE="${ARTIFACT_HOST}/${GCP_PROJECT_ID}/${ARTIFACT_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"
CLOUDSQL_CONNECTION_NAME="${GCP_PROJECT_ID}:${GCP_REGION}:${CLOUDSQL_INSTANCE}"
GSA_EMAIL="${GSA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

cd "$ROOT"

echo "==> Configuring gcloud project: $GCP_PROJECT_ID"
gcloud config set project "$GCP_PROJECT_ID" >/dev/null

echo "==> Enabling required Google Cloud APIs"
gcloud services enable \
  artifactregistry.googleapis.com \
  container.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  iam.googleapis.com \
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

# --- Cloud SQL (PostgreSQL) ---
if ! gcloud sql instances describe "$CLOUDSQL_INSTANCE" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Creating Cloud SQL PostgreSQL instance: $CLOUDSQL_INSTANCE (this can take several minutes)"
  gcloud sql instances create "$CLOUDSQL_INSTANCE" \
    --database-version=POSTGRES_16 \
    --edition="$CLOUDSQL_EDITION" \
    --tier="$CLOUDSQL_TIER" \
    --region="$GCP_REGION" \
    --storage-size=10 \
    --storage-auto-increase \
    --availability-type=zonal \
    --assign-ip \
    --project="$GCP_PROJECT_ID"
else
  echo "==> Cloud SQL instance $CLOUDSQL_INSTANCE already exists"
fi

if ! gcloud sql databases describe "$DB_NAME" --instance="$CLOUDSQL_INSTANCE" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Creating database $DB_NAME"
  gcloud sql databases create "$DB_NAME" \
    --instance="$CLOUDSQL_INSTANCE" \
    --project="$GCP_PROJECT_ID"
fi

# --- GKE cluster ---
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

# Reuse DB password from existing secret when possible
if [ -z "$DB_PASSWORD" ]; then
  DB_PASSWORD="$(kubectl get secret channel-connect-secrets -n "$NAMESPACE" -o jsonpath='{.data.DB_PASSWORD}' 2>/dev/null | base64 -d 2>/dev/null || true)"
fi
if [ -z "$DB_PASSWORD" ]; then
  DB_PASSWORD="$(openssl rand -hex 16)"
  echo "==> Generated DB_PASSWORD (stored in Kubernetes secret)"
fi

if gcloud sql users list --instance="$CLOUDSQL_INSTANCE" --project="$GCP_PROJECT_ID" --format='value(name)' | grep -qx "$DB_USER"; then
  echo "==> Updating password for database user $DB_USER"
  gcloud sql users set-password "$DB_USER" \
    --instance="$CLOUDSQL_INSTANCE" \
    --password="$DB_PASSWORD" \
    --project="$GCP_PROJECT_ID" \
    --quiet
else
  echo "==> Creating database user $DB_USER"
  gcloud sql users create "$DB_USER" \
    --instance="$CLOUDSQL_INSTANCE" \
    --password="$DB_PASSWORD" \
    --project="$GCP_PROJECT_ID"
fi

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}?schema=public"

# --- Workload Identity for Cloud SQL Auth Proxy ---
if ! gcloud iam service-accounts describe "$GSA_EMAIL" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Creating Google service account $GSA_NAME"
  gcloud iam service-accounts create "$GSA_NAME" \
    --display-name="Channel Connect Cloud SQL" \
    --project="$GCP_PROJECT_ID"
fi

echo "==> Granting Cloud SQL client role to $GSA_EMAIL"
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${GSA_EMAIL}" \
  --role="roles/cloudsql.client" \
  --condition=None \
  --quiet >/dev/null

echo "==> Binding Workload Identity for Kubernetes service account"
gcloud iam service-accounts add-iam-policy-binding "$GSA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${GCP_PROJECT_ID}.svc.id.goog[${NAMESPACE}/channel-connect]" \
  --project="$GCP_PROJECT_ID" \
  --quiet >/dev/null

if [ -z "$SESSION_SECRET" ]; then
  SESSION_SECRET="$(kubectl get secret channel-connect-secrets -n "$NAMESPACE" -o jsonpath='{.data.SESSION_SECRET}' 2>/dev/null | base64 -d 2>/dev/null || true)"
fi
if [ -z "$SESSION_SECRET" ]; then
  SESSION_SECRET="$(openssl rand -hex 32)"
  echo "==> Generated SESSION_SECRET (store this for future deploys)"
fi

echo "==> Applying Kubernetes manifests (GCP overlay) with image $FULL_IMAGE"
kubectl kustomize "$KUSTOMIZE_DIR" \
  | sed "s|image: channel-connect:[^ \"']*|image: ${FULL_IMAGE}|g" \
  | sed "s|CLOUDSQL_CONNECTION_NAME|${CLOUDSQL_CONNECTION_NAME}|g" \
  | kubectl apply -f -

echo "==> Annotating Kubernetes service account for Workload Identity"
kubectl annotate serviceaccount channel-connect \
  -n "$NAMESPACE" \
  "iam.gke.io/gcp-service-account=${GSA_EMAIL}" \
  --overwrite

echo "==> Updating application secrets"
kubectl create secret generic channel-connect-secrets \
  --namespace="$NAMESPACE" \
  --from-literal=SESSION_SECRET="$SESSION_SECRET" \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

if [ "$SEED_DATABASE" = "true" ]; then
  echo "==> Enabling demo seed when database is empty"
  kubectl patch configmap channel-connect-config -n "$NAMESPACE" \
    --type merge -p '{"data":{"SEED_DATABASE":"true"}}'
fi

if [ -n "$FORCE_SEED" ]; then
  echo "==> FORCE_SEED=1: pods will reset demo data on next start"
  kubectl set env deployment/channel-connect -n "$NAMESPACE" FORCE_SEED=true
else
  kubectl set env deployment/channel-connect -n "$NAMESPACE" FORCE_SEED-
fi

kubectl annotate deployment/channel-connect \
  -n "$NAMESPACE" \
  channel-connect.io/deployed-at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  channel-connect.io/image-tag="$IMAGE_TAG" \
  channel-connect.io/cloudsql="${CLOUDSQL_CONNECTION_NAME}" \
  --overwrite

echo "==> Restarting deployment to pick up secrets and proxy config"
kubectl rollout restart deployment/channel-connect -n "$NAMESPACE"

echo "==> Waiting for rollout"
if ! kubectl rollout status deployment/channel-connect -n "$NAMESPACE" --timeout=600s; then
  echo "==> Rollout failed — pod status:" >&2
  kubectl get pods -n "$NAMESPACE" -l app=channel-connect -o wide >&2 || true
  kubectl describe pods -n "$NAMESPACE" -l app=channel-connect 2>&1 | tail -60 >&2 || true
  kubectl logs -n "$NAMESPACE" -l app=channel-connect -c channel-connect --tail=80 2>&1 | tail -80 >&2 || true
  kubectl logs -n "$NAMESPACE" -l app=channel-connect -c cloud-sql-proxy --tail=40 2>&1 | tail -40 >&2 || true
  exit 1
fi

# Clear one-shot FORCE_SEED so later restarts do not wipe data
if [ -n "$FORCE_SEED" ]; then
  kubectl set env deployment/channel-connect -n "$NAMESPACE" FORCE_SEED-
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
echo "Channel Connect deployed to GKE + Cloud SQL."
echo "  Project:   $GCP_PROJECT_ID"
echo "  Cluster:   $GKE_CLUSTER ($GCP_REGION)"
echo "  Image:     $FULL_IMAGE"
echo "  Cloud SQL: $CLOUDSQL_CONNECTION_NAME"
echo "  Database:  $DB_NAME (user: $DB_USER)"
echo "  Domain:    https://$APP_DOMAIN"
echo "  Ingress:   $INGRESS_IP"
echo "  Cert:      $CERT_STATUS (Active once DNS propagates)"
echo ""
echo "DNS records (at your domain registrar or Cloud DNS):"
echo "  A    $APP_DOMAIN    -> $INGRESS_IP"
echo ""
echo "HTTPS provisioning usually takes 15-60 minutes after DNS is correct."
echo "Check cert: kubectl describe managedcertificate channel-connect-cert -n $NAMESPACE"
echo ""
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Demo logins (seeded when the database is empty):"
  echo "  vendor@ionix.io / password123"
  echo "  admin@guidepoint.com / password123"
  echo "  rep@guidepoint.com / password123"
else
  echo "SEED_DATABASE=false — register users at /register or redeploy with SEED_DATABASE=true"
fi
echo ""
echo "Teardown:  ./scripts/gcp-cleanup.sh"
echo "Redeploy:  GCP_PROJECT_ID=$GCP_PROJECT_ID ./scripts/gcp-deploy.sh"
