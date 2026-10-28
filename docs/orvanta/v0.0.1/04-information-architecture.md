# Information Architecture

## Shell

Orvanta sống trong VS Code webview hiện có (`apps/vscode/webview-ui`). **Chốt:** cả A–D trong **cùng sidebar** (~320–400px). Không editor panel, không cửa sổ hai. War room 1 cột.

```
┌─ VS Code ──────────────────────────────────────────────┐
│ Activity Bar                                           │
│  [Orvanta]  ← icon Indigo, badge số inbox nếu > 0      │
│                                                        │
│  ┌─ Webview ─────────────────────────────────────────┐ │
│  │ Top bar:  Home   Inbox(3)   Chat   War room       │ │
│  │           [A]    [B]        [C]    [D]            │ │
│  │───────────────────────────────────────────────────│ │
│  │ Nội dung view active                              │ │
│  └───────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Quy tắc shell

- **Một view active** tại một thời điểm trên top bar.
- **ChatView không bị unmount** khi đổi tab (giữ nguyên pattern Cline: `isHidden`). Đổi sang Home/Inbox/War room chỉ ẩn chat, không hủy session.
- History / Settings / MCP / Account / Worktrees của Cline vẫn overlay như cũ; chúng không phải tab Orvanta.
- Badge Inbox = số decision `pending`. Hiện trên tab Inbox **và** trên Activity Bar.
- Deep-link **nội bộ webview** (không đăng ký protocol OS `orvanta://`): `{ view, focus, task, agent, decision }`. Sau này có thể map `vscode://saoudrizwan.claude-dev/orvanta?...` — không bắt buộc P1–P7.

## Top bar

| Tab | View | Shortcut đề xuất | Badge |
|---|---|---|---|
| Home | A | `Alt+1` | Không. Có “blocked” dot nếu task blocked > 0 |
| Inbox | B | `Alt+2` | Số pending |
| Chat | C | `Alt+3` | Agent đang `running` (dot) |
| War room | D | `Alt+4` | Số run `running` |

Shortcut có thể đổi; không đụng keybinding Cline cốt lõi (`Cmd/Ctrl+L` nếu đang dùng).

## Cây điều hướng

```
Home (A)
 ├─ Purpose card → edit purpose (tạo decision change_purpose nếu đã lock)
 ├─ Roster
 │   ├─ Agent card → Chat focus agent (C) | War room focus (D)
 │   ├─ Hire → tạo draft decision hire_agent (B)
 │   └─ Fire → tạo draft decision fire_agent (B)
 ├─ Work now
 │   ├─ Task → Chat “nói về task này” | War room filter task
 │   └─ Blocked task → Escalate (B)
 └─ Inbox teaser (3 item mới nhất) → Inbox (B)

Inbox (B)
 ├─ Pending list → Decision detail
 │   ├─ Approve / Reject / Defer
 │   └─ “Mở chat về quyết định này” → C
 └─ History (approved/rejected)

Chat (C)
 ├─ Sidebar đội (luôn)
 │   ├─ Coordinator (lead)
 │   ├─ Teammates + status
 │   └─ Click = filter transcript / steer target
 └─ Transcript + composer (ChatView hiện tại)

War room (D)
 ├─ Grid agent cards (stream)
 ├─ Click card → expand transcript agent đó
 └─ “Nói với agent này” → C focus
```

## Trạng thái workspace

| Trạng thái | Home hiện | Inbox | Chat | War room |
|---|---|---|---|---|
| Chưa có `.orvanta/` | Empty: “Lập công ty” | Disabled + tooltip | Chat Cline thường, sidebar trống | Empty: “Chưa có đội” |
| Có company, roster trống | Purpose + CTA hire | Có thể có draft hire | Sidebar chỉ coordinator | Một cột coordinator |
| Có đội, không run | Roster idle + task board | Bình thường | Sidebar idle | Card idle |
| Có run | Work now live | Quyết định mới đẩy vào | Dot running | Stream |
| Workspace không phải folder | Banner: mở folder | Disabled | Chat vẫn dùng được | Disabled |

## First-run (chưa có công ty)

1. Mở Orvanta → Home empty state.
2. Form tối thiểu: **tên công ty**, **purpose** (1–3 đoạn), **coordinator model** (default theo setting Cline).
3. Ghi `.orvanta/company.json` + `purpose.md` + coordinator trong roster.
4. Không tự hire thêm agent. CEO hire qua Inbox (hoặc CTA “Hire” trên home — vẫn tạo decision, auto-approve nếu policy `first_hire_fast` — xem SPEC-B).

## Cross-view consistency

- Đổi purpose trên Home (sau khi approve) phải hiện câu purpose mới trên sidebar Chat và header War room trong cùng tick UI.
- Approve hire trên Inbox → agent xuất hiện trên Home roster, Chat sidebar, War room grid ngay.
- Reject hire → không bao giờ xuất hiện ở ba nơi kia.
- Task chuyển `completed` trên runtime → Home Work now bỏ nó; War room card về idle.

## Overlay Cline không đụng

Không nhét A–D vào Settings hay Marketplace. Không thay Onboarding Cline bằng Orvanta (trừ khi workspace đã có `.orvanta/` thì skip welcome Cline? **Không** — giữ onboarding Cline; Orvanta empty state là onboarding công ty, tách biệt).
