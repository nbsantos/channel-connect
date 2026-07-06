# Channel Connect — Agent Guide

Vendor–reseller deal registration and partner discovery platform.

**Production:** https://app.channel-connect.com  
**Stack:** Next.js 15 (App Router), React 19, Prisma, PostgreSQL, Tailwind CSS v4, session cookies

Read `README.md` for full setup and deploy instructions. This file is a fast orientation for coding agents.

---

## What this app does

- **Vendors** search reseller account mappings (one account at a time), register deals, message reps, pay annual + per-deal fees.
- **Resellers** upload customer→rep mappings, approve/decline deals, manage company profile.
- **Individuals** have a personal home, search, and profile; can auto-join companies by email domain.
- **Partnerships** link vendors and resellers (signed vs unsigned).
- **AI Search** (`/search`) is implemented but **keyword-based**, not LLM-powered — see `src/lib/ai-search.ts`.

---

## Repository layout

```
src/
  app/                  # Next.js App Router pages + API routes
    api/                # REST handlers (auth, deals, search, billing, …)
    company/[id]/       # Company profile, team, domains, content
    vendor/             # Vendor home, onboarding, billing
    reseller/           # Reseller home, account upload
    deals/[id]/         # Deal detail, messages, approve/decline
    search/             # AI Search UI
    login/, register/   # Auth flows
  components/           # Shared UI (ui.tsx, nav, logo, forms)
  lib/                  # Server utilities
    auth.ts             # Session cookie auth
    prisma.ts           # Prisma client singleton
    ai-search.ts        # Search scoring (not real AI)
    billing.ts          # Invoice logic
    domains.ts          # Email domain auto-join
prisma/
  schema.prisma         # PostgreSQL schema (single source of truth)
  seed.ts               # Demo data (idempotent; FORCE_SEED=true to reset)
k8s/
  base/                 # Shared manifests
  overlays/local/       # Local k8s + in-cluster Postgres
  overlays/gcp/         # GKE + Cloud SQL proxy + Ingress
scripts/
  ensure-local-db.sh    # Auto-starts local Postgres before `npm run dev`
  k8s-deploy.sh         # Local Kubernetes deploy
  gcp-deploy.sh         # Production deploy (always use this for GCP)
```

---

## Conventions

### Next.js patterns

- **Server components** by default; add `"use client"` only for interactivity.
- **Auth:** call `getCurrentUser()` in server components; redirect to `/login` if null. API routes return `401` when unauthenticated.
- **Redirects after login:** use `homePathForUser()` from `src/lib/utils.ts` (vendors may go to `/vendor/onboarding` first).
- **API routes** live under `src/app/api/**/route.ts` and return `NextResponse.json()`.

### UI / styling

- Theme tokens in `src/app/globals.css` (`@theme`: `brand`, `navy`, `navy-elevated`, `navy-border`).
- Shared primitives in `src/components/ui.tsx`: `Card`, `Badge`, `StatCard`, `fieldClass`, `labelClass`, `btnPrimaryClass`, `btnPrimaryLinkClass`.
- **Logo:** `src/components/logo.tsx` + `public/logo.png` — do not change unless asked.
- Global link color is in `@layer base`; primary button links must use `btnPrimaryLinkClass` or `text-white` on `bg-brand` so link color does not override button text.
- Light theme (soft blue-gray surfaces). Do not revert to dark navy without explicit request.

### Database

- **Provider:** PostgreSQL only (`prisma/schema.prisma`). No SQLite.
- **Local dev:** Docker Postgres on `localhost:5432` via `docker-compose.yml`. `npm run dev` runs `predev` → `scripts/ensure-local-db.sh` (starts DB, `db push`, seed).
- **Production:** Cloud SQL via Auth Proxy sidecar — configured only by `scripts/gcp-deploy.sh`, not local `.env`.
- **Env:** copy `.env.example` → `.env`. Never commit `.env`, `.env.gcp`, or secrets.
- **Schema changes:** `npx prisma db push` locally; seed with `npm run db:seed`.

### Auth

- Cookie name: `cc_session` (httpOnly, 7-day sessions).
- Passwords hashed with bcrypt in register/login API routes.
- Company types: `vendor` | `reseller` | `individual` (Prisma enum `CompanyType`).

---

## Common commands

```bash
npm install
npm run dev              # local app (auto DB setup via predev)
npm run build            # production build
npm run db:up            # start Postgres container
npm run db:setup         # push schema + seed
FORCE_SEED=true npm run db:seed   # reset demo data

./scripts/k8s-deploy.sh  # local Kubernetes (NodePort :30080)
./scripts/gcp-deploy.sh  # GCP — never raw kubectl apply on gcp overlay alone
```

---

## Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Vendor admin | vendor@ionix.io | password123 |
| Reseller admin | admin@guidepoint.com | password123 |
| Reseller rep | rep@guidepoint.com | password123 |

---

## Branches & deploy notes

- **`main`:** last stable deploy baseline (GKE + Ingress).
- **`cursor/postgres-cloud-sql`:** PostgreSQL migration + Cloud SQL + light theme + local dev DB script (may be ahead of `main`).

GCP deploy requires `GCP_PROJECT_ID` and must use `./scripts/gcp-deploy.sh` (builds `linux/amd64` image, sets secrets, Cloud SQL connection).

---

## Agent dos and don'ts

**Do**

- Match existing patterns in neighboring files before adding abstractions.
- Keep changes scoped; prefer editing `ui.tsx` tokens over one-off colors.
- Run `npm run build` after non-trivial changes.
- Use `getCurrentUser()` / session checks on protected pages and APIs.

**Don't**

- Commit `.env`, `.env.gcp`, or credentials.
- Add LLM dependencies for “AI Search” without an explicit request.
- Change `logo.tsx` / `public/logo.png` unless asked.
- Use `kubectl apply -k k8s/overlays/gcp/` without `gcp-deploy.sh`.
- Assume Cloud SQL is available locally — use Docker Postgres.

---

## Key files to read first

| Task | Start here |
|------|------------|
| New page | `src/app/layout.tsx`, similar page in `src/app/` |
| New API | `src/app/api/deals/route.ts` (pattern), `src/lib/auth.ts` |
| Data model | `prisma/schema.prisma` |
| Search behavior | `src/lib/ai-search.ts`, `src/app/api/search/route.ts` |
| Vendor billing | `src/lib/billing.ts`, `src/app/vendor/billing/` |
| Deploy | `README.md`, `scripts/gcp-deploy.sh` |
