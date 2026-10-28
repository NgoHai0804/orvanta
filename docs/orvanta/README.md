# Orvanta — Tài liệu Kiến trúc & Sản phẩm

Orvanta là lớp **công ty AI theo từng repository**, xây dựng trên nền tảng Cline. Người dùng đóng vai trò CEO định hình mục tiêu công ty; hệ thống đội ngũ AI tự phối hợp phân chia công việc theo vai trò chuẩn mực; CEO theo dõi trạng thái và phê duyệt các quyết định quan trọng.

---

## Cấu trúc Phiên bản Tài liệu

Tài liệu thiết kế và đặc tả kỹ thuật được phân chia theo 2 phiên bản:

### 📁 [v0.0.1 (Tài liệu Nền tảng Ban đầu)](./v0.0.1/README.md)
Chứa toàn bộ tài liệu kiến trúc ban đầu từ Phase P1 đến Phase P9, bộ 4 bề mặt chính (A–D):
- **A — Company Home**: Trang chủ công ty (Purpose, Roster dạng danh sách phẳng, Work now).
- **B — CEO Inbox**: Hộp thư duyệt quyết định (Hire agent, Change purpose, Fire agent...).
- **C — Chat & Team Sidebar**: Luồng trao đổi với Coordinator và thanh công việc song song.
- **D — War Room**: Bảng điều khiển giám sát trực tiếp hoạt động toàn đội.
- Các tài liệu nguyên lý, schema thư mục `.orvanta/`, purpose-lock và thư viện công ty (Company Library).

---

### 🚀 [v0.0.2 (Phiên bản Cải tiến Mới — Roster & Agents Tree)](./v0.0.2/README.md)
Phiên bản nâng cấp toàn diện trang **Home** và hệ thống quản lý **Agents**:
1. **Tách Roster thành Tab Agents riêng** trên thanh điều hướng `OrvantaShell` (`Home | Agents | Inbox | Chat | War room`).
2. **Sơ đồ cây phân cấp Agent đa tầng (Multi-level Tree Org Chart)**: Mô hình hóa rõ nét quan hệ *Agent nào quản lý agent nào* thông qua trường `reportsTo`.
3. **Bố cục Split View Trên - Dưới**: Nửa trên là sơ đồ cây tương tác trực quan; Nửa dưới là khu vực cấu hình chi tiết của Agent đang chọn.
4. **Cấu hình Agent 5 Tabs chuyên biệt**:
   - Tab 1: **Profile** (Thông tin chung, vai trò, quản lý bởi).
   - Tab 2: **Model & Thông số AI** (Combobox chọn model từ catalog, Reasoning, Supports Images, Context Window, Max Output Tokens, Temperature).
   - Tab 3: **Tools & Quyền hạn** (Combobox chọn tools allow/deny, phạm vi thư mục).
   - Tab 4: **Instructions & Rules** (System instructions & Rules gán cho agent).
   - Tab 5: **Skills** (Thư viện kỹ năng cấp phép cho agent).
5. **UI & Hiệu ứng Chuẩn**: Thiết kế pixel-perfect, animation mượt mà, theme màu tối Indigo/Violet/Navy, tương thích chuẩn VS Code.
6. **Logic Chuẩn Xác**: Thuật toán dựng cây, chống chu trình (cycle detection), tự động điền specs từ catalog, xử lý fallback khi agent cha bị xóa.
7. **Actionable AI Checklist**: Bộ checklist chi tiết đến từng file, từng hàm và từng test case để AI triển khai code chính xác 100%.

---

## Danh mục tài liệu trong v0.0.2

- [`v0.0.2/README.md`](./v0.0.2/README.md): Tổng quan phiên bản v0.0.2.
- [`v0.0.2/01-SPEC-UI-UX-EFFECTS.md`](./v0.0.2/01-SPEC-UI-UX-EFFECTS.md): Đặc tả chi tiết UI, Bố cục & Hiệu ứng chuyển động chuẩn.
- [`v0.0.2/02-SPEC-BUSINESS-LOGIC.md`](./v0.0.2/02-SPEC-BUSINESS-LOGIC.md): Đặc tả Logic nghiệp vụ, thuật toán cây, quy tắc phân cấp & đồng bộ.
- [`v0.0.2/03-SPEC-DATA-CONTRACTS.md`](./v0.0.2/03-SPEC-DATA-CONTRACTS.md): Đặc tả Protobuf, Zod Schemas & định dạng YAML Frontmatter.
- [`v0.0.2/04-AI-IMPLEMENTATION-CHECKLIST.md`](./v0.0.2/04-AI-IMPLEMENTATION-CHECKLIST.md): Bộ checklist triển khai chi tiết cho AI Agent.
