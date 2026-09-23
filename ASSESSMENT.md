# Teleconference MCP -- Project Health Assessment

**Date:** 2026-06-12
**Version:** 2.2.0 (pyproject) / 2.3.0 (CHANGELOG, unreleased)
**Method:** Full repo scan + live ruff/pytest/git runs on Goliath
**Supersedes:** 2026-05-23 assessment (which listed "no CI" as the critical gap -- CI now exists but cannot pass, see P1-1/P1-2)

---

## 1. Verified Live State (2026-06-12)

| Gate | Result |
|------|--------|
| `ruff check apps/agent/ packages/ myconf/ tests/` | ✅ **All checks passed** |
| `pytest tests/ apps/agent/tests/` | ⚠️ **90 passed, 5 ERRORS** (61s) |
| Git working tree | ❌ **43 dirty entries** (25 modified, ~18 untracked) |
| Branch vs origin | ❌ **master ahead 1, behind 3** -- diverged |
| CI on GitHub | ❌ **Cannot pass as written** (P1-1, P1-2) |

Headline: code quality is genuinely good, but **the entire 2.3.0 body of work
(7 test files, AGENTS.md, the prior assessment, fixture refactor, LiveKit 2026
config, docs/llms.txt, FleetStartMode vendoring) is uncommitted**, on a branch
that has meanwhile diverged from origin. One careless reset or IDE crash loses
~3 weeks of work. The README CI badge reports on code 3 commits behind disk.

---

## 2. Bugs -- P1 (break things now)

### P1-1: CI python job cannot succeed on ubuntu-latest
`pyproject.toml` declares `pywin32>=306`, `pywinctl`, `pynput`, `mss` as
**unconditional** dependencies. pywin32 has no Linux wheels and no buildable
sdist for Linux → `uv sync --dev` on the ubuntu runner fails before a single
test runs.

**Fix:** environment markers:
```toml
"pywin32>=306; sys_platform == 'win32'",
"pywinctl>=0.0.43; sys_platform == 'win32'",
"pynput>=1.7.6; sys_platform == 'win32'",
"mss>=9.0.1; sys_platform == 'win32'",
```
Then verify lazy-import fallbacks in remoting/contacts/vision modules (some
already exist -- check each). Alternative: `runs-on: windows-latest` for the
python job, but markers are the correct fix since conferencing_mcp is
platform-neutral.

### P1-2: CI web job -- `npm ci` in `apps/web` with no lockfile there
The lockfile lives at the monorepo root (npm workspaces). `npm ci` with
`working-directory: apps/web` has no `package-lock.json` in scope.
**Fix:** install at repo root: `npm ci`, then
`npm run lint --workspace=web`, `npx tsc --noEmit -p apps/web`,
`npm run test --workspace=web`.

### P1-3: 5 test errors -- `temp_lancedb` fixture out of scope
The 2.3.0 dedup removed `temp_lancedb` from `apps/agent/tests/conftest.py`,
keeping it only in root `tests/conftest.py`. pytest conftest scoping is
directory-based: the root fixture is **not visible** to
`apps/agent/tests/test_memory.py` → all 5 TestMemorySubstrate tests ERROR at
setup. **Fix:** restore the fixture in `apps/agent/tests/conftest.py` (or share
both suites' fixtures via `pytest_plugins`). Real count today is **90 passing**,
not the 95 (68+27) claimed in docs.

### P1-4: Uncommitted 2.3.0 work on a diverged branch
43 dirty entries; master ahead 1 / behind 3 of origin. Commit the work in
logical chunks first, then `git pull --rebase`, resolve, push. The 3 upstream
commits will likely conflict with the modified start.ps1/docs files (they look
like the FleetStartMode vendoring round-trip).

### P1-5: Runtime artifacts tracked in git
Tracked (gitignore was added *after* the fact, which does not untrack):
- `apps/agent/lancedb_data/**` -- binary .lance vector data
- `packages/conferencing_mcp/conference.db` -- live SQLite db
- `apps/agent/contacts_cache.json` -- **personal contact data in a public repo**
- `apps/web/lint_output.txt`

**Fix:**
```powershell
git rm --cached -r apps/agent/lancedb_data
git rm --cached packages/conferencing_mcp/conference.db apps/agent/contacts_cache.json apps/web/lint_output.txt
```
Check git history on contacts_cache.json for whether real PII was ever pushed;
decide on history rewrite vs. accept.

---

## 3. Bugs -- P2 (traps and drift)

- **P2-1: Duplicate compose files.** `docker-compose.yaml` (full 8-container
  stack, Redis on 16379) vs stale `docker-compose.yml` (Redis only, port
  **6379**, conflicting with the fleet port registry). Compose file resolution
  makes `docker compose up` behavior version-dependent; one of them is a lie.
  Delete `docker-compose.yml`.
- **P2-2: justfile `agent` recipe broken.** Uses `.\venv\Scripts\activate` but
  the project moved to uv; no venv exists. Should be `uv run python agent.py dev`.
- **P2-3: Legacy TypeScript remnants** in `packages/conferencing_mcp/`:
  `package.json`, `package-lock.json`, `tsconfig.json` survive although the TS
  server was deleted (CHANGELOG 2.1.0 claims removal). Turbo still picks the
  package up as a JS workspace (`.turbo/turbo-build.log` present).
- **P2-4: Version drift.** pyproject `2.2.0`; CHANGELOG/assessment `2.3.0`;
  README badge Python `3.13+` vs prereq text `3.12+` vs `requires-python >=3.12`.
- **P2-5: Repo-root clutter.** `pyproject.toml.bak`, 3×
  `scripts/FleetStartMode.ps1.*.bak`, root-level `mcp_server.log` /
  `agent_industrial.log` / 3× `build_agent_log*.txt` (gitignored but on-disk
  clutter; the .bak files are untracked landmines).
- **P2-6: PRD.md badly stale.** v1.3 (2026-03-17), "Next Review: 2025-02-11"
  (typo, in the past), duplicate section numbering (two §7s, two §8s), shipped
  features (screen share, recording, chat, blur, file sharing) still listed as
  "Phase 2 Planned", references "Fast_MCP 2.14.4" vs actual FastMCP 3.2.
- **P2-7: CHANGELOG structure.** Stray `[Unreleased]` header mid-file,
  Keep-a-Changelog preamble buried between 2.0.0 and 0.3.0, stale "Version
  History" footer claiming the UI overhaul is unreleased.
- **P2-8: No coverage gate** (carried over from May). `[tool.coverage]` is
  configured but CI never runs it. Add `--cov --cov-fail-under=70` once CI is
  green at all.

---

## 4. What's genuinely good

Modular tools/ split with thin orchestrators; FastMCP 3.2 with full
Annotated/Field docstring SOTA across all 38 tools; ruff completely clean at a
strict select set (E, F, W, I, B, S, UP, RUF); shared fixture architecture
(when in scope); 90 real passing tests with parametrization; observability
stack provisioned; AGENTS.md present; honest changelog entries (the June 4
STUN `host:port` format catch was a good one). Nothing wrong here is
architectural -- it's repo discipline and CI plumbing.

---

## 5. Scorecard

```
Code Quality     █████████████████░ 90%  (ruff clean, real implementations)
Tests            ██████████████░░░░ 78%  (90 pass / 5 broken, no CI execution)
CI/CD            ████░░░░░░░░░░░░░░ 20%  (workflow exists, cannot pass, never green)
Repo Hygiene     ██████░░░░░░░░░░░░ 35%  (43 dirty, diverged, tracked artifacts, PII)
Documentation    ████████████░░░░░░ 70%  (good docs/, but PRD+CHANGELOG drift)
```

Fix order: P1-4 → P1-3 → P1-1/P1-2 → P1-5, roughly one focused day.
See **TODO.md** for the actionable plan.
