# Schema `.orvanta/`

Hợp đồng đĩa **workspace**. UI và runtime chỉ được đọc/ghi theo hợp đồng này. Thư mục **không lên git** (đã thêm `.orvanta/` vào `.gitignore` gốc).

Kho user (`%USERPROFILE%/.orvanta/companies/<slug>/`) là snapshot allowlist — xem [09-two-stores.md](./09-two-stores.md) và [SPEC-company-library.md](./SPEC-company-library.md). Không trộn hai cây.

## Cây thư mục

```
<workspace>/
  .orvanta/
    company.json              # identity + policy flags
    purpose.md                # hiến pháp — người viết, agent chỉ đọc
    constraints.md            # luật cứng (optional, default từ template)
    org/
      roster.json             # danh sách agent, role id, status
      agents/
        <agentId>/
          profile.md          # IDENTITY — chỉ CEO
          workspace/          # SPACE — chỉ agent này ghi
            memory.md
            journal/
            scratch/
    shared/
      handoffs/
        <taskId>/
          <agentId>.md        # nộp bài, chỉ đúng chủ file
      board.md                # host ghi
    inbox/
      pending.json            # quyết định chờ
      history.jsonl           # append-only audit
    state/                    # chiếu từ TeamStore — có thể rebuild
      snapshot.json           # TeamRuntimeState thu gọn
      last-sync.json
    memory/                   # ghi chú bền, handoff do người hoặc agent
      <yyyy-mm-dd>-<slug>.md
    runs/                     # artifact theo runId (optional)
      <runId>/
        summary.md
    secrets/                  # tuyệt đối không commit (đã nằm trong .orvanta/)
    VERSION                   # schema semver, hiện "1"
```

## `company.json`

```json
{
  "schemaVersion": 1,
  "id": "orvanta-local-<uuid>",
  "name": "Orvanta",
  "createdAt": "2026-10-27T10:00:00.000Z",
  "updatedAt": "2026-10-27T10:00:00.000Z",
  "workspaceRoot": ".",
  "teamName": "orvanta",
  "policies": {
    "hire": "ceo_approve",
    "fire": "ceo_approve",
    "changePurpose": "ceo_approve",
    "changeScope": "ceo_approve",
    "merge": "ceo_approve",
    "spawnEphemeral": "lead_only",
    "firstHireFast": false,
    "budgetUsdPerDay": null
  },
  "coordinatorAgentId": "coordinator",
  "brand": {
    "primary": "indigo",
    "accent": "violet",
    "bg": "navy"
  }
}
```

### Field

| Field | Bắt buộc | Luật |
|---|---|---|
| `schemaVersion` | có | Integer. Loader từ chối > supported. |
| `id` | có | Ổn định suốt đời công ty trên máy này |
| `name` | có | 1–64 ký tự, hiện trên Home header |
| `teamName` | có | Khớp `sanitizeTeamName` của Cline; dùng làm key TeamStore |
| `policies.*` | có | Enum: `ceo_approve` \| `lead_only` \| `allow`. Default `ceo_approve` cho hire/fire/purpose/scope/merge |
| `firstHireFast` | không | Nếu `true`, hire agent đầu tiên auto-approve (vẫn ghi history) |
| `budgetUsdPerDay` | không | `null` = không chặn. Số → decision `over_budget` khi vượt |
| `coordinatorAgentId` | có | Phải tồn tại trong roster |

Không lưu API key trong `company.json`. Key đi theo Cline auth / env.

## `purpose.md`

Markdown, không frontmatter bắt buộc. Đây là điều lệ.

Cấu trúc khuyến nghị (empty-state template):

```markdown
# Purpose

## Chúng ta đang làm gì
[một đoạn]

## Thành công trông như thế nào
- [ ]

## Không làm
- [ ]

## Ràng buộc
- Không đổi scope nếu chưa có quyết định CEO
```

Luật:

- Mọi agent (kể cả coordinator) nhận toàn bộ file này trong system prompt, block riêng, không trộn vào role.
- Chỉ CEO sửa file. Agent `write_to_file` vào `.orvanta/purpose.md` bị purpose-lock từ chối.
- Sửa purpose trên UI → tạo decision `change_purpose` (trừ lần tạo công ty đầu).

## `constraints.md`

Optional. Nếu thiếu, dùng default:

```markdown
- Không sửa purpose.md
- Không hire/fire ngoài inbox
- Không viết code ngoài path mà task đã ghi
- Reviewer không được commit hay apply diff
```

Inject sau purpose, trước role.

## `org/roster.json`

```json
{
  "schemaVersion": 1,
  "agents": [
    {
      "id": "coordinator",
      "displayName": "Coordinator",
      "role": "lead",
      "status": "idle",
      "agentFile": "org/agents/coordinator/profile.md",
      "hiredAt": "2026-10-27T10:00:00.000Z",
      "hiredBy": "ceo",
      "modelId": null,
      "maxIterations": 40
    }
  ]
}
```

| Field | Luật |
|---|---|
| `id` | `^[a-z][a-z0-9_-]{1,31}$`, unique |
| `role` | `lead` \| `teammate` — đúng `TeamMemberSnapshot.role` |
| `status` | `idle` \| `running` \| `stopped` \| `pending_hire` \| `pending_fire` |
| `agentFile` | Relative to `.orvanta/` |
| `modelId` | `null` = thừa kế provider/model session Cline |

Chỉ được có **một** `role: lead`.

`pending_hire`: đã có file agent + decision chưa approve — không spawn runtime. `pending_fire`: còn trên UI, runtime sẽ shutdown khi approve.

## `org/agents/<agentId>/profile.md`

Identity — chỉ CEO sửa. Space ghi nhớ: `org/agents/<agentId>/workspace/`. Luật: [10-agent-spaces.md](./10-agent-spaces.md).

```markdown
---
id: reviewer
description: Adversarial review — tìm bug, xếp severity, không viết code
role: teammate
modelId: null
maxIterations: 25
tools:
  allow: [read_files, list_files, grep, web_fetch]
  deny: [write_to_file, apply_diff, execute_command, team_spawn_teammate]
scopePaths:
  allow: ["**/*"]
  denyWrite: ["**/*"]
---

Bạn là reviewer. Chỉ review. Không implement. Không mở rộng scope.
Khi thấy lệch purpose, mở escalate chứ không tự sửa purpose.
```

Frontmatter:

| Key | Ý nghĩa |
|---|---|
| `tools.allow` / `tools.deny` | Deny thắng allow. Tên tool Cline `snake_case` |
| `scopePaths.denyWrite` | Path agent không được ghi. Reviewer default `**/*` |
| `scopePaths.allow` | Path được đọc. Default `**/*` |

Body = `rolePrompt` đưa vào `team_spawn_teammate`.

## `inbox/pending.json`

```json
{
  "schemaVersion": 1,
  "items": [
    {
      "id": "dec_01J...",
      "type": "hire_agent",
      "status": "pending",
      "createdAt": "2026-10-27T11:00:00.000Z",
      "createdBy": "coordinator",
      "title": "Hire implementer cho auth module",
      "summary": "Cần agent chỉ implement trong src/auth",
      "payload": {},
      "urgency": "normal"
    }
  ]
}
```

Schema payload theo `type` — xem [SPEC-B-ceo-inbox.md](./SPEC-B-ceo-inbox.md).

## `inbox/history.jsonl`

Mỗi dòng một JSON. Append-only. Không sửa, không xóa từ UI (không có “dọn history” trong scope).

```json
{"id":"dec_01J...","type":"hire_agent","status":"approved","resolvedAt":"...","resolvedBy":"ceo","note":""}
```

## `state/snapshot.json`

Chiếu read-only từ `TeamRuntimeState`:

- `members`, `tasks` (id, title, status, assignee, updatedAt), `taskCounts`
- `runs` (id, agentId, status, currentActivity, startedAt)
- `unreadMessages`, `activeRuns`
- `outcomes` counts

Không phải nguồn ghi. Nếu lệch runtime, “Sync” trên Home ghi đè snapshot từ TeamStore.

## `memory/`

Ghi chú người hoặc agent (`save_handoff` style). Path traversal bị chặn: chỉ file trong `memory/`, extension `.md`. Không thực thi.

## `runs/<runId>/`

Optional. Khi run `completed` / `failed`, coordinator có thể ghi `summary.md`. War room và Home link tới đây nếu có.

## `VERSION`

Một dòng: `1`. Đổi schema = tăng số + migration note trong file này (khi tới lúc).

## Load / validate

1. Không có `.orvanta/` → empty state, không tạo thầm.
2. Có folder thiếu `company.json` hoặc `purpose.md` → trạng thái **broken**: banner Home, nút “Sửa công ty” / “Xóa local và lập lại” (xóa phải confirm).
3. `schemaVersion` lạ → không load runtime; hiện “schema không hỗ trợ”.
4. Roster thiếu coordinator → broken.
5. Hai lead → broken.

Tạo công ty = atomic: viết vào `.orvanta/.tmp/` rồi rename. Không để nửa cây.

## Mapping sang Cline

| Orvanta | Cline |
|---|---|
| `company.teamName` | `teamName` / TeamStore key |
| `org/agents/<id>/profile.md` body | `TeamTeammateSpec.rolePrompt` |
| `modelId`, `maxIterations` | `TeamTeammateSpec` |
| `roster.agents[].id` | `TeamMemberSnapshot.agentId` |
| `state/snapshot` | subset `TeamRuntimeState` |
| `.orvanta/` root | `SqliteTeamStoreOptions.teamDir` **nên** trỏ `.orvanta/state/team` hoặc tương đương — không ghi team vào `~/.cline` khi Orvanta active |

Quyết định persist: khi session Orvanta chạy, TeamStore dùng thư mục dưới `.orvanta/`, không `~/.cline/data/teams`. Đó là khác biệt then chốt với Cline mặc định.

## Import từ `.cline/agents/`

Lệnh / nút “Nhập preset”: copy markdown thành `org/agents/<name>/profile.md` + thêm `pending_hire` nếu policy hire = `ceo_approve`. Không watch hai chiều.

## Bảo mật

- Toàn bộ `.orvanta/` gitignore.
- `secrets/` không hiện trong war room stream.
- Không đưa nội dung `secrets/` vào prompt trừ khi CEO gắn file cụ thể.
- Path tool không được `..` ra ngoài workspace.
- Không upload `.orvanta/` lên telemetry.
