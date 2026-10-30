# Orvanta v0.1.1 Release Notes

## Tổng quan phiên bản v0.1.1 (Session, Agent Identity & History Architecture Redesign)

Phiên bản Orvanta v0.1.1 mang đến tái kiến trúc toàn diện cho hệ thống quản lý danh tính Agent và lưu trữ lịch sử phiên (Session History). Các thay đổi này giải quyết triệt để các vấn đề về race condition, coupling giữa task và session, cũng như tính ổn định của danh tính Agent khi đổi tên hoặc luân chuyển trong tổ chức.

---

### 1. Bất biến danh tính Agent (Authoritative Agent Identity & Allocator)

- **Số định danh số nguyên dương bất biến (`agentNumericId`):**
  - Mỗi Agent được cấp một số ID nguyên dương (`positive safe integer`) duy nhất và cố định trong suốt vòng đời của tổ chức (company).
  - Tên định danh (`agentSlug`) và tên hiển thị (`displayName`) có thể đổi tự do mà không làm thay đổi `agentNumericId` hay đứt gãy liên kết lịch sử.
  - Các slug cũ được tự động lưu lại trong danh sách `legacySlugs` làm bí danh phục vụ giải quyết danh tính an toàn (`resolveLegacyAgentSlug`).
- **Nguồn Authoritative duy nhất:**
  - File `.orvanta/org/roster.json` (Schema Version 2) là nguồn sự thật duy nhất nắm giữ `nextAgentNumericId` và danh sách `retiredAgents`.
  - Bộ đếm monotonic counter chỉ tăng, không bao giờ giảm.
- **Tombstone & Chống tái sử dụng ID:**
  - Khi một Agent bị xóa/retire, danh tính được chuyển vào mảng `retiredAgents`. Số ID và slug/alias không bao giờ bị tái cấp cho Agent khác.
- **Bảo vệ đồng thời:**
  - Mọi thao tác cấp ID và cập nhật roster đều được tuần tự hóa bằng in-process Promise queue và file lock liên tiến trình `org/roster.json.lock` với cơ chế kiểm tra PID chủ sở hữu và timeout recovery.

---

### 2. Kiến trúc Session History v1 (`.orvanta/history/`)

- **Tách biệt Session và Task:**
  - Một `Session` đại diện cho một phiên làm việc/chỉ đạo của CEO. Một Session có thể có nhiều Agent tham gia, mỗi Agent sở hữu một Cline `taskId` riêng biệt.
  - Cấu trúc lưu trữ độc lập theo từng session: `.orvanta/history/sessions/<sessionId>/session.json`.
  - File catalog tổng hợp `.orvanta/history/index.json` đóng vai trò accelerator, có thể tự động tái tạo (`rebuildIndex`) bất kỳ lúc nào từ các file `session.json`.
- **Authoritative Participants:**
  - Một Agent chỉ trở thành `participant` khi thực sự gửi nhận tin nhắn hoặc có task được xác nhận. Tuyệt đối không fallback toàn bộ roster vào danh sách người tham gia.
  - Mỗi participant lưu snapshot lịch sử (`agentSlugAtJoin`, `displayNameAtJoin`, `roleAtJoin`, `joinedAt`, `lastActiveAt`, `usage`).
- **Ghi nguyên tử (Atomic Replacement) & Chống ghi đè dữ liệu hỏng:**
  - Ghi file qua tệp tạm `.tmp-<uuid>` cùng filesystem rồi đổi tên nguyên tử (`rename`).
  - Khi phát hiện manifest bị hỏng JSON hoặc lỗi cấu trúc, hệ thống ném `SessionCorruptError` và tuyệt đối không nuốt lỗi hay ghi đè catalog rỗng lên file hỏng.

---

### 3. Chính sách Cutover Lịch sử Legacy (Clean Cutover — Không Migration)

- **Nguyên tắc bảo toàn dữ liệu trên đĩa:**
  - Tất cả các file lịch sử cũ trước v0.1.1 (như `.orvanta/history/sessions.json`, `.orvanta/history/tasks/<taskId>/ui_messages.json`, và `taskHistory.json` classic) **được giữ nguyên trạng trên đĩa, không bị xóa, di chuyển, đổi tên hay ghi đè**.
- **Cách ly runtime và giao diện:**
  - Các task và session pre-v0.1.1 không xuất hiện trong danh sách History Drawer của Orvanta lẫn Cline.
  - Hệ thống chặn toàn bộ các luồng mở lại (`showTaskWithId`), tiếp tục (`resumeTask`), hoặc fallback từ session v0.1.1 sang dữ liệu legacy cũ.
  - Không chạy migration ngầm hay tạo session v0.1.1 giả lập từ dữ liệu cũ nhằm đảm bảo tính toàn vẹn 100% của store mới.
- **Rollback an toàn:**
  - Ranh giới cutover độc lập và nhất quán. Nếu cần rollback code, chỉ rollback code logic v0.1.1 mà không làm hư hại hay thất thoát các file dữ liệu cũ.

---

### 4. Vận hành, Dọn dẹp & Bảo mật

- **Phân tách thao tác xóa:**
  - Hỗ trợ xóa riêng từng cuộc trò chuyện của Agent (`deleteParticipantTask`) mà không xóa session nếu còn Agent khác tham gia.
  - Hỗ trợ lưu trữ (`archiveSession`) và xóa toàn bộ session (`deleteSession`) với quy trình staged deletion (tombstone `status: "deleting"`) và rollback tự động nếu SDK xóa transcript thất bại.
- **Chẩn đoán & Sửa chữa (`diagnoseAndRepairHistory`):**
  - Quét và dọn dẹp các tệp tạm mồ côi do sự cố crash, cách ly manifest hỏng sang `.corrupt-<uuid>` mà không xóa, và tái lập lại `index.json`.
- **Bảo mật & Quyền riêng tư:**
  - Enforce regex an toàn cho `sessionId` và `taskId`, ngăn chặn triệt để Path Traversal (`../`, null bytes).
  - Tự động che giấu các thông tin nhạy cảm (API keys, tokens, bearer secrets) trong preview tin nhắn và telemetry logging.
  - Bắt buộc ràng buộc `companyId` để ngăn ngừa mở nhầm lịch sử session giữa các repository hoặc workspace khác nhau.
