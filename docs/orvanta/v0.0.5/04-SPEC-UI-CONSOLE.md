# Orvanta v0.0.5 — Đặc Tả Chi Tiết Giao Diện Trang Console (Multi-Agent Mission Console)
## Trung Tâm Tác Chiến Hợp Nhất: Kênh `#team-feed`, Kênh Riêng `@agent`, Định Danh Tác Nhân & Sidebar Thu Gọn

---

## 1. Mục Tiêu & Triết Lý Thiết Kế Trang Console

Trang **Console** (hợp nhất từ Chat và War Room) là màn hình chỉ huy thống nhất của Orvanta. Tại đây, CEO có thể:
1. **Quan sát toàn cảnh:** Theo dõi nhịp đập hoạt động và dòng thời gian thực của toàn bộ công ty trên kênh chung `#team-feed`.
2. **Chỉ đạo trọng điểm 1:1:** Chuyển sang kênh riêng `@agent-id` để xem transcript độc lập của nhân sự đó, rà soát diff file họ đã sửa, và gửi tin nhắn chỉ đạo trực tiếp (Direct Steer) vào Mailbox của họ.
3. **Định danh minh bạch (Agent Attribution):** Loại bỏ hoàn toàn hình ảnh "Cline" chung chung; mọi hành động sửa code, chạy lệnh terminal hay suy nghĩ logic đều mang Avatar, Tên và Màu sắc vai trò cụ thể của Agent thực thi.
4. **Giải phóng không gian hiển thị (Collapsible Sidebar):** Cho phép thu gọn thanh kênh về dạng Mini-mode 48px để tập trung tối đa diện tích cho việc đọc code diff và chat.

### 1.1. Tài liệu tham chiếu gốc
- [`D:\Tool\Skill\.cursor\specs\web\patterns\sidebar.md`](../../../../Tool/Skill/.cursor/specs/web/patterns/sidebar.md): Bố cục Sidebar Collapsed (48px - 64px) ↔ Expanded (180px - 260px), Tooltip khi thu gọn.
- [`D:\Tool\Skill\.cursor\specs\web\others\chatbox-ai-agent.md`](../../../../Tool/Skill/.cursor/specs/web/others/chatbox-ai-agent.md): Cửa sổ chat AI, dock cạnh, không overlay, cuộn transcript `.scroller-y`.
- [`D:\Tool\Skill\.cursor\specs\web\styles\scroll.md`](../../../../Tool/Skill/.cursor/specs/web/styles/scroll.md): Vùng cuộn `.scroller-y` cho sidebar list, timeline và chat transcript.
- [`D:\Tool\Skill\.cursor\specs\web\styles\icons.md`](../../../../Tool/Skill/.cursor/specs/web/styles/icons.md): Tabler Icons cho Agent Roles và Controls (`stroke={1.5}`).
- [`D:\Tool\Skill\.cursor\specs\web\components\button.md`](../../../../Tool/Skill/.cursor/specs/web/components/button.md): Các nút tương tác composer và header actions.

---

## 2. Kiến Trúc Hợp Nhất & Bố Cục Kênh (Channels Architecture)

```
┌────────────────────────────────────────────────────────┐
│ OrvantaShell Navigation Bar                            │
├────────────────────────────────────────────────────────┤
│ ConsoleView Root (100dvh flex-row, overflow: hidden)   │
│ ┌──────────────┬─────────────────────────────────────┐ │
│ │ TeamSidebar  │ Main Work Area (flex-1 min-w-0)     │ │
│ │ (Collapsible)│                                     │ │
│ │ Mode:        │ [Trường hợp 1: Chọn #team-feed]     │ │
│ │ - Mini (48px)│ - Channel Header (#team-feed)       │ │
│ │   hoặc       │ - Mini War Room Grid (Live Cards)   │ │
│ │ - Expanded   │ - Global Activity Timeline (100% h) │ │
│ │   (190px)    │                                     │ │
│ │              │ [Trường hợp 2: Chọn @agent-id]      │ │
│ │              │ - Agent Channel Header (Badge, Back)│ │
│ │              │ - Filtered Agent Transcript         │ │
│ │              │   (Thinking, DiffEdit, Commands)    │ │
│ │              │ - 1:1 Direct Steer Mailbox Composer │ │
│ └──────────────┴─────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

- **Sidebar Width States:**
  - Expanded Mode: Mặc định `190px` (có thể kéo co giãn từ `160px` đến `280px`).
  - Collapsed Mini-Mode: Cố định `48px`, chỉ hiển thị icon avatar tròn + đèn status dot.
  - Phím tắt toggle nhanh: `Ctrl + B` (Windows/Linux) hoặc `Cmd + B` (macOS).
  - Trạng thái đóng/mở được lưu bền vững vào `localStorage.getItem("orvanta_sidebar_collapsed")`.

---

## 3. Đặc Tả Chi Tiết Từng Thành Phần Giao Diện

### 3.1. `TeamSidebar` (Thanh Kênh Thu Gọn Linh Hoạt)
- **Container:** `flex flex-col min-h-0 h-full border-r border-border-panel bg-(--vscode-sideBar-background) select-none transition-all duration-150`
- **Header Sidebar:** `flex shrink-0 items-center justify-between border-b border-border-panel px-2.5 py-1.5 h-9`
  - Khi Expanded: Tiêu đề `KÊNH TÁC CHIẾN`, nút Thu gọn `<IconLayoutSidebarLeftCollapse size={14} stroke={1.5} />` (Tooltip: "Thu gọn sidebar Ctrl+B").
  - Khi Collapsed (48px): Nút Mở rộng căn giữa `<IconLayoutSidebarLeftExpand size={16} stroke={1.5} />`.
- **Kênh Chung `#team-feed`:**
  - Mục cố định trên cùng ngay dưới header.
  - Expanded: Nút tràn ngang, icon `<IconHash size={14} stroke={2} className="text-indigo-400" />` + Text: `team-feed` + Badge đếm hoạt động.
  - Collapsed: Khung tròn `32x32` căn giữa, icon `<IconHash size={15} stroke={2} />`, tooltip khi hover.
- **Danh Sách Kênh Từng Agent:**
  - Vùng cuộn: `.scroller-y flex-1 min-h-0 p-1 space-y-0.5`.
  - Expanded: Avatar role icon tròn `22x22`, status dot pulse khi running, Tên hiển thị, ID `@agentId`, task tóm tắt.
  - Collapsed: Duy nhất Avatar tròn `32x32` căn giữa + đèn dot nhỏ góc `6x6`, tooltip hiển thị đầy đủ thông tin khi hover.
- **Nút Thêm Agent Nhanh:** `<IconPlus size={13} stroke={1.5} />` "Tuyển nhân sự mới…".
- **Thanh Kéo Resize:** Mép phải rộng `4px`, con trỏ `cursor-col-resize`.

### 3.2. Kênh Chung `#team-feed` (`TeamFeedView`)
- **Container:** `flex flex-1 min-h-0 h-full w-full flex-col overflow-hidden bg-(--vscode-editor-background) text-(--vscode-editor-foreground)`
- **Channel Header:** `flex shrink-0 items-center justify-between border-b border-border-panel bg-(--vscode-sideBar-background)/50 px-4 py-2`
  - Trái: Icon `<IconHash size={16} stroke={2} className="text-indigo-400" />` + Tên kênh `team-feed` + Tên công ty.
  - Phải: Badge tình trạng toàn đội (`X đang chạy` nền tím nhấp nháy, hoặc `Toàn đội sẵn sàng` nền xanh lá).
- **Phần 1: Mini War Room Grid (Header Strip):**
  - Container: `shrink-0 border-b border-border-panel bg-(--vscode-sideBar-background)/40 p-2.5 space-y-1.5`
  - Tiêu đề dải: Icon `<IconBroadcast size={14} stroke={1.5} className="text-indigo-400" />` + Text: `Mini War Room (${agents.length} nhân sự)`.
  - Grid Cards: Chia 2 đến 4 cột tùy chiều rộng (`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5`).
  - Mỗi thẻ Card: Nền `bg-(--vscode-sideBar-background)`, viền `border-border-panel` (chuyển viền tím khi running), click vào thẻ tự động chuyển sang kênh riêng của Agent đó.
- **Phần 2: Global Activity Timeline:**
  - Container: Chiếm 100% chiều cao còn lại (`flex-1 min-h-0 w-full overflow-hidden`).
  - Vùng cuộn: `.scroller-y h-full p-3 space-y-2 select-text`.
  - Tự động cuộn xuống đáy khi có dòng sự kiện mới (`timelineScrollRef`).
  - Khối sự kiện: Thời gian (`HH:mm:ss`), Badge Agent (`AgentBadge`), Loại hành động (`text`, `think`, `tool`, `error`), nội dung sự kiện.

### 3.3. Kênh Riêng `@agent-id` (Chỉ Đạo Trọng Điểm 1:1)
- **Container:** `flex flex-col min-h-0 flex-1 h-full overflow-hidden`
- **Agent Channel Header:** `flex shrink-0 items-center justify-between border-b border-border-panel bg-(--vscode-sideBar-background)/70 px-3 py-1.5 select-none`
  - Trái:
    - Nút quay lại: `<button>` icon `<IconArrowLeft size={14} stroke={1.5} />` (Text: `#team-feed`).
    - Thanh ngăn cách: Đường dọc mỏng `h-3 w-[1px] bg-border-panel`.
    - Badge Agent: `<AgentBadge size="sm" agentId={focusedAgent.id} role={focusedAgent.role} />`.
    - ID kênh: `@${focusedAgent.id}` (font-mono text-muted-foreground).
  - Phải: Đèn trạng thái running/idle + Dòng ghi chú tinh tế: `Chỉ đạo 1:1 qua Mailbox`.
- **Filtered Agent Transcript (Luồng Làm Việc Đã Định Danh):**
  - Chỉ hiển thị tin nhắn, suy nghĩ và hành động của riêng Agent đang chọn.
  - Các thành phần định danh chuẩn:
    1. **`ThinkingRow`:** Khối suy nghĩ logic mang `AgentBadge` phía trên, nội dung chữ xám nghiêng có thể thu gọn.
    2. **`DiffEditRow`:** Khối sửa file hiển thị rõ `AgentBadge` + Text: `[💻 Implementer · Dave] đã sửa 14 dòng trong src/auth.ts`.
    3. **`CommandOutputRow`:** Khối thực thi terminal có badge Agent phụ trách lệnh.
    4. **Tin nhắn trao đổi:** Avatar và tên của Agent hiển thị rõ ở đầu mỗi tin nhắn.
- **1:1 Direct Steer Composer (Khung Chỉ Đạo Trực Tiếp):**
  - Ghim ở đáy màn hình kênh riêng: `shrink-0 p-2.5 border-t border-border-panel bg-(--vscode-sideBar-background)/80 backdrop-blur-xs`
  - Ô nhập: Textarea tự động co giãn chiều cao theo nội dung (tối đa 150px), placeholder: `Chỉ đạo trực tiếp tới @${agentId} qua Mailbox...`
  - Toolbar hành động dưới ô nhập:
    - Trái: Nút đính kèm file `<IconPaperclip size={14} stroke={1.5} />`.
    - Phải: Nút gửi tin nhắn `<IconSend size={14} stroke={1.5} className="text-white" />` (Primary button).
  - Cơ chế gửi: Gửi thông điệp trực tiếp vào Mailbox riêng của Agent đó mà không kích hoạt chuỗi broadcast làm phiền các Agent khác.

### 3.4. Component Primitives `AgentBadge`
- Đặt tại `webview-ui/src/components/common/AgentBadge.tsx`.
- Hiển thị gồm: Icon vai trò Tabler + Tên hiển thị + Màu nền/viền theo role:
  - `lead`: Viền vàng hổ phách, icon `<IconStar />`
  - `implementer`: Viền tím violet, icon `<IconCode />`
  - `reviewer`: Viền xanh indigo, icon `<IconSearch />`
  - `architect`: Viền xanh sky, icon `<IconRuler />`
  - `researcher`: Viền xanh teal, icon `<IconCompass />`
  - `skeptic`: Viền đỏ rose, icon `<IconShieldAlert />`
  - `writer`: Viền xanh emerald, icon `<IconPencil />`


---

## 4. Quy Chuẩn Design Tokens & Tabler Icons Áp Dụng

### 4.1. Bảng ánh xạ tokens trên trang Console

| Phần tử UI | Class / Token áp dụng | Nguồn tham chiếu `specs/web` |
|---|---|---|
| **Root Viewport** | `flex flex-row min-h-0 overflow-hidden 100dvh` | `styles/layout.md` |
| **Sidebar Expanded** | `w-[190px] border-r flex flex-col min-h-0` | `patterns/sidebar.md` |
| **Sidebar Collapsed** | `w-[48px] border-r flex flex-col min-h-0` | `patterns/sidebar.md` |
| **Timeline Scroll** | `.scroller-y flex-1 min-h-0 select-text` | `styles/scroll.md` |
| **Chat Transcript** | `.scroller-y flex-1 min-h-0 p-3 space-y-3` | `others/chatbox-ai-agent.md` |
| **Mini War Room Grid**| `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5` | `patterns/sidebar.md` |
| **Agent Badge** | `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border font-medium` | `communication/announcement.md` |
| **Direct Composer** | `shrink-0 p-2.5 border-t bg-(--vscode-sideBar-background)/80` | `others/chatbox-ai-agent.md` |
| **Nút Gửi Tin Nhắn** | `bg-(--vscode-button-background) text-(--vscode-button-foreground) rounded h-7 px-3` | `components/button.md` |

### 4.2. Danh mục Tabler Icons chuẩn trên trang Console

| Vị trí | Icon Component | Kích thước | Stroke | Mục đích |
|---|---|---|---|---|
| Thu gọn Sidebar | `<IconLayoutSidebarLeftCollapse />` | `14px` | `1.5` | Đóng sidebar về chế độ mini (48px) |
| Mở rộng Sidebar | `<IconLayoutSidebarLeftExpand />` | `16px` | `1.5` | Mở rộng sidebar về chế độ đầy đủ |
| Kênh chung | `<IconHash />` | `14px - 16px` | `2.0` | Biểu tượng kênh `#team-feed` |
| Mini War Room | `<IconBroadcast />` | `14px` | `1.5` | Tiêu đề dải thẻ giám sát trực tiếp |
| Đang chạy pulse | `<IconActivity />` | `13px` | `1.5` | Biểu thị Agent đang thực thi tác vụ |
| Quay lại Feed | `<IconArrowLeft />` | `14px` | `1.5` | Nút back từ kênh riêng về `#team-feed` |
| Gửi tin nhắn | `<IconSend />` | `14px` | `1.5` | Nút gửi tin nhắn chỉ đạo 1:1 |
| Đính kèm file | `<IconPaperclip />` | `14px` | `1.5` | Đính kèm tài liệu vào Mailbox |
| Thêm Agent | `<IconPlus />` | `13px - 14px`| `1.5` | Nút tuyển thêm nhân sự mới |
| Thu gọn nhóm | `<IconChevronDown />`, `<IconChevronUp />` | `12px` | `1.5` | Đóng/mở nhóm Agent đã dừng |

---

## 5. Checklist Nghiệm Thu Chuẩn Trang Console (Acceptance Checklist)

### 5.1. Bố cục & Viewport
- [ ] ConsoleView chiếm trọn `100dvh`, không xuất hiện thanh cuộn toàn màn hình.
- [ ] TeamSidebar thu gọn về `48px` và mở rộng về `190px` mượt mà không giật layout.
- [ ] Trạng thái đóng/mở sidebar được lưu vào `localStorage` và phục hồi chuẩn xác sau khi tải lại.
- [ ] Phím tắt `Ctrl + B` (hoặc `Cmd + B`) chuyển đổi đóng/mở sidebar tức thì.
- [ ] Kéo thanh resize mép phải sidebar mượt mà trong giới hạn `160px` - `280px`.

### 5.2. Biểu tượng & Trực quan
- [ ] Toàn bộ emoji và ký tự unicode cũ (`★`, `«`, `»`, `▲`, `▼`, `#`, `📢`) được thay thế 100% bằng Tabler Icons.
- [ ] Khi sidebar thu gọn: Hiển thị avatar tròn gọn gàng, hover vào hiện Tooltip chuẩn VS Code có đầy đủ tên, vai trò và trạng thái.
- [ ] Kênh `#team-feed` và các kênh riêng Agent có phân biệt rõ ràng về màu sắc và icon.

### 5.3. Định Danh Tác Nhân (Agent Attribution)
- [ ] Xóa bỏ hoàn toàn "Cline edit file" hoặc "Cline is thinking".
- [ ] Mọi khối `ThinkingRow` đều có `AgentBadge` với đúng vai trò và tên của Agent đang suy nghĩ.
- [ ] Mọi khối `DiffEditRow` đều có `AgentBadge` và văn bản chỉ rõ ai đã sửa file nào.
- [ ] Mọi khối `CommandOutputRow` đều ghi nhận chính xác Agent đã chạy lệnh terminal.

### 5.4. Kênh Chung `#team-feed` & Kênh Riêng `@agent`
- [ ] Mini War Room Grid trên `#team-feed`: Hiển thị đúng các thẻ Agent, nhấp thẻ tự động chuyển kênh riêng.
- [ ] Global Activity Timeline: Tự động cuộn xuống đáy khi có log sự kiện mới, mang class `.scroller-y`.
- [ ] Kênh riêng: Có nút `<IconArrowLeft>` quay lại `#team-feed`, hiển thị đúng transcript riêng của Agent.
- [ ] Khung Composer 1:1: Gửi tin nhắn thành công qua Mailbox của Agent mà không làm Coordinator bị ảnh hưởng.

### 5.5. Kiểm thử & Độ ổn định
- [ ] Unit tests pass 100%: `TeamSidebar.test.tsx` (11/11), `ConsoleView.test.tsx` (6/6), `TeamFeedView.tsx` pass.
- [ ] E2E verification test `v0.0.4-e2e-verification.test.tsx` pass 100%.
- [ ] TypeScript typecheck pass 100% (`bun run tsc --noEmit`).

