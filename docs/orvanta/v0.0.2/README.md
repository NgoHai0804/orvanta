# Orvanta v0.0.2 — Cải Tiến Trang Home & Quản Lý Agents Dạng Cây

Tài liệu này tổng hợp toàn bộ định hướng, kiến trúc, đặc tả chi tiết và checklist triển khai cho phiên bản **Orvanta v0.0.2**.

---

## 1. Bối cảnh & Lý do nâng cấp

Trong phiên bản v0.0.1:
- Trang **Home** bị quá tải nội dung: vừa hiển thị Purpose, vừa hiển thị Work tasks (In progress / Blocked / Queue), vừa hiển thị Inbox teaser, và ở cuối là danh sách Roster phẳng.
- Roster chỉ là danh sách các thẻ Agent đơn giản, không biểu thị được mối quan hệ quản lý phân cấp trong tổ chức (ai giao việc cho ai, ai là lead phụ trách nhóm nào).
- Trình biên tập Agent (`AgentEditor.tsx`) là một form cuộn dọc đơn khối (monolithic), các trường nhập liệu như `modelId` hay `tools` đều phải gõ tay bằng văn bản thô, chưa có combobox chọn từ catalog hệ thống.
- Thiếu các trường thông số AI quan trọng (Reasoning type/effort, Hỗ trợ hình ảnh - Supports Images, Kích thước Context Window, Giới hạn Max Output Tokens, Temperature tùy chỉnh).
- Chưa có cơ chế gán Rule và Skill chuyên biệt cho từng Agent.

---

## 2. 7 Trọng tâm cải tiến trong v0.0.2

| STT | Trọng tâm cải tiến | Mục tiêu đạt được |
|:---:|---|---|
| **1** | **Tách ROSTER ra Tab riêng** | Thanh điều hướng `OrvantaShell` có thêm tab `Agents` độc lập (`Home \| Agents \| Inbox \| Chat \| War room`). Home được giải phóng để tập trung làm dashboard điều hành. |
| **2** | **Sơ đồ cây phân cấp Agent** | Mô hình hóa mối quan hệ phân cấp đa tầng (Multi-level Hierarchy) qua trường `reportsTo`. Coordinator làm Root; các Tech Lead / Manager quản lý các Teammate cấp dưới. |
| **3** | **Bố cục Split View Trên - Dưới** | Nửa trên là Sơ đồ cây trực quan, có thể nhấp chọn node; Nửa dưới là Panel chi tiết cấu hình Agent đang chọn (mặc định chọn Coordinator/Lead khi mở tab). |
| **4** | **Chi tiết Agent 5 Tabs** | Chia tách form thành 5 tabs rõ ràng: Profile, Model & Thông số AI, Tools & Quyền hạn, Instructions & Rules, Skills. |
| **5** | **Combobox Model & Tools** | Dropdown tìm kiếm thông minh: Model lấy trực tiếp từ catalog các provider (Claude, GPT, Gemini, DeepSeek...); Tools multi-select phân loại theo nhóm chức năng. |
| **6** | **Mở rộng Thông số AI Model** | Tùy chỉnh: Reasoning effort (None/Low/Med/High/Max), Supports Images (Toggle), Context Window (128K, 200K, 1M...), Max Output Tokens, Temperature slider. |
| **7** | **Quản lý Rules & Skills cho Agent** | Cho phép gán các Rule (.cline/rules/, .cursorrules) và Skill (.agents/skills/) riêng biệt cho từng Agent, giúp chuyên môn hóa năng lực từng role. |

---

## 3. Cấu trúc bộ tài liệu v0.0.2

Để đảm bảo AI và đội ngũ kỹ sư có thể triển khai code chuẩn xác tuyệt đối, bộ tài liệu v0.0.2 được phân tách thành 4 tài liệu chuyên sâu:

1. 🎨 **[`01-SPEC-UI-UX-EFFECTS.md`](./01-SPEC-UI-UX-EFFECTS.md)**
   - Thiết kế giao diện chi tiết đến từng pixel, bảng màu dark theme chuẩn Orvanta.
   - Đặc tả bố cục Split View (Top: Tree Chart, Bottom: Detail Editor).
   - Hiệu ứng chuyển động (animations), trạng thái tương tác (hover, active, focus, pulse running, branch collapse/expand, tabs transition).

2. ⚙️ **[`02-SPEC-BUSINESS-LOGIC.md`](./02-SPEC-BUSINESS-LOGIC.md)**
   - Toàn bộ thuật toán nghiệp vụ: Dựng cây từ `reportsTo`, thuật toán phát hiện và ngăn chặn lặp vòng (Cycle Detection DFS).
   - Quy tắc kế thừa và fallback khi node cha bị sa thải/xóa.
   - Logic Combobox Model, auto-fill thông số từ `ModelInfo` catalog.
   - Thứ tự ưu tiên tool (Deny luôn thắng Allow) và bảo vệ mandatory paths.
   - Đồng bộ trạng thái giữa Webview và Core Extension qua gRPC.

3. 📑 **[`03-SPEC-DATA-CONTRACTS.md`](./03-SPEC-DATA-CONTRACTS.md)**
   - Đặc tả Protobuf message `OrvantaAgentProfile` trong `proto/cline/orvanta.proto`.
   - Zod schema `AgentProfileFrontmatterSchema` trong `sdk/packages/shared/src/orvanta/agent-profile.ts`.
   - Cấu trúc YAML frontmatter của file `profile.md`.
   - Cấu trúc `org/roster.json` và ánh xạ dữ liệu hai chiều.

4. ✅ **[`04-AI-IMPLEMENTATION-CHECKLIST.md`](./04-AI-IMPLEMENTATION-CHECKLIST.md)**
   - Danh sách kiểm tra siêu chi tiết chia theo 5 giai đoạn triển khai (Data Contract -> UI Shell -> Tree Chart -> Editor 5 Tabs -> Verification).
   - Liệt kê cụ thể từng file, từng hàm cần viết, từng test case cần vượt qua.
