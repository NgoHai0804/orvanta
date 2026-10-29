# Orvanta v0.0.5 — Đặc Tả Chi Tiết Giao Diện Trang Home (Company HQ)
## Tổng Hành Dinh Công Ty: Mục Tiêu (Purpose), Nhiệm Vụ Đang Chạy (Work Now) & Trạng Thái Toàn Đội

---

## 1. Mục Tiêu & Triết Lý Thiết Kế Trang Home

Trang **Home** đóng vai trò là "Phòng Điều Hành Tổng Thể" (Company Headquarters) dành cho CEO. Đây là bề mặt đầu tiên người dùng nhìn thấy khi mở Orvanta.

### 1.1. Triết lý thiết kế
- **Tập trung & Tinh gọn:** Không nhồi nhét biểu đồ phức tạp; chỉ hiển thị 4 khối thông tin sống còn: Tên & Sứ mệnh công ty, Quyết định cần duyệt ngay (nếu có), Nhiệm vụ đang chạy (Work Now) và Sức khỏe đội ngũ (Roster status).
- **Mật độ thông tin cao (High Density):** Giảm thiểu khoảng cách trống, tối ưu chiều dọc để hiển thị trọn vẹn thông tin trên cửa sổ VS Code chỉ cao 600px - 800px.
- **Không emoji trang trí:** Toàn bộ trạng thái và chỉ mục đều được thể hiện qua Tabler Icons nét mảnh `stroke={1.5}` kết hợp với màu ngữ nghĩa (semantic tokens).

### 1.2. Tài liệu tham chiếu gốc
- [`D:\Tool\Skill\.cursor\specs\web\styles\layout.md`](../../../../Tool/Skill/.cursor/specs/web/styles/layout.md): Mẫu Dashboard Overview, Header + Content Inset `12px`.
- [`D:\Tool\Skill\.cursor\specs\web\styles\scroll.md`](../../../../Tool/Skill/.cursor/specs/web/styles/scroll.md): Vùng cuộn `.scroller-y`, thin scrollbar 6px.
- [`D:\Tool\Skill\.cursor\specs\web\styles\icons.md`](../../../../Tool/Skill/.cursor/specs/web/styles/icons.md): Tabler Icons scale 12px / 14px / 16px, `stroke={1.5}`.
- [`D:\Tool\Skill\.cursor\specs\web\styles\color.md`](../../../../Tool/Skill/.cursor/specs/web/styles/color.md): Bảng màu semantic chuẩn VS Code.
- [`D:\Tool\Skill\.cursor\specs\web\communication\announcement.md`](../../../../Tool/Skill/.cursor/specs/web/communication/announcement.md): Alert Banners & Toast messages.

---

## 2. Kiến Trúc Bố Cục & Khung Nhìn Viewport (`100dvh`)

Trang Home nằm trong container chính của `OrvantaShell` với các ràng buộc kích thước:

```
┌────────────────────────────────────────────────────────┐
│ OrvantaShell Navigation Bar (h: ~36px, shrink-0)      │
├────────────────────────────────────────────────────────┤
│ HomeView Root (flex-1, min-h: 0, overflow: hidden)     │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Scrollable Viewport (.scroller-y, p-3, space-y-2.5)│ │
│ │ 1. Company Header & Action Toolbar                 │ │
│ │ 2. Notice / Interrupted Session Banner (nếu có)    │ │
│ │ 3. Decision Pending Quick Banner (nếu có)          │ │
│ │ 4. Purpose Card & Purpose Lock Indicator           │ │
│ │ 5. Work Now Tasks Board (Active / Blocked / Queue) │ │
│ │ 6. Team Roster Quick Summary & Link to Agents      │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

- **Root Container:** `className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground"`
- **Khu vực cuộn nội dung:** `className="scroller-y flex-1 min-h-0 p-3 space-y-2.5"`
  - Tuyệt đối cấm cuộn ngoài root (không dùng `overflow-y-auto` trên shell ngoài).
  - Áp dụng `min-h-0` trên mọi cấp cha/con để ngắt propagation chiều cao của flexbox.

---

## 3. Đặc Tả Chi Tiết Từng Thành Phần Giao Diện

### 3.1. Company Header & Action Toolbar
- **Vị trí:** Đầu trang, luôn hiển thị đầu tiên trong dòng cuộn.
- **Cấu trúc hàng:** `flex items-start justify-between gap-2`
  - **Bên trái (Tiêu đề):**
    - Tên công ty: Thẻ `<h2>`, `font-semibold text-sm sm:text-base text-foreground truncate`.
    - Tagline Purpose: Thẻ `<p>`, `text-xs text-muted-foreground line-clamp-1` (tối đa 1 dòng, cắt bằng ellipsis).
  - **Bên phải (Công cụ):**
    - **Nút Đồng bộ (Sync):** Icon `<IconRefresh size={14} stroke={1.5} />`, quay animation `animate-spin` khi `syncing === true`. Tooltip: "Đồng bộ công ty từ đĩa".
    - **Nút Menu Tùy Chọn (More Options):** Icon `<IconDots size={16} stroke={1.5} />`, mở dropdown popup nổi (`z-30`).
- **Dropdown Menu Popup:**
  - Viền `border border-border-panel`, nền `bg-(--vscode-editor-background)`, bo góc `rounded-md`, đổ bóng `shadow-lg`.
  - Danh sách thao tác:
    1. Mở thư mục `.orvanta/`: `<IconFolder size={14} stroke={1.5} />` (Text: "Mở thư mục cấu hình")
    2. Xem `company.json`: `<IconFileCode size={14} stroke={1.5} />` (Text: "Xem company.json")
    3. Lưu vào thư viện: `<IconDownload size={14} stroke={1.5} />` (Text: "Lưu vào thư viện mẫu…")
    4. Tải từ thư viện: `<IconUpload size={14} stroke={1.5} />` (Text: "Tải từ thư viện mẫu…")
    5. Đường kẻ phân cách: `border-t border-border-panel my-1`
    6. Xóa công ty: `<IconTrash size={14} stroke={1.5} className="text-red-400" />` (Text màu đỏ: "Xóa công ty…")


### 3.2. Notice & Alert Banners
- **Banner Bị Gián Đoạn (Interrupted Session Warning):**
  - Hiển thị khi `hasInterrupted === true` (có ít nhất 1 Agent ở trạng thái `interrupted`).
  - Giao diện: Nền `bg-amber-500/10`, viền `border border-amber-500/30`, bo góc `rounded-md`, padding `p-2.5`.
  - Icon: `<IconAlertTriangle size={15} stroke={1.5} className="text-amber-400 shrink-0" />`.
  - Text: "Phiên làm việc trước bị gián đoạn. Bạn có thể tiếp tục với Coordinator."
  - CTA Button: Nút "Tiếp tục" (`bg-amber-600 hover:bg-amber-500 text-white text-xs px-2.5 py-1 rounded inline-flex items-center gap-1 font-medium cursor-pointer`), icon `<IconArrowRight size={12} stroke={1.5} />`. Chuyển ngay sang tab `Console` tại kênh `@coordinator`.
- **Flash Notification Banner (Toast inline):**
  - Hiển thị khi có thông báo nhanh (ví dụ sau khi đồng bộ hoặc copy).
  - Nền `bg-blue-500/10 border border-blue-500/20 text-blue-300`, nút đóng `<IconX size={12} stroke={1.5} />`.

### 3.3. Purpose & Purpose Lock Section
- **Card Container:** Viền `border border-border-panel`, nền `bg-surface-secondary/20`, bo góc `rounded-md`, padding `p-3`.
- **Header Khối:** `flex items-center justify-between mb-2`
  - Tiêu đề khối: Icon `<IconShieldLock size={14} stroke={1.5} className="text-indigo-400" />` + Text: "Sứ mệnh Công ty (Purpose)".
  - Badges & Actions:
    - Badge Purpose Lock: `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] px-1.5 py-0.2 rounded-full font-mono` ghi nhãn `PURPOSE-LOCKED`.
    - Nút Sửa Purpose: `<button>` icon `<IconPencil size={12} stroke={1.5} />` (Text: "Sửa"). Mở `EditPurposeModal`.
- **Nội dung Purpose:**
  - Render qua `MarkdownBlock` với kiểu chữ `text-xs text-foreground leading-relaxed`.
  - Khống chế chiều cao: Mặc định tối đa 4 dòng (`max-h-24 overflow-hidden relative`).
  - Khi thu gọn có lớp mờ gradient ở đáy (`from-transparent to-(--vscode-editor-background)`).
  - Nút toggle: Icon `<IconChevronDown size={12} stroke={1.5} />` ("Xem thêm") / `<IconChevronUp size={12} stroke={1.5} />` ("Thu gọn").
  - Nút Sao chép Purpose: Icon `<IconCopy size={12} stroke={1.5} />`.

### 3.4. Decision Pending Quick Banner
- **Điều kiện hiển thị:** Chỉ xuất hiện khi `inboxPending.length > 0`.
- **Mục đích:** Kéo sự chú ý tức thì của CEO về các đề xuất đang chờ phê duyệt mà không cần chuyển qua tab Inbox.
- **Giao diện:**
  - Nền `bg-purple-500/10 border border-purple-500/30`, bo góc `rounded-md`, padding `p-2.5 flex items-center justify-between`.
  - Trái: Icon `<IconInbox size={15} stroke={1.5} className="text-purple-400 shrink-0" />` + Text: `Có ${inboxPending.length} quyết định chờ CEO phê duyệt`.
  - Phải: Nút dán nhãn "Mở Inbox" (`text-xs text-purple-300 hover:text-white font-medium inline-flex items-center gap-1 cursor-pointer`), icon `<IconArrowRight size={12} stroke={1.5} />`.

### 3.5. Work Now Tasks Board (Bảng Nhiệm Vụ Thời Gian Thực)
- **Nguồn dữ liệu:** Đọc từ trường `tasksJson` trong `OrvantaCompanyResponse` (sinh bởi Coordinator khi phân rã Purpose).
- **Cấu trúc khối:**
  - **Header:** `flex items-center justify-between mb-2`
    - Tiêu đề: Icon `<IconFlame size={14} stroke={1.5} className="text-orange-400" />` + Text: "Nhiệm vụ đang thực thi (Work Now)".
    - Thống kê tóm tắt: Chip đếm `X đang làm · Y nghẽn · Z trong hàng đợi`.
  - **Danh sách nhiệm vụ (Task Cards):**
    - Mỗi thẻ nhiệm vụ: Viền `border-border-panel`, nền `bg-(--vscode-sideBar-background)`, bo góc `rounded`, padding `p-2 space-y-1`.
    - Trạng thái phân loại:
      - `in_progress`: Icon `<IconPlayerPlay size={13} stroke={1.5} className="text-violet-400 animate-pulse" />`, viền tím nhạt.
      - `blocked`: Icon `<IconAlertCircle size={13} stroke={1.5} className="text-rose-400" />`, viền đỏ nhạt.
      - `pending`: Icon `<IconClock size={13} stroke={1.5} className="text-muted-foreground" />`.
    - Thông tin thẻ: Tiêu đề nhiệm vụ (`font-medium text-xs`), Badge Agent phụ trách (`AgentBadge`), Danh sách phụ thuộc (`dependsOn: #task-id`).
    - Nút toggle "Xem tất cả nhiệm vụ": Icon `<IconChevronDown size={12} stroke={1.5} />` khi danh sách > 3 tasks.

### 3.6. Team Roster Quick Summary & Quick Nav
- **Cấu trúc:** Card tóm tắt nhanh số lượng và tình trạng của đội ngũ.
- **Thành phần:**
  - Header: Icon `<IconUsers size={14} stroke={1.5} className="text-emerald-400" />` + Text: `Đội ngũ nhân sự (${agents.length} thành viên)`.
  - Badges trạng thái:
    - Đang chạy: `bg-violet-500/10 text-violet-400 border border-violet-500/30 text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1` kèm đèn pulse violet.
    - Sẵn sàng: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1` kèm đèn xanh lá.
  - CTA Link: Nút chuyển hướng sang tab Agents: `<button>` icon `<IconArrowRight size={13} stroke={1.5} />` (Text: "Mở sơ đồ cây Agents →").

### 3.7. Empty States & Error States
- **Chưa mở Workspace (`no_folder`):**
  - Card thông báo trung tâm: Icon `<IconFolderOff size={28} stroke={1.5} className="text-muted-foreground mx-auto mb-2" />`.
  - Text: "Chưa mở thư mục làm việc. Vui lòng mở một folder trong VS Code để khởi tạo công ty AI."
- **Chưa khởi tạo công ty (`company.status === "missing"`):**
  - Khung Onboarding tinh gọn:
    - Tiêu đề: Icon `<IconSparkles size={18} stroke={1.5} className="text-indigo-400" />` + "Lập Công Ty AI Mới".
    - Ô nhập tên công ty (`text-field.md`): Placeholder "Ví dụ: NextGen SaaS Corp", viền `border-panel`.
    - Ô nhập Purpose / Sứ mệnh: Textarea có template mẫu sẵn từ `PURPOSE_TEMPLATE`.
    - Nút hành động: `[Tạo từ Template mẫu]` (`Secondary button`, icon `<IconBook size={14} stroke={1.5} />`) và `[Khởi lập công ty]` (`Primary button`, icon `<IconPlus size={14} stroke={1.5} />`, có spinner `<IconLoader2>` khi đang tạo).
- **Công ty bị lỗi cấu trúc (`company.status === "broken"`):**
  - Card cảnh báo màu đỏ: Icon `<IconAlertOctagon size={24} stroke={1.5} className="text-rose-400 mx-auto" />`.
  - Tiêu đề: "Cấu trúc .orvanta bị lỗi".
  - Danh sách lỗi cụ thể: Render bullet list các chuỗi trong `company.errors`.
  - Nút phục hồi: "Thử đồng bộ lại" (`IconRefresh`) hoặc "Khởi tạo lại cấu hình".

### 3.8. Modals Tích Hợp Trên Home
- **`EditPurposeModal`:**
  - Dialog kích thước vừa (`max-w-md`), theo chuẩn `communication/dialog.md`.
  - Tiêu đề: "Chỉnh sửa Sứ Mệnh Công Ty (Purpose)".
  - Nội dung: Textarea chỉnh sửa Markdown, hỗ trợ xem trước (Preview toggle).
  - Cảnh báo: "Thay đổi Purpose sẽ gửi đề xuất vào CEO Inbox để thẩm định và tái cấu trúc nhiệm vụ của các Agent."
  - Nút hành động: `[Hủy bỏ]` (`Secondary`) căn trái/giữa, `[Gửi đề xuất sửa Purpose]` (`Primary`) căn phải.
- **`LibraryDialog` (Thư viện mẫu công ty):**
  - Modal danh mục mẫu (`SaaS`, `E-Commerce`, `Fullstack Dev`, `Research`).
  - Tìm kiếm mẫu qua `IconSearch`, nạp mẫu tức thì vào form khởi tạo.
- **`DeleteCompanyModal`:**
  - Dialog xác nhận nguy hiểm (`Destructive` dialog).
  - Nhập chính xác tên công ty để mở khóa nút xóa: `<IconTrash size={14} stroke={1.5} />` "Tôi hiểu và muốn xóa toàn bộ công ty".


---

## 4. Quy Chuẩn Design Tokens & Tabler Icons Áp Dụng

### 4.1. Bảng ánh xạ tokens trên HomeView

| Phần tử UI | Class / Token áp dụng | Nguồn tham chiếu `specs/web` |
|---|---|---|
| **Root Viewport** | `flex flex-col min-h-0 overflow-hidden 100dvh` | `styles/layout.md` |
| **Vùng cuộn chính** | `.scroller-y flex-1 min-h-0 p-3 space-y-2.5` | `styles/scroll.md` |
| **Thanh cuộn** | `width: 6px; scrollbar-width: thin; background: transparent;` | `styles/scroll.md` |
| **Card viền / nền** | `border border-border-panel bg-surface-secondary/20 rounded-md` | `styles/color.md` |
| **Tiêu đề công ty** | `text-base font-semibold text-foreground` (H2 scale) | `styles/typography.md` |
| **Tagline / Subtext** | `text-xs text-muted-foreground` (Body Regular) | `styles/typography.md` |
| **Button Primary** | `bg-(--vscode-button-background) text-(--vscode-button-foreground) rounded-md h-7 px-3 text-xs` | `components/button.md` |
| **Button Secondary** | `border border-border-panel hover:bg-(--vscode-list-hoverBackground) rounded-md h-7 px-2.5 text-xs` | `components/button.md` |
| **Button Destructive** | `bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-md h-7 px-2.5 text-xs` | `components/button.md` |
| **Badge trạng thái** | `rounded-full px-2 py-0.5 text-[10px] font-medium border` | `communication/announcement.md` |

### 4.2. Danh mục Tabler Icons chuẩn trên trang Home

| Vị trí | Icon Component | Kích thước | Stroke | Mục đích |
|---|---|---|---|---|
| Nút làm mới | `<IconRefresh />` | `14px` | `1.5` | Đồng bộ dữ liệu công ty từ ổ đĩa (quay khi loading) |
| Menu thêm | `<IconDots />` | `16px` | `1.5` | Mở menu tùy chọn nâng cao |
| Thư mục config | `<IconFolder />` | `14px` | `1.5` | Trỏ tới folder `.orvanta/` trong Explorer |
| Xem JSON | `<IconFileCode />` | `14px` | `1.5` | Mở xem trực tiếp `company.json` |
| Lưu thư viện | `<IconDownload />` | `14px` | `1.5` | Export template công ty vào Library |
| Nạp thư viện | `<IconUpload />` | `14px` | `1.5` | Import template từ Library |
| Xóa công ty | `<IconTrash />` | `14px` | `1.5` | Kích hoạt modal xóa công ty (màu đỏ) |
| Cảnh báo đứt đoạn | `<IconAlertTriangle />` | `15px` | `1.5` | Cảnh báo phiên làm việc trước bị gián đoạn |
| Điều hướng tiếp | `<IconArrowRight />` | `12px - 14px` | `1.5` | Nút tiếp tục hoặc liên kết chuyển tab |
| Khóa Purpose | `<IconShieldLock />` | `14px` | `1.5` | Biểu tượng Purpose Lock bảo vệ sứ mệnh |
| Sửa Purpose | `<IconPencil />` | `12px` | `1.5` | Mở modal sửa Purpose |
| Quyết định Inbox | `<IconInbox />` | `15px` | `1.5` | Báo hiệu có quyết định cần duyệt |
| Nhiệm vụ Work Now | `<IconFlame />` | `14px` | `1.5` | Biểu tượng khối nhiệm vụ đang cháy |
| Task đang chạy | `<IconPlayerPlay />` | `13px` | `1.5` | Trạng thái nhiệm vụ đang được Agent thực thi |
| Task bị nghẽn | `<IconAlertCircle />` | `13px` | `1.5` | Trạng thái nhiệm vụ bị chặn bởi dependency |
| Task chờ xử lý | `<IconClock />` | `13px` | `1.5` | Trạng thái nhiệm vụ đang nằm trong hàng đợi |
| Mở rộng / Thu gọn | `<IconChevronDown />`, `<IconChevronUp />` | `12px` | `1.5` | Toggle xem thêm/thu gọn Purpose & Tasks |

---

## 5. Checklist Nghiệm Thu Chuẩn Trang Home (Acceptance Checklist)

### 5.1. Bố cục & Viewport
- [ ] Root container có `h-full min-h-0 flex-1 flex flex-col overflow-hidden`.
- [ ] Không có thanh cuộn ở cấp cửa sổ webview hay body của extension.
- [ ] Khu vực nội dung mang class `.scroller-y` với padding `p-3` và `space-y-2.5`.
- [ ] Thanh cuộn hiển thị siêu mảnh (6px), không che mất nội dung hay đè lên nút bấm.

### 5.2. Biểu tượng & Trực quan
- [ ] 100% biểu tượng sử dụng `@tabler/icons-react` với thuộc tính `stroke={1.5}`.
- [ ] Không còn bất kỳ emoji nào như `📢`, `★`, `→`, `+`, `✕`, `🎉` trong toàn bộ code HomeView.
- [ ] Icon nút làm mới tự động quay đều (`animate-spin`) khi đang thực hiện đồng bộ.

### 5.3. Trạng thái & Tương tác
- [ ] Nhấp "Đồng bộ": Gọi RPC reload công ty, hiển thị banner thông báo "Đã đồng bộ công ty".
- [ ] Menu `...`: Mở đúng popup, bấm ra ngoài thì menu tự đóng; các mục mở đúng dialog.
- [ ] Banner "Phiên trước bị gián đoạn": Hiện đúng khi có Agent `interrupted`, bấm "Tiếp tục" chuyển tab Console.
- [ ] Banner "Quyết định chờ duyệt": Hiện đúng khi `inboxPending.length > 0`, bấm chuyển tab Inbox.
- [ ] Purpose: Nhấp "Xem thêm / Thu gọn" giãn nở mượt mà không làm vỡ bố cục các khối bên dưới.
- [ ] Bảng Work Now: Phân chia chính xác 3 trạng thái (`in_progress`, `blocked`, `pending`).
- [ ] Nút "Mở sơ đồ cây Agents →": Chuyển activeTab sang `agents` mượt mà.

### 5.4. Kiểm thử & Độ ổn định
- [ ] Unit test `HomeView.test.tsx` pass 100% (tối thiểu 13 test cases).
- [ ] Không phát sinh warning hoặc error trên console của VS Code Webview Developer Tools.
- [ ] TypeScript typecheck pass 100% (`bun run tsc --noEmit`).

