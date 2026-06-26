# Contributing to ish-rize-web

Welcome. This is the Next.js web client for IshRize Scheduling Intelligence. It talks to
the existing `ish-rize-backend` over REST + WebSocket. Before writing code, skim
[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) (what/when),
[COPILOT_CONTEXT.md](COPILOT_CONTEXT.md) (how), and
[VERSION_CONTROL_GUIDE.md](VERSION_CONTROL_GUIDE.md) (the git discipline this repo enforces).

---

## The 8 golden rules

1. **Issue first** — no branch without a GitHub issue (`#N`).
2. **Never commit to `main` or `dev`** — always a short-lived branch → PR.
3. **Stage by name** — never `git add -A` or `git add .`.
4. **Conventional commits** ending `Closes #N`. No emoji, no AI / `Co-Authored-By` trailer.
5. **CI must be green** before a PR is ready.
6. **Only the maintainer merges**, after explicit approval. Squash-merge, then delete the branch.
7. **Never destroy uncommitted work** — if `git status` is unexpected, stop and ask.
8. **No secrets** — never commit `.env*`, keys, tokens, or credentials.

---

## Local setup

Requires Node 20+. The backend should be running locally first (see `ish-rize-backend`).

```bash
# from this repo root
npm install
cp .env.example .env.local        # set NEXT_PUBLIC_API_URL to your backend
npm run dev                        # Next.js dev server on http://localhost:3000
```

`.env.local` (gitignored):

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

> The Next.js app and backend run in **separate terminals**. `npm run dev` is a
> long-running process — open a second terminal for git, tests, or curl.

---

## Step-by-step workflow

1. **Create an issue:** `gh issue create --title "..." --body "..."` → note `#N`.
2. **Branch from dev:** `git checkout dev && git pull origin dev && git checkout -b feat/...`
3. **Write code** for one focused concern (see [DEV_MODE.md](DEV_MODE.md)).
4. **Stage by name:** `git add app/foo.tsx components/Bar.tsx` (never `-A`).
5. **Commit:** conventional message with `Closes #N`, no AI trailer.
6. **Push:** `git push -u origin <branch>`.
7. **Wait for CI;** fix any failure in the same branch.
8. **Open a PR:** `gh pr create --base dev --fill`.
9. **Share the URL;** wait for maintainer approval + merge.

---

## Branch naming

`<type>/<kebab-description>` — `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`.
Examples: `feat/schedule-grid-read`, `fix/clash-online-venue`, `chore/tailwind-tokens`.

---

## Commit format

```
type(scope): short imperative summary

Why the change, not just what.

Closes #N
```

Scopes you'll use here: `schedule`, `clash`, `availability`, `ingestion`, `config`,
`auth`, `realtime`, `ui`. Full examples in [VERSION_CONTROL_GUIDE.md](VERSION_CONTROL_GUIDE.md).

---

## PR body template

```markdown
## Summary
- Bullet what changed and why (2–4 max)

## Test plan
- [ ] Manual: which screens, checked at mobile + desktop widths
- [ ] CI: typecheck / lint / build green

Closes #N
```

---

## Reviewer checklist

- Issue-backed branch off `dev`; conventional commits ending `Closes #N`.
- Single focused concern; small diff.
- No `git add -A`; no secrets / `.env*`; no AI / `Co-Authored-By` trailer.
- Backend stays the source of truth; the client enforces no business rules.
- Theme tokens only (Foundation/Ascent) — no hardcoded colors.
- Responsive at mobile, tablet, and desktop widths.
- Loading and error states handled; no `any`.

---

## Pre-commit hook

The `prepare` script points git at `.githooks/`. The pre-commit hook type-checks before
each commit. Emergency bypass: `git commit --no-verify` (use sparingly, and never to dodge
a real failure).

---

## Local checks (mirror CI)

```bash
npm ci
npm run type-check
npm run lint
npm run build
```

---

## Multi-phase / cross-repo work

Features ship in numbered phases (see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)).
A phase that touches both this repo and the backend gets **one issue/branch/PR per repo**,
cross-linked. Never mix unrelated concerns in one PR.

---

## Never do this

- Commit to `main`/`dev` directly, or merge your own PR.
- `git add -A` / `git add .`, or force-push a shared branch.
- Commit `.env*`, secrets, `.next/`, or `node_modules/`.
- Add an emoji or AI co-author to a commit.
- Enforce a business rule in the client, or hardcode a university assumption.
- Touch uncommitted changes you didn't make.

---

## How to ask questions

Open a GitHub issue, or comment on the relevant PR. If you're blocked on a decision only
the maintainer can make, say so explicitly rather than guessing.
