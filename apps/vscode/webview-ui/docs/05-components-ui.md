# 05 – UI Components Chuẩn hóa

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Chuẩn hóa các UI component cơ bản (Button, Badge, Tooltip, Tab nav) theo specs, phù hợp với VS Code panel context.

---

## 5.1 Button (`src/components/ui/button.tsx`)

### Thay đổi đã thực hiện
- `rounded-md` (6px radius panel standard) thay thế `rounded-xs` (2px)
- `[&_svg]:size-4` (16px) thay thế `[&_svg]:size-2` (8px) – icons hiển thị sắc nét, chuẩn Tabler
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`
- Explicit height token:
  - `default`: `h-[28px] py-1 px-3 [&_svg]:size-4`
  - `sm`: `h-[24px] py-0.5 px-2.5 text-xs [&_svg]:size-3.5`
  - `xs`: `h-[20px] p-1 text-[11px] [&_svg]:size-3`
  - `lg`: `h-[32px] py-1.5 px-4 font-medium [&_svg]:size-4`
  - `icon`: `h-[28px] w-[28px] p-0 [&_svg]:size-4`
  - `icon-sm`: `h-[24px] w-[24px] p-0 [&_svg]:size-3.5`
  - `header`: `h-[26px] py-0.5 px-3 [&_svg]:size-3.5`
- Giữ nguyên các variants nghiệp vụ: `cline`, `error`, `text`, `link`, `success`, `danger`, `outline-primary`, `secondary`.

---

## 5.2 Badge (`src/components/ui/badge.tsx`)

### Thay đổi đã thực hiện
- Đổi `rounded` sang `rounded-md`
- Đổi `[&_svg]:size-2` sang `[&_svg]:size-3` (12px)
- Thêm `count` variant (`bg-violet-600 text-white min-w-4 text-center justify-center font-semibold`) cho notification counter / badge số lượng.

---

## 5.3 Tooltip (`src/components/ui/tooltip.tsx`)

### Thay đổi đã thực hiện
- Đổi content border-radius từ `rounded-xs` sang `rounded-md`
- Tương thích đầy đủ với VS Code theme colors (`bg-background`, `border-muted-foreground/30`).

---

## 5.4 Tab Navigation (`OrvantaShell.tsx`)

### Thay đổi đã thực hiện
- Sử dụng CSS variables VS Code: `bg-(--vscode-sideBar-background)` cho header container
- Active button: `bg-(--vscode-button-background) text-(--vscode-button-foreground) shadow-xs`
- Inactive button: `text-muted-foreground hover:text-foreground hover:bg-(--vscode-list-hoverBackground)`
- Tích hợp Tabler Icons (`IconHome`, `IconUsers`, `IconInbox`, `IconTerminal2`) với `size={13} stroke={1.5}`.

---

## Checklist components

- [x] Đọc `badge.tsx` hiện tại để quyết định thay đổi
- [x] Đọc `tooltip.tsx` hiện tại để verify style
- [x] Cập nhật base styles trong `button.tsx`:
  - [x] `rounded-md` thay `rounded-xs`
  - [x] `[&_svg]:size-4` (16px) thay `[&_svg]:size-2` (8px) trong base
  - [x] Focus ring `ring-2` thay `ring-1`
  - [x] Height explicit trong size variants (`28px`, `24px`, `20px`, `32px`)
- [x] **Giữ nguyên** các variant cũ đang được dùng (`cline`, `error`, `outline-primary`, ...)
- [x] Verify Button render đúng trong mọi contexts
- [x] Cập nhật Badge với `count` variant và `rounded-md`
- [x] Cập nhật Tooltip sang `rounded-md`
- [x] Build thành công
- [x] Không có TypeScript errors
