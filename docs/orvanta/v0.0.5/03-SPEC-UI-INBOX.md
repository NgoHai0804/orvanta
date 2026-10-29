# Orvanta v0.0.5 — Đặc Tả Chi Tiết Giao Diện Trang Inbox (CEO Decision Inbox)
## Hộp Thư Phê Duyệt Tối Cao Của CEO: Quyết Định Chiến Lược, Đánh Giá Tác Động & Phê Duyệt Rủi Ro

---

## 1. Mục Tiêu & Triết Lý Thiết Kế Trang Inbox

Trang **Inbox** là trạm kiểm soát quyền lực cao nhất của CEO. Trong cơ chế Hub-and-Spoke tự động của Orvanta:
- Các việc thường nhật do Coordinator và Sub-Agents tự thẩm định qua quy trình Maker-Checker.
- Mọi quyết định có tính chất chiến lược, vượt ngân sách token, thay đổi sứ mệnh (Purpose), tuyển thêm nhân sự, sa thải nhân sự hoặc sau 2 vòng review không đạt tiêu chuẩn đều được tự động chuyển lên **CEO Inbox** để con người thẩm duyệt.

### 1.1. Triết lý thiết kế
- **Minh bạch thông tin (Audit Transparency):** Mỗi quyết định đều phải có đầy đủ: Lý do đề xuất, Bằng chứng thẩm định của Checker, File sản phẩm (Deliverable Artifact) và Đánh giá tác động (Impact Analysis).
- **Hành động dứt khoát (Zero Ambiguity):** Nút hành động mang nhãn rõ ràng (`Phê duyệt`, `Từ chối`, `Để sau`), không dùng các nhãn Yes/No mập mờ.
- **Bảo vệ an toàn (Safety Guardrails):** Các hành vi có rủi ro cao (Sa thải nhân sự, Sửa Purpose) bắt buộc phải qua Modal xác nhận kèm lý do.

### 1.2. Tài liệu tham chiếu gốc
- [`D:\Tool\Skill\.cursor\specs\web\styles\layout.md`](../../../../Tool/Skill/.cursor/specs/web/styles/layout.md): Mẫu Master rộng trái / Detail hẹp phải (hoặc tỷ lệ 4:6), Action-order `[Secondary] [Destructive] [Primary]`.
- [`D:\Tool\Skill\.cursor\specs\web\styles\scroll.md`](../../../../Tool/Skill/.cursor/specs/web/styles/scroll.md): Vùng cuộn `.scroller-y` độc lập cho cả List và Detail.
- [`D:\Tool\Skill\.cursor\specs\web\communication\dialog.md`](../../../../Tool/Skill/.cursor/specs/web/communication/dialog.md): Modal xác nhận rủi ro `InboxConfirmModal`.
- [`D:\Tool\Skill\.cursor\specs\web\communication\empty-state.md`](../../../../Tool/Skill/.cursor/specs/web/communication/empty-state.md): Trạng thái hộp thư rỗng.
- [`D:\Tool\Skill\.cursor\specs\web\styles\color.md`](../../../../Tool/Skill/.cursor/specs/web/styles/color.md): Bảng màu semantic (Success `#12A248`, Danger `#D82424`, Warning `#EA540C`).

---

## 2. Kiến Trúc Bố Cục Master-Detail Trái - Phải

```
┌────────────────────────────────────────────────────────┐
│ OrvantaShell Navigation Bar                            │
├────────────────────────────────────────────────────────┤
│ Sub-Tabs & Refresh Bar: [Chờ duyệt (N)] [Để sau] [Lịch sử]  [Làm mới]│
├────────────────────────────────────────────────────────┤
│ Filter Bar: [Loại: Tất cả ▼]  [Độ khẩn cấp: Tất cả ▼]  │
├──────────────────────────┬─────────────────────────────┤
│ Master List (w: ~40%)    │ Detail View (w: ~60%)       │
│ (.scroller-y, min 220px) │ (flex-1 min-w-0, min 280px) │
│ - Thẻ quyết định #1      │ ┌─────────────────────────┐ │
│   (Type icon, Title,     │ │ Header: Title & Badges  │ │
│    Urgency, Time, Agent) │ ├─────────────────────────┤ │
│ - Thẻ quyết định #2 (Act)│ │ Body Content (.scroller)│ │
│ - Thẻ quyết định #3      │ │ - Lý do đề xuất         │ │
│                          │ │ - Thẩm định Checker     │ │
│                          │ │ - Deliverables & Diff   │ │
│                          │ │ - Phân tích tác động    │ │
│                          │ ├─────────────────────────┤ │
│                          │ │ Sticky Action Footer:   │ │
│                          │ │ [Để sau] [Từ chối][Duyệt]│ │
│                          │ └─────────────────────────┘ │
└──────────────────────────┴─────────────────────────────┘
```

- **Tỷ lệ phân chia:**
  - Cột Master List: Chiếm khoảng 38% - 42% (min 220px).
  - Cột Detail View: Chiếm khoảng 58% - 62% (min 280px).
  - Cả hai cột đều có `min-height: 0` và cuộn `.scroller-y` hoàn toàn độc lập.

---

## 3. Đặc Tả Chi Tiết Từng Thành Phần Giao Diện

### 3.1. Sub-Tabs & Filter Toolbar
- **Sub-Tabs Bar:** `flex shrink-0 items-center justify-between border-b border-border-panel px-3 py-1.5 bg-(--vscode-sideBar-background)/50`
  - Nhóm tabs bên trái:
    1. Chờ duyệt (Pending): Icon `<IconClock size={13} stroke={1.5} />` kèm badge số lượng (`bg-(--vscode-badge-background) text-(--vscode-badge-foreground)`).
    2. Để sau (Deferred): Icon `<IconBookmark size={13} stroke={1.5} />` kèm số lượng.
    3. Lịch sử (History): Icon `<IconHistory size={13} stroke={1.5} />` kèm số lượng.
  - Nút bên phải: Nút Làm mới (`IconRefresh size={13} stroke={1.5} className={loading ? "animate-spin" : ""} />`).
- **Filter Bar:** `flex shrink-0 gap-2 border-b border-border-panel bg-(--vscode-sideBar-background)/30 px-3 py-1.5 text-xs`
  - Dropdown lọc Loại (Type Filter): Gồm `Tất cả loại`, `Tuyển Agent` (`hire_agent`), `Sa thải Agent` (`fire_agent`), `Đổi Role` (`change_role`), `Đổi Purpose` (`change_purpose`), `Đổi Scope` (`change_scope`), `Duyệt Merge` (`merge`), `Vượt Budget` (`over_budget`).
  - Dropdown lọc Độ khẩn cấp (Urgency Filter): `Tất cả mức độ`, `Khẩn cấp (critical)`, `Cao (high)`, `Bình thường (normal)`, `Thấp (low)`.

### 3.2. Master List Column (`InboxList`)
- **Container:** `scroller-y h-full min-h-0 w-2/5 min-w-[220px] border-r border-border-panel p-2 space-y-1.5`
- **Thẻ Quyết Định (Decision Card):**
  - Cấu trúc: `p-2.5 rounded-md border transition-colors cursor-pointer select-none text-left w-full flex flex-col gap-1.5`
  - Nền & Viền:
    - Mặc định: `border-border-panel bg-(--vscode-sideBar-background) hover:bg-(--vscode-list-hoverBackground)`
    - Khi được chọn (Active): `border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30`
  - Hàng 1 (Type & Urgency):
    - Type Icon: Tabler Icon đại diện cho loại hành động (`IconUserPlus` cho hire, `IconUserMinus` cho fire, `IconTarget` cho purpose, `IconGitMerge` cho merge, `IconCoin` cho budget...).
    - Urgency Badge: Chip nhỏ dán nhãn màu theo `color.md`:
      - `critical`: Nền đỏ `bg-red-500/10 text-red-400 border border-red-500/30`
      - `high`: Nền cam `bg-orange-500/10 text-orange-400 border border-orange-500/30`
      - `normal`: Nền lam `bg-blue-500/10 text-blue-400 border border-blue-500/30`
      - `low`: Nền xám `bg-slate-500/10 text-slate-400 border border-slate-500/30`
  - Hàng 2 (Tiêu đề): `font-medium text-xs text-foreground line-clamp-2`.
  - Hàng 3 (Footer thẻ):
    - Tên Agent đề xuất: `<AgentBadge size="xs" agentId={item.proposedBy} />`.
    - Thời gian: Relative time (ví dụ: `5m trước`, `1h trước`), `text-[10px] text-muted-foreground`.
- **Trạng thái Hộp Thư Rỗng (Empty State):**
  - Hiển thị khi danh sách không có mục nào:
  - Icon: `<IconCheck size={32} stroke={1.5} className="text-emerald-400 mx-auto mb-2" />`.
  - Text: "Hộp thư sạch sẽ! Toàn bộ công việc đang diễn ra tự động và trơn tru."

### 3.3. Detail View Column (`InboxDetail`)
- **Container:** `flex flex-col min-h-0 flex-1 h-full overflow-hidden bg-(--vscode-editor-background)`
- **Detail Header:** `shrink-0 border-b border-border-panel p-3 bg-(--vscode-sideBar-background)/30 space-y-2`
  - Tiêu đề quyết định đầy đủ: `font-semibold text-sm text-foreground`.
  - Metadata row: `flex items-center gap-2 text-xs flex-wrap` (Badge loại, Badge khẩn cấp, Agent tạo, Thời gian gửi chi tiết).
- **Detail Body (Vùng cuộn nội dung):**
  - Mang class `.scroller-y flex-1 min-h-0 p-3 space-y-3 text-xs leading-relaxed`
  - Gồm 4 khối nội dung thẩm định chuẩn:
    1. **Tóm Tắt & Lý Do Đề Xuất (Motivation):**
       - Icon `<IconInfoCircle size={14} stroke={1.5} className="text-indigo-400 inline mr-1" />` Tiêu đề khối.
       - Đoạn văn bản Markdown giải thích nguồn cơn vấn đề và tại sao cần CEO can thiệp.
    2. **Biên Bản Thẩm Định Độc Lập (Maker-Checker Audit):**
       - Ý kiến của Reviewer / Auditor (`@reviewer` hoặc `@skeptic`).
       - Bảng kiểm tra tiêu chuẩn Definition of Done (DoD Checkpoints) với các biểu tượng `<IconCheck size={12} className="text-emerald-400" />` hoặc `<IconX size={12} className="text-rose-400" />`.
    3. **Bằng Chứng Sản Phẩm & Dữ Liệu Kỹ Thuật (Deliverables):**
       - Đường dẫn artifact: Icon `<IconFileText size={13} stroke={1.5} />` `.orvanta/artifacts/...`.
       - Khối Code Diff hoặc JSON Data Payload Viewer hiển thị chi tiết các thay đổi.
    4. **Đánh Giá Tác Động & Rủi Ro (Impact Analysis):**
       - Token ước tính tiêu hao, Chi phí API, Mức độ ảnh hưởng tới các Agent khác.
- **Sticky Action Footer (Thanh Duyệt Ghim Đáy):**
  - Container: `shrink-0 border-t border-border-panel p-2.5 bg-(--vscode-sideBar-background)/80 backdrop-blur-xs flex items-center justify-between`
  - Bên trái: Trạng thái hoặc cảnh báo ngắn ("Thao tác này sẽ cập nhật cấu hình công ty").
  - Bên phải (Nhóm nút thao tác theo thứ tự chuẩn `action-order`):
    1. **Nút "Để sau":** `<button>` Secondary (`border border-border-panel text-muted-foreground hover:text-foreground text-xs px-2.5 py-1 rounded inline-flex items-center gap-1.5 cursor-pointer`), icon `<IconBookmark size={13} stroke={1.5} />`.
    2. **Nút "Từ chối":** `<button>` Destructive (`bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-3 py-1 rounded inline-flex items-center gap-1.5 font-medium cursor-pointer`), icon `<IconX size={13} stroke={1.5} />`.
    3. **Nút "Phê duyệt":** `<button>` Primary Success (`bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded inline-flex items-center gap-1.5 font-medium cursor-pointer shadow-xs`), icon `<IconCheck size={13} stroke={1.5} />`.

### 3.4. Modal Xác Nhận Quyết Định Rủi Ro Cao (`InboxConfirmModal`)
- **Điều kiện kích hoạt:** Khi người dùng bấm Phê duyệt hoặc Từ chối đối với các loại hành động: `fire_agent`, `change_purpose`, `change_policy`.
- **Giao diện:** Dialog theo chuẩn `dialog.md` với backdrop làm mờ nền:
  - Header: Icon `<IconAlertTriangle size={18} stroke={1.5} className="text-rose-400" />` + "Xác nhận hành động rủi ro".
  - Nội dung: Cảnh báo chi tiết về hệ quả (ví dụ: "Sa thải nhân sự này sẽ chuyển giao toàn bộ task tồn đọng về cho Coordinator").
  - Ô nhập ghi chú (CEO Note): Textarea cho phép CEO truyền đạt chỉ đạo bổ sung vào lý do duyệt/từ chối.
  - Footer actions: `[Hủy bỏ (Secondary)]` `[Xác nhận thực hiện (Primary Destructive)]`.


---

## 4. Quy Chuẩn Design Tokens & Tabler Icons Áp Dụng

### 4.1. Bảng ánh xạ tokens trên trang Inbox

| Phần tử UI | Class / Token áp dụng | Nguồn tham chiếu `specs/web` |
|---|---|---|
| **Root Viewport** | `flex flex-col min-h-0 overflow-hidden 100dvh` | `styles/layout.md` |
| **Master List Split** | `w-2/5 min-w-[220px] scroller-y h-full border-r` | `styles/layout.md` |
| **Detail Body Split** | `flex-1 min-w-0 scroller-y h-full p-3 space-y-3` | `styles/scroll.md` |
| **Thanh cuộn List/Detail**| `width: 6px; scrollbar-width: thin; background: transparent;` | `styles/scroll.md` |
| **Dropdown Filters** | `rounded border border-border-panel bg-(--vscode-dropdown-background) text-xs` | `components/combobox.md` |
| **Nút Phê Duyệt** | `bg-emerald-600 hover:bg-emerald-500 text-white rounded h-7 px-3 text-xs` | `components/button.md` (Success) |
| **Nút Từ Chối** | `bg-red-500/10 text-red-400 border border-red-500/30 rounded h-7 px-3 text-xs` | `components/button.md` (Danger) |
| **Nút Để Sau** | `border border-border-panel text-muted-foreground rounded h-7 px-2.5 text-xs` | `components/button.md` (Secondary) |
| **Urgency Critical** | `bg-red-500/10 text-red-400 border-red-500/30` | `styles/color.md` (Danger soft) |
| **Urgency High** | `bg-orange-500/10 text-orange-400 border-orange-500/30` | `styles/color.md` (Warning soft) |
| **Urgency Normal** | `bg-blue-500/10 text-blue-400 border-blue-500/30` | `styles/color.md` (Info soft) |

### 4.2. Danh mục Tabler Icons theo Loại Quyết Định (Decision Types)

| Loại Quyết Định | Icon Component | Kích thước | Mô tả |
|---|---|---|---|
| `hire_agent` | `<IconUserPlus />` | `14px` | Đề xuất tuyển thêm nhân sự mới vào đội |
| `fire_agent` | `<IconUserMinus />` | `14px` | Đề xuất giải phóng / sa thải một Agent |
| `change_role` | `<IconUserCheck />` | `14px` | Đề xuất chuyển đổi vai trò chuyên môn |
| `change_purpose`| `<IconTarget />` | `14px` | Đề xuất điều chỉnh Sứ Mệnh công ty |
| `change_scope` | `<IconAdjustments />`| `14px` | Đề xuất mở rộng hoặc thu hẹp phạm vi task |
| `merge` | `<IconGitMerge />` | `14px` | Đề xuất merge mã nguồn sau thẩm định |
| `over_budget` | `<IconCoin />` | `14px` | Cảnh báo chi phí token vượt ngưỡng dự tính |
| Phê duyệt | `<IconCheck />` | `13px` | Nút hành động chấp thuận đề xuất |
| Từ chối | `<IconX />` | `13px` | Nút hành động bác bỏ đề xuất |
| Để sau | `<IconBookmark />` | `13px` | Chuyển đề xuất vào danh sách xem xét sau |
| Làm mới | `<IconRefresh />` | `13px` | Tải lại danh sách quyết định từ backend |

---

## 5. Checklist Nghiệm Thu Chuẩn Trang Inbox (Acceptance Checklist)

### 5.1. Bố cục & Viewport
- [ ] Bố cục Master-Detail chia tách 2 cột rõ ràng, không bị co giật khi chuyển đổi item.
- [ ] Cả cột Master List và cột Detail Body đều mang class `.scroller-y` cuộn hoàn toàn độc lập.
- [ ] Sticky Action Footer ở cột phải luôn ghim cố định ở đáy, không bao giờ bị cuộn trôi theo nội dung body.
- [ ] Không có thanh cuộn ngang ngoài ý muốn trên toàn trang Inbox.

### 5.2. Biểu tượng & Trực quan
- [ ] Toàn bộ các icon đại diện cho loại quyết định và nút hành động dùng `@tabler/icons-react` `stroke={1.5}`.
- [ ] Không dùng bất kỳ emoji hay ký tự Unicode decorative nào (`🎉`, `✓`, `✗`, `★`).
- [ ] Thay biểu tượng party popper `🎉` trong empty state bằng icon SVG `<IconCheck>` tinh tế.

### 5.3. Trạng thái & Tương tác
- [ ] Chuyển đổi giữa 3 tabs: "Chờ duyệt", "Để sau", "Lịch sử" mượt mà, đếm đúng số lượng items.
- [ ] Bộ lọc loại (Type filter) và bộ lọc độ khẩn cấp (Urgency filter) lọc tức thì danh sách.
- [ ] Nhấp vào thẻ bất kỳ bên cột trái: Hiển thị ngay chi tiết tương ứng bên cột phải.
- [ ] Bấm "Phê duyệt" hoặc "Từ chối" với các loại rủi ro cao (`fire_agent`, `change_purpose`): Bật đúng `InboxConfirmModal`.
- [ ] Bấm xác nhận trong modal: Gửi đúng quyết định kèm `note` của CEO về backend và cập nhật danh sách.
- [ ] Bấm "Để sau": Chuyển item từ tab "Chờ duyệt" sang tab "Để sau" ngay lập tức.

### 5.4. Kiểm thử & Độ ổn định
- [ ] Unit tests pass 100%: `InboxView.test.tsx` (7/7 tests pass).
- [ ] Không xảy ra lỗi re-render vòng lặp khi thay đổi `selectedId`.
- [ ] TypeScript typecheck pass 100% (`bun run tsc --noEmit`).

