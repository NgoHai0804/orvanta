# Intent đã chốt

Ngày chốt: 2026-10-27. Nguồn: phỏng vấn founder trong session ý tưởng.

## Statement of Intent

- **Outcome:** Mỗi repo là một công ty AI. Founder set mục tiêu; đội tự chia việc hàng ngày; agent ở trong role; việc chạy xuyên session; founder chỉ vào khi có quyết định lớn (hire, đổi scope, merge).
- **User:** Chính founder — một người, trên máy Windows (`D:\orvanta`). Chưa phải sản phẩm public.
- **Why now:** Cline đã có chat, team, task board, agent presets — nhưng quản lý bằng prompt nên dễ lệch mục tiêu, state nằm `~/.cline`, không có “công ty” bền theo project.
- **Success:** Mở icon Orvanta trên Activity Bar là thấy Company home: purpose, roster, việc đang chạy, badge quyết định chờ. Không tạo lại đội mỗi lần. Agent không tự đổi scope.
- **Constraint:** Fork Cline. Surface đầu là VS Code extension (`apps/vscode`). State local trong `.orvanta/` (gitignore). Tái sử dụng runtime team/chat của Cline — không dựng orchestrator mới.
- **Thêm (2026-10-27):** Cấu hình từng agent trong `<folder>/.orvanta`. Lưu cả công ty (purpose + đội, không task) thành nhiều bản `%USERPROFILE%/.orvanta/companies/<slug>` để Tải sang folder khác. Mỗi agent có **space** riêng (ghi memory/scratch); **không** sửa `profile.md` của mình hay space agent khác. Giao tiếp: mailbox + `shared/handoffs`. Rebrand chữ Cline → hoãn.
- **Out of scope lúc này:** marketplace, multi-user, desktop riêng, AI CEO, rebuild runtime, auto-save thư viện, symlink hai kho, thư viện từng agent lẻ (chỉ snapshot cả công ty).

## Quyết định đã chốt

| Câu hỏi | Trả lời |
|---|---|
| Cho ai? | Cho chính founder |
| Job? | Công ty AI: purpose-lock + việc chuẩn + tự giao việc + xuyên session |
| Ai giữ mục tiêu? | Founder = CEO nhẹ |
| Surface? | Extension VS Code, quản lý agent dễ hơn |
| Tầm nhìn UI? | A + B + C + D, đủ |
| Cắt implement? | **A-first.** Chat Cline giữ nguyên. Inbox riêng và war room sau khi home sống. |

## “CEO nhẹ” nghĩa là gì — và không nghĩa là gì

Làm:

- Viết / sửa purpose
- Duyệt hire, fire, đổi role
- Duyệt đổi scope (task mới vượt purpose, hoặc purpose mới)
- Duyệt merge / apply thay đổi lớn (khi policy yêu cầu)
- Mở chat khi muốn chỉ đạo
- Vào war room khi muốn tin đội đang làm gì

Không làm (đội tự làm):

- Chia task hàng ngày
- Spawn run cho task đã được assign
- Handoff giữa implementer ↔ reviewer
- Ghi mission log
- Hỏi lại CEO từng lệnh `ls` hay mỗi file nhỏ trong scope đã duyệt

## Muốn vs nên muốn

“Giống một công ty” không có nghĩa phải có HR, lương, OKR, hay AI CEO. Nó có nghĩa:

1. Có điều lệ (purpose) mà mọi agent đọc được và bị khóa bởi policy.
2. Có người đúng việc (roster + tool policy).
3. Có việc đang chạy mà không mất khi tắt máy.
4. Có chỗ CEO đứng ngoài (home + inbox), không chỉ ngồi trong chat.

Nếu một tính năng không phục vụ bốn dòng trên, nó không vào Orvanta lúc này.
