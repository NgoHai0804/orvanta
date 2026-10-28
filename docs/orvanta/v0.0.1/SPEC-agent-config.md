# Spec — Cấu hình từng agent

Module id: `agent-config`. CEO sửa một agent như sửa nhân sự: model, prompt, tool, path. Ghi **ngay** vào workspace `.orvanta/`.

## Objective

Mỗi agent trên roster có một hồ sơ đủ để:

1. Người đọc hiểu role trong 10 giây
2. Runtime spawn đúng `rolePrompt` + model + maxIterations
3. Purpose-lock đọc allow/deny + denyWrite
4. Snapshot thư viện copy nguyên hồ sơ sang máy/folder khác

## File trên đĩa (workspace)

` <workspace>/.orvanta/org/agents/<agentId>/profile.md `

Space (agent tự ghi, editor CEO chỉ xem): `org/agents/<agentId>/workspace/`. Agent **không** được ghi `profile.md`. Xem [10-agent-spaces.md](./10-agent-spaces.md).

```markdown
---
id: implementer
displayName: Implementer
description: Viết code trong scope task, không nới epic
role: teammate
providerId: null
modelId: null
maxIterations: 40
temperature: null
tools:
  allow: [read_files, write_to_file, apply_diff, execute_command, grep, list_files]
  deny: [team_spawn_teammate]
scopePaths:
  allow: ["**/*"]
  denyWrite:
    - ".orvanta/purpose.md"
    - ".orvanta/company.json"
    - ".orvanta/org/roster.json"
---

Bạn là implementer của công ty này.
Chỉ làm đúng task được giao. Không sửa purpose. Không hire.
```

`id` trong frontmatter **phải** khớp tên file (`implementer.md`) và `roster.agents[].id`.

### Field — hợp đồng TypeScript

Đặt tại `sdk/packages/shared/src/orvanta/agent-profile.ts` (P2). Zod bắt buộc.

```ts
export const AGENT_ID_RE = /^[a-z][a-z0-9_-]{1,31}$/

export type AgentRole = "lead" | "teammate"

export interface AgentProfileFrontmatter {
  id: string
  displayName: string
  description: string
  role: AgentRole
  providerId: string | null
  modelId: string | null
  maxIterations: number
  temperature: number | null
  tools: {
    allow: string[]
    deny: string[]
  }
  scopePaths: {
    allow: string[]
    denyWrite: string[]
  }
}

export interface AgentProfile extends AgentProfileFrontmatter {
  /** Markdown body after frontmatter — đây là rolePrompt */
  instructions: string
  filePath: string // relative to .orvanta/, e.g. org/agents/implementer/profile.md
}
```

Luật validate:

| Field | Luật |
|---|---|
| `id` | `AGENT_ID_RE`, unique trong roster |
| `displayName` | 1–48 ký tự |
| `description` | 0–200 ký tự |
| `role` | đúng một `lead` trong cả roster |
| `providerId` / `modelId` | `null` = thừa kế session Cline đang mở |
| `maxIterations` | integer 1–200, default 40 |
| `temperature` | `null` hoặc 0–2 |
| `tools.deny` thắng `tools.allow` |
| `instructions` | trim, không rỗng khi Save |
| Tên tool | `snake_case`, phải nằm trong catalog host biết (unknown → warning, vẫn lưu) |

Coordinator (`role: lead`) luôn có `id` = `company.coordinatorAgentId`. Không đổi id lead trong editor (disable field).

## UI — Agent editor

Mở từ: Home roster card → “Sửa” / click card. Overlay giống Settings (không unmount ChatView).

```
┌─ Agent: Implementer ──────────────────── [Lưu] [Đóng] ─┐
│ Id          [implementer    ]  (disable nếu đã hire runtime) │
│ Tên         [Implementer    ]                               │
│ Mô tả       [Viết code…     ]                               │
│ Role        ( ) lead  (•) teammate                          │
│ Provider    [Kế thừa session ▾]                             │
│ Model       [Kế thừa session ▾]                             │
│ Max iter    [40]   Temperature [kế thừa]                    │
│ Tools allow [chip + add]   Tools deny [chip + add]          │
│ Đọc path    [**/*]                                          │
│ Cấm ghi     [.orvanta/purpose.md] [+]                       │
│────────────────────────────────────────────────────────────│
│ Instructions (textarea markdown, min 6 dòng)                │
│ …                                                           │
└─────────────────────────────────────────────────────────────┘
```

- **Lưu** ghi file + cập nhật roster (`displayName`, `modelId`, `maxIterations`, `agentFile`). Không tạo Inbox decision.
- **Đóng** với dirty buffer → confirm “Bỏ thay đổi?”
- Template khi **Thêm agent** trên Home: `implementer` | `reviewer` | `researcher` | `skeptic` | `blank` — điền default tools (xem 06-purpose-lock) rồi mở editor.
- Xóa agent: confirm → xóa file + bỏ roster. Nếu runtime đang chạy: P5+ mới shutdown; P2 chỉ xóa đĩa, không có runtime.

## Template mặc định (code cứng P2)

Xem bảng default tools trong [06-purpose-lock.md](./06-purpose-lock.md). Coordinator template tạo ở P1 (lập công ty). P2 thêm 4 template teammate.

Mỗi template = file trong `sdk/packages/shared/src/orvanta/templates/*.md` (hoặc `.ts` export string). Không đọc từ mạng.

## Mapping runtime (P5+, không làm ở P2)

`AgentProfile` → `TeamTeammateSpec`:

```
agentId      ← id
rolePrompt   ← instructions
modelId      ← modelId ?? session.modelId
maxIterations← maxIterations
```

Tool policy áp lớp 2 purpose-lock, không nhét vào `rolePrompt`.

## Acceptance

- [ ] Sửa coordinator, reload window, instructions còn
- [ ] Thêm reviewer từ template, file + roster đúng
- [ ] Validate chặn id `Reviewer` (hoa), id trùng, instructions rỗng
- [ ] Không được có hai lead
- [ ] `null` model không ghi string `"null"`
- [ ] Deny write luôn chứa 3 path purpose/company/roster (editor prepend, user không xóa hết được)
- [ ] Dirty close confirm
- [ ] Không ghi lên `%USERPROFILE%\.orvanta` (đó là P3 Lưu công ty)

## Không thuộc module này

- Save/Load thư viện user (P3)
- Inbox hire
- Spawn teammate
- Chat 1:1
