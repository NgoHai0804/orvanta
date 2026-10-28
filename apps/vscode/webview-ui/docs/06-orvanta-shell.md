# 06 – OrvantaShell Tab Navigation Refactor

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Tái cấu trúc tab navigation trong `OrvantaShell.tsx` – thêm icons Tabler, dùng VS Code color variables thay hard-code, cải thiện accessibility và flex layout.

---

## 6.1 Thay đổi đã thực hiện

**File:** `src/orvanta/OrvantaShell.tsx`

1. **Icons Tabler cho 4 tabs chính:**
   - Home: `IconHome` (`size={13} stroke={1.5}`)
   - Agents: `IconUsers` (`size={13} stroke={1.5}`)
   - Inbox: `IconInbox` (`size={13} stroke={1.5}`)
   - Console: `IconTerminal2` (`size={13} stroke={1.5}`)

2. **VS Code theme tokens thay cho hard-code hex:**
   - Nav bar: `bg-(--vscode-sideBar-background) border-b border-border-panel px-2 py-1`
   - Active tab: `bg-(--vscode-button-background) text-(--vscode-button-foreground) shadow-xs`
   - Inactive tab: `text-muted-foreground hover:text-foreground hover:bg-(--vscode-list-hoverBackground)`
   - Badge notification: `bg-(--vscode-badge-background) text-(--vscode-badge-foreground)`
   - Focus ring: `focus-visible:ring-1 focus-visible:ring-ring`

3. **Flex Layout & View Container:**
   - Wrapper cho các view full: `<div className="flex-1 min-h-0 overflow-hidden">`
   - Đảm bảo `HomeView`, `AgentsView`, `InboxView` lấp đầy không gian màn hình mà không gây scroll vỡ khung.

4. **Accessibility:**
   - Giữ ngữ nghĩa button chuẩn để tương thích 100% với React Testing Library (`getByRole("button")`)
   - `aria-current={isSelected ? "page" : undefined}`
   - `aria-label` cho Inbox kèm số lượng pending: `Inbox, 3 pending`

---

## Checklist OrvantaShell

- [x] Import icons: `IconHome, IconUsers, IconInbox, IconTerminal2`
- [x] Thêm `icon` property vào tabs array
- [x] Cập nhật nav container: loại bỏ `bg-[#0b1021]`, dùng `bg-(--vscode-sideBar-background)`
- [x] Cập nhật tab button classes: VS Code color tokens
- [x] Thêm icon render trong tab button
- [x] Cập nhật badge styling: dùng `bg-(--vscode-badge-background) text-(--vscode-badge-foreground)`
- [x] `aria-current="page"` & accessible name chuẩn
- [x] Thêm view wrapper `flex-1 min-h-0 overflow-hidden` sau nav
- [x] Test: click tab chuyển view đúng
- [x] Test: disabled tab không click được
- [x] Test: badge hiện đúng số
- [x] Build không lỗi TypeScript
- [x] Unit test pass: `OrvantaShell.test.tsx` (10/10 tests passed)
