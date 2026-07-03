# Channel Connect

Vendor–reseller deal registration and partner discovery platform.

**Production:** [https://app.channel-connect.com](https://app.channel-connect.com)

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

## Stack

- Next.js 15 (App Router)
- Prisma + **PostgreSQL** (local Docker Compose, in-cluster Postgres, or **Cloud SQL** on GCP)
- Tailwind CSS
- Session-based auth (httpOnly cookies)

## Prerequisites

| Environment | Tools |
|-------------|--------|
| Local app | Node.js 20+, npm, Docker (for Postgres) |
| Local Kubernetes | Docker, kubectl, kind / minikube / Docker Desktop Kubernetes |
| GCP | [gcloud CLI](https://cloud.google.com/sdk/docs/install) (authenticated), Docker with **buildx**, kubectl, GCP project with billing, DNS for `channel-connect.com` |

## Quick reference

```bash
# Local app
cp .env.example .env && npm install && npm run db:up && npm run db:setup && npm run dev

# Local Kubernetes
./scripts/k8s-deploy.sh
./scripts/k8s-cleanup.sh

# GCP (GKE + Cloud SQL + HTTPS Ingress)
export GCP_PROJECT_ID=your-project-id
CREATE_CLUSTER=1 SEED_DATABASE=true ./scripts/gcp-deploy.sh
GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh
```

Script help:

```bash
./scripts/gcp-deploy.sh --help
./scripts/gcp-cleanup.sh --help
./scripts/k8s-cleanup.sh --help
```

## Local development

```bash
cp .env.example .env
npm install
npm run db:up          # Postgres on localhost:5432
npm run db:setup       # prisma db push + seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default `.env` values (from `.env.example`):

```bash
DATABASE_URL="postgresql://channel:channel@localhost:5432/channel_connect?schema=public"
SESSION_SECRET="channel-connect-dev-secret-change-in-production"
```

### npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and start |
| `npm run db:up` | Start local Postgres (`docker compose up -d postgres`) |
| `npm run db:down` | Stop local Postgres |
| `npm run db:push` | Apply Prisma schema |
| `npm run db:seed` | Seed demo data (skips if data exists) |
| `npm run db:setup` | `db:push` + `db:seed` |
| `npm run db:generate` | Regenerate Prisma Client |

Reset demo data:

```bash
FORCE_SEED=true npm run db:seed
```

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Vendor (Ionix) | vendor@ionix.io | password123 |
| Reseller admin (Guidepoint) | admin@guidepoint.com | password123 |
| Reseller rep (Guidepoint) | rep@guidepoint.com | password123 |

**Other flows** at `/register`:

- **Individual user** — work email + LinkedIn URL; auto-joins a company when the email domain is registered
- **Vendor admin** — security-space vendors; then `/vendor/onboarding` ($5k/year + $500/deal contract)
- **Reseller admin** — free; LinkedIn-verified company setup

Ionix and Guidepoint are pre-seeded as an approved partnership. Seed is **idempotent** (skips when companies already exist).

## Docker (app container)

Run the app container against local Postgres:

```bash
npm run db:up
docker build -t channel-connect:local .
docker run --rm -p 3000:3000 \
  -e SESSION_SECRET=dev-secret \
  -e SEED_DATABASE=true \
  -e DATABASE_URL="postgresql://channel:channel@host.docker.internal:5432/channel_connect?schema=public" \
  channel-connect:local
```

Open http://localhost:3000

On Linux, replace `host.docker.internal` with your host IP or use `--add-host=host.docker.internal:host-gateway`.

The container entrypoint:

1. Waits for Postgres and runs `prisma db push` (retries until ready)
2. Seeds when `SEED_DATABASE=true` (skipped if data already exists unless `FORCE_SEED=true`)
3. Starts Next.js

## Kubernetes (local cluster)

Requires Docker, kubectl, and a local cluster (Docker Desktop Kubernetes, kind, or minikube). Deploys the app plus an in-cluster **Postgres** service.

```bash
# Build, load image, apply k8s/overlays/local, wait for rollout
./scripts/k8s-deploy.sh

# Force a clean Docker build
NO_CACHE=1 ./scripts/k8s-deploy.sh

# Wipe local Postgres PVC and re-seed demo accounts
RESEED=1 ./scripts/k8s-deploy.sh

# Tear down app + Postgres + namespace resources
./scripts/k8s-cleanup.sh

# Stop the app only; keep Postgres data
WORKLOAD_ONLY=1 ./scripts/k8s-cleanup.sh

# Also remove local channel-connect:* images
DELETE_IMAGES=1 ./scripts/k8s-cleanup.sh
```

### Access

| Method | URL |
|--------|-----|
| NodePort | http://localhost:30080 |
| Port-forward | `kubectl port-forward -n channel-connect svc/channel-connect 3000:80` → http://localhost:3000 |

Hard-refresh the browser after deploy (`Cmd+Shift+R`).

### Local Kubernetes notes

- Manifests: `k8s/base/` + `k8s/overlays/local/`
- Postgres PVC: `channel-connect-postgres`
- Secrets (`channel-connect-secrets`): `DATABASE_URL`, `SESSION_SECRET`
- ConfigMap: `SEED_DATABASE=true` by default for local
- Default local `DATABASE_URL`: `postgresql://channel:channel@postgres:5432/channel_connect?schema=public`

## Google Cloud (GKE + Cloud SQL)

Production URL: **[https://app.channel-connect.com](https://app.channel-connect.com)**

Stack on GCP:

- **GKE Autopilot** cluster
- Images in **Artifact Registry** (built as `linux/amd64` via Docker buildx)
- **Cloud SQL for PostgreSQL 16**, **Enterprise** edition, tier **`db-f1-micro`**
- **Cloud SQL Auth Proxy** sidecar + **Workload Identity**
- **HTTPS Ingress** on global static IP `channel-connect-ip`
- Google-managed TLS certificate for **`app.channel-connect.com`**
- HTTP → HTTPS redirect

### Deploy

Always use `./scripts/gcp-deploy.sh`. Do **not** run `kubectl apply -k k8s/overlays/gcp/` alone — that leaves a placeholder image and Cloud SQL connection name and causes `ErrImagePull` / failed DB connections.

```bash
# Optional: copy defaults, then export them
cp .env.gcp.example .env.gcp
set -a && source .env.gcp && set +a

# First deploy (cluster, Artifact Registry, Cloud SQL, static IP, Ingress, app)
# Cloud SQL create can take several minutes
export GCP_PROJECT_ID=your-project-id
CREATE_CLUSTER=1 SEED_DATABASE=true ./scripts/gcp-deploy.sh

# Subsequent deploys (build, push, rollout)
GCP_PROJECT_ID=your-project-id ./scripts/gcp-deploy.sh

# Force a clean image rebuild
NO_CACHE=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-deploy.sh

# Reset demo data in Cloud SQL
FORCE_SEED=1 SEED_DATABASE=true GCP_PROJECT_ID=your-project-id ./scripts/gcp-deploy.sh
```

Cloud SQL defaults (set automatically by the script):

```bash
CLOUDSQL_EDITION=ENTERPRISE   # required for db-f1-micro
CLOUDSQL_TIER=db-f1-micro
CLOUDSQL_INSTANCE=channel-connect-db
```

Do **not** use `db-f1-micro` with `ENTERPRISE_PLUS` — GCP rejects that combination. For Enterprise Plus:

```bash
CLOUDSQL_EDITION=ENTERPRISE_PLUS \
CLOUDSQL_TIER=db-perf-optimized-N-2 \
GCP_PROJECT_ID=your-project-id \
./scripts/gcp-deploy.sh
```

The deploy script:

1. Enables required APIs (Artifact Registry, GKE, Compute, Cloud SQL, IAM)
2. Reserves global static IP `channel-connect-ip` (if needed)
3. Creates (or reuses) Cloud SQL Postgres 16 with `--edition=ENTERPRISE` and `--tier=db-f1-micro`
4. Creates database/user; stores `DATABASE_URL` and `DB_PASSWORD` in the Kubernetes secret
5. Configures Workload Identity for the Cloud SQL Auth Proxy sidecar
6. Builds/pushes a `linux/amd64` image and rolls out the deployment

Use a stable session secret across deploys:

```bash
SESSION_SECRET=$(openssl rand -hex 32) GCP_PROJECT_ID=your-project-id ./scripts/gcp-deploy.sh
```

### GCP environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GCP_PROJECT_ID` | *(required)* | GCP project |
| `GCP_REGION` | `us-central1` | Region for GKE, Artifact Registry, Cloud SQL |
| `GKE_CLUSTER` | `channel-connect` | Autopilot cluster name |
| `ARTIFACT_REPO` | `channel-connect` | Artifact Registry repository name |
| `IMAGE_NAME` | `app` | Image name inside the registry |
| `NAMESPACE` | `channel-connect` | Kubernetes namespace |
| `CLOUDSQL_INSTANCE` | `channel-connect-db` | Cloud SQL instance id |
| `CLOUDSQL_EDITION` | `ENTERPRISE` | `ENTERPRISE` (shared-core tiers) or `ENTERPRISE_PLUS` |
| `CLOUDSQL_TIER` | `db-f1-micro` | Machine tier (`db-perf-optimized-N-*` required for Enterprise Plus) |
| `DB_NAME` | `channel_connect` | Database name |
| `DB_USER` | `channel_connect` | Database user |
| `DB_PASSWORD` | *(from secret or generated)* | Reused from K8s secret when unset |
| `GSA_NAME` | `channel-connect-gsa` | Google service account for Workload Identity |
| `APP_DOMAIN` | `app.channel-connect.com` | Public hostname / cert domain |
| `STATIC_IP_NAME` | `channel-connect-ip` | Global static IP resource name |
| `SESSION_SECRET` | *(from secret or generated)* | Session signing secret |
| `SEED_DATABASE` | `false` | Seed when DB is empty |
| `FORCE_SEED` | unset | Reset and re-seed even if data exists (`FORCE_SEED=1`) |
| `CREATE_CLUSTER` | unset | Create Autopilot cluster if missing (`CREATE_CLUSTER=1`) |
| `NO_CACHE` | unset | Docker build without cache (`NO_CACHE=1`) |
| `DOCKER_PLATFORM` | `linux/amd64` | Image platform for GKE nodes |

See `.env.gcp.example` for a copy-paste template.

### DNS

Create an **A** record for the app hostname pointing at the Ingress IP:

| Type | Name | Value |
|------|------|-------|
| A | `app` (`app.channel-connect.com`) | Ingress IP (printed by deploy script) |

```bash
# Look up the reserved IP anytime
gcloud compute addresses describe channel-connect-ip --global --format='get(address)'

# Confirm DNS
dig app.channel-connect.com +short
```

Google provisions the managed certificate after DNS is correct (typically **15–60 minutes**):

```bash
kubectl get managedcertificate channel-connect-cert -n channel-connect
kubectl describe managedcertificate channel-connect-cert -n channel-connect
```

When `Certificate Status` is **Active**, open **https://app.channel-connect.com**.

**Do not open the bare Ingress IP in a browser.** The load balancer serves TLS for `app.channel-connect.com` only. Opening `http://<IP>` often returns `ERR_EMPTY_RESPONSE`. Always use the hostname.

### Useful checks

```bash
kubectl get pods,svc,ingress -n channel-connect
kubectl get managedcertificate -n channel-connect

# App and Cloud SQL proxy logs
kubectl logs -n channel-connect -l app=channel-connect -c channel-connect --tail=100
kubectl logs -n channel-connect -l app=channel-connect -c cloud-sql-proxy --tail=50

# Cloud SQL instance
gcloud sql instances describe channel-connect-db --format='value(state,settings.tier,settings.edition)'
```

### Cleanup

```bash
# Remove Kubernetes resources (keeps Cloud SQL by default)
GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh

# Stop the app only; keep Ingress/config
WORKLOAD_ONLY=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh

# Also delete Cloud SQL (irreversible), GKE cluster, and/or Artifact Registry
DELETE_SQL=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh
DELETE_CLUSTER=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh
DELETE_REGISTRY=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh

# Full teardown example
DELETE_SQL=1 DELETE_CLUSTER=1 DELETE_REGISTRY=1 GCP_PROJECT_ID=your-project-id ./scripts/gcp-cleanup.sh
```

### GCP notes

| Topic | Detail |
|-------|--------|
| Cluster | GKE Autopilot (`CREATE_CLUSTER=1`), region `us-central1` by default |
| Database | Cloud SQL PostgreSQL 16, **Enterprise** edition, tier **`db-f1-micro`** |
| DB access | Cloud SQL Auth Proxy sidecar on `127.0.0.1:5432` via Workload Identity |
| Image | `{region}-docker.pkg.dev/{project}/channel-connect/app:{git-sha}` |
| Platform | Built as `linux/amd64` (required for GKE; needed when building on Apple Silicon) |
| Hostname | `APP_DOMAIN` defaults to `app.channel-connect.com` |
| Ingress | Global static IP `channel-connect-ip` + managed cert + HTTPS redirect |
| Seed | `SEED_DATABASE=true` seeds only when empty; `FORCE_SEED=1` resets data |
| Manifests | `k8s/base/` + `k8s/overlays/gcp/` |

### Troubleshooting

| Symptom | Cause | Fix |
|---------|--------|-----|
| `ErrImagePull` / `docker.io/library/channel-connect:...` | Applied overlay without the deploy script | Use `./scripts/gcp-deploy.sh` only |
| `no match for platform in manifest` | Image built for arm64 (Apple Silicon) | Redeploy; script builds `linux/amd64` via buildx |
| `ERR_EMPTY_RESPONSE` on bare IP | Ingress expects hostname + HTTPS | Use `https://app.channel-connect.com` after DNS/cert |
| Certificate not Active | DNS not pointing at Ingress IP yet | Fix A record; wait 15–60 minutes |
| Pod crash / DB errors | Proxy or Cloud SQL not ready | Check `cloud-sql-proxy` logs; wait for instance `RUNNABLE` |
| `Invalid Tier (db-f1-micro) for (ENTERPRISE_PLUS)` | Edition/tier mismatch | Script defaults to `CLOUDSQL_EDITION=ENTERPRISE` with `db-f1-micro`; redeploy |
| Rollout stuck (old SQLite PVC era) | N/A with Cloud SQL | Current deploy uses RollingUpdate + Cloud SQL (no app PVC) |

**Migration from SQLite:** switching to Cloud SQL does **not** copy data from the old SQLite PVC. Redeploy with `SEED_DATABASE=true` for demo accounts, or register fresh users.

## Repository layout

```
k8s/
  base/                 # shared Deployment, Service, ConfigMap, Secret, ServiceAccount
  overlays/
    local/              # NodePort, in-cluster Postgres
    gcp/                # Ingress, ManagedCertificate, FrontendConfig, Cloud SQL proxy
scripts/
  k8s-deploy.sh         # local Kubernetes deploy
  k8s-cleanup.sh        # local Kubernetes teardown
  gcp-deploy.sh         # GKE + Cloud SQL + Ingress deploy
  gcp-cleanup.sh        # GCP teardown
docker/
  entrypoint.sh         # prisma db push, optional seed, npm start
docker-compose.yml      # local Postgres
prisma/
  schema.prisma         # PostgreSQL datasource
  seed.ts
.env.example            # local DATABASE_URL / SESSION_SECRET
.env.gcp.example        # GCP deploy variables (copy to .env.gcp; gitignored)
```
