# 08 – HomeView & Other Views Layout Refactor

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Cải thiện layout của HomeView, AgentsView, InboxView, TeamFeedView, WarRoomView, AgentEditor, AgentTreeChart để sử dụng đúng flex layout, scroller, và spacing tokens. Loại bỏ toàn bộ emoji và decorative symbols.

---

## 8.1 Thay đổi đã thực hiện

### 1. HomeView (`src/orvanta/HomeView.tsx`)
- **Container:** `h-full min-h-0 flex-1 flex flex-col overflow-hidden`
- **Scroll area:** `scroller-y flex-1 min-h-0 p-4 space-y-4`
- **Icons:** Thay thế toàn bộ ký tự `+`, emoji bằng Tabler icons:
  - `<IconPlus size={14} stroke={1.5} />` cho nút tạo/thêm agent
  - `<IconBuilding size={16} stroke={1.5} />` cho thông tin công ty
  - `<IconUsers size={16} stroke={1.5} />` cho danh sách nhân sự
  - `<IconShieldLock size={14} stroke={1.5} />` cho Purpose Lock
  - `<IconInbox size={14} stroke={1.5} />` cho Inbox pending banner
  - `<IconCheck size={14} stroke={1.5} />` cho trạng thái hoàn thành
  - `<IconExternalLink size={12} stroke={1.5} />` cho external links
- **Cards & badges:** Dùng VS Code panel border và background tokens.
- **Tests:** `HomeView.test.tsx` pass 13/13 tests.

### 2. AgentsView & AgentTreeChart (`src/orvanta/AgentsView.tsx`, `AgentTreeChart.tsx`)
- **Layout:** `flex-1 min-h-0 flex flex-col overflow-hidden`
- **Controls toolbar:** `IconZoomIn`, `IconZoomOut`, `IconMaximize`, `IconRefresh`
- **Tree nodes:** Hiển thị icon role qua Tabler icon component, status dot, Purpose Lock badge
- **Scroller:** `.scroller` cho vùng canvas / zoom container
- **Tests:** `AgentsView.test.tsx` pass 11/11 tests, `AgentTreeChart.test.tsx` pass 8/8 tests.

### 3. AgentEditor (`src/orvanta/AgentEditor.tsx`)
- **Header:** Tabler icons (`IconArrowLeft`, `IconDeviceFloppy`, `IconTrash`, `IconX`)
- **Form tabs:** Tabler icons (`IconUser`, `IconBrain`, `IconSettings`, `IconTool`, `IconFileText`, `IconDatabase`)
- **Sub-tabs bar:** `.scroller-x` thanh cuộn ngang siêu mảnh
- **Content panels:** `.scroller-y` cuộn dọc mượt mà
- **Tests:** `AgentEditor.test.tsx` pass 18/18 tests.

### 4. InboxView & Sub-components (`src/orvanta/InboxView.tsx`)
- **Split view:** List 5/12 (`.scroller-y`) + Detail 7/12 (`.scroller-y`)
- **Header:** `IconRefresh` (spin animation khi loading)
- **Empty state:** Thay `🎉` bằng `IconCheck` tinh gọn
- **Badges:** `rounded-md` với tokens thống nhất
- **Tests:** `InboxView.test.tsx` pass 7/7 tests.

### 5. TeamFeedView (`src/orvanta/TeamFeedView.tsx`)
- **Layout:** Mini War Room header strip + Global Activity Timeline chiếm trọn chiều cao còn lại
- **Scroll:** Timeline container dùng `.scroller-y`
- **Icons:** `IconHash`, `IconBroadcast`, `IconClock`, `IconActivity`, `IconSparkles`, `IconCornerDownRight`.

### 6. WarRoomView (`src/orvanta/WarRoomView.tsx`)
- **Header toolbar:** `IconPlayerPause`, `IconPlayerPlay`, `IconFilter`, `IconRefresh`, `IconClock`, `IconUsers`
- **Agent grid & Activity logs:** Sử dụng `.scroller-y`
- **Tests:** `WarRoomView.test.tsx` pass 16/16 tests.

### 7. LibraryDialog (`src/orvanta/LibraryDialog.tsx`)
- **Tabs & categories:** `IconBook`, `IconPackage`, `IconSearch`, `IconCheck`, `IconPlus`, `IconX`
- **Template list:** `.scroller-y`
- **Tests:** `LibraryDialog.test.tsx` pass 4/4 tests.

### 8. App.tsx
- **Banner dismiss button:** `<IconX size={12} stroke={1.5} />` thay thế `✕`
- **"Lập công ty" link:** `<IconArrowRight size={12} stroke={1.5} />` thay thế `→`
- **Outer container:** `overflow-hidden` ngăn chặn triệt để full-viewport scroll.

---

## Checklist Views

### HomeView
- [x] Đọc full `HomeView.tsx` và quét toàn bộ emoji
- [x] Cập nhật root wrapper: `h-full flex flex-col min-h-0 overflow-hidden`
- [x] Áp dụng `scroller-y` cho vùng nội dung cuộn
- [x] Thay emoji decorative bằng Tabler icons (`IconBuilding`, `IconUsers`, `IconPlus`, `IconInbox`)
- [x] Tests pass: `HomeView.test.tsx` (13/13)

### AgentsView & Tree Chart
- [x] Cập nhật layout pattern `min-h-0 flex-1 overflow-hidden`
- [x] Thay thế toàn bộ zoom/pan symbols bằng Tabler icons
- [x] Tests pass: `AgentsView.test.tsx` (11/11), `AgentTreeChart.test.tsx` (8/8)

### AgentEditor
- [x] Cập nhật form layout với `scroller-x` và `scroller-y`
- [x] Thay thế toàn bộ tab icons và action icons bằng Tabler icons
- [x] Tests pass: `AgentEditor.test.tsx` (18/18)

### InboxView
- [x] Cập nhật split layout với `scroller-y`
- [x] Thêm `IconRefresh`, thay `🎉` bằng `IconCheck`
- [x] Tests pass: `InboxView.test.tsx` (7/7)

### TeamFeedView & WarRoomView
- [x] Cập nhật layout flexbox và scroller
- [x] Thay thế toàn bộ emoji bằng Tabler icons
- [x] Tests pass: `WarRoomView.test.tsx` (16/16)

### App.tsx
- [x] Thay `✕` bằng `<IconX>`
- [x] Thay `→` bằng `<IconArrowRight>`
- [x] Khóa viewport `overflow-hidden` trên root container.
