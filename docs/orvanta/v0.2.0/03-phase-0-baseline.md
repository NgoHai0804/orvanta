# Orvanta v0.2.0 — Phase 0 baseline and safety findings

**Assessment date:** 2026-10-31 (updated after Phases 1–8 implementation)  
**Status:** Phase 0 **Pass**. Decisions locked in [`04-phase-0-decisions.md`](./04-phase-0-decisions.md).  
**Scope:** Repository code/document review plus focused unit/e2e suites listed below. Inventory below reflects post-implement layout.

## Executive findings

1. **Gate 1 Pass.** `local-runtime-host.e2e.test.ts` (4 tests) starts project-scoped cores for workspaces A and B, persists user+assistant turns, asserts artifacts under each project’s `local/sdk/sessions/`, not under `CLINE_DIR`, and fail-closed workspace mismatch via `validateProjectStorageRoots`.
2. **Layout locked to `01`.** `resolveProjectStorageRoots()` and VS Code session factory use `.orvanta/local/db` (TeamStore), `local/sdk/db`, `local/sdk/sessions`. History under `local/history/`; memory under `local/memory/`; `PROJECT_LAYOUT_VERSION = 2`.
3. **User library.** Windows resolver uses `%LOCALAPPDATA%\Orvanta\` with one-time copy migration from `homedir()/.orvanta` and injectable `baseDir` for tests.
4. **Legacy cleanup.** `legacy-history-cleanup.ts` inventories Keep/Delete paths and dry-runs without touching company/SDK/memory; fixture tests green. Apply only on confirmed fixtures.
5. **Pause / resume / needs-attention.** Durable pause store, drain ack, Feed Pause/Resume RPCs, `needsAttention` badge, War Room TeamStore hydrate, CEO DM blocked while paused. Runtime rebuild: Orvanta interrupts mid-flight runs then recovers queued durable work; `teamAutoRecover: false` when pause/live-reconnect/unresolved attention. Reconnect registry avoids duplicate SDK starts within the extension host.
6. **CEO session identity.** `initTask` allocates a distinct `ceo_*` Orvanta session id and passes `orvantaSessionId` into Core config; HistoryItem.sessionId is that CEO id, HistoryItem.id remains the SDK transcript id. Sticky `sdkSessionId` + canonical team-task sub-session ids.

## Inventory after implement (under project `.orvanta/`)

| Relative path | Label | Notes |
|---|---|---|
| `VERSION`, `company.json`, `purpose.md`, `org/roster.json`, `org/agents/**` | Keep | Company/config (git-ignored in v0.2.0) |
| `local/LAYOUT_VERSION` | Keep | `PROJECT_LAYOUT_VERSION = 2` |
| `local/sdk/**` | Keep | Canonical transcripts + SDK db |
| `local/history/**` | Keep | CEO history index + session manifests |
| `local/db/**` | Keep | TeamStore (`teams.db`) + `ceo-session-pause.json` |
| `local/memory/agents/<id>/` | Keep | Accepted memory + `proposals/` |
| `history/sessions.json`, `history/tasks/**` | Delete (legacy) | Dry-run only via `legacy-history-cleanup` |
| `org/agents/*/workspace/memory.md` | Migrate | One-shot into `local/memory/...` |
| User library `%LOCALAPPDATA%\Orvanta\` | Keep | Templates; not written by project chat/run |

## Evidence (focused)

| Evidence | Result |
|---|---|
| `bun -F @cline/core test:e2e -- src/runtime/host/local-runtime-host.e2e.test.ts` | Pass: 4 tests |
| `bun -F @cline/shared` orvanta suites (incl. resume-plan / pause) | Pass |
| `runtime-builder.team-persistence` (Orvanta interrupt-then-recover + skip) | Pass |
| VS Code `ceo-session-runtime-reconnect` | Pass |
| Phase 7 isolation (shared orvanta + TeamStore fail-closed + participant transcript) | Pass |

## Remaining after baseline update

- Optional manual Phase 5 nghiệm thu (Feed↔detail continuity, reload stale→live on VS Code host)
- Optional live LLM War Room dual-agent run outside CI
- Phase 9 fixture Gate Pass recorded 2026-10-31 (`ceo-session-phase9-scenario`, user-library, pause-drain)
