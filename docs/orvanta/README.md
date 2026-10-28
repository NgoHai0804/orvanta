# Orvanta — Tài liệu Kiến trúc & Sản phẩm

Orvanta là lớp **công ty AI theo từng repository**, xây dựng trên nền tảng Cline. Người dùng đóng vai trò CEO định hình mục tiêu công ty; hệ thống đội ngũ AI tự phối hợp phân chia công việc theo vai trò chuẩn mực; CEO theo dõi trạng thái và phê duyệt các quyết định quan trọng.

---

## Cấu trúc Phiên bản Tài liệu

Tài liệu thiết kế và đặc tả kỹ thuật được phân chia theo 4 phiên bản:

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
4. **Cấu hình Agent 5 Tabs chuyên biệt**: Profile, Model & Thông số AI, Tools & Quyền hạn, Instructions & Rules, Skills.
5. **UI & Hiệu ứng Chuẩn**: Thiết kế pixel-perfect, animation mượt mà, theme màu tối Indigo/Violet/Navy, tương thích chuẩn VS Code.
6. **Actionable AI Checklist**: Bộ checklist chi tiết đến từng file, từng hàm và từng test case để AI triển khai code chính xác 100%.

---

### ⚡ [v0.0.3 (Kiến Trúc Thực Thi Tự Động — Autonomous Execution Engine)](./v0.0.3/README.md)
Phiên bản nâng cấp toàn diện **Cơ chế phối hợp & Thực thi thực tế** cho mọi loại công việc (Tech, Marketing, Sales, Research):
1. **Mô hình Hub-and-Spoke Orchestration**: Toàn bộ luồng giao việc và thẩm định đi qua Quản lý trực tiếp theo sơ đồ Cây. Tuyệt đối cấm sub-agent chat ngang hàng (P2P) tránh cạn token / lặp vô tận.
2. **Artifact-Driven Deliverables (File là bằng chứng duy nhất)**: Mọi nhiệm vụ đều bắt buộc xuất ra file sản phẩm cụ thể lưu tại thư mục `.orvanta/artifacts/`.
3. **Quy trình Thẩm định Độc lập (Maker - Checker Separation)**: Nhân sự làm xong phải được Reviewer thẩm định độc lập dựa trên Definition of Done (DoD).
4. **Bounded Feedback Loop**: Tối đa 2 vòng sửa đổi. Nếu quá 2 lần không đạt, tự động escalate lên CEO Inbox cho người dùng duyệt.
5. **Nạp Cây Tổ Chức vào Não Agent Chủ**: Coordinator tự động nhận diện toàn bộ cơ cấu nhân sự, năng lực và quyền hạn của từng cấp dưới trong System Prompt để tự giao việc đúng người.
6. **Universal Company Presets**: Mẫu cấu hình đội ngũ toàn diện cho Lập trình, Marketing & Growth, B2B Sales, Nghiên cứu sâu.


---

### 🎮 [v0.0.4 (Trung Tâm Tác Chiến Đa Tác Nhân — Multi-Agent Mission Console)](./v0.0.4/README.md)
Phiên bản nâng cấp trải nghiệm tương tác & điều hành tập trung:
1. **Hợp nhất Chat & War Room thành Tab [Console]**: Một màn hình chỉ huy duy nhất loại bỏ hoàn toàn sự phân mảnh giữa quan sát và ra lệnh.
2. **Mô hình Kênh (Channels Architecture)**: Kênh chung `#team-feed` (War Room Grid + Global Activity Timeline) và các kênh riêng chuyên biệt cho từng Agent (`@coordinator`, `@implementer`, `@reviewer`...).
3. **Định danh Tác nhân (Agent Attribution Engine)**: Xóa bỏ hoàn toàn "Cline edit file", mọi tin nhắn, lệnh terminal và khối diff file đều mang Avatar, Tên và Màu sắc nhận diện rõ ràng của Agent thực thi.
4. **Thanh Điều Hướng Thu Gọn (Collapsible Sidebar)**: Chuyển đổi linh hoạt giữa Expanded mode (160-280px) và Collapsed Mini mode (48px) kèm đèn trạng thái nhấp nháy, tối ưu diện tích hiển thị trên VS Code.

---

## Danh mục tài liệu trong v0.0.2

- [`v0.0.2/README.md`](./v0.0.2/README.md): Tổng quan phiên bản v0.0.2.
- [`v0.0.2/01-SPEC-UI-UX-EFFECTS.md`](./v0.0.2/01-SPEC-UI-UX-EFFECTS.md): Đặc tả chi tiết UI, Bố cục & Hiệu ứng chuyển động chuẩn.
- [`v0.0.2/02-SPEC-BUSINESS-LOGIC.md`](./v0.0.2/02-SPEC-BUSINESS-LOGIC.md): Đặc tả Logic nghiệp vụ, thuật toán cây, quy tắc phân cấp & đồng bộ.
- [`v0.0.2/03-SPEC-DATA-CONTRACTS.md`](./v0.0.2/03-SPEC-DATA-CONTRACTS.md): Đặc tả Protobuf, Zod Schemas & định dạng YAML Frontmatter.
- [`v0.0.2/04-AI-IMPLEMENTATION-CHECKLIST.md`](./v0.0.2/04-AI-IMPLEMENTATION-CHECKLIST.md): Bộ checklist triển khai chi tiết cho AI Agent.
