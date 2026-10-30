# Orvanta v0.1.2 — Sửa lỗi tuyển Agent không lưu vào workspace đang mở

## Tổng quan

v0.1.2 xử lý lỗi Agent được duyệt tuyển nhưng hồ sơ không xuất hiện trong workspace đang mở, hoặc được ghi sang workspace khác khi VS Code đang mở nhiều thư mục. Bản sửa gộp Inbox từ các workspace đang mở, tìm workspace sở hữu quyết định trước khi ghi, và bảo đảm trạng thái Inbox chỉ hoàn tất sau khi lưu Agent thành công.

## 1. Triệu chứng

- Người dùng duyệt yêu cầu **Tuyển Agent** nhưng Agent không xuất hiện trong tab Agents.
- Hồ sơ Agent hoặc roster không được ghi vào thư mục dự án đang mở; trong workspace đa thư mục, thao tác có thể gắn với thư mục khác.
- Nếu thao tác lưu thất bại, yêu cầu có thể biến mất khỏi Inbox chờ duyệt dù Agent chưa được thêm thành công.

## 2. Nguyên nhân

1. `resolveOrvantaWorkspaceRoot()` chọn một root cho các thao tác chung bằng cách lấy thư mục đầu tiên có `.orvanta`; trong workspace đa thư mục, thao tác chung không nhận biết yêu cầu cụ thể thuộc Inbox/company nào.
2. Danh sách Inbox và xử lý quyết định từng đọc một root được phân giải riêng. Yêu cầu không mang liên kết bền vững tới root/company đã tạo nó; nếu người dùng tạo quyết định trong workspace thứ hai, Inbox có thể không hiển thị nó và thao tác duyệt có thể tra ở root đầu tiên.
3. Trước bản sửa, `resolveDecision()` chuyển quyết định khỏi `inbox/pending.json` và ghi lịch sử trước khi chạy `upsertAgent()`. Nếu bước ghi hồ sơ/roster lỗi, quyết định đã bị đánh dấu hoàn tất trong khi Agent chưa được lưu. Bản sửa đổi thứ tự riêng cho duyệt tuyển: lưu Agent trước, sau đó mới hoàn tất quyết định.

Luồng dữ liệu đúng của một Agent sau khi duyệt là:

```text
<workspace đang dùng>/.orvanta/org/agents/<agentId>/profile.md
<workspace đang dùng>/.orvanta/org/agents/<agentId>/workspace/memory.md
<workspace đang dùng>/.orvanta/org/roster.json
```

## 3. Cách sửa trong v0.1.2

### 3.1 Giải quyết quyết định trên workspace sở hữu Inbox

- Khi liệt kê Inbox, đọc và gộp pending/deferred/history của các workspace đang mở để các quyết định không bị ẩn do chọn nhầm root đầu tiên.
- Khi duyệt, tìm decision ID trong Inbox của các workspace đang mở và ghi side effect đúng root duy nhất sở hữu decision.
- Nếu decision ID không có trong workspace đang mở hoặc tồn tại nhiều hơn một lần, trả lỗi rõ ràng và không sửa Inbox/roster ở bất kỳ workspace nào.
- Quyết định cũ không cần migration nếu workspace nguồn vẫn đang mở; không thể resolve quyết định trong workspace đã đóng cho tới khi workspace đó được mở lại.

### 3.2 Chỉ hoàn tất quyết định sau khi lưu Agent thành công

- Kiểm tra trạng thái và dữ liệu đầu vào của yêu cầu trước khi thực hiện.
- Lưu profile, memory và roster qua `upsertAgent()` trong workspace đã ràng buộc.
- Chỉ sau khi lưu thành công mới chuyển quyết định từ pending sang history và trả phản hồi thành công.
- Nếu lưu Agent thất bại, giữ yêu cầu ở trạng thái pending để có thể thử lại; không báo đã tuyển thành công.
- Giữ thao tác idempotent để nhấn duyệt lại không tạo bản ghi/ID Agent trùng.

### 3.3 Bảo đảm UI phản ánh dữ liệu trên đĩa

- Chỉ refresh roster/tab Agents sau phản hồi duyệt thành công.
- Hiển thị lỗi có thể hành động khi không tìm thấy workspace/company hoặc khi không thể ghi profile/roster.
- Không dùng trạng thái UI tạm thời làm bằng chứng tuyển dụng thành công; roster và profile trong `.orvanta/` là dữ liệu cần xác minh.

## 4. Cách kiểm tra sau khi cập nhật

1. Mở đúng thư mục dự án trong VS Code và tạo yêu cầu tuyển một Agent mới.
2. Duyệt yêu cầu trong Inbox.
3. Xác nhận Agent xuất hiện trong tab Agents và có đủ các file:
   - `.orvanta/org/agents/<agentId>/profile.md`
   - `.orvanta/org/agents/<agentId>/workspace/memory.md`
   - Agent mới trong `.orvanta/org/roster.json`
4. Mở workspace thứ hai cùng lúc; lặp lại thao tác và xác nhận yêu cầu của từng workspace hiện trong Inbox, chỉ workspace sở hữu quyết định nhận thay đổi.
5. Đổi workspace hoặc đóng workspace nguồn khi quyết định còn pending; xác nhận hệ thống không ghi nhầm sang workspace khác và thông báo rõ nếu workspace nguồn không còn khả dụng.
6. Mô phỏng lỗi ghi file khi duyệt; xác nhận quyết định vẫn có thể thử lại và không được báo thành công khi roster/profile chưa được lưu.
7. Duyệt lại cùng một quyết định; xác nhận chỉ có một Agent và một `agentNumericId` trong roster.

## 5. Kiểm thử hồi quy cần có

- Workspace resolver: không có workspace, một workspace, nhiều workspace có và không có `.orvanta`, workspace/company được chọn rõ ràng.
- Inbox controller: duyệt tuyển trên đúng workspace nguồn; từ chối workspace/company không khớp; yêu cầu legacy không có root; lỗi `upsertAgent()` không làm mất quyết định pending.
- Workspace store: Agent và ID được ghi đúng vào root yêu cầu; lưu lặp không tạo ID hoặc slug trùng.
- Webview: trạng thái Inbox, roster và thông báo lỗi đồng bộ với kết quả backend.

## 6. Checklist triển khai và nghiệm thu v0.1.2

- [x] Thêm test hồi quy chứng minh quyết định được tìm và duyệt tại đúng workspace chứa Inbox, kể cả khi workspace đó không phải thư mục đầu tiên.
- [x] Sửa resolve decision để quét các workspace đang mở, dùng đúng root sở hữu quyết định và từ chối trường hợp ID quyết định trùng/không xác định được.
- [x] Thêm test đảm bảo lỗi khi lưu Agent không xóa quyết định tuyển khỏi Inbox chờ duyệt.
- [x] Sửa thứ tự xử lý: ghi Agent thành công qua `upsertAgent()` (profile, memory, roster) rồi mới hoàn tất quyết định.
- [x] Kiểm thử hồi quy duyệt tuyển thành công, xác nhận Agent chỉ được thêm vào đúng workspace; retry/duyệt lặp không tạo Agent hoặc history trùng.
- [x] Chạy kiểm tra types/lint của package VS Code và rà diff/định dạng; ghi nhận kết quả kiểm chứng. TypeScript `tsc --noEmit` đạt; Biome check ba file sửa đạt; test Inbox 13/13 đạt; `git diff --check` đạt. Chạy lint gốc toàn monorepo vẫn gặp diagnostics ở CLI không liên quan.

## Ghi chú phạm vi

Các mục checklist đã tick tương ứng với code và test hồi quy hiện có; package VS Code typecheck và các kiểm tra file sửa đạt. Lint toàn monorepo còn diagnostics ngoài phạm vi thay đổi. Workspace nguồn cần vẫn đang mở để hệ thống tìm decision ID; nếu workspace đã đóng, người dùng cần mở lại workspace đó rồi thử duyệt. Đây không phải xác nhận rằng v0.1.2 đã được phát hành.