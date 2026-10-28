# 04 – Scrollbar Standards (Thin `.scroller`)

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Áp dụng thin scrollbar nhất quán trên mọi vùng cuộn, dùng CSS class `.scroller` chuẩn. Tích hợp với VS Code native scrollbar variables khi có thể.

---

## Hiện trạng & Giải pháp

### Classes cuộn đã chuẩn hóa trong `src/main.css`:
- `.scroller`: Cuộn 2 chiều với scrollbar mỏng 6px.
- `.scroller-y`: Cuộn dọc (dùng phổ biến nhất), `overflow-x: hidden; overflow-y: auto;` với width 6px.
- `.scroller-x`: Cuộn ngang cho các tab bar/toolbar tràn, `overflow-x: auto; overflow-y: hidden;` với height 4px.

---

## Cấu hình chi tiết đã triển khai

```css
/* ============================================
   .scroller - Thin scrollbar standard class
   Ref: specs/web/styles/scroll.md
   ============================================ */
.scroller {
  overflow: auto;
  scrollbar-width: thin;                      /* Firefox */
  scrollbar-color: var(--vscode-scrollbarSlider-background, rgba(100, 100, 100, 0.4)) transparent;
}

.scroller::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.scroller::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background, rgba(100, 100, 100, 0.4));
  border-radius: 3px;
}

.scroller::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
}

.scroller::-webkit-scrollbar-track {
  background: transparent;
}

/* Vertical-only scroll variant */
.scroller-y {
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--vscode-scrollbarSlider-background, rgba(100, 100, 100, 0.4)) transparent;
}

.scroller-y::-webkit-scrollbar {
  width: 6px;
}

.scroller-y::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background, rgba(100, 100, 100, 0.4));
  border-radius: 3px;
}

.scroller-y::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
}

.scroller-y::-webkit-scrollbar-track {
  background: transparent;
}

/* Horizontal-only scroll variant */
.scroller-x {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--vscode-scrollbarSlider-background, rgba(100, 100, 100, 0.4)) transparent;
}

.scroller-x::-webkit-scrollbar {
  height: 4px;
}

.scroller-x::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background, rgba(100, 100, 100, 0.4));
  border-radius: 2px;
}

.scroller-x::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
}

.scroller-x::-webkit-scrollbar-track {
  background: transparent;
}
```

---

## Nơi áp dụng `.scroller`

| Component | Vùng scroll | Class đã áp dụng |
|---|---|---|
| `HomeView.tsx` | Main content area | `.scroller-y` |
| `AgentsView.tsx` | Main content area & split panels | `.scroller-y` |
| `AgentTreeChart.tsx` | Tree chart container | `.scroller` |
| `AgentEditor.tsx` | Form scroll & sub-tabs | `.scroller-y` & `.scroller-x` |
| `InboxView.tsx` | Decision list & detail panel | `.scroller-y` |
| `TeamSidebar.tsx` | Agent list nav | `.scroller-y` |
| `WarRoomView.tsx` | Activity cards grid & expand modal | `.scroller-y` |
| `TeamFeedView.tsx` | Global activity timeline | `.scroller-y` |
| `LibraryDialog.tsx` | Saved company list | `.scroller-y` |
| `App.tsx` | Onboarding view | `.scroller` |

---

## Checklist scrollbar

- [x] Thêm `.scroller` CSS class vào `main.css` (width 6px, track transparent)
- [x] Thêm `.scroller-y` CSS class vào `main.css` (chống horizontal scroll)
- [x] Thêm `.scroller-x` CSS class vào `main.css` (cho horizontal tabs/toolbars)
- [x] Áp dụng `.scroller-y` trong `HomeView.tsx`
- [x] Áp dụng `.scroller-y` trong `TeamSidebar.tsx` (agent list)
- [x] Áp dụng `.scroller-y` trong `AgentsView.tsx` (2 cột trái - phải)
- [x] Áp dụng `.scroller-y` trong `InboxView.tsx` (danh sách và chi tiết quyết định)
- [x] Áp dụng `.scroller-y` trong `WarRoomView.tsx` (card list và full buffer)
- [x] Áp dụng `.scroller-y` trong `TeamFeedView.tsx` (timeline thời gian thực)
- [x] Áp dụng `.scroller-y` trong `LibraryDialog.tsx` (danh sách công ty lưu)
- [x] Verify: scrollbar xuất hiện khi cần, ẩn khi vừa vặn
- [x] Verify: scrollbar mỏng (6px cho vertical, 4px cho horizontal), không che khuất nội dung
- [x] Verify: không có scrollbar luôn hiển thị (no `overflow: scroll`)
- [x] Verify: track transparent, thumb nhất quán với VS Code theme
- [x] Build & typecheck thành công: 0 errors, 141/141 tests PASS
