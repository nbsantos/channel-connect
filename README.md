# Channel Connect

Vendor–reseller deal registration and partner discovery platform.

## Features

- **Auth & profiles** — Individual and company profiles (vendor/reseller typing)
- **Role-based homes** — Vendor and reseller dashboards
- **Deal registration** — Bidirectional vendor ↔ reseller flow with approve/decline
- **Protected account search** — One-at-a-time account lookup (no bulk export)
- **In-platform messaging** — Deal-thread messages and notifications
- **AI search layer** — Use-case search, vendor matching, rep matching
- **Partner portal** — Vendor content (videos, white papers, briefs)
- **Accounts to watch** — Track accounts and get activity notifications
- **Vendor billing** — $5,000/year vendor membership, $500/approved deal, monthly invoices, contract onboarding
- **Join flows** — Vendor admin, reseller admin, or individual user; domain auto-join; LinkedIn profile URL
- **Partnerships** — Signed vs unsigned vendor/reseller listings; admin approval flow
- **Team management** — Company admins can add team members
- **Reseller drill-down** — Click a reseller to search accounts and register deals

## Setup

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Vendor (Ionix) | vendor@ionix.io | password123 |
| Reseller admin (Guidepoint) | admin@guidepoint.com | password123 |
| Reseller rep (Guidepoint) | rep@guidepoint.com | password123 |

**Other flows:** Register at `/register` — individual users (work email + LinkedIn), or new vendor/reseller admins. Ionix and Guidepoint are pre-seeded as approved partners. New vendors complete `/vendor/onboarding` ($5k annual fee, then deal contract).

## Stack

- Next.js 15 (App Router)
- Prisma + SQLite
- Tailwind CSS
- Session-based auth (httpOnly cookies)

## Docker

Build and run locally:

```bash
docker build -t channel-connect:local .
docker run --rm -p 3000:3000 \
  -e SESSION_SECRET=dev-secret \
  -e SEED_DATABASE=true \
  -v channel-connect-data:/data \
  channel-connect:local
```

Open http://localhost:3000

## Kubernetes (local cluster)

Requires Docker, kubectl, and a local cluster (Docker Desktop Kubernetes, kind, or minikube).

```bash
# Rebuilds image, tags with git SHA, restarts pods (picks up UI/theme changes)
./scripts/k8s-deploy.sh

# Force a clean Docker build if styles still look stale
NO_CACHE=1 ./scripts/k8s-deploy.sh

# Wipe SQLite PVC and re-seed demo accounts (after schema/seed updates)
RESEED=1 ./scripts/k8s-deploy.sh

# Tear down the cluster deployment
./scripts/k8s-cleanup.sh

# Stop the app but keep SQLite data and config
WORKLOAD_ONLY=1 ./scripts/k8s-cleanup.sh
```

Or step by step:

```bash
docker build -t channel-connect:local .

# kind
kind load docker-image channel-connect:local

# minikube
minikube image load channel-connect:local

kubectl apply -k k8s/overlays/local/
kubectl set image deployment/channel-connect channel-connect=channel-connect:local -n channel-connect
kubectl rollout restart deployment/channel-connect -n channel-connect
kubectl rollout status deployment/channel-connect -n channel-connect
```

**Access**

| Method | URL |
|--------|-----|
| NodePort | http://localhost:30080 |
| Port-forward | `kubectl port-forward -n channel-connect svc/channel-connect 3000:80` → http://localhost:3000 |

**Notes**

- Manifests live under `k8s/base/` with overlays for `local` and `gcp`.
- SQLite data is stored on a PersistentVolumeClaim (`channel-connect-data`).
- Set `SEED_DATABASE=true` in `k8s/base/configmap.yaml` to seed demo data on first boot.
- Change `SESSION_SECRET` in `k8s/base/secret.yaml` before any real deployment.
- Re-seed demo data: `RESEED=1 ./scripts/k8s-deploy.sh` (deletes the PVC; seed runs on next pod start).
- Manual re-seed: `kubectl delete pvc channel-connect-data -n channel-connect` then redeploy.

## Google Cloud (GKE)

Production URL: **[https://app.channel-connect.com](https://app.channel-connect.com)**

Deploy to **GKE Autopilot** with:

- Container images in **Artifact Registry** (`linux/amd64` via Docker buildx)
- **HTTPS Ingress** on a global static IP (`channel-connect-ip`)
- Google-managed TLS certificate for **`app.channel-connect.com`**
- HTTP → HTTPS redirect

**Prerequisites:** [gcloud CLI](https://cloud.google.com/sdk/docs/install) (authenticated), Docker with buildx, kubectl, a GCP project with billing enabled, and DNS control for `channel-connect.com`.

### Deploy

Always use the deploy script (do not run `kubectl apply -k k8s/overlays/gcp/` alone — that leaves a placeholder image and causes `ErrImagePull`).

```bash
# Optional: copy and edit env defaults
cp .env.gcp.example .env.gcp

# First deploy (creates Autopilot cluster, Artifact Registry, static IP, Ingress, and app)
export GCP_PROJECT_ID=your-project-id
CREATE_CLUSTER=1 SEED_DATABASE=true ./scripts/gcp-deploy.sh

# Subsequent deploys (build, push, apply manifests with the real image URL, rollout)
GCP_PROJECT_ID=your-project-id ./scripts/gcp-deploy.sh

# Force a clean image rebuild
NO_CACHE=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-deploy.sh
```

Use a stable session secret across deploys:

```bash
SESSION_SECRET=$(openssl rand -hex 32) GCP_PROJECT_ID=your-project-id ./scripts/gcp-deploy.sh
```

The script prints the Ingress IP and DNS instructions when finished.

### DNS

Create an **A** record for the app hostname pointing at the Ingress IP:

| Type | Name | Value |
|------|------|-------|
| A | `app` (`app.channel-connect.com`) | Ingress IP (from deploy output) |

Look up the reserved IP anytime:

```bash
gcloud compute addresses describe channel-connect-ip --global --format='get(address)'
```

Confirm DNS:

```bash
dig app.channel-connect.com +short
```

Google provisions the managed certificate after DNS is correct (typically **15–60 minutes**). Check status:

```bash
kubectl get managedcertificate channel-connect-cert -n channel-connect
kubectl describe managedcertificate channel-connect-cert -n channel-connect
```

When `Certificate Status` is **Active**, open **https://app.channel-connect.com**.

**Do not open the bare Ingress IP in a browser.** The load balancer serves TLS for `app.channel-connect.com` only; `http://<IP>` often returns `ERR_EMPTY_RESPONSE`. Always use the hostname.

### Useful checks

```bash
kubectl get pods,svc,ingress -n channel-connect
kubectl get managedcertificate -n channel-connect
kubectl logs -n channel-connect -l app=channel-connect --tail=100
```

### Cleanup

```bash
# Remove app resources (Ingress, deployment, PVC, etc.)
GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh

# Stop the app only; keep PVC and config
WORKLOAD_ONLY=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh

# Also delete the GKE cluster and/or Artifact Registry repo
DELETE_CLUSTER=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh
DELETE_REGISTRY=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh
```

### GCP notes

| Topic | Detail |
|-------|--------|
| Cluster | GKE Autopilot (`CREATE_CLUSTER=1`), region `us-central1` by default |
| Image | `{region}-docker.pkg.dev/{project}/channel-connect/app:{git-sha}` |
| Platform | Built as `linux/amd64` (required for GKE; needed when building on Apple Silicon) |
| Hostname | `APP_DOMAIN` defaults to `app.channel-connect.com` |
| Ingress | Global static IP `channel-connect-ip` + managed cert + HTTPS redirect |
| Storage | SQLite on a 10Gi `standard-rwo` PVC (fine for demos; use Cloud SQL for production) |
| Rollouts | `strategy: Recreate` (single replica + ReadWriteOnce volume) |
| Seed | `SEED_DATABASE` defaults to `false` on GCP; set `true` for demo accounts |
| Manifests | `k8s/base/` + `k8s/overlays/gcp/` (Ingress, ManagedCertificate, FrontendConfig) |
