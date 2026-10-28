# Capability Map

Một yêu cầu (“công ty AI trong VS Code”) bó nhiều capability độc lập. Map này là index. Mỗi module có spec riêng.

## Module

| Module id | Bề mặt | Trách nhiệm | Phụ thuộc |
|---|---|---|---|
| `schema` | — | Hợp đồng workspace `.orvanta/`, load/validate | — |
| `agent-config` | Home overlay | Sửa `profile.md` (CEO); không đụng space | `schema` |
| `agent-spaces` | cắt ngang | Space / handoff / mailbox; lock path | `schema`, `agent-config` |
| `company-library` | dialog | Lưu/Tải snapshot `%USERPROFILE%/.orvanta/companies/<slug>` | `schema`, `agent-config` |
| `purpose-lock` | cắt ngang | Policy role, tool allow/deny, chặn spawn/scope | `schema` |
| `company-home` | **A** | Purpose, roster, việc đang chạy, badge inbox | `schema` |
| `chat-sidebar` | **C** | Chat Cline + sidebar đội; deep-link từ home | `schema`, `company-home` |
| `ceo-inbox` | **B** | Hàng đợi quyết định, approve/reject/defer, audit | `schema`, `purpose-lock`, `company-home` |
| `war-room` | **D** | Lưới live per-agent, stream, focus một agent | `chat-sidebar`, `company-home` |
| `persistence` | — | Chiếu TeamStore ↔ `.orvanta/state`, restore session | `schema` |
| `brand-shell` | cắt ngang | Icon, màu Indigo/Violet/Navy, empty states | — |

## Phụ thuộc

```
schema ──► agent-config ──► company-library
   │              │
   ├──────────────┴──► company-home
   │
   └──► purpose-lock ──► ceo-inbox
              │
              ▼
         chat-sidebar ──► war-room
              ▲
   persistence ┘
brand-shell ──► mọi UI
```

Không có chu trình. Inbox không phụ thuộc war room. War room không được là điều kiện để home sống.

## Build order (khi bắt đầu code)

```
P1 schema + home
P2 agent-config
P3 company-library
P4 chat-sidebar
P5 spawn + lock min
P6 inbox min
P7 inbox + lock full
P8–P9 war-room
```

Chi tiết task/file/verify: [phases/README.md](./phases/README.md).

Thứ tự này không xóa chức năng khỏi spec. Nó chỉ nói **code cái gì trước**.

## Ranh giới với Cline

| Cline giữ | Orvanta thêm | Cline phải bật/sửa |
|---|---|---|
| Agent loop, tools, approvals | Company home / Inbox / War room | `enableAgentTeams: true` trong session VS Code |
| `TeamRuntimeState` + TeamStore | Chiếu state vào `.orvanta/state` | `teamDir` trỏ workspace (không chỉ `~/.cline`) |
| ChatView, History, Settings | Tab shell A–D, sidebar đội | View mới; ChatView vẫn mounted |
| `.cline/agents/` presets | `.orvanta/org/agents/` là roster công ty | Có thể import preset → roster, một chiều |
| `/team` slash command | Vẫn dùng được; UI là đường chính | Không xóa command |

## Tiêu chí “module xong”

Mỗi module xong khi:

1. Spec của nó (file SPEC hoặc mục tương ứng) có acceptance cụ thể đã được kiểm.
2. Không cần module phía sau để demo giá trị của nó (home demo được dù chưa có war room).
3. Checklist trong [CHECKLIST.md](./CHECKLIST.md) của module đó tick được.

## Id ổn định

Không đổi `schema`, `agent-config`, `agent-spaces`, `company-library`, `purpose-lock`, `company-home`, `chat-sidebar`, `ceo-inbox`, `war-room`, `persistence`, `brand-shell` giữa chừng. Spec, checklist, PR sau này chọn việc bằng các id này.
