# Kế Hoạch Cải Thiện Giao Diện Agent Chat Theo Phong Cách Cursor (13 Điểm Nâng Cấp)

Tài liệu đặc tả chi tiết nguyên nhân gốc rễ, giải pháp kỹ thuật, phân cấp component và checklist nghiệm thu cho 13 yêu cầu cải tiến giao diện Agent Chat và luồng phối hợp tác nhân Orvanta.

---

## 1. Phân Tích Chi Tiết 13 Vấn Đề & Nguyên Nhân Gốc Rễ

### Vấn đề 1: Đọc file chỉ hiện chữ "c" ở tên file, cần hiển thị đầy đủ như ban đầu
- **Nguyên nhân:** Trong `ToolGroupRenderer.tsx`, logic hiển thị filename áp dụng `split(/[/\\]/).pop()` kết hợp với thuộc tính CSS `[direction: rtl]` và hàm `cleanPathPrefix` loại bỏ ký tự đầu, dẫn đến việc trên đường dẫn Windows (như `c:\...` hoặc relative path) chuỗi bị cắt xén bất thường hoặc đảo ngược chiều hiển thị, chỉ sót lại ký tự đầu tiên `"c"`.
- **Giải pháp:** Khôi phục logic hiển thị đường dẫn nguyên bản chuẩn của Cline: hiển thị đầy đủ path có format rõ ràng qua `cleanPathPrefix(tool.path)` kèm `[direction: ltr]` khi có displayText và giữ nguyên định dạng đầy đủ, tránh việc pop tên file gây mất thông tin ngữ cảnh thư mục.

### Vấn đề 2: Xóa hẳn nút "Nói với: ..." và bỏ toàn bộ logic liên quan
- **Nguyên nhân:** Trong `InputSection.tsx`, chip `composer-focus-chip` hiển thị dòng chữ `Nói với: {focusAgent.displayName}` cùng nút "Quay lại coordinator". Điều này gây trùng lặp vì header phía trên và tab active đã thể hiện rõ Agent đang được chọn. Ngoài ra, việc tiêm tiền tố "Nói với" vào input gây cồng kềnh cho người dùng.
- **Giải pháp:** Xóa hoàn toàn chip `composer-focus-chip`, gỡ bỏ logic điều hướng phụ `Nói với:` và các state liên quan trong `InputSection.tsx`, để ô nhập liệu luôn trực tiếp, sạch sẽ và tối giản.

### Vấn đề 3: Gom các file vào folder chuẩn hoặc component để dễ bảo trì
- **Nguyên nhân:** Các component mở rộng của Orvanta (như `McpServersTab.tsx`, `SkillsTab.tsx`, `ToolsPermissionsTab.tsx`) đang nằm rải rác trực tiếp trong thư mục `webview-ui/src/orvanta/` mà chưa có module hóa thành thư mục `components/` rõ ràng, khiến việc import và quản lý về sau dễ bị phân mảnh.
- **Giải pháp:** Gom các sub-tabs và sub-components vào `webview-ui/src/orvanta/components/` với file `index.ts` tập trung, đảm bảo kiến trúc component chuẩn mực, dễ mở rộng và dễ bảo trì.

### Vấn đề 4: Bỏ chữ "đang đề xuất sửa 29 dòng trong", chỉ để tên file
- **Nguyên nhân:** `DiffEditRow.tsx` đang render chuỗi dài dạng: `đang đề xuất sửa ${totalChangedLines} dòng trong ${file.path}`. Điều này chiếm nhiều diện tích ngang trên thanh tiêu đề khối diff, làm giảm sự tinh gọn theo phong cách Cursor.
- **Giải pháp:** Đơn giản hóa tiêu đề `DiffEditRow.tsx`: chỉ hiển thị icon trạng thái + tên file hoặc đường dẫn file gọn gàng, số dòng thay đổi (+add / -del) đã được hiển thị tách biệt ở `DiffStats` bên phải.

### Vấn đề 5: Chạy command mặc định ở dạng thu nhỏ, trạng thái có màu dễ theo dõi
- **Nguyên nhân:** `CommandOutputRow.tsx` mặc định mở rộng toàn bộ khung terminal output, chiếm quá nhiều diện tích dọc trong luồng chat. Trạng thái thực thi chưa có phối màu trực quan nổi bật.
- **Giải pháp:** 
  - Mặc định trạng thái thu gọn (`isOutputFullyExpanded = false` và khối lệnh đóng gọn).
  - Thêm dot màu & badge trạng thái chuẩn:
    - Đang chạy (Executing): Xanh lục sáng (`text-emerald-400`, `bg-emerald-500 animate-pulse`).
    - Chờ duyệt (Pending approval): Vàng hổ phách (`text-amber-400`, `bg-amber-500`).
    - Hoàn thành (Completed): Xanh dương/xanh lục nhạt (`text-sky-400` / `text-emerald-400`).
    - Lỗi (Failed/Error): Đỏ rực (`text-rose-400`, `bg-rose-500`).

### Vấn đề 6: Coordinator vẫn hiện "Cline wants to execute this command:", sửa thành "Coordinator wants to execute this command:"
- **Nguyên nhân:** `ChatRow.tsx` hardcode chuỗi `"Cline wants to execute this command:"`, `"Cline wants to read this file:"`, `"Cline wants to create a new file:"` mà không lấy định danh của Agent đang chạy (Coordinator hoặc Teammate).
- **Giải pháp:** Động hóa toàn bộ tiêu đề công cụ trong `ChatRow.tsx`: lấy `actor = message.agentDisplayName || message.agent_display_name || (message.agentId ? `@${message.agentId}` : "Coordinator")`. Chuỗi hiển thị sẽ là `${actor} wants to execute this command:` (hoặc `${actor} muốn thực thi lệnh:`).

### Vấn đề 7: "</> Implementer • Coder Coder muốn sửa file này:" chuyển thành chỉ cần "</> Coder muốn sửa file này:"
- **Nguyên nhân:** `AgentBadge` render cả `role` (`Implementer`) và `displayName` (`Coder`), đồng thời tiêu đề `editToolTitle` lại tiếp tục nối thêm `actorName` (`Coder muốn sửa file này:`), gây ra hiện tượng lặp từ ngớ ngẩn: `Implementer • Coder Coder muốn sửa file này:`.
- **Giải pháp:** Chuẩn hóa `AgentBadge` và các dòng tiêu đề công cụ:
  - Chỉ hiển thị icon vai trò (ví dụ `</>`) kèm tên hiển thị của Agent (`Coder`).
  - Không in lặp tên ở cả badge lẫn chuỗi thông điệp.
  - Chuẩn hóa thành: `</> Coder muốn sửa file này:` trên một dòng duy nhất.

### Vấn đề 8: Coder tự giao việc cho Reviewer sai quy trình
- **Nguyên nhân:** Các teammate (như Coder) chưa bị khóa công cụ điều phối `team_run_task`, `team_task`, `team_spawn_teammate` trong profile và policy runtime. Do đó, model LLM của Coder tự ý gọi `team_run_task` giao thẳng cho Reviewer thay vì nộp bài/báo cáo về cho Coordinator.
- **Giải pháp:** 
  - Khóa chặt quyền: Mọi Teammate (role !== "lead" / id !== "coordinator") mặc định `deny` các công cụ `team_run_task`, `team_task`, `team_spawn_teammate`.
  - Cập nhật prompt & template: Teammate chỉ hoàn thành nhiệm vụ và bàn giao sản phẩm bằng `orvanta_submit_handoff` hoặc báo cáo kết quả lại cho Coordinator. Duy nhất Coordinator mới có thẩm quyền phân công Reviewer thẩm định.

### Vấn đề 9: Thêm phần hiển thị Task được giao ở trên cùng khi vào kênh Agent riêng
- **Nguyên nhân:** Khi người dùng chuyển sang xem kênh của một Agent cụ thể (ví dụ `@coder`), giao diện chỉ hiện luồng chat mà không có thông tin tóm lược về Task mà Agent đó đang đảm nhiệm.
- **Giải pháp:** Bổ sung Card "Task được giao" ghim trên đầu khu vực tin nhắn của Agent riêng (`AgentAssignedTaskHeader.tsx`), hiển thị rõ: Tiêu đề Task, Yêu cầu bàn giao (DoD), trạng thái thực thi hiện tại.


---

## PHẦN BỔ SUNG: 7 YÊU CẦU TINH CHỈNH NÂNG CAO (PHONG CÁCH CURSOR)

### Yêu cầu 1: Sửa UI Form nhận nhiệm vụ đồng bộ với form giao nhiệm vụ
- **Nguyên nhân:** Khối hiển thị nhận nhiệm vụ của chuyên viên (Coder, Reviewer) trước đây tách biệt với `TeamRunTaskCard`, chưa có đầy đủ mã nhiệm vụ, sản phẩm bàn giao (Artifact DoD) và các thông tin chi tiết.
- **Giải pháp:** Sử dụng thống nhất cấu trúc của `TeamRunTaskCard`: hiển thị header nhiệm vụ từ Coordinator, trạng thái, mã nhiệm vụ `#taskId`, sản phẩm bàn giao tại `.orvanta/artifacts/**`, cùng khối DoD và yêu cầu chi tiết có thể mở rộng. Gắn `id="task-msg-${message.ts}"` để hỗ trợ điều hướng.

### Yêu cầu 2: Think mở rộng hiển thị toàn bộ không cần scroll
- **Nguyên nhân:** Trong `ThinkingRow.tsx`, phần nội dung bị giới hạn bởi `max-h-[200px]` và `max-h-[150px] overflow-y-auto` kèm thanh cuộn bị ẩn (`[&::-webkit-scrollbar]:hidden`), khiến người dùng phải cuộn chuột trong khung nhỏ hẹp.
- **Giải pháp:** Gỡ bỏ các giới hạn chiều cao `max-h-[...]` và `overflow-y-auto`. Khi người dùng bấm mở khối suy nghĩ, nội dung reasoning bung đầy đủ theo chiều cao tự nhiên (`h-auto max-h-none overflow-visible whitespace-pre-wrap select-text`), dễ đọc toàn bộ logic suy luận.

### Yêu cầu 3: Sửa danh sách đọc file bị hẹp/nhỏ chiều rộng
- **Nguyên nhân:** Trong `ToolGroupRenderer.tsx`, nút mở file sử dụng `size="icon"`. Trong `buttonVariants`, `size: "icon"` có thuộc tính cứng `w-[28px]`, khiến hàng đọc file bị co rúm thành một ô vuông nhỏ 28px, đè nén chữ và gây cắt cụt thông tin.
- **Giải pháp:** Bỏ `size="icon"`, chuyển thành hàng flex chiếm trọn 100% chiều rộng (`w-full flex items-center justify-between`), hiển thị rõ ràng icon loại tệp, đường dẫn file đầy đủ với tooltip, phạm vi dòng đọc `(dòng X-Y)` và biểu tượng mở trong editor.

### Yêu cầu 4: Ngăn chặn hiện "Thinking..." nhầm ở Agent không chạy
- **Nguyên nhân:** `useThinkingLoaderRow` trong `MessagesArea.tsx` chỉ kiểm tra biến `turnState.phase === "streaming"` toàn cục mà không kiểm tra kênh Agent đang xem (`selectedAgentId`) có phải là tác nhân đang trực tiếp chạy hay không. Khi Coder đang suy nghĩ, người dùng chuyển sang Reviewer thì Reviewer vẫn hiển thị dòng `Thinking...`.
- **Giải pháp:** Xác định tác nhân đang thực sự streaming từ đuôi tin nhắn (`activeRunningAgentId`). Chỉ kích hoạt hiển thị `Thinking...` loader row khi đang ở kênh toàn đội (`#team-feed`) hoặc khi `selectedAgentId === activeRunningAgentId`.

### Yêu cầu 5: Bỏ các nút Retry và Start new chat ở chân trang
- **Nguyên nhân:** Khi hoàn tất tác vụ hoặc gặp lỗi, `ActionButtons.tsx` hiển thị các nút lớn như "Start New Task" hoặc "Retry" chiếm dụng không gian chân trang và khác biệt với phong cách hội thoại liên tục của Cursor.
- **Giải pháp:** Ẩn các nút hành động `new_task` ("Start New Task") và `retry` ("Retry") ở chân trang `ActionButtons.tsx`. Kích hoạt trạng thái mở ô nhập liệu (`sendingDisabled = false`) để người dùng có thể gõ trao đổi tiếp bất kỳ lúc nào.

### Yêu cầu 6: Báo cáo và nhận nhiệm vụ hiển thị theo dòng timeline; Header đính gọn ở trên điều hướng đến tin nhắn
- **Nguyên nhân:** Thẻ "Đã gửi báo cáo cho: Coordinator" trước đây bị ghim cố định ở đáy view. Thẻ nhận nhiệm vụ cũng bị ghim ở đầu trang mà không nằm trong dòng thời gian.
- **Giải pháp:**
  - Bỏ banner cố định ở đáy `ChatView.tsx`. Cả hành động giao/nhận nhiệm vụ và nộp báo cáo (`orvanta_submit_handoff`) hiển thị như một tin nhắn tự nhiên trên timeline tại đúng thời điểm phát sinh.
  - Tạo thanh đính gọn ở đỉnh giao diện chat (`AgentPinnedTaskBar.tsx`), hiển thị tóm tắt nhiệm vụ hiện tại kèm nút bấm cuộn mượt (`scrollIntoView`) tới đúng vị trí tin nhắn nhận nhiệm vụ trên timeline. Hỗ trợ chuyển đổi khi có nhiều nhiệm vụ.

### Yêu cầu 7: Hiển thị báo cáo nhận được trên timeline của Coordinator/Reviewer
- **Nguyên nhân:** Bộ lọc tin nhắn của kênh Coordinator loại bỏ các tin nhắn có `m.agentId` của chuyên viên, khiến Coordinator không thấy tin nhắn báo cáo `orvanta_submit_handoff` trong dòng timeline của mình.
- **Giải pháp:** Cập nhật bộ lọc kênh Coordinator (và Reviewer): giữ lại các tin nhắn `orvanta_submit_handoff` gửi tới tác nhân đó. Hiển thị dưới dạng thẻ báo cáo kết quả trang nhã trên timeline của Coordinator.

### Vấn đề 10: Hiện thêm phần "Đã gửi báo cáo cho ai" ở cuối cùng khi Agent làm xong
- **Nguyên nhân:** Khi Agent hoàn tất lượt chạy hoặc submit handoff, người dùng không thấy được trạng thái luồng dữ liệu tiếp theo (báo cáo đã chuyển đi đâu).
- **Giải pháp:** Render khối Handoff Completion Banner ở cuối tin nhắn hoàn tất:
  `✅ Đã hoàn thành nhiệm vụ và gửi báo cáo cho: Coordinator (Trưởng nhóm)` kèm timestamp và đường dẫn file artifact nếu có.

### Vấn đề 11: Lỗi xem file thay đổi (View Changes)
- **Nguyên nhân:** 
  1. Trên Windows, hàm `openMultiFileDiff.ts` dùng đường dẫn với dấu gạch chéo ngược `\` đưa vào `vscode.Uri.parse("cline-diff:" + relativePath)`, gây lỗi định dạng URI của VS Code.
  2. Khi tác vụ đang chạy hoặc chưa tạo git checkpoint, `computeLatestCheckpointChanges` trả về `undefined`, không có fallback so sánh working tree qua git diff cục bộ.
- **Giải pháp:** 
  - Chuẩn hóa đường dẫn POSIX: `.replace(/\\/g, "/")` khi tạo URI `cline-diff`.
  - Bổ sung fallback kiểm tra git diff trực tiếp hoặc mở file so sánh an toàn nếu multi-file diff không khả dụng.

### Vấn đề 12: Tin nhắn báo cáo của Coordinator bị hiện nhầm ở Reviewer
- **Nguyên nhân:** 
  1. Trong `message-translator.ts`, khi một lượt chạy teammate kết thúc, `state.currentAgent` không được reset về Coordinator. Các event tổng kết sau đó bị gắn nhãn nhầm là của Teammate cuối cùng.
  2. Trong `ChatView.tsx`, bộ lọc tin nhắn cho kênh Agent dùng điều kiện `m.say === "tool" && m.text.includes(agentId)`, khiến các lệnh gọi công cụ của Coordinator có nhắc tới tên Reviewer bị lọt vào tab của Reviewer.
- **Giải pháp:** 
  - Đảm bảo reset `currentAgent` về Coordinator ngay khi teammate run kết thúc.
  - Tách bạch lọc tin nhắn: Chỉ hiển thị tin nhắn do chính Agent đó phát sinh (`m.agentId === selectedAgentId`) hoặc Task card được giao riêng cho Agent đó.

### Vấn đề 13: Bỏ thanh công cụ bên dưới ô nhập liệu (@, model, plan/act)
- **Nguyên nhân:** Bên dưới ô nhập liệu có thanh `ButtonGroup` chứa `@ (Add Context)`, `Model Selector`, các nút này đã được chuyển quyền cấu hình vào tab Agent Editor và phím tắt, chiếm dụng diện tích vô ích.
- **Giải pháp:** Loại bỏ toàn bộ `ButtonGroup` thanh đáy bên dưới ô nhập liệu. Ô nhập liệu trở thành một khung chat gọn gàng với nút Đính kèm (Paperclip) và Gửi (Send Arrow) tích hợp ngay góc trong ô nhập.




---

## 2. Tổ Chức Thư Mục & Phân Cấp Component Chuẩn

Nhằm đảm bảo dự án dễ bảo trì và mở rộng trong tương lai, cấu trúc component Orvanta được quy hoạch lại như sau:

```
apps/vscode/webview-ui/src/orvanta/
├── components/
│   ├── AgentPinnedTaskBar.tsx         # Thanh đính nhiệm vụ 34px ghim trên đỉnh, cuộn mượt tới timeline (Yêu cầu 6)
│   ├── AgentAssignedTaskHeader.tsx    # Card hiển thị task được giao ở đầu kênh Agent riêng (Điểm 9)
│   ├── AgentHandoffBanner.tsx         # Banner "Đã gửi báo cáo cho ai" khi hoàn thành (Điểm 10)
│   ├── McpServersTab.tsx              # Cấu hình MCP riêng từng agent (Điểm 3)
│   ├── SkillsTab.tsx                  # Quản lý kỹ năng workspace (Điểm 3)
│   ├── ToolsPermissionsTab.tsx        # Quyền hạn & Auto-approve riêng từng agent (Điểm 3)
│   └── index.ts                       # Export tập trung các sub-component
├── ConsoleView.tsx                    # View chính điều phối Chat & War Room
├── AgentsView.tsx                     # Quản lý danh sách Agent & hồ sơ
├── AgentEditor.tsx                    # Modal chỉnh sửa chi tiết Agent
├── TeamSidebar.tsx                    # Danh sách kênh #team-feed & @agent
└── index.ts                           # Root exports
```

---

## 3. Checklist Nghiệm Thu Chi Tiết

- [x] **Mục 1 (Tên file khi đọc):** Đọc file hiển thị đầy đủ đường dẫn và tên file nguyên vẹn, không còn bị cắt cụt thành chữ `"c"`.
- [x] **Mục 2 (Bỏ "Nói với:"):** Xóa hoàn toàn chip "Nói với: ..." và nút "Quay lại coordinator", gỡ bỏ toàn bộ logic liên quan khỏi ô nhập liệu.
- [x] **Mục 3 (Cấu trúc thư mục):** Gom các file tabs/sub-components của Orvanta vào thư mục chuẩn `orvanta/components/` có index export rõ ràng (`AgentPinnedTaskBar`, `AgentAssignedTaskHeader`, `AgentHandoffBanner`, `McpServersTab`, `SkillsTab`, `ToolsPermissionsTab`).
- [x] **Mục 4 (Tiêu đề DiffEditRow):** Tiêu đề khối sửa file chỉ hiển thị tên file/đường dẫn, không còn dòng chữ dài dòng "đang đề xuất sửa X dòng trong...".
- [x] **Mục 5 (Command thu gọn & màu sắc):** Lệnh chạy mặc định hiển thị thu gọn; dot trạng thái và chữ có màu sắc rõ ràng (đang chạy: xanh lá pulse, chờ duyệt: vàng, xong: xanh lục, lỗi: đỏ).
- [x] **Mục 6 (Động hóa tiêu đề Coordinator):** Thay thế chữ "Cline" bằng định danh thực tế: "Coordinator wants to execute this command:".
- [x] **Mục 7 (Không lặp tên Agent):** Header hiển thị ngắn gọn `</> Coder muốn sửa file này:`, loại bỏ lặp `Implementer • Coder Coder`.
- [x] **Mục 8 (Khóa Coder giao việc Reviewer):** Coder và các Teammate bị cấm tuyệt đối dùng `team_run_task`, bắt buộc phải báo cáo/handoff về Coordinator để Coordinator giao Reviewer.
- [x] **Mục 9 (Thẻ Task được giao):** Kênh Agent riêng hiển thị thẻ Task được giao đồng nhất định dạng với form giao việc.
- [x] **Mục 10 (Thẻ báo cáo hoàn thành):** Báo cáo kết quả hiển thị tự nhiên trên dòng timeline qua `TeamRunTaskCard` với `type="handoff"`.
- [x] **Mục 11 (Sửa lỗi View Changes):** Sửa lỗi đường dẫn Windows trong `openMultiFileDiff.ts` và đảm bảo View Changes hoạt động ổn định mọi lúc.
- [x] **Mục 12 (Cách ly tin nhắn báo cáo):** Tin nhắn báo cáo của Coordinator tới CEO không bị rò rỉ hay hiển thị nhầm trong kênh của Reviewer.
- [x] **Mục 13 (Tối giản ô nhập liệu Cursor):** Xóa bỏ thanh công cụ đáy bên dưới ô nhập (@, model, plan/act), chỉ giữ ô nhập liệu với nút đính kèm và nút gửi nổi bật.
- [x] **Yêu cầu 1 (Đồng nhất Form giao/nhận việc):** Cả Form nhận nhiệm vụ và giao nhiệm vụ dùng chung cấu trúc `TeamRunTaskCard`, hiển thị tóm tắt và chi tiết không giới hạn.
- [x] **Yêu cầu 2 (Think bung hết chiều cao):** Bỏ `max-h-[150px]` và thanh cuộn con; bấm mở là nội dung suy nghĩ hiển thị trọn vẹn không cần cuộn bên trong.
- [x] **Yêu cầu 3 (Danh sách đọc file 100% rộng):** Bỏ `size="icon"` (28px), mở rộng full width để hiển thị đầy đủ tên file, đường dẫn và phạm vi dòng.
- [x] **Yêu cầu 4 (Khắc phục thinking nhầm kênh):** Kênh Agent chỉ hiển thị thinking khi Agent đó đang trực tiếp chạy hoặc khi vừa gửi tin nhắn.
- [x] **Yêu cầu 5 (Bỏ nút Retry & Start new chat):** Ẩn các nút Retry / Start new chat ở chân trang, giữ ô nhập liệu luôn sẵn sàng trao đổi liên tục.
- [x] **Yêu cầu 6 (Header đính gọn 34px điều hướng timeline):** `AgentPinnedTaskBar` hiển thị nhiệm vụ đính ở trên, bấm là cuộn mượt tới tin nhắn đó trên timeline; hỗ trợ chuyển giữa nhiều nhiệm vụ.
- [x] **Yêu cầu 7 (Báo cáo nhận được trên timeline):** Báo cáo nhận được hiển thị như tin nhắn tự nhiên trên timeline của Coordinator/Reviewer.

---

## 4. Kế Hoạch Triển Khai Kỹ Thuật

1. **Nhóm 1 - Tinh giản Input & Header (Điểm 1, 2, 4, 13):**
   - Sửa `ToolGroupRenderer.tsx` khôi phục đường dẫn đầy đủ khi readFile.
   - Sửa `InputSection.tsx` & `ChatTextArea.tsx`: Xóa chip "Nói với:" và thanh công cụ đáy `@, model, plan/act`.
   - Sửa `DiffEditRow.tsx`: Tinh giản tiêu đề chỉ hiển thị tên file.
2. **Nhóm 2 - Động hóa Attribution & Command UX (Điểm 5, 6, 7):**
   - Sửa `ChatRow.tsx`: Động hóa `${actor} wants to execute this command:`.
   - Sửa `CommandOutputRow.tsx`: Mặc định thu gọn, bổ sung màu sắc trạng thái chuẩn.
   - Sửa `AgentBadge.tsx` / `ChatRow.tsx`: Tinh giản hiển thị `</> [Tên] muốn sửa file này:`.
3. **Nhóm 3 - Quy chuẩn Thư mục & Luồng Báo Cáo Agent (Điểm 3, 9, 10):**
   - Di chuyển các tabs vào `orvanta/components/`.
   - Tạo `AgentAssignedTaskHeader.tsx` & `AgentHandoffBanner.tsx`.
   - Nhúng vào `ChatView.tsx`.
4. **Nhóm 4 - Chính Sách Điều Phối & Khắc Phục Lỗi (Điểm 8, 11, 12):**
   - Cập nhật `sdk-tool-policies.ts`, `teammate-specs.ts`, template hồ sơ Coder để khóa `team_run_task`.
   - Sửa `openMultiFileDiff.ts` chuẩn hóa URI Windows.
   - Sửa `message-translator.ts` & `ChatView.tsx` để cách ly tin nhắn Coordinator và Reviewer.
5. **Nhóm 5 - Kiểm Thử Toàn Diện & Nghiệm Thu:**
   - Chạy test unit và typecheck để đảm bảo không có hồi quy.
