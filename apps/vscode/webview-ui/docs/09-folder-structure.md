# 09 – Cấu trúc thư mục & Code Organization

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Tổ chức thư mục theo feature/responsibility, áp dụng naming conventions nhất quán, tách bạch components/styles/hooks/utils.

---

## 9.1 Cấu trúc dự án sau khi chuẩn hóa

```
webview-ui/
├── docs/                           # Documentation chi tiết và checklists chuẩn hóa UI
│   ├── 00-ui-refactor-overview.md
│   ├── 01-design-tokens.md
│   ├── 02-icons-migration.md
│   ├── 03-layout-viewport.md
│   ├── 04-scrollbar.md
│   ├── 05-components-ui.md
│   ├── 06-orvanta-shell.md
│   ├── 07-team-sidebar.md
│   ├── 08-home-view.md
│   └── 09-folder-structure.md
└── src/
    ├── assets/                     # SVG assets & icons tĩnh
    ├── components/                 # Shared UI components
    │   ├── ui/                     # UI Primitives
    │   │   ├── icon.tsx            # [MỚI] AppIcon wrapper chuẩn hóa Tabler Icons
    │   │   ├── button.tsx          # Chuẩn hóa radius-md, height tokens, icon sizing
    │   │   ├── badge.tsx           # Chuẩn hóa radius-md, count variant
    │   │   ├── tooltip.tsx         # Chuẩn hóa radius-md, theme-aware
    │   │   └── ...
    │   ├── chat/                   # Feature: Chat console
    │   ├── account/                # Feature: Account & Organization
    │   ├── settings/               # Feature: Settings
    │   └── ...
    ├── orvanta/                    # Orvanta Team Operations
    │   ├── inbox/                  # Sub-feature: CEO Decision Inbox
    │   ├── OrvantaShell.tsx        # Shell navigation container
    │   ├── TeamSidebar.tsx         # Team sidebar với Tabler role icons & thin scroller
    │   ├── TeamFeedView.tsx        # Mini War Room & Global activity timeline
    │   ├── WarRoomView.tsx         # Full War Room dashboard
    │   ├── AgentsView.tsx          # Agents org chart
    │   ├── AgentTreeChart.tsx      # SVG interactive hierarchy tree
    │   ├── AgentEditor.tsx         # Multi-tab agent configuration editor
    │   ├── HomeView.tsx            # Company overview & team roster
    │   ├── LibraryDialog.tsx       # Template library modal
    │   └── ...
    ├── theme.css                   # VS Code design tokens (radius, height, font)
    ├── main.css                    # Scroller classes (.scroller, .scroller-y, .scroller-x)
    └── tailwind.config.mjs         # Tailwind configuration & token bindings
```

---

## 9.2 Các quy ước đặt tên (Naming Conventions)

### 1. Components
- PascalCase: `AppIcon.tsx`, `TeamSidebar.tsx`, `AgentTreeChart.tsx`
- Không đặt suffix thừa `-component`

### 2. Hooks
- Prefix `use`: `useOrvantaCompany.ts`, `useOrvantaInbox.ts`, `useWarRoom.ts`

### 3. Utility functions
- camelCase / kebab-case: `format.ts`, `tree-utils.ts`

### 4. CSS Classes
- Kebab-case cho global CSS utilities: `.scroller`, `.scroller-y`, `.scroller-x`
- Tailwind classes kết hợp hàm `cn()`

---

## Checklist cấu trúc

- [x] Tạo `src/components/ui/icon.tsx` (AppIcon wrapper cho Tabler Icons)
- [x] Tạo bộ tài liệu hướng dẫn và checklist chi tiết tại `webview-ui/docs/*.md` (00 đến 09)
- [x] Đảm bảo tính ổn định tối đa: giữ nguyên import paths, không làm vỡ các module hiện có
- [x] Verify naming nhất quán trên tất cả components, styles và utilities
- [x] Toàn bộ test suites pass 100% (`bun run test`)
- [x] TypeScript compiler pass 100% không có lỗi (`bun run tsc --noEmit`)
- [x] Webview bundle build production thành công (`bun run build:webview`)
