# UI Refactor – Tổng quan & Phạm vi

> **Trạng thái:** ✅ Hoàn thành  
> **Ngày:** 2026-10-28  
> **Mục tiêu:** Tái cấu trúc toàn bộ giao diện webview-ui theo hướng tinh gọn, chuyên nghiệp, nhất quán với design system từ `specs/web`, phù hợp kích thước VS Code extension panel.

---

## Phạm vi thay đổi

| Lớp | Thay đổi | Trạng thái |
|---|---|---|
| **Design Tokens** | Định nghĩa tokens từ specs vào `theme.css` + Tailwind | ✅ Hoàn thành |
| **Icons** | Cài `@tabler/icons-react`, thay emoji/unicode bằng SVG Tabler | ✅ Hoàn thành |
| **Scrollbar** | Áp dụng `.scroller`, `.scroller-y`, `.scroller-x` class chuẩn, thin scrollbar 6px | ✅ Hoàn thành |
| **Layout / Viewport** | `100dvh`, flex layout, `min-height: 0`, không full-page scroll | ✅ Hoàn thành |
| **Components UI** | Button, Badge, Tab, AppIcon, Tooltip – chuẩn hóa | ✅ Hoàn thành |
| **OrvantaShell** | Tab nav gọn, icon Tabler + label, token VS Code native | ✅ Hoàn thành |
| **TeamSidebar** | Xóa emoji icon (★, «, », #, 📢, ▲, ▼), dùng Tabler Icons, scroller-y | ✅ Hoàn thành |
| **HomeView** | Layout gọn, spacing chuẩn, xóa emoji, thay thế Tabler icons | ✅ Hoàn thành |
| **TeamFeedView** | Mini War Room + Activity Timeline scroller-y, icons Tabler | ✅ Hoàn thành |
| **AgentsView / AgentEditor / AgentTreeChart** | Tabler icons, scroller-y, responsive layout | ✅ Hoàn thành |
| **InboxView / WarRoomView / LibraryDialog** | Tabler icons, scroller-y, modal compact | ✅ Hoàn thành |

---

## Nguyên tắc thiết kế cốt lõi

1. **VS Code-native**: Luôn dùng `--vscode-*` CSS variables làm base; không hard-code màu nếu có token VSCode tương ứng.
2. **Specs làm chuẩn**: Tham chiếu `D:\Tool\Skill\.cursor\specs\web\` nhưng **điều chỉnh** cho panel nhỏ (~300-400px rộng).
3. **Tabler Icons duy nhất**: Xóa mọi emoji, unicode decorative, thay bằng `@tabler/icons-react` SVG, stroke 1.5px, size 12/14/16/20px.
4. **100dvh viewport**: Root container chiếm toàn bộ chiều cao (`100dvh`), không scroll page, chỉ scroll nội dung bên trong (`overflow-hidden` ở container, `.scroller-y` ở child).
5. **Thin scrollbar**: `scrollbar-width: thin`, webkit 6px, track transparent, thumb muted hover.
6. **Không thay đổi business logic**: Giữ nguyên toàn bộ logic xử lý, API calls, event handlers, chỉ thay đổi presentation layer.

---

## Danh sách file kế hoạch chi tiết

| File | Nội dung | Trạng thái |
|---|---|---|
| [`01-design-tokens.md`](./01-design-tokens.md) | Design tokens, CSS variables, Tailwind config | ✅ Hoàn thành |
| [`02-icons-migration.md`](./02-icons-migration.md) | Cài Tabler Icons, danh sách icon cần thay | ✅ Hoàn thành |
| [`03-layout-viewport.md`](./03-layout-viewport.md) | Layout 100dvh, flex, scroll chuẩn | ✅ Hoàn thành |
| [`04-scrollbar.md`](./04-scrollbar.md) | `.scroller` class, thin scrollbar spec | ✅ Hoàn thành |
| [`05-components-ui.md`](./05-components-ui.md) | Button, Badge, Tab, Tooltip chuẩn hóa | ✅ Hoàn thành |
| [`06-orvanta-shell.md`](./06-orvanta-shell.md) | Tab navigation refactor | ✅ Hoàn thành |
| [`07-team-sidebar.md`](./07-team-sidebar.md) | Sidebar refactor | ✅ Hoàn thành |
| [`08-home-view.md`](./08-home-view.md) | HomeView layout refactor | ✅ Hoàn thành |
| [`09-folder-structure.md`](./09-folder-structure.md) | Cấu trúc thư mục tổ chức lại | ✅ Hoàn thành |

---

## Checklist tổng quan

- [x] Đọc và hiểu toàn bộ specs (xem file 01-09)
- [x] Cài `@tabler/icons-react`
- [x] Cập nhật `theme.css` với design tokens chuẩn
- [x] Cập nhật `tailwind.config.mjs` với tokens
- [x] Tạo `.scroller`, `.scroller-y`, `.scroller-x` CSS class chuẩn
- [x] Fix root layout `100dvh` (không scroll body, độc lập scroller)
- [x] Refactor `OrvantaShell` tab nav (dùng Tabler icons: Home, Users, Inbox, Terminal2)
- [x] Refactor `TeamSidebar` (xóa toàn bộ emoji, unicode decorative sang Tabler icons)
- [x] Refactor `TeamFeedView` (Tabler icons, mini war room, timeline scroller-y)
- [x] Refactor `HomeView`, `AgentsView`, `AgentTreeChart`, `AgentEditor`, `InboxView`, `WarRoomView`, `LibraryDialog`
- [x] Chuẩn hóa `Button` component (variant, size, radius-md, SVG size)
- [x] Tạo `AppIcon` component tái sử dụng (`src/components/ui/icon.tsx`)
- [x] Verify typecheck: `bun run tsc --noEmit` (0 errors)
- [x] Verify tests: `bun run test src/orvanta` (14/14 files pass, 141/141 tests pass)

---

## Quy ước quan trọng

- **Không dùng `npm`**: Dùng `bun add`, `bun run`
- **Không thay đổi logic**: Chỉ thay đổi JSX/CSS/class
- **Không tạo changelog**: Maintainer xử lý
- **Emoji decorative → Tabler Icon**: Luôn thay thế
- **Emoji nội dung (text) → giữ nguyên**: Ví dụ trong nội dung message AI
