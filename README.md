# ish-rize-web

The web client for **IshRize Timetable Intelligence** — a live master timetable, clash
detection, free-room/free-slot finding, and safe timetable ingestion for universities.
Part of the IshRize platform; it extends the existing attendance system rather than
replacing it.

> **Repo status: Phase 0 — foundation.** This repo currently contains the governing docs,
> version-control scaffolding, and CI. The Next.js application is scaffolded in **Phase 2**
> per the [implementation plan](IMPLEMENTATION_PLAN.md). Phases are gated — each starts only
> on the maintainer's go-ahead.

---

## What this is

The mobile app (`ish-rize-mobile`) is the *attendance + growth* tool. This web app is the
*timetable* tool:

- Digitize and edit a live master timetable (a grid of `Booking`s).
- Detect venue, lecturer, and cohort (group) clashes.
- Find free rooms at a slot and free slots for a cohort.
- Ingest existing timetables (Excel / PDF) with mandatory human review.

It works for **any** university through configuration, not code branches.

## The IshRize repos

| Repo | Role |
|---|---|
| `ish-rize-backend` | Single source of truth: API, Prisma schema, **timetable engines**, sockets |
| `ish-rize-mobile` | React Native attendance app + proximity engine + student insights |
| `ish-rize-web` | **This repo** — Next.js timetable client |
| `ish-rize-docs` | Canonical docs, version-control guide, decisions |

## Stack

Next.js 15 (App Router, TS) · Tailwind CSS 4 · Zustand · TanStack Query + Table ·
Socket.io client · deployed on Vercel. The backend timetable layer is Express 5 + Prisma 7
+ PostgreSQL with pure, Vitest-tested domain engines. Rationale:
[IMPLEMENTATION_PLAN.md §4](IMPLEMENTATION_PLAN.md).

## Quick start

```bash
npm install
cp .env.example .env.local        # set NEXT_PUBLIC_API_URL to your running backend
npm run dev                        # http://localhost:3000
```

(`npm` scripts and the Next.js project arrive in Phase 2. The backend must be running
first — see `ish-rize-backend`.)

## Documentation

| Doc | What it covers |
|---|---|
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | The phased build plan — what we build, in what order, and the gate for each phase |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, the Configuration Engine, data model, web structure |
| [API_CONTRACT.md](API_CONTRACT.md) | The new timetable REST + WebSocket endpoints |
| [COPILOT_CONTEXT.md](COPILOT_CONTEXT.md) | How code must be written here (read before generating code) |
| [DEV_MODE.md](DEV_MODE.md) | The incremental, engine-first development loop |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Local setup + the contribution workflow |
| [VERSION_CONTROL_GUIDE.md](VERSION_CONTROL_GUIDE.md) | Branching, commits, PRs — the git discipline this repo enforces |

## Phase status

- ✅ **Phase 0** — repo foundation + docs
- ⏸ **Phase 1** — Configuration Engine + schema extension *(backend)*
- ⏸ **Phase 2** — Booking core + Next.js grid read
- ⏸ **Phase 3** — Clash + Availability engines + UI
- ⏸ **Phase 4** — Real-time sync + audit
- ⏸ **Phase 5** — Ingestion (Layers 1 & 2 + review)

## License & ownership

Private project. Do not commit secrets; see [CONTRIBUTING.md](CONTRIBUTING.md).
