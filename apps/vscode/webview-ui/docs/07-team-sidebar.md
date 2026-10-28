# 07 – TeamSidebar Refactor

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Xóa emoji icons trong sidebar, thay bằng Tabler Icons, cải thiện spacing, scroller và visual consistency.

---

## 7.1 Thay đổi đã thực hiện

**File:** `src/orvanta/TeamSidebar.tsx`

1. **Icons Tabler cho Agent Roles:**
   - Lead / Coordinator: `IconStar` (vàng amber)
   - Architect: `IconRuler`
   - Implementer / Coder: `IconCode`
   - Reviewer / Auditor: `IconSearch`
   - Copywriter / Content: `IconPencil`
   - Sales / Outreach: `IconTarget`
   - Ephemeral / Guest: `IconBolt`
   - Default: `IconRobot`
   - Thay thế toàn bộ unicode decorative (`★`, `«`, `»`, `▲`, `▼`, `#`, `📢`) bằng Tabler SVG icons:
     - `IconLayoutSidebarLeftExpand` / `IconLayoutSidebarLeftCollapse` cho nút mở rộng / thu gọn
     - `IconChevronUp` / `IconChevronDown` cho accordion agent đã dừng
     - `IconHash` cho kênh `#team-feed`
     - `IconSpeakerphone` cho thông báo feed trong tooltip

2. **Status Colors chuẩn:**
   - Dùng VS Code variables: `var(--vscode-charts-green)`, `var(--vscode-charts-yellow)`, `var(--vscode-descriptionForeground)`

3. **Scrollbar chuẩn:**
   - Dùng `.scroller-y` cho danh sách agent (`<nav className="flex-1 scroller-y p-1">`)

4. **Tests:**
   - `TeamSidebar.test.tsx` được cập nhật và pass 100% (11/11 tests)

---

## Checklist TeamSidebar

- [x] Import Tabler icons: `IconStar, IconRuler, IconCode, IconSearch, IconPencil, IconTarget, IconBolt, IconRobot, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconChevronUp, IconChevronDown, IconHash, IconSpeakerphone`
- [x] Tạo `AGENT_ROLE_ICON_RULES` array thay hàm string-return
- [x] Tạo `getAgentRoleIconComponent()` trả về Tabler icon component
- [x] Cập nhật render: dùng `AgentIcon` component thay vì string emoji
- [x] Cập nhật `getStatusDotColor()` dùng VS Code color variables
- [x] Áp dụng `.scroller-y` cho vùng cuộn danh sách agent
- [x] Thay thế toàn bộ ký tự unicode `«`, `»`, `★`, `▲`, `▼`, `#` bằng Tabler icons
- [x] Verify: collapse/expand sidebar vẫn hoạt động qua button và phím tắt `Ctrl+B` / `Cmd+B`
- [x] Verify: tooltip khi collapsed vẫn hiện chính xác
- [x] Verify: resize drag vẫn hoạt động mượt mà
- [x] Build không lỗi TypeScript
- [x] Tests pass: `TeamSidebar.test.tsx` (11/11 passed)

---

## Không thay đổi

- Collapse/expand logic
- Resize drag logic
- `sortAgents()` function
- `getStatusRank()` function
- Props interface `TeamSidebarProps`
- localStorage persistence logic

