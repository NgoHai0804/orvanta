# Spec UI/UX & Hiệu Ứng Chuẩn — Orvanta v0.0.2

Tài liệu đặc tả chi tiết về mặt thị giác (Visual Design), hệ thống màu sắc, kiểu dáng component, bố cục Split View và các hiệu ứng chuyển động (Animation/Transition) cho giao diện Tab Agents dạng cây.

---

## 1. Hệ Thống Design Tokens & Bảng Màu (Dark Theme Palette)

Giao diện tuân thủ triết lý thương hiệu Orvanta: **Indigo · Violet · Dark Navy**, đồng thời tích hợp mượt mà với biến màu (CSS Variables) chuẩn của VS Code:

| Thành phần | Mã màu Tailwind / Hex | VS Code CSS Variable tương thích | Mục đích sử dụng |
|---|---|---|---|
| **App Background** | `#0b1021` (Dark Navy) | `--vscode-editor-background` | Nền tổng thể của toàn bộ shell |
| **Panel Surface** | `#141b34` (Surface Navy) | `--vscode-sideBar-background` | Nền của các card, container, popover |
| **Border / Divider** | `border-slate-800` / `#1e293b` | `--vscode-panel-border` | Đường viền ngăn cách, viền node |
| **Primary Accent** | `bg-indigo-600` / `#4f46e5` | `--vscode-button-background` | Nút hành động chính, tab active, node selected |
| **Primary Hover** | `bg-indigo-500` / `#6366f1` | `--vscode-button-hoverBackground` | Trạng thái hover của nút chính |
| **Secondary Accent** | `text-violet-400` / `#a78bfa` | `--vscode-textLink-foreground` | Điểm nhấn icon, badge kỹ năng, liên kết |
| **Text Primary** | `text-slate-100` / `#f8fafc` | `--vscode-foreground` | Tiêu đề, tên agent, nhãn quan trọng |
| **Text Muted** | `text-slate-400` / `#94a3b8` | `--vscode-descriptionForeground` | Chú thích, @id, mô tả phụ |
| **Status Running** | `text-amber-400`, `bg-amber-400/10` | `--vscode-charts-yellow` | Huy hiệu agent đang thực thi nhiệm vụ |
| **Status Idle** | `text-emerald-400`, `bg-emerald-400/10` | `--vscode-charts-green` | Huy hiệu agent rảnh rỗi / sẵn sàng |
| **Status Stopped** | `text-slate-400`, `bg-slate-500/10` | `--vscode-disabledForeground` | Huy hiệu agent đã tạm dừng |
| **Danger / Fire** | `text-rose-400`, `hover:bg-rose-500/10` | `--vscode-errorForeground` | Nút sa thải, thao tác xóa nguy hiểm |

---

## 2. Bố Cục Split View Trên - Dưới (`AgentsView.tsx`)

Bố cục tổng thể chia làm 2 phân vùng theo chiều dọc, tận dụng tối đa chiều cao cửa sổ:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Tabs OrvantaShell [Home] [Agents] [Inbox] [Chat] [War room]   │
├────────────────────────────────────────────────────────────────────────┤
│ TAB AGENTS HEADER: "Cơ cấu tổ chức"          [Tỉ lệ: 100%] [+ Thêm]  │
├────────────────────────────────────────────────────────────────────────┤
│ PHÂN VÙNG 1: SƠ ĐỒ CÂY TỔ CHỨC (TOP PANEL - Chiều cao: 42% min 240px)  │
│                                                                        │
│                      ┌──────────────────────┐                          │
│                      │   👑 Coordinator     │                          │
│                      │   @coordinator · Idle│                          │
│                      └──────────┬───────────┘                          │
│            ┌────────────────────┼────────────────────┐                 │
│            ▼                    ▼                    ▼                 │
│    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐         │
│    │  Implementer  │    │   Reviewer    │    │  Researcher   │         │
│    │  @impl · Run  │    │  @review· Idle│    │  @res · Idle  │         │
│    │  [ACTIVE RING]│    └───────────────┘    └───────────────┘         │
│    └───────────────┘                                                   │
├────────────────────────────────────────────────────────────────────────┤
│ SPLIT DIVIDER / RESIZER BAR (Border 1px kèm handle nắm kéo nhẹ)        │
├────────────────────────────────────────────────────────────────────────┤
│ PHÂN VÙNG 2: CHI TIẾT AGENT (BOTTOM PANEL - Chiều cao: 58% flex-1)     │
│ Header: [Implementer (@implementer)]               [Lưu] [Hủy/Đóng]   │
│ Sub-tabs: [Profile] [Model & Params] [Tools] [Rules] [Skills]          │
│ ────────────────────────────────────────────────────────────────────── │
│ [Nội dung form cuộn độc lập theo từng tab]                             │
└────────────────────────────────────────────────────────────────────────┘

---

## 3. Đặc Tả Sơ Đồ Cây & Hiệu Ứng Chuyển Động (`AgentTreeChart.tsx`)

### 3.1. Thiết kế Thẻ Node Agent trong Cây
Mỗi node đại diện cho một agent có kích thước cố định `min-w-[170px] max-w-[210px]`:
- **Avatar Role Icon**:
  - `lead` / `coordinator`: 👑 Biểu tượng vương miện viền vàng
  - `implementer`: 💻 Biểu tượng code viền xanh dương
  - `reviewer`: 🔍 Biểu tượng kính lúp viền tím
  - `researcher`: 🌐 Biểu tượng địa cầu viền lục lam
  - `skeptic`: 🛡️ Biểu tượng khiên bảo vệ viền hổ phách
- **Tên hiển thị & @id**:
  - `displayName`: Font semibold, truncate nếu quá dài, tooltip hiển thị tên đầy đủ.
  - `@id`: Font mono nhỏ `text-[10px] text-slate-400`.
- **Badges**:
  - Badge Role: Pill nhỏ góc phải (`LEAD` màu tím indigo, `TEAM` màu slate).
  - Status Indicator: Chấm tròn trạng thái:
    - `running`: Đèn vàng nhấp nháy (Pulsing animation: `animate-pulse ring-2 ring-amber-400/50`).
    - `idle`: Đèn xanh lục tĩnh (`bg-emerald-400`).
    - `stopped`: Đèn xám mờ (`bg-slate-500`).

### 3.2. Hiệu ứng Node khi Tương tác (States & Transitions)
- **Normal State**: `bg-[#141b34] border border-slate-800 rounded-lg shadow-sm transition-all duration-200`.
- **Hover State**:
  - Đổi viền: `hover:border-indigo-400/60 hover:bg-[#1a2344]`.
  - Nâng nhẹ bề mặt: `hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-500/10`.
  - Cursor pointer rõ ràng.
- **Active / Selected State** (Agent đang được chọn sửa ở panel dưới):
  - Viền phát sáng: `border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/30`.
  - Shadow tỏa sắc tím: `shadow-lg shadow-indigo-500/20`.
  - Icon đánh dấu checkmark hoặc chấm active góc trên.

### 3.3. Đường Nối Phân Cấp Cây (Connector Lines)
- Sử dụng thẻ SVG phủ nền hoặc layout flex/grid với pseudo-lines.
- Đường vẽ: Đường cong Bezier mượt mà (`M x1,y1 C x1,(y1+y2)/2 x2,(y1+y2)/2 x2,y2`) hoặc đường gập góc vuông (`orthogonal`).
- Màu nét: `stroke-slate-700 stroke-[1.5px]`.
- Nét active: Khi node con hoặc node cha được active, đường nối giữa hai node chuyển sang màu `stroke-indigo-400 stroke-[2px] transition-colors duration-300`.

### 3.4. Nút Thu Gọn / Mở Rộng Nhánh Cây (Collapse/Expand Branch)
- Nếu một node có > 1 agent con trực tiếp: hiển thị nút tròn nhỏ `[ - ]` hoặc `[ + ]` ở chân node.
- Click `[ - ]`: Thu gọn toàn bộ cây con bên dưới node đó với hiệu ứng fade/collapse nhẹ nhàng (`transition-all duration-200`).
- Badge số lượng: Khi thu gọn, hiển thị badge `(+3)` biểu thị có 3 agent cấp dưới đang ẩn.


---

## 4. Đặc Tả Chi Tiết Panel Dưới & Các Form Controls Chuẩn

### 4.1. Thanh Sub-Tabs Chi Tiết Agent
Gồm 5 tabs với biểu tượng trực quan:
```
[ 👤 Profile ]   [ 🧠 Model & Thông số ]   [ 🛠️ Tools ]   [ 📜 Rules ]   [ ⚡ Skills ]
```
- **Hiệu ứng Tab Switching**:
  - Tab đang chọn: `bg-indigo-600 text-white font-medium shadow-xs scale-100 transition-all duration-150`.
  - Tab không chọn: `text-slate-400 hover:text-slate-200 hover:bg-white/5`.
  - Vùng nội dung bên dưới trượt mờ nhẹ khi chuyển tab (`fade-in duration-200`).

### 4.2. Model Combobox với Tìm Kiếm & Catalog Specs
- Ô Combobox hiển thị: Tên model hiện tại + icon provider (ví dụ: `Anthropic / Claude 3.7 Sonnet`).
- Khi click mở ra **Popover Dropdown**:
  - Thanh tìm kiếm trên cùng có input debounce, tự động lọc theo id hoặc tên model.
  - Nhóm danh sách theo Provider (Anthropic, OpenAI, OpenRouter, Google Vertex, Groq...).
  - Mỗi dòng model hiển thị:
    - Tên Model đậm, Model ID nhạt font mono.
    - Badges thông số tự động: `128K Context`, `Vision`, `Reasoning`.
    - Checkmark xanh bên phải nếu đang được chọn.
  - Tùy chọn Custom: Cho phép người dùng nhập Model ID thủ công nếu dùng private proxy hoặc mô hình nội bộ.

### 4.3. Multi-Select Tools Chips
- **Danh sách chip đã chọn**:
  - Dạng tag bo tròn: `bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs text-slate-200 flex items-center gap-1.5`.
  - Nút xóa `×` có animation thu nhỏ và mờ dần khi nhấp (`hover:text-red-400 hover:bg-red-500/20 rounded-full`).
- **Nút Thêm Tool**:
  - Mở dropdown liệt kê các tool chuẩn chưa được gán.
  - Phân loại rõ ràng: File operations, Execution, Web & Browser, Team coordination.
  - Di chuột vào từng tool có tooltip hiển thị bản giải thích công năng 1 câu ngắn gọn.

### 4.4. Controls Thông Số AI: Sliders, Toggles, Number Presets
- **Reasoning Effort Segmented Control**:
  - Thanh nút chuyển đổi ngang 5 mức: `[ None ] [ Low ] [ Medium ] [ High ] [ Max ]`.
  - Mức active có nền tím phát sáng.
- **Supports Images Toggle Switch**:
  - Switch tiêu chuẩn iOS/macOS style: Nền xanh indigo khi On, xám khi Off. Nút tròn trượt mượt mà `duration-200 ease-in-out`.
- **Context Window & Output Tokens Presets**:
  - Bên dưới ô nhập số có các nút bấm nhanh: `[ 64K ] [ 128K ] [ 200K ] [ 1M ]`. Bấm vào sẽ tự động điền số tokens tương ứng.
- **Temperature Slider**:
  - Thanh trượt mượt từ `0.0` đến `2.0` (bước nhảy `0.1`).
  - Hiển thị giá trị số thực thời gian thực ngay bên cạnh thanh trượt (ví dụ: `0.7 - Sáng tạo vừa phải`).

### 4.5. Phản Hồi Trạng Thái Lưu (Save & Feedback Animations)
- **Dirty State**: Khi có thay đổi chưa lưu, nút `Lưu` chuyển sang trạng thái nổi bật (`ring-2 ring-indigo-400/50 animate-pulse`), góc tên agent hiển thị dấu chấm vàng `● Chưa lưu`.
- **Saving State**: Nút `Lưu` chuyển thành icon spinner xoay (`codicon-loading codicon-modifier-spin`), disable các thao tác khác.
- **Success Toast**: Khi lưu xong, xuất hiện thanh thông báo nổi trên cùng màu xanh ngọc dịu nhẹ tự ẩn sau 3 giây.


```
