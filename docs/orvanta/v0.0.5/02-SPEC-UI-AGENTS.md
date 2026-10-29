# Orvanta v0.0.5 — Đặc Tả Chi Tiết Giao Diện Trang Agents
## Sơ Đồ Cây Phân Cấp Nhân Sự (Org Tree Chart) & Trình Cấu Hình Đa Chuyên Đề (5-Tab Agent Editor)

---

## 1. Mục Tiêu & Triết Lý Thiết Kế Trang Agents

Trang **Agents** là trung tâm quản trị cơ cấu tổ chức và nhân sự AI của công ty. Đây là nơi CEO thiết lập quan hệ cấp trên - cấp dưới (`reportsTo`), quy định quyền hạn công cụ, lựa chọn mô hình AI (Model) và nạp hướng dẫn vận hành cho từng thành viên.

### 1.1. Triết lý thiết kế
- **Master Trên / Detail Dưới:** Thay vì Master-Detail ngang (chiếm bề ngang lớn), Orvanta sử dụng bố cục Trên - Dưới phù hợp hoàn hảo với chiều dọc của VS Code extension panel (bề ngang hẹp 250px - 400px).
- **Trực quan hóa cấu trúc quyền lực:** Cây tổ chức thể hiện rõ dòng chảy công việc từ Coordinator xuống các Sub-Agent; triệt tiêu hoàn toàn sự mù mờ về vai trò nhân sự.
- **Cấu hình không cần rời VS Code:** Mọi thiết lập từ Model, API Key, Tools đến System Prompt đều được chỉnh sửa ngay trong Webview thông qua 5 chuyên đề chuyên biệt.

### 1.2. Tài liệu tham chiếu gốc
- [`D:\Tool\Skill\.cursor\specs\web\styles\layout.md`](../../../../Tool/Skill/.cursor/specs/web/styles/layout.md): Mẫu Master trên / Detail dưới, Master-Detail pattern.
- [`D:\Tool\Skill\.cursor\specs\web\styles\scroll.md`](../../../../Tool/Skill/.cursor/specs/web/styles/scroll.md): Vùng canvas `.scroller`, thanh cuộn ngang tab bar `.scroller-x`, cuộn form `.scroller-y`.
- [`D:\Tool\Skill\.cursor\specs\web\styles\icons.md`](../../../../Tool/Skill/.cursor/specs/web/styles/icons.md): Bộ Tabler Icons đại diện cho các vai trò Agent Roles (`stroke={1.5}`).
- [`D:\Tool\Skill\.cursor\specs\web\components\combobox.md`](../../../../Tool/Skill/.cursor/specs/web/components/combobox.md): Model Picker Combobox và Parent Agent Selector.
- [`D:\Tool\Skill\.cursor\specs\web\components\text-field.md`](../../../../Tool/Skill/.cursor/specs/web/components/text-field.md): Form fields, validation & readonly states.

---

## 2. Kiến Trúc Bố Cục Split View Trên - Dưới (Master-Detail)

```
┌────────────────────────────────────────────────────────┐
│ OrvantaShell Navigation Bar                            │
├────────────────────────────────────────────────────────┤
│ AgentsView Root (100dvh flex-col, overflow: hidden)    │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Top Area: AgentTreeChart (h: ~42%, min 180px)      │ │
│ │ - Toolbar: [Zoom -] [Zoom +] [Fit] [Reset] [+ Thêm]│ │
│ │ - Interactive SVG/DOM Tree Canvas (.scroller)      │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ Split Divider Drag Handle (h: 12px, resize-y)      │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ Bottom Area: AgentEditor (flex-1, min 220px)       │ │
│ │ - Agent Header (Avatar, Name, ID, Actions)         │ │
│ │ - 5-Tabs Navigation (.scroller-x, h: 32px)         │ │
│ │ - Tab Form Content Container (.scroller-y)         │ │
│ │ - Sticky Form Footer ([Hủy] [Lưu cấu hình])        │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

- **Hệ số phân chia kích thước:**
  - `AGENTS_SPLIT_MIN_TREE`: `180px`
  - `AGENTS_SPLIT_MIN_EDITOR`: `220px`
  - `AGENTS_SPLIT_DIVIDER`: `12px`
  - `AGENTS_SPLIT_DEFAULT_RATIO`: `0.42` (42% chiều cao container dành cho cây)
  - `AGENTS_SPLIT_STORAGE_KEY`: `orvanta_agents_split_tree_height` (lưu vị trí kéo thả vào `localStorage`).

---

## 3. Đặc Tả Chi Tiết Từng Thành Phần Giao Diện

### 3.1. `AgentTreeChart` (Sơ Đồ Cây Phân Cấp Tương Tác)
- **Container:** `flex flex-col min-h-0 relative overflow-hidden bg-(--vscode-editor-background)`
- **Toolbar điều khiển cây:**
  - Nhóm nút thao tác: Nền `bg-(--vscode-sideBar-background)/80 backdrop-blur-xs border border-border-panel rounded-md p-0.5 flex items-center gap-1`.
  - Các nút:
    1. Thu nhỏ (Zoom Out): `<IconZoomOut size={13} stroke={1.5} />` (giảm zoom 15%)
    2. Phóng to (Zoom In): `<IconZoomIn size={13} stroke={1.5} />` (tăng zoom 15%)
    3. Căn vừa khung (Fit View): `<IconMaximize size={13} stroke={1.5} />`
    4. Khôi phục mặc định (Reset): `<IconRefresh size={13} stroke={1.5} />` (zoom 100%, căn giữa)
    5. Thêm Agent Mới: Nút Primary `<IconPlus size={13} stroke={1.5} />` (Mở modal tạo Agent)
- **Vùng Canvas Cây:** Mang class `.scroller flex-1 min-h-0 w-full relative select-none cursor-grab active:cursor-grabbing`.
- **Thẻ Nhân Sự Trên Cây (Org Node Card):**
  - Rộng `160px - 180px`, padding `p-2.5`, bo góc `rounded-md`, viền `border border-border-panel`, nền `bg-(--vscode-sideBar-background)`.
  - Trạng thái Active: Viền sáng `border-indigo-500 ring-2 ring-indigo-500/20 shadow-md`.
  - Cấu trúc: Avatar Tabler role icon tròn `24x24`, status dot, Purpose Lock badge (`IconShieldLock`), Tên hiển thị, `@agentId`, Role chip, badge số cấp dưới trực tiếp.

### 3.2. Split Divider Bar (Thanh Phân Tách Kéo Thả)
- **Kích thước & Hit-area:** Chiều cao cố định `12px`, con trỏ chuột dạng `cursor-row-resize`.
- **Hiệu ứng trực quan:**
  - Ở giữa có thanh gạch ngang nhỏ dài `36px`, dày `2px`, bo tròn, màu `bg-border-panel`.
  - Khi hover hoặc đang kéo (dragging): Thanh chuyển sang màu xanh `bg-indigo-500` và toàn bộ divider có dải nền sáng mờ.
- **Ràng buộc:** Tự động clamp độ cao cây trong khoảng `180px` đến `containerHeight - 220px`. Lưu độ cao vào `localStorage`.

### 3.3. `AgentEditor` (Trình Cấu Hình Đa Chuyên Đề)
- **Container:** `flex-1 min-h-0 flex flex-col overflow-hidden bg-background`
- **Editor Header:**
  - `flex shrink-0 items-center justify-between border-b border-border-panel px-3 py-2 bg-(--vscode-sideBar-background)/50`
  - Bên trái: Avatar icon của Agent, Tên hiển thị (`font-semibold text-xs`), ID `@agentId`, Role tag.
  - Bên phải (Quick Actions):
    - Nút Chat 1:1: `<IconMessage size={13} stroke={1.5} />` (Text: "Mở kênh chat", chuyển sang tab Console tại kênh agent này).
    - Nút Xóa Agent: `<IconTrash size={13} stroke={1.5} className="text-red-400" />` (vô hiệu hóa nếu là Coordinator).
    - Nút Đóng: `<IconX size={13} stroke={1.5} />`.
- **Sub-Tabs Navigation Bar:**
  - Chiều cao `32px`, cuộn ngang `.scroller-x flex shrink-0 items-center gap-1 border-b border-border-panel px-2 bg-(--vscode-sideBar-background)/30`.
  - 5 Chuyên đề cấu hình với Tabler icons chuẩn:
    1. **Profile** (`<IconUser size={13} stroke={1.5} />`):
       - Tên hiển thị (`displayName`), Mã định danh (`id` - readonly sau khi tạo).
       - Vai trò (`role`): Dropdown chọn vai trò (`lead`, `teammate`, `ephemeral`).
       - Mô tả tóm tắt nhiệm vụ (`description`): Textarea 2 dòng.
       - Cấp trên trực tiếp (`reportsTo`): Dropdown danh sách các Agent khác trong công ty để thiết lập quan hệ phân cấp.
    2. **Model & Thông Số AI** (`<IconBrain size={13} stroke={1.5} />`):
       - Mô hình LLM: `ModelPickerCombobox` có tìm kiếm, hỗ trợ Anthropic, OpenAI, OpenRouter, Bedrock, Ollama...
       - Nhiệt độ sáng tạo (`Temperature`): Slider từ `0.0` đến `1.0` (mặc định `0.2` cho code).
       - Max Output Tokens: Ô số giới hạn token sinh ra.
       - Thinking Budget: Bật/tắt chế độ suy nghĩ sâu (extended thinking).
    3. **Tools & Quyền Hạn** (`<IconTool size={13} stroke={1.5} />`):
       - Danh sách Tools cho phép (Whitelist): Checkboxes cho `read_files`, `edit_file`, `new_file`, `execute_command`, `fetch_web_search`...
       - Phạm vi đường dẫn (Scope Paths): Danh sách `allow` (cho phép đọc/ghi) và `denyWrite` (chặn chỉnh sửa file nhạy cảm).
    4. **Instructions & Rules** (`<IconFileText size={13} stroke={1.5} />`):
       - System Prompt Editor: Trình soạn thảo Markdown chuyên biệt quy định trách nhiệm và phong cách hành xử.
       - Definition of Done (DoD): Danh sách tiêu chí nghiệm thu bắt buộc phải thỏa mãn trước khi nộp sản phẩm bàn giao.
    5. **Skills** (`<IconSparkles size={13} stroke={1.5} />`):
       - Danh sách kỹ năng nạp từ thư mục `.cline/skills/` và Workspace.
       - Toggle switch kích hoạt hoặc vô hiệu hóa từng kỹ năng riêng biệt cho Agent này.
- **Sticky Form Footer:**
  - Ghim cố định ở đáy editor: `flex shrink-0 items-center justify-end gap-2 border-t border-border-panel p-2.5 bg-(--vscode-sideBar-background)/70`
  - Thứ tự nút đúng chuẩn: `[Hủy bỏ (Secondary)]` `[Lưu cấu hình Agent (Primary, IconDeviceFloppy)]`.

### 3.4. Modal Tạo Agent Từ Template Mẫu
- Mở khi người dùng bấm nút `+` trên toolbar của cây.
- Cung cấp 5 mẫu template dựng sẵn:
  1. `implementer`: Code Implementer (`IconCode`) - Chuyên viết mã và giải quyết tính năng.
  2. `reviewer`: Code Reviewer (`IconSearch`) - Thẩm định code độc lập, phát hiện lỗi.
  3. `researcher`: Tech Researcher (`IconCompass`) - Nghiên cứu tài liệu và giải pháp.
  4. `skeptic`: Critical Skeptic (`IconShieldAlert`) - Phản biện kiến trúc và tìm edge cases.
  5. `blank`: Agent Tùy Biến (`IconPlus`) - Khởi tạo từ mẫu trắng.
- Tự động gán `reportsTo` mặc định trỏ về Coordinator hoặc node cha đang chọn.


---

## 4. Quy Chuẩn Design Tokens & Tabler Icons Áp Dụng

### 4.1. Bảng ánh xạ tokens trên trang Agents

| Phần tử UI | Class / Token áp dụng | Nguồn tham chiếu `specs/web` |
|---|---|---|
| **Root Viewport** | `flex flex-col min-h-0 overflow-hidden 100dvh` | `styles/layout.md` |
| **Org Tree Canvas** | `.scroller flex-1 min-h-0 w-full` | `styles/scroll.md` |
| **Split Divider** | `h-3 cursor-row-resize flex items-center justify-center hover:bg-surface-secondary` | `patterns/sidebar.md` |
| **Editor Sub-tabs** | `.scroller-x flex shrink-0 items-center gap-1 border-b h-8 px-2` | `styles/scroll.md` |
| **Editor Form Body** | `.scroller-y flex-1 min-h-0 p-3 space-y-3` | `styles/scroll.md` |
| **Node Card viền** | `border border-border-panel bg-(--vscode-sideBar-background) rounded-md` | `styles/color.md` |
| **Node Card active** | `border-indigo-500 ring-2 ring-indigo-500/20 shadow-md` | `styles/color.md` |
| **Form Inputs** | `rounded border border-border-panel bg-(--vscode-input-background) text-xs p-1.5` | `components/text-field.md` |
| **Model Combobox** | `rounded border border-border-panel bg-(--vscode-dropdown-background) text-xs` | `components/combobox.md` |
| **Sticky Footer** | `flex shrink-0 items-center justify-end gap-2 border-t p-2.5` | `styles/layout.md` (form-footer) |

### 4.2. Danh mục Tabler Icons vai trò (Agent Roles)

| Vai trò | Icon Component | Màu sắc nhận diện | Mô tả |
|---|---|---|---|
| **Lead / Coordinator** | `<IconStar />` | Vàng Amber (`#F59E0B`) | Chỉ huy trưởng, phân chia task và điều phối toàn đội |
| **Coder / Implementer**| `<IconCode />` | Tím Violet (`#8B5CF6`) | Kỹ sư lập trình, viết mã nguồn, sửa lỗi |
| **Reviewer / Auditor** | `<IconSearch />` | Xanh Dương Indigo (`#3B82F6`) | Thẩm định chất lượng mã nguồn, kiểm tra DoD |
| **Architect** | `<IconRuler />` | Xanh Lam Sky (`#0EA5E9`) | Thiết kế kiến trúc hệ thống và luồng dữ liệu |
| **Researcher** | `<IconCompass />` | Xanh Lục Teal (`#14B8A6`) | Khảo sát công nghệ, tìm kiếm tài liệu kỹ thuật |
| **Skeptic / Critic** | `<IconShieldAlert />` | Đỏ Rose (`#F43F5E`) | Phản biện rủi ro, kiểm thử bảo mật và edge cases |
| **Content / Writer** | `<IconPencil />` | Xanh Lá Emerald (`#10B981`) | Soạn thảo tài liệu kỹ thuật và báo cáo |
| **Sales / Outreach** | `<IconTarget />` | Cam Orange (`#F97316`) | Tiếp cận đối tác và giao tiếp bên ngoài |
| **Ephemeral / Temp** | `<IconBolt />` | Vàng Gold (`#EAB308`) | Agent tạm thời cho tác vụ ngắn hạn |
| **Mặc định** | `<IconRobot />` | Xám Muted (`#94A3B8`) | Vai trò đồng đội chung |

---

## 5. Checklist Nghiệm Thu Chuẩn Trang Agents (Acceptance Checklist)

### 5.1. Bố cục & Viewport
- [ ] Bố cục Split View Trên - Dưới duy trì tỷ lệ hợp lý, không bao giờ để vùng cây hoặc editor biến mất hoàn toàn.
- [ ] Split Divider kéo thả mượt mà, lưu giá trị độ cao vào `localStorage` và phục hồi chính xác khi mở lại.
- [ ] Vùng canvas cây có `.scroller` pan/zoom mượt mà.
- [ ] Thanh tab chuyên đề có `.scroller-x` siêu mảnh (không wrap xuống dòng khi panel hẹp).
- [ ] Nội dung form bên dưới có `.scroller-y` độc lập, nút Lưu/Hủy luôn ghim cố định ở đáy.

### 5.2. Biểu tượng & Trực quan
- [ ] 100% vai trò Agent được đại diện bằng đúng Tabler Icon tương ứng với `stroke={1.5}`.
- [ ] Tuyệt đối không dùng emoji `★`, `💻`, `🔍`, `📐`, `🤖` trong code hiển thị thẻ và danh sách.
- [ ] Đèn trạng thái status dot hiển thị đúng màu và nhấp nháy pulse khi Agent đang chạy (`running`).

### 5.3. Trạng thái & Tương tác
- [ ] Nhấp chọn node bất kỳ trên cây: Cập nhật ngay `focusedAgentId`, mở đúng dữ liệu trong Editor bên dưới.
- [ ] Toolbar: Nút Zoom In, Zoom Out, Fit View, Reset hoạt động chính xác.
- [ ] Chuyển đổi giữa 5 sub-tabs (Profile, Model, Tools, Instructions, Skills) tức thì, giữ nguyên dữ liệu chưa lưu (dirty state).
- [ ] Sửa đổi trường `reportsTo`: Cây tự động tái cấu trúc theo phân cấp cha - con mới sau khi bấm Lưu.
- [ ] Nút "Mở kênh chat": Chuyển tab sang Console và chọn đúng kênh của Agent đó.
- [ ] Modal tạo Agent: Chọn mẫu template tự động điền đầy đủ Profile, Tools và Instructions mẫu.

### 5.4. Kiểm thử & Độ ổn định
- [ ] Unit tests pass 100%: `AgentsView.test.tsx` (11/11), `AgentTreeChart.test.tsx` (8/8), `AgentEditor.test.tsx` (18/18).
- [ ] Không có memory leak khi drag split divider liên tục.
- [ ] TypeScript typecheck pass 100% (`bun run tsc --noEmit`).

