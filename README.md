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
- **Vendor billing** — $500/approved deal, monthly invoices, contract onboarding
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
```

Or step by step:

```bash
docker build -t channel-connect:local .

# kind
kind load docker-image channel-connect:local

# minikube
minikube image load channel-connect:local

kubectl apply -k k8s/
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

- SQLite data is stored on a PersistentVolumeClaim (`channel-connect-data`).
- Set `SEED_DATABASE=true` in `k8s/configmap.yaml` to seed demo data on first boot.
- Change `SESSION_SECRET` in `k8s/secret.yaml` before any real deployment.
- Re-seed: delete the PVC and redeploy (`kubectl delete pvc channel-connect-data -n channel-connect`).
# channel-connect
