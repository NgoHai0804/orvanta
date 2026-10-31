# Orvanta v0.2.0 — Phase 0 decisions (locked)

**Date:** 2026-10-31  
**Product owner (implementation request):** user requesting playbook execution  
**Security/privacy owner:** Product (fail-closed allowlist already approved 2026-10-30)  
**Runtime owner:** Product (pause contract approved 2026-10-30; store + dispatch gate landed)

This file records Phase 0 locks required by [`02-implementation-steps.md`](./02-implementation-steps.md). It does not replace `01` product intent.

## 0.1 Scope lock

**In scope (MVP):** Agent identity/memory/transcript isolation per project; CEO session draft→persist; reopen history; TeamStore ownership; realtime one-source; durable CEO-session pause; isolation tests; git ignore allowlist empty; representative E2E.

**Out of scope (v0.2.0):**

- Worktree / sandbox per Agent
- Auto-sync project → user template
- Memory or transcript shared across projects or cloud
- Per-Agent always-on daemon
- Cross-CEO-session transcript continuation
- Opening Git allowlist without per-path owner review

## 0.2 Security / privacy

| Data class | Location | Policy |
|---|---|---|
| Transcript | `<project>/.orvanta/local/sdk/` | Project-local; never commit; read only via mapped `sdkSessionId` |
| Event feed | TeamStore + allowlisted projection | Fail-closed: only `EVENT_CONTENT_ALLOWLIST` types; redact secrets before project/display |
| Memory | `local/memory/agents/<id>/` | Project-local; CEO approve proposals; not in user-library snapshot |
| Secrets / credentials | Provider/host stores | Never commit; redaction patterns in `event-content-allowlist.ts` |
| Tool log | Feed/detail projection | Same allowlist + redaction |

**Retention:** Event projections follow CEO session lifecycle (session active → retained with session; archive/delete with session policy).  
**SQLite backup:** Use SQLite backup API or close writers; never copy `teams.db` while WAL is open as a successful backup.

## 0.3 Gate 1 — SDK storage seam

**Result: Pass (2026-10-31)**

Evidence: `sdk/packages/core/src/runtime/host/local-runtime-host.e2e.test.ts` (4 tests green) asserts:

- Distinct `sdkDbDir` / `sdkArtifactDir` for projects A and B
- User + assistant turns persist under each project’s `local/sdk/sessions/`
- Artifacts are not under process `CLINE_DIR`
- `validateProjectStorageRoots(A, B)` fail-closed on workspace mismatch

Roots are injected via `ProjectStorageRoots` on the local host; no process-wide env selects project storage.

## 0.4 Legacy inventory

| Relative path under `.orvanta/` | Label | Notes |
|---|---|---|
| `company.json`, `purpose.md`, `org/roster.json`, `org/agents/**` | Keep | Company/config |
| `local/sdk/**` | Keep | Canonical transcripts |
| `local/history/**` | Keep | CEO history manifest |
| `local/db/**` | Keep | TeamStore + pause file |
| `local/memory/**` | Keep | Accepted memory + proposals |
| `history/sessions.json` | Delete | Legacy list |
| `history/tasks/**` | Delete | Legacy ui_messages cache |
| `org/agents/*/workspace/memory.md` | Migrate | One-shot copy into `local/memory/...` |
| User library `homedir()/.orvanta` | Migrate | Copy → `%LOCALAPPDATA%\Orvanta\` when dest empty |

Dry-run: `dryRunLegacyHistoryCleanup()` + tests in `legacy-history-cleanup.test.ts`. Do not run delete on real monorepo data without explicit confirmation.

## 0.5 Layout + schema

**Chosen tree (matches `01`):**

```text
.orvanta/
  VERSION / company.json / purpose.md / org/...
  local/
    LAYOUT_VERSION          # PROJECT_LAYOUT_VERSION = 2
    history/index.json + sessions/<id>/session.json
    db/                     # TeamStore + ceo-session-pause.json
    sdk/db + sdk/sessions/
    memory/agents/<id>/memory.md + proposals/
```

Write rules: schema validate → temp file → atomic rename; history lock for index/manifest.  
Git allowlist: **empty** (entire `.orvanta/**` ignored).

## 0.6 Pause / tab / shutdown contract

Confirmed for implementation:

| Action | Effect |
|---|---|
| Pause Team Feed | Persist `pause_requested`; block new Coordinator/Agent/run/queue dispatch; drain tools to safe boundary; no kill; UI `Paused` only after durable ack + all participants safe |
| Partial failure | Aggregate not paused; per-Agent status |
| Resume | Continue from durable checkpoint |
| Close tab / unmount detail | No cancel, no pause, no drop runtime subscription |
| Close VS Code | Not an implicit pause; reconnect live runtime on reopen |
