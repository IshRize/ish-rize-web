# VERSION CONTROL GUIDE

The single source of truth for how changes move through the IshRize repositories
(`ish-rize-backend`, `ish-rize-mobile`, `ish-rize-docs`, `ish-rize-web`). This governs
**every** change, regardless of stack. If a tool or habit conflicts with this guide, this
guide wins. The canonical copy lives in `ish-rize-docs`; this copy is kept in sync.

---

## BRANCH STRUCTURE

```
main      Production. Protected. Only updated via PR from dev. Tagged releases.
  ^
dev       Integration. Protected. All feature/fix work targets dev via PR.
  ^
<type>/<short-description>   Short-lived working branches. One branch = one PR.
```

- **Never commit directly to `main` or `dev`.** Everything goes through a PR.
- **Never force-push** a shared branch unless the maintainer explicitly asks.
- Branches are disposable: one branch → one PR → squash-merge → delete.

---

## BRANCH NAMING

`<type>/<kebab-description>`

| Prefix | Use | Example |
|--------|-----|---------|
| `feat/` | New feature | `feat/timetable-grid-read` |
| `fix/` | Bug fix | `fix/clash-online-venue` |
| `chore/` | Tooling, deps, config | `chore/add-ci-workflows` |
| `refactor/` | Restructure, no behaviour change | `refactor/availability-engine` |
| `docs/` | Documentation only | `docs/web-architecture` |

---

## COMMIT MESSAGE FORMAT (Conventional Commits)

```
type(scope): short imperative summary

Longer explanation if needed — what changed and WHY, not just what.
Focus on the reason, not the diff.

Closes #N
```

- Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`
- `scope` is optional but encouraged (e.g. `timetable`, `clash`, `ingestion`, `config`).
- Every commit on an issue-backed branch ends with `Closes #N`.
- **Never** add Claude/AI or any `Co-Authored-By` trailer.

**Examples (IshRize timetable domain):**

```
feat(clash): detect cohort clashes at the group level

Expands each Group's courses to bookings and flags any two that share a
time slot, naming both courses so a student sees exactly which of their
classes collide.

Closes #61
```

```
feat(timetable): render read-only master grid from seeded UG data

Rows are time slots by day, columns are departments, cells show lecturer
initials + course code + room. Filtering is client-side over fetched data.

Closes #62
```

```
test(config): prove universality with a trimester fixture university

Adds a Sun–Thu, three-term fixture and asserts the Configuration Engine
resolves it without any UG-specific assumption.

Closes #63
```

---

## MANDATORY ORDER OF OPERATIONS (no exceptions)

1. **Open a GitHub issue first** — `gh issue create --title "..." --body "..."`. Note `#N`.
2. **Branch from the target** — `git checkout dev && git pull origin dev && git checkout -b feat/...`
3. **Write the code.**
4. **Stage only the specific files** — `git add path/one path/two`.
   **Never `git add -A` or `git add .`.**
5. **Commit** with a conventional message including `Closes #N`.
6. **Push the branch** — `git push origin <branch>`.
7. **Wait for CI.** If it fails, fix it in the same branch before doing anything else.
8. **Open a PR** — `gh pr create --base dev --head <branch> --title "..." --body "..."`.
9. **Share the PR URL** and wait for the maintainer's review.
10. **Only the maintainer merges**, after they say "approved" / "merge it".

---

## STAGING DISCIPLINE

- Stage files by name, one logical change per commit.
- If `git status` shows changes you did not make, **stop and ask** — never blindly stage
  or discard another person's uncommitted work.
- Never commit secrets, `.env`, `.env.local`, credentials, tokens, or build artefacts
  (`.next/`, `node_modules/`).

---

## PR BODY TEMPLATE (always use)

```markdown
## Summary
- Bullet what changed and why (2–4 bullets max)

## Test plan
- [ ] What to check manually (which screens, which screen sizes)
- [ ] What automated checks cover it (CI: typecheck / lint / build; engine Vitest)

Closes #N
```

---

## WHAT "APPROVED" MEANS

- The contributor (including Claude) **never merges their own PR**.
- The maintainer reviews, and only the maintainer merges, after explicitly saying
  "approved" or "merge it".
- Merge method: **squash-merge**; delete the branch after merge.

---

## CI

- A PR is not "ready" until CI is green.
- Web CI runs: install → type-check → lint → build (plus non-blocking `npm audit`).
- Backend CI runs: install → prisma generate → type-check → build → engine tests.
- If CI fails, diagnose and fix **in the same branch** before any other work.
- Never skip hooks (`--no-verify`) or bypass checks to get a PR through.

---

## MULTI-PHASE / MULTI-REPO FEATURES

Large features are split into numbered phases. **Each phase gets its own issue, branch,
and PR.** A phase that spans both repos gets **one issue/branch/PR per repo**, cross-linked.
Never combine unrelated concerns in one PR.

```
feat/timetable-grid-read   (ish-rize-web)      → issue #62, PR
feat/booking-core          (ish-rize-backend)  → issue #60, PR
```

---

## HOTFIX vs FEATURE WORK

- **Feature / fix work** branches from `dev`, PRs into `dev`.
- **Production hotfix** (urgent, `main` is broken): branch `fix/...` from `main`, PR into
  `main`, then merge `main` back into `dev` so the fix isn't lost.

---

## AFTER A MERGE

```bash
git checkout dev
git pull origin dev
git log --oneline | head -5   # confirm the merge landed
```

For a release, PR `dev → main`, squash-merge, then tag: `git tag -a vX.Y.Z -m "..."`.

---

## SHARED FILES ACROSS REPOS

`CONTRIBUTING.md`, `DEV_MODE.md`, `COPILOT_CONTEXT.md`, `API_CONTRACT.md`, and this guide
exist in more than one repo. Update in `ish-rize-docs` first, merge, then sync to the other
repos in their own `docs/sync-...` PRs that reference the docs PR.

---

**Discipline in version control is discipline in the product. No shortcuts.**
