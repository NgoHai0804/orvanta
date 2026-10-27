# User journeys

Mọi journey giả định: VS Code mở một folder workspace, extension Orvanta (fork Cline) đã cài, đã có LLM credential.

## J1 — Lập công ty lần đầu

1. Click icon Orvanta.
2. Home empty: tiêu đề “Chưa có công ty trong folder này”.
3. Nhập tên, purpose (template sẵn 3 mục), chọn model coordinator (default).
4. Submit → `.orvanta/` được tạo atomic; coordinator vào roster `idle`.
5. Home hiện purpose + roster 1 người + Work now trống + Inbox 0.
6. Chat vẫn dùng được ngay: nói với coordinator “chia việc cho purpose này”.

**Thất bại:** không có folder mở → không cho submit, bảo Open Folder. Ghi đĩa fail → banner, không để folder nửa vời.

## J2 — Hire implementer + reviewer (CEO nhẹ)

Hai đường (không trộn):

- **Chưa có session teams (P2 authoring):** Home → Thêm agent → editor → Lưu thẳng `profile.md` + roster `idle`. Không Inbox.
- **Session teams đang live (P6+):** Home → Hire → `pending_hire` + Inbox `hire_agent` → Approve mới spawn.

Journey dưới là đường **live**:

1. Home → Hire. Form: id, displayName, chọn template role (implementer/reviewer/custom), model, tools default.
2. Submit → `org/agents/<id>/profile.md` được ghi, status `pending_hire`, decision `hire_agent` vào Inbox.
3. Badge Inbox = 1. Activity Bar badge = 1.
4. CEO mở Inbox, đọc payload (role, deny list), Approve.
5. Agent `idle` trên roster, sidebar Chat, một card War room.
6. Coordinator được steer: “implementer và reviewer đã vào đội”.

**Reject:** file agent xóa hoặc chuyển `archive/`; không spawn. History ghi rejected.

**firstHireFast = true:** bước 4 tự approve, history vẫn có dòng approved by `policy`.

## J3 — Giao mục tiêu, đội tự chia

1. CEO mở Chat, nói: “Làm X trong phạm vi purpose. Chia việc. Đừng nới scope.”
2. Coordinator tạo task bằng `team_task` (trong purpose) → hiện Home Work now.
3. Coordinator `team_run_task` cho implementer.
4. Implementer làm, reviewer nhận task review phụ thuộc.
5. CEO không được hỏi từng file. Home hiện task `in_progress`. War room (nếu mở) stream.

**Lệch scope:** coordinator tạo task ngoài purpose → task `blocked` + decision `change_scope`. CEO Approve thì chạy; Reject thì task canceled, log `decision`.

## J4 — Xuyên session

1. Đang có 2 run `running`. CEO tắt VS Code.
2. Runtime đánh `interrupted` (Cline đã có).
3. Mở lại, Home: banner “2 run bị gián đoạn”, task vẫn `in_progress`.
4. CTA “Tiếp tục” → coordinator nhận prompt resume từ snapshot; không tạo công ty mới.
5. Roster giữ nguyên. Purpose giữ nguyên. Inbox pending giữ nguyên.

## J5 — Duyệt merge

1. Implementer xong; outcome `in_review` hoặc bộ diff chờ apply.
2. Policy merge = `ceo_approve` → decision `merge` kèm tóm tắt file + link diff.
3. CEO Approve → apply / finalize outcome.
4. Reject → implementer nhận mailbox: lý do CEO (bắt buộc 1 câu khi reject merge).

## J6 — Fire agent

1. Home agent card → Fire. Lý do bắt buộc.
2. Decision `fire_agent`. Agent `pending_fire` (vẫn thấy, không nhận task mới).
3. Approve → `team_shutdown_teammate`, status `stopped`, thư mục `org/agents/<id>/` chuyển `org/agents/_archive/<id>/`.
4. Task đang assign được unassign, về `pending` hoặc `blocked`.

## J7 — Chỉ đạo một agent (player-coach)

1. Từ Home hoặc sidebar Chat, click implementer.
2. Tab Chat, composer gửi tới agent đó (steer / message_subagent hoặc mailbox).
3. Sidebar highlight agent đang focus. Coordinator vẫn lead.
4. CEO không bị biến thành lead runtime.

## J8 — Không tin, vào War room

1. Tab War room. Lưới card: coordinator + teammates + guest ephemeral.
2. Mỗi card: status, task hiện tại, 20 dòng stream mới nhất.
3. Click card → panel phải full transcript agent đó.
4. “Nói với agent” → J7.
5. Đóng war room không dừng run.

## J9 — Công ty broken

1. Xóa nhầm `purpose.md`.
2. Home banner broken, liệt kê file thiếu.
3. “Khôi phục template purpose” (giữ roster) hoặc “Xóa `.orvanta` và lập lại” (confirm 2 bước).

## J10 — Ngày thường (hạnh phúc)

1. Mở VS Code. Home: purpose cũ, 3 agent idle, 1 task blocked, inbox 0.
2. Click blocked → escalate đã có sẵn hoặc tạo mới.
3. Approve một câu. Đội chạy. CEO đi làm việc khác.
4. Cuối ngày War room xem 3 card `completed`. Inbox trống.

Đây là ngày Orvanta được coi là thành công.
