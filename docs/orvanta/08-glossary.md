# Glossary

| Thuật ngữ | Nghĩa trong Orvanta |
|---|---|
| **Công ty** | Bộ purpose + roster + policy + state gắn một workspace, sống trong `.orvanta/` |
| **CEO nhẹ** | Người dùng. Set purpose, duyệt quyết định lớn, không chia task hàng ngày |
| **Coordinator / lead** | Agent `role: lead`. Nói chuyện mặc định trên Chat. Được team tools; không được phá purpose |
| **Teammate** | Agent roster không phải lead |
| **Guest / ephemeral** | Agent một session, không vào roster, TTL hết session |
| **Purpose** | Điều lệ (`purpose.md`). Mọi agent đọc; chỉ CEO sửa |
| **Purpose-lock** | Ba lớp: prompt, tool policy, decision gate |
| **Roster** | Danh sách agent bền của công ty |
| **Hire / Fire** | Thêm / gỡ agent bền. Mặc định qua Inbox |
| **Decision** | Item Inbox. Có type, payload, status pending/approved/rejected/deferred |
| **Inbox** | Hàng đợi quyết định CEO (B) |
| **Company home** | Màn A: purpose, roster, work now, badge |
| **Chat** | Màn C: ChatView Cline + sidebar đội |
| **War room** | Màn D: lưới stream live |
| **Task** | `TeamTask` Cline: pending / in_progress / blocked / completed |
| **Run** | `TeamRunRecord`: một lần teammate được chạy |
| **Outcome** | Kết quả có section, review, finalize (Cline team outcomes) |
| **Mission log** | Nhật ký điều phối đội |
| **Mailbox** | Tin nội bộ agent ↔ agent |
| **TeamStore** | Persist Cline (sqlite/file). Orvanta đặt dưới `.orvanta/` |
| **Snapshot** | Chiếu runtime xuống `.orvanta/state/snapshot.json` |
| **Broken company** | `.orvanta/` tồn tại nhưng thiếu / mâu thuẫn schema |
| **Scope** | Phạm vi task (mô tả + path). Ngoài purpose → `change_scope` |
| **Merge** | Quyết định áp outcome / diff lớn vào working tree |
| **Badge** | Số pending inbox, hiện tab + Activity Bar |
| **Deep-link** | `orvanta://view/...` chuyển tab và focus |
| **A / B / C / D** | Home / Inbox / Chat+sidebar / War room |
| **Workspace store** | `<folder đang mở>/.orvanta/` — công ty đang chạy |
| **User library** | `%USERPROFILE%/.orvanta/companies/<slug>/` — snapshot điều lệ + đội |
| **Slug** | Tên thư mục bản lưu, `orvanta-core` |
| **Authoring** | CEO sửa agent/purpose trên Home, ghi thẳng workspace |
| **Agent profile** | Identity trong `org/agents/<id>/profile.md` — chỉ CEO |
| **Agent space** | `org/agents/<id>/workspace/` — chỉ agent đó ghi |
| **Handoff** | `shared/handoffs/<taskId>/<agentId>.md` — nộp bài |
| **Mailbox** | Thư nội bộ; không ghi vào space người khác |
