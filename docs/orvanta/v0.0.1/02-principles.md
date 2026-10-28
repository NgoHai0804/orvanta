# Nguyên tắc thiết kế

## 1. Công ty trước, chat sau

Home (A) là ngôi nhà. Chat (C) là cách nói chuyện. War room (D) là cách nhìn. Inbox (B) là cách giữ mục tiêu.

Không đảo: không thiết kế Orvanta như “Cline thêm tab”.

## 2. Một nguồn sự thật

- Hiến pháp và roster sống trong `.orvanta/`.
- Runtime (tasks, runs, mailbox, mission log, outcomes) sống trong TeamStore Cline, được **chiếu** vào `.orvanta/state/` khi cần debug / khôi phục.
- UI không được giữ bản copy lệch. Mọi màn A–D đọc cùng store.

## 3. Tái sử dụng runtime, không viết lại

Cline đã có:

- `TeamRuntimeState` (members, tasks, mailbox, missionLog, runs, outcomes)
- Tool: `team_spawn_teammate`, `team_task`, `team_run_task`, `team_send_message`, …
- ChatView (không unmount — giữ input và ask-promise)
- Approval tool sẵn có trong extension

Orvanta thêm: **hiến pháp, purpose-lock, inbox CEO, bốn màn hình, persistence theo workspace**.

Cấm: viết orchestrator thứ hai, queue thứ hai, “agent loop” riêng.

## 4. Purpose-lock là product, không phải lời nhắc

System prompt không đủ. Lock phải có răng:

- Role file + tool policy (reviewer không `write_to_file`; nộp bài bằng `orvanta_submit_handoff`)
- Quyết định loại `change_purpose` / `change_scope` / `hire_agent` bắt buộc qua Inbox
- Coordinator bị từ chối nếu gọi `team_spawn_teammate` khi policy = `ceo_approve`
- Mission log ghi mọi lần agent cố vượt role

Chi tiết: [06-purpose-lock.md](./06-purpose-lock.md).

## 5. Local-first, hai kho, không lên git

Workspace `<folder>/.orvanta/` chứa prompt, roster, memory, run. Gitignore. Clone máy khác = trống **trừ khi** CEO đã Lưu lên `%USERPROFILE%/.orvanta/companies/<slug>/` và Tải lại.

Lưu là chủ động, không auto. Snapshot chỉ điều lệ + đội — xem [09-two-stores.md](./09-two-stores.md).

## 5b. Authoring ≠ runtime hire

CEO sửa agent trên Home/Editor: ghi thẳng workspace. Coordinator xin thêm người lúc đang chạy: Inbox. Không bắt Inbox cho mỗi lần sửa prompt.

## 6. CEO không bị spam

Inbox chỉ nhận việc **không đảo ngược được** hoặc **đổi mục tiêu**. Mọi thứ khác là noise.

Có → hire, fire, đổi purpose, đổi scope, merge lớn, chi phí vượt ngưỡng, escalate blocked quá hạn.

Không có → “đã đọc file X”, “đang chạy tesst”, “cần confirm `ls`”.

## 7. Đơn giản hơn “nền tảng agent”

Một workspace = một công ty. Một CEO. Một coordinator (lead). Không org lồng nhau, không multi-company trong một folder, không marketplace.

## 8. Fail visible

Run `interrupted` khi tắt VS Code phải hiện trên home. Agent `blocked` phải hiện trên home và có thể leo inbox. Không nuốt lỗi trong transcript.

## Always / Ask first / Never

**Always**

- Đọc purpose + roster trước khi spawn bất kỳ agent nào
- Ghi quyết định CEO vào inbox history (kể cả reject)
- Giữ ChatView mounted
- Gitignore `.orvanta/`

**Ask first (CEO)**

- Hire / fire / đổi role
- Đổi purpose hoặc nới scope
- Merge / apply diff khi policy `ceo_approve`
- Đổi model đắt / vượt ngân sách session
- Bật war room stream nếu cost/token hiện trên UI

**Never**

- Commit `.orvanta/`
- Lead tự spawn teammate bền mà không qua policy
- Agent sửa `purpose.md` trực tiếp
- Rebuild Cline Agent / ClineCore loop
- Marketplace, multi-user, AI CEO tự trị trong scope hiện tại
- Xóa test fail để “cho xanh”

## Not Doing (và vì sao)

| Không làm | Lý do |
|---|---|
| Orchestrator mới | Cline teams đã có task/run/mailbox |
| Desktop / CLI Orvanta riêng (pha này) | Surface đã chốt = VS Code |
| Sync `.orvanta` lên cloud | User một máy; secret risk |
| Agent tự sửa purpose | Phá CEO nhẹ |
| Multi-company / team-of-teams | Phức tạp chưa có job |
| Marketplace preset cộng đồng | Sản phẩm public bị loại |
| Voice, mobile, Slack bot | Không phải job hiện tại |
| Billing / seat | Một user |
| War room 3D / canvas vô hạn | Spectacle, không purpose-lock |

## Tension đã chấp nhận

- **Tự chủ vs đúng mục tiêu:** tự chủ chỉ bên trong purpose đã duyệt. Ngoài purpose = inbox.
- **Gitignore vs portable:** mất công ty khi đổi máy. Chấp nhận đến khi có export.
- **A-first vs tầm nhìn A–D:** spec đủ bốn màn; code theo pha. Không cắt chức năng khỏi tài liệu.
