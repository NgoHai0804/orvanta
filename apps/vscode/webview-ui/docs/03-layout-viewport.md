# 03 – Layout & Viewport (100dvh, Flex, No Full-Page Scroll)

> **Trạng thái:** ✅ Hoàn thành  
> **Mục tiêu:** Đảm bảo toàn bộ UI nằm trong viewport 100dvh của VS Code webview. Không có scroll toàn trang; chỉ các vùng nội dung cụ thể mới scroll độc lập.

---

## Vấn đề & Giải pháp đã thực hiện

| Vấn đề trước đây | Vị trí | Giải pháp đã áp dụng |
|---|---|---|
| Root có thể scroll | `main.css` | Đã thêm `overflow: hidden` trên `html`, `body`, `#root` |
| Các views thiếu `min-height: 0` | Nhiều component | Toàn bộ flex containers và flex children đều được bổ sung `min-h-0` |
| `OrvantaShell` wrapper | `OrvantaShell.tsx` | Đã wrap views bằng `<div className="flex-1 min-h-0 overflow-hidden">` |
| Viewport & View sizing | `App.tsx` & Views | `100%` / `100dvh` viewport, `overflow-hidden` ở container, `.scroller-y` ở phần scroll |

---

## Cấu trúc layout chuẩn đã áp dụng

```
html, body, #root            → height: 100%; overflow: hidden; display: flex; flex-direction: column
  └── App (flex col)         → flex: 1; min-height: 0; height: 100%; overflow: hidden
       ├── nav bar            → flex-shrink: 0; height: 32px (OrvantaShell nav)
       └── content area      → flex: 1; min-height: 0; overflow: hidden
            └── [view]        → flex: 1; min-height: 0; overflow: hidden
                 ├── header   → flex-shrink: 0
                 └── scroll   → flex: 1; min-height: 0; .scroller-y (chỉ cuộn phần nội dung)
```

---

## Checklist layout

- [x] `main.css`: Thêm `overflow: hidden` vào `html`, `body`, `#root`
- [x] `main.css`: Thêm `display: flex; flex-direction: column` vào `#root`
- [x] `App.tsx`: Root wrapper có `min-h-0 overflow-hidden`
- [x] `App.tsx`: Content area có `flex-1 min-h-0 overflow-hidden`
- [x] `OrvantaShell.tsx`: Nav bar có `shrink-0`
- [x] `OrvantaShell.tsx`: Content area sau nav có `flex-1 min-h-0 overflow-hidden`
- [x] `HomeView.tsx`: Root `h-full flex flex-col min-h-0 overflow-hidden`
- [x] `HomeView.tsx`: Scrollable content sử dụng `.scroller-y`
- [x] `AgentsView.tsx`: Split layout 2 cột với `scroller-y` độc lập từng cột
- [x] `InboxView.tsx`: Header shrink-0, danh sách và chi tiết cuộn độc lập với `.scroller-y`
- [x] `TeamFeedView.tsx`: Header + Mini War Room shrink-0, Global Timeline chiếm trọn phần còn lại với `.scroller-y`
- [x] `WarRoomView.tsx`: Toolbar shrink-0, grid cards cuộn với `.scroller-y`
- [x] Không sử dụng `overflow: scroll` cố định, chỉ dùng `overflow: auto` thông qua `.scroller*`
- [x] Test scroll behavior: thanh điều hướng cố định, nội dung cuộn mượt mà
- [x] Test resize panel: không xuất hiện thanh cuộn toàn trang (body scroll)
