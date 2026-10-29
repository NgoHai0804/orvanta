# Orvanta v0.1.0 — Chrome-like Multi-Chat Tabs & Console Task History

Phiên bản **v0.1.0** mang đến bước tiến đột phá trong trải nghiệm người dùng trên màn hình **Console** của Orvanta:
1. **Hệ Thống Tab Đa Phiên Phong Cách Chrome (Chrome-like Multi-Chat Tabs):**
   - Cho phép mở nhiều cuộc trò chuyện song song (Tab 1, Tab 2, Tab 3...).
   - Nút `[+]` tạo nhanh cuộc trò chuyện mới.
   - Nút `[x]` đóng tab linh hoạt (hỗ trợ phím tắt và click chuột giữa).
   - Tự động chuyển đổi mượt mà và bảo lưu draft input đang soạn thảo dở.
2. **Khay Lịch Sử Cuộc Trò Chuyện Trực Quan (Console History Drawer):**
   - Nút bấm *"Lịch sử"* chuyên biệt trên thanh Tab Bar.
   - Ngăn kéo trượt (Slide-over panel) trực quan, tìm kiếm toàn văn và lọc task theo thời gian/yêu thích.
   - Mở lại bất kỳ cuộc hội thoại nào trong quá khứ vào một Tab mới để xem lại và tiếp tục gửi lệnh trò chuyện.
3. **Lưu Trữ Bền Vững & Khôi Phục Tự Động (Persistence):**
   - Tự động lưu danh sách tabs và tab active vào `localStorage`.
   - Khôi phục trọn vẹn khi reload webview hoặc chuyển đổi giữa các tab trang Home, Agents, Inbox.

---

## Tài Liệu Chi Tiết

- [**01-CHROME-TABS-AND-HISTORY-SPEC.md**](./01-CHROME-TABS-AND-HISTORY-SPEC.md): Đặc tả chi tiết UI/UX, Bố cục, Sơ đồ luồng dữ liệu, Mô hình State, Quy chuẩn tương thích gRPC Backend và Actionable Checklist 6 Phase.
- [**02-HISTORY-MANAGEMENT-AND-CLEANUP-SPEC.md**](./02-HISTORY-MANAGEMENT-AND-CLEANUP-SPEC.md): Đặc tả bổ sung tính năng Xóa lịch sử trò chuyện, Lưu trữ đầy đủ metadata các Agent trong `.orvanta/history/`, và Tối giản Drawer loại bỏ các nút lọc dư thừa.
- [**03-CEO-SESSION-MULTI-AGENT-HISTORY-SPEC.md**](./03-CEO-SESSION-MULTI-AGENT-HISTORY-SPEC.md): Đặc tả cấu trúc Lịch sử phiên chat của CEO gắn liền với lịch sử hội thoại 1:1 của tất cả các Agent (@coordinator, @implementer, @reviewer...) trong cùng một phiên.

