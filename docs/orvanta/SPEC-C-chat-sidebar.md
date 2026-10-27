# Spec C — Chat + sidebar đội

Module id: `chat-sidebar`. Nơi CEO nói chuyện. **Không viết lại ChatView.**

## Objective

Giữ toàn bộ sức mạnh chat Cline (tool, approval, history, streaming một coordinator) và thêm **sidebar đội** + **nhắm agent**, để chat là 1:1 hoặc 1:lead trong một công ty đang hiện trên Home — không phải chatbot vô danh.

## User stories

1. Tôi muốn chat như Cline hôm nay, không mất phím, không mất ask-promise khi sang Home.
2. Tôi muốn thấy đội cạnh transcript: ai idle / running / blocked.
3. Tôi muốn click một agent để nói riêng, rồi quay lại coordinator.
4. Tôi muốn composer hiện “Đang nói với {name}”.
5. Tôi muốn task/decision từ A/B mở chat đã có context.
6. Tôi muốn slash `/team` vẫn chạy, nhưng UI là đường chính.
7. Tôi muốn sidebar trống và giải thích khi chưa có công ty — chat vẫn dùng như Cline.
8. Tôi muốn thấy agent bị purpose-lock deny vừa rồi trên sidebar (dot).
9. Tôi muốn không vô tình biến mình thành lead runtime.
10. Tôi muốn mở War room từ sidebar khi muốn nhìn stream nhiều agent.

## Kiến trúc UI

```
┌─ Chat tab ───────────────────────────────────────────┐
│ ┌─ Sidebar 160–220px ─┬─ ChatView (existing) ───────┐│
│ │ Coordinator ★       │ transcript                   ││
│ │ Implementer ● run   │ …                            ││
│ │ Reviewer            │ composer                     ││
│ │                     │ “Nói với: Implementer”       ││
│ │ [War room]          │                              ││
│ └─────────────────────┴──────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

- Sidebar **chỉ hiện khi đã có công ty**. Chưa có: ChatView full width (Cline nguyên bản).
- ChatView `isHidden` khi tab A/B/D — không unmount.
- Width sidebar kéo được, nhớ trong VS Code state, min 140, max 280.

## Sidebar

Mỗi hàng agent:

- displayName
- status icon + text
- current task title (một dòng, ellipsis)
- lock-deny dot nếu agent đó bị deny trong 5 phút gần nhất
- `★` cho lead
- selected ring Indigo

Thứ tự: lead, running, idle, pending_*, stopped (stopped collapsed mặc định).

Guest ephemeral: nhóm “Tạm thời”, chữ phụ “hết khi đóng session”.

Footer sidebar:

- `Mở War room`
- `Hire` (deep-link Home hire hoặc Inbox draft) — không hire trong sidebar form để tránh hai form

Click hàng:

- Set `chatFocusAgentId`
- Không đổi session Cline chính (vẫn một session lead) trừ khi gửi tin — xem “Nhắm agent”

## Nhắm agent (steer)

Mặc định `chatFocusAgentId = coordinator`.

Composer:

- Chip: “Nói với {displayName}” + X về coordinator
- Placeholder đổi: “Chỉ đạo implementer…” / “Nói với coordinator…”

Khi gửi:

| Focus | Hành vi |
|---|---|
| coordinator / lead | `cline.start` / tin user bình thường như Cline |
| teammate đang tồn tại | Gửi qua `team_send_message` hoặc API tương đương (mailbox + optional `team_run_task` follow-up). Transcript chính hiện một bubble hệ thống: “→ {agent}: {text}” và sau đó hiện reply khi có |
| teammate stopped | Disable composer, “Agent đã dừng. Hire lại từ Home.” |
| pending_hire | Disable, “Chờ duyệt hire.” |

**Không** tạo ClineCore session thứ hai làm default cho 1:1 (phức tạp, mất approval UX). 1:1 = mailbox + run. War room mới là nơi xem stream teammate.

Nếu CEO cần full tool loop với một agent như chat chính: action “Mở session riêng” (pha sau, optional). Spec C tối thiểu **không** yêu cầu multi-session chat. Ghi rõ để khỏi phình.

### Context đính kèm khi mở từ A/B

Query:

- `?task={taskId}` → prefills composer một dòng ẩn system: “CEO đang nói về task {id}: {title}.” Hiện chip “Task: {title}” trên composer, X để bỏ.
- `?decision={id}` → chip “Decision: {title}”
- `?agent={id}` → set focus

## Transcript

Giữ nguyên Cline:

- assistant stream
- tool approval cards
- images, code, plan

Thêm marker Orvanta (nhẹ):

- Khi lead gọi `team_run_task`: card “Đã giao {task} → {agent}” click → War room filter
- Khi `orvanta_request_decision`: card “Xin CEO: {title}” click → Inbox focus
- Khi purpose-lock deny: card “Bị khóa: {tool} · {agent}”

Không vẽ lại toàn bộ tool UI.

## Slash / lệnh

- `/team <task>` giữ như `apps/cli` / ACP: spawn team cho task. Khi có công ty, `/team` **không** tạo teamName mới — dùng `company.teamName`.
- Không thêm `/hire` nếu đã có UI (tránh hai đường). Có thể thêm sau.

## Session & teams flag

Khi workspace có công ty hợp lệ, session factory VS Code:

- `enableAgentTeams: true` (hiện đang hardcode `false` trong `cline-session-factory.ts`)
- `teamName: company.teamName`
- `teamDir` dưới `.orvanta/`
- Inject purpose-lock vào tool pipeline

Khi không có công ty: giữ hành vi Cline hiện tại (`enableAgentTeams: false` trừ user tự bật sau này — **không** tự bật).

## Chưa có công ty

- Sidebar ẩn
- Banner mỏng phía trên chat (dismissible 7 ngày): “Lập công ty trên Home để quản lý đội.” Không chặn chat.

## Accessibility

- Sidebar `nav` + `aria-label="Đội"`
- Hàng agent: `aria-current` khi selected
- Chip composer đọc được bởi screen reader
- Focus composer giữ khi đổi agent (không mất nội dung đang gõ — confirm “đổi người nhận?” nếu buffer > 0)

## Brand

- Sidebar nền Navy hơn panel chat một bậc
- Selected = Indigo bar 2px trái
- Running = Violet dot

## Không thuộc C

- Grid stream nhiều cột (D)
- Form lập công ty (A)
- Approve/reject (B)
- Viết lại ChatView, History, Settings

## Acceptance

- [ ] Sang Home/Inbox/War room rồi về Chat: input còn, ask-promise còn
- [ ] Không có `.orvanta/`: chat full width, teams flag off
- [ ] Có công ty: sidebar hiện roster khớp Home
- [ ] Click teammate: chip composer đổi; gửi tạo mailbox/run, không đổi lead session
- [ ] Gửi khi focus lead: hành vi Cline cũ
- [ ] Deep-link task/decision/agent đúng chip + focus
- [ ] Card tool `team_run_task` và `orvanta_request_decision` click đi đúng chỗ
- [ ] `/team` dùng `company.teamName`
- [ ] `enableAgentTeams` true chỉ khi company valid
- [ ] TeamStore không ghi `~/.cline/data/teams` khi Orvanta active
- [ ] Stopped/pending_hire disable composer đúng
- [ ] Đổi focus khi đang gõ: confirm nếu buffer không rỗng
- [ ] Sidebar ẩn/hiện không unmount ChatView
- [ ] Guest ephemeral hiện nhóm riêng

## Open questions (C)

- Session riêng per teammate: để pha sau. Nếu CEO đòi “chat đầy đủ với reviewer”, mở lại câu này.
- Có hiện mailbox nội bộ agent↔agent trên transcript lead không? **Đề xuất:** không, trừ khi lead được cc. Tránh spam. War room / mission log là chỗ xem.
