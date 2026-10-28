# Spec A — Company home

Module id: `company-home`. Ngôi nhà của Orvanta. Implement trước B và D.

## Objective

CEO mở Orvanta và trong **một màn hình** biết: công ty này vì đâu, ai đang ở, việc gì đang chạy, có quyết định nào chờ — rồi đi tiếp Inbox / Chat / War room mà không đoán.

## User stories

1. Là CEO, tôi muốn thấy purpose ngay, để nhớ đội đang phục vụ gì.
2. Là CEO, tôi muốn thấy roster và trạng thái từng agent, để biết ai rảnh / ai chạy / ai chờ hire.
3. Là CEO, tôi muốn thấy task đang `in_progress` và `blocked`, để không phải đọc hết transcript.
4. Là CEO, tôi muốn thấy 3 decision mới nhất và số pending, để không bỏ sót Inbox.
5. Là CEO, tôi muốn lập công ty từ empty state, không sửa file bằng tay.
6. Là CEO, tôi muốn sửa purpose từ home (qua decision), không mở explorer.
7. Là CEO, tôi muốn hire/fire từ roster (tạo decision), không nhớ tên tool.
8. Là CEO, tôi muốn click task / agent để nhảy Chat hoặc War room.
9. Là CEO, tôi muốn biết run bị interrupted sau khi tắt máy.
10. Là CEO, tôi muốn biết công ty broken và sửa được.

## Bố cục màn hình

```
┌─ Header ─────────────────────────────────────────────┐
│ [Logo]  {company.name}                 [Sync] [···]  │
│ Mục tiêu · {một dòng rút từ purpose H1/đoạn 1}       │
├─ Purpose ────────────────────────────────────────────┤
│ purpose.md render markdown (clamp 8 dòng + Expand)   │
│ [Sửa purpose]                                        │
├─ Roster ─────────────────────────────────────────────┤
│ [Hire]                                               │
│ ┌────────┐ ┌────────┐ ┌────────┐                     │
│ │ coord  │ │ impl   │ │ review │                     │
│ │ idle   │ │ running│ │ idle   │                     │
│ └────────┘ └────────┘ └────────┘                     │
├─ Work now ───────────────────────────────────────────┤
│ In progress (n)   Blocked (n)   Queue (n)            │
│ list task: title · assignee · updated · [mở]         │
├─ Inbox teaser ───────────────────────────────────────┤
│ {n} quyết định chờ · [Mở inbox]                      │
│ · hire implementer · 2m ago                          │
│ · merge auth · 10m ago                               │
├─ Health (nếu có) ────────────────────────────────────┤
│ Interrupted runs: 2  [Tiếp tục]                      │
│ Purpose-lock denies hôm nay: 4                       │
└──────────────────────────────────────────────────────┘
```

**Chốt:** A–D nằm **cùng sidebar** (~320–400px). Một cột. Roster wrap nếu đủ rộng. War room không đòi 2 cột.

## Chi tiết từng vùng

### Header

- Tên công ty: `company.name`. Click không làm gì (không có trang settings công ty riêng ở pha này — settings nằm menu `···`).
- Dòng mục tiêu: 80–120 ký tự đầu của purpose (bỏ heading mark).
- **Sync:** đọc TeamStore, ghi `state/snapshot.json`, toast “Đã đồng bộ” / lỗi.
- **Menu `···`:**
  - Mở `.orvanta/` trong explorer
  - Xuất purpose ra clipboard
  - Xóa công ty (confirm 2 bước: gõ tên công ty)
  - Xem `company.json` (read-only webview panel)

### Purpose

- Render markdown an toàn (không thực thi HTML).
- Clamp 8 dòng; `Expand` / `Collapse`.
- `Sửa purpose`:
  - Mở editor 2 cột: hiện tại | draft.
  - Save → decision `change_purpose` (trừ khi công ty vừa tạo và purpose chưa lock — lần tạo đã ghi rồi, mọi sửa sau = decision).
  - Cancel → bỏ draft.

### Roster

Mỗi card:

| Element | Nguồn |
|---|---|
| displayName + id | roster |
| role badge | `lead` / `teammate` / `guest` không hiện ở đây |
| status pill | `idle` / `running` / `stopped` / `pending_hire` / `pending_fire` |
| model | `modelId` hoặc “default” |
| task hiện tại | run `running` của agent, title task |
| menu | Chat với… · War room · Sửa role · Fire |

- `Sửa role` → decision `change_role` (payload: frontmatter mới).
- `Hire` mở form:
  - `id` (validate regex)
  - displayName
  - template: `implementer` | `reviewer` | `researcher` | `skeptic` | `blank`
  - model override
  - maxIterations
  - preview tools allow/deny (sửa được trước submit)
  - Submit → ghi file + `pending_hire` + decision `hire_agent`

Sắp xếp card: lead trước, rồi `running`, rồi `idle`, rồi pending, rồi stopped.

### Work now

Ba nhóm, default mở In progress + Blocked, Queue collapsed nếu > 5.

Mỗi hàng task:

- status icon
- title
- assignee (hoặc “unassigned”)
- relative time `updatedAt`
- dependsOn: hiện “chờ {n}” nếu chưa ready (`isReady` Cline)
- actions: Mở Chat (prefill “về task {id}”) · Filter War room · Escalate (nếu blocked)

Empty: “Chưa có việc. Nói với coordinator trên Chat.”

Ceiling: hiện 20 task/nhóm, “Xem tất cả” → panel list đầy đủ (cùng tab Home, view `all-tasks`).

### Inbox teaser

- Số pending + 3 item mới nhất (title, type, relative time).
- Click item → `orvanta://view/inbox?focus={id}`.
- Click “Mở inbox” → tab B.
- 0 pending: “Không có quyết định chờ.” Không ẩn vùng — CEO cần tin rằng đã nhìn.

### Health

Hiện khi:

- `interrupted` runs > 0
- company broken
- last-sync older than 10 phút và có session đang mở (dot “có thể lệch”)
- purpose-lock deny count hôm nay > 0 (từ mission log / local counter)

**Tiếp tục:** gửi steer cho coordinator: resume interrupted runs, không tự spawn agent mới.

## Empty / broken / no-folder

### Empty (không có `.orvanta/`)

- Headline: “Lập công ty cho folder này”
- Fields: name (default = tên folder), purpose textarea (template), coordinator model dropdown
- Primary: “Lập công ty”
- Secondary: “Nhập preset từ `.cline/agents/`” (nếu folder đó tồn tại)

### No folder

- “Mở một folder workspace để lập công ty.” Không hiện form.

### Broken

- Danh sách lỗi validate (thiếu purpose, hai lead, schema lạ).
- Actions: khôi phục template file thiếu | xóa và lập lại.

## Trạng thái UI

| State | Hành vi |
|---|---|
| loading | Skeleton 3 block, không flash empty |
| ready | Layout đầy đủ |
| syncing | Header Sync spinner, không block tương tác |
| error-sync | Banner, data stale, nút thử lại |
| first-run-saving | Disable form, progress “Đang ghi .orvanta” |

## Accessibility

- Tab order: header → purpose → roster → work → inbox.
- Status không chỉ bằng màu: kèm text (`running`).
- Card agent là button/group có `aria-label="{name}, {role}, {status}"`.
- Contrast trên Dark Navy: text ≥ 4.5:1; badge Violet không dùng chữ Navy mỏng.

## Brand

- Header nền Dark Navy, accent gạch dưới Indigo khi Home active.
- Status `running` = Violet pulse nhẹ (không flash).
- `blocked` = không dùng chỉ red raw; dùng amber + chữ “blocked”.

## Mapping runtime

| UI | Nguồn |
|---|---|
| Purpose | `.orvanta/purpose.md` |
| Roster | `org/roster.json` + members/runs TeamStore |
| Work now | `TeamRuntimeState.tasks` |
| Inbox teaser | `inbox/pending.json` |
| Interrupted | `runs` status `interrupted` |
| Sync | TeamStore → `state/snapshot.json` + `last-sync.json` |

## Không thuộc A

- Approve/reject (đó là B)
- Composer chat (C)
- Stream token (D)
- Settings provider Cline (Settings Cline)

## Acceptance

- [ ] Empty state lập được công ty, tạo đủ file tối thiểu (`company.json`, `purpose.md`, roster + coordinator.md, VERSION)
- [ ] Reload window: home hiện lại cùng purpose + roster, không form empty
- [ ] Roster phản ánh `running` trong ≤ 1s sau khi run start (khi session live)
- [ ] Teaser inbox khớp số pending
- [ ] Broken state khi xóa purpose.md
- [ ] No-folder không tạo `.orvanta` ở user home
- [ ] Sync không ghi đè purpose/roster
- [ ] Sửa purpose tạo decision, chưa approve thì file trên đĩa không đổi
- [ ] Hire từ home không spawn trước khi approve
- [ ] Click task mở Chat với context task id
- [ ] Interrupted banner sau khi kill window giữa run (hoặc mô phỏng)
- [ ] Sidebar hẹp 320px: không overflow ngang
- [ ] ChatView vẫn mounted khi đang ở Home

## Open questions (A)

- Có cần “OKR tuần” trên home không? **Không** — purpose đủ.
- Multi-root: **đã chốt** — folder nào có `.orvanta/` thì dùng; không có thì `workspaceFolders[0]`. Hai folder cùng có `.orvanta/`: lấy folder **đầu tiên trong list** (hiếm; không merge).
