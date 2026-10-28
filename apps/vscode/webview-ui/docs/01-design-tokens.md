# 01 – Design Tokens

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Định nghĩa một hệ thống token nhất quán trong `theme.css` và `tailwind.config.mjs`, ánh xạ từ VS Code CSS variables vào design system nội bộ.

---

## Bối cảnh hiện tại

### `theme.css` hiện có
- Dùng `@theme { ... }` Tailwind v4 syntax ✅
- Ánh xạ trực tiếp `--vscode-*` variables ✅
- Có nhiều tokens nhưng **thiếu** các semantic tokens cho spacing, icon size, border-radius ❌
- Không có tokens cho scrollbar ❌

### `tailwind.config.mjs` hiện có
- Extend theme với colors từ VSCode variables ✅
- Font sizes tỷ lệ theo `--vscode-font-size` ✅
- **Thiếu**: border-radius tokens chuẩn, icon size tokens ❌

---

## Tokens cần thêm / cập nhật

### 1. Spacing tokens (VS Code panel context)

| Token | Giá trị | Dùng |
|---|---|---|
| `--space-1` | `4px` | Khoảng cách nhỏ nhất |
| `--space-2` | `8px` | Gap icon↔text, padding nhỏ |
| `--space-3` | `12px` | Gap items sidebar |
| `--space-4` | `16px` | Padding standard |
| `--space-6` | `24px` | Padding section |

### 2. Border-radius tokens

| Token | Giá trị | Dùng |
|---|---|---|
| `--radius-sm` | `4px` | Badge, tooltip |
| `--radius-md` | `6px` | Button, input (VS Code panel nhỏ hơn spec 8px) |
| `--radius-lg` | `8px` | Card, popup |

> **Lưu ý VS Code panel**: Spec web dùng radius 8px cho button; trong panel nhỏ điều chỉnh xuống 6px cho phù hợp.

### 3. Icon size tokens

| Token | Giá trị | Dùng |
|---|---|---|
| `--icon-sm` | `16px` | Nav items, sidebar icons |
| `--icon-md` | `20px` | Header icons |
| `--icon-lg` | `24px` | Feature icons |
| `--icon-stroke` | `1.5` | Stroke width cho Tabler Icons |

### 4. Component size tokens

| Token | Giá trị | Dùng |
|---|---|---|
| `--nav-height` | `32px` | Tab nav bar |
| `--item-height` | `28px` | List items (panel nhỏ, giảm từ 32px spec) |
| `--btn-height` | `28px` | Buttons (panel nhỏ) |

### 5. Scrollbar tokens

| Token | Giá trị | Dùng |
|---|---|---|
| `--scrollbar-width` | `6px` | WebKit scrollbar width/height |
| `--scrollbar-thumb` | `var(--vscode-scrollbarSlider-background)` | Màu thumb |
| `--scrollbar-thumb-hover` | `var(--vscode-scrollbarSlider-hoverBackground)` | Hover |
| `--scrollbar-track` | `transparent` | Track |

### 6. Surface / background tokens (bổ sung)

| Token | Mô tả | Giá trị |
|---|---|---|
| `--color-surface` | Nền chính | `var(--vscode-sideBar-background)` |
| `--color-surface-secondary` | Nền phụ nhạt hơn | `color-mix(in srgb, var(--vscode-sideBar-background) 90%, white 10%)` |
| `--color-surface-raised` | Nền raised (card) | `var(--vscode-editor-background)` |
| `--color-divider` | Đường phân cách | `var(--vscode-panel-border)` |

---

## Thay đổi cụ thể

### File: `src/theme.css`

**Thêm vào `@theme {}` block:**

```css
/* Spacing scale */
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-6: 24px;

/* Border radius */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;

/* Icon sizes */
--icon-sm: 16px;
--icon-md: 20px;
--icon-lg: 24px;

/* Component heights (VS Code panel optimized) */
--height-nav: 32px;
--height-item: 28px;
--height-btn: 28px;

/* Scrollbar */
--scrollbar-size: 6px;

/* Surface tokens */
--color-surface: var(--vscode-sideBar-background);
--color-surface-secondary: color-mix(in srgb, var(--vscode-sideBar-background) 90%, #ffffff 10%);
--color-surface-raised: var(--vscode-editor-background);
--color-divider: var(--vscode-panel-border, #3c3c3c);

/* Status colors (use vscode charts when available) */
--color-success: var(--vscode-charts-green, #4ec9b0);
--color-warning: var(--vscode-charts-yellow, #cca700);
--color-error: var(--vscode-errorForeground, #f14c4c);
--color-info: var(--vscode-textLink-foreground, #3794ff);
```

### File: `tailwind.config.mjs`

**Thêm vào `theme.extend`:**

```js
borderRadius: {
  'sm': 'var(--radius-sm, 4px)',
  'md': 'var(--radius-md, 6px)',
  'lg': 'var(--radius-lg, 8px)',
},
spacing: {
  // Override or add specific values if needed
  'icon-sm': 'var(--icon-sm, 16px)',
  'icon-md': 'var(--icon-md, 20px)',
},
height: {
  'nav': 'var(--height-nav, 32px)',
  'item': 'var(--height-item, 28px)',
  'btn': 'var(--height-btn, 28px)',
},
```

---

## Checklist

- [x] Thêm spacing tokens vào `theme.css` (`--spacing-panel-xs`, `sm`, `md`, `lg`, `xl`)
- [x] Thêm border-radius tokens vào `theme.css` (`--radius-panel`, `sm`, `md`, `lg`)
- [x] Thêm icon size tokens vào `theme.css` (`--icon-size-sm`, `md`, `lg`, `--icon-sm`, `md`, `lg`)
- [x] Thêm component size tokens vào `theme.css` (`--height-nav`, `--height-nav-bar`, `--height-item`, `--height-btn`, `--height-btn-sm`)
- [x] Thêm scrollbar tokens vào `theme.css` (`--scrollbar-size: 6px`)
- [x] Thêm surface tokens vào `theme.css` (`--color-surface`, `--color-surface-secondary`, `--color-surface-elevated`, `--color-surface-raised`, `--color-divider`)
- [x] Cập nhật `tailwind.config.mjs` với border-radius từ tokens (`panel`, `panel-sm`, `panel-md`, `panel-lg`)
- [x] Cập nhật `tailwind.config.mjs` với font-size và radius phù hợp VS Code
- [x] Verify không vỡ các component hiện tại sau khi thêm tokens
- [x] Typecheck thành công: `bun run tsc --noEmit` (0 errors)
- [x] Test suite thành công: 141/141 tests pass trong `src/orvanta`

---

## Lưu ý quan trọng

> **Không xóa tokens hiện có** trong `theme.css` – chỉ bổ sung thêm. Các tokens hiện tại được nhiều component sử dụng; xóa sẽ gây vỡ UI.

> **VS Code panel context**: Panel thường rộng 300-400px. Kích thước cần nhỏ hơn spec web (32px → 28px cho items, 8px → 6px cho radius button). Đây là điều chỉnh có chủ đích, không phải sai spec.
