# Orvanta v0.0.5 — Đặc Tả Tái Cấu Trúc Giao Diện Người Dùng & Chuẩn Hóa Design System
## Hướng Dẫn Tái Cấu Trúc Toàn Diện 4 Bề Mặt Giao Diện (Home · Agents · Inbox · Console) Chuẩn VS Code Extension

---

## 1. Bối cảnh & Mục tiêu Phiên bản v0.0.5

Sau khi hoàn thiện kiến trúc nền tảng qua các phiên bản:
- **v0.0.1:** Kiến trúc công ty AI ban đầu và 4 bề mặt (Home, Inbox, Chat, War Room).
- **v0.0.2:** Tách tab Agents, sơ đồ cây tổ chức đa tầng (`reportsTo`) và bộ cấu hình 5 tabs.
- **v0.0.3:** Bộ máy thực thi tự động (Hub-and-Spoke, Deliverable Artifacts, Maker-Checker Review).
- **v0.0.4:** Hợp nhất Chat & War Room thành Mission Console, Channels `#team-feed` / `@agent`, Agent Attribution Engine và Sidebar thu gọn.

Phiên bản **v0.0.5** tập trung chuyên sâu vào **Chuẩn hóa Giao diện Người Dùng (UI/UX Refactor)** nhằm giải quyết các tồn đọng về mặt thị giác và tương tác:
1. **Thiếu tính nhất quán thị giác:** Việc lạm dụng emoji, ký tự Unicode trang trí (`★`, `«`, `»`, `▲`, `▼`, `#`, `📢`, `🎉`, `→`) gây cảm giác thiếu chuyên nghiệp và không hòa nhập tự nhiên vào giao diện VS Code.
2. **Xung đột cuộn trang (Scrollbar Chaining & Clipping):** Hiện tượng cuộn kép, thanh cuộn to dày che mất nội dung, hoặc container bị tràn gây thanh cuộn ngoài cùng của toàn bộ webview.
3. **Lãng phí diện tích hiển thị:** Sidebar và các khoảng đệm (padding/margin) quá lớn trong khi panel VS Code thường có bề ngang hẹp (250px – 400px).
4. **Trải nghiệm rời rạc giữa các màn hình:** Thiếu quy chuẩn chung về tokens, spacing, component primitives và typography hierarchy.

---

## 2. Bảy Trụ Cột Thiết Kế Cốt Lõi (Core UI Principles)

Hệ thống UI của Orvanta v0.0.5 tuân thủ nghiêm ngặt 7 nguyên tắc thiết kế được chuyển hóa từ Design System tại `D:\Tool\Skill\.cursor\specs\web`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ORVANTA UI FOUNDATION                           │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. Minimal & Lean │ 2. Specs-Adapted  │ 3. Reusable Primitives & Tokens│
│ Gọn gàng, tinh tế,│ Điều chỉnh từ web │ Khung tokens VS Code đồng bộ,  │
│ loại bỏ rườm rà   │ sang VS Code panel│ tái sử dụng component cao      │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ 4. Tabler Icons   │ 5. 100dvh Lock    │ 6. Micro Scrollbar (.scroller) │
│ 100% SVG outline, │ Khóa tràn trang,  │ Thanh cuộn siêu mảnh 6px,      │
│ stroke 1.5px      │ cuộn cục bộ       │ không che khuất dữ liệu        │
├───────────────────┴───────────────────┴────────────────────────────────┤
│ 7. Modular Architecture: components / styles / hooks / utils / types   │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Giao diện tinh gọn & tối giản (Lean & Minimal)
- Tối ưu hóa không gian hiển thị thông tin hữu ích (High Information Density).
- Loại bỏ các mảng màu nền gay gắt, gradient rực rỡ hoặc viền đổ bóng đậm.
- Sử dụng các sắc độ trung tính và token nguyên bản của VS Code (`--vscode-sideBar-background`, `--vscode-editor-background`, `--vscode-border-panel`, `--vscode-list-hoverBackground`).

### 2.2. Tham chiếu thiết kế chuẩn hóa (`D:\Tool\Skill\.cursor\specs\web`)
- Không sao chép nguyên bản bố cục Web (thường thiết kế cho màn hình ≥1440px).
- Thu hẹp padding/gap từ `24px/16px` xuống `12px/8px` để phù hợp với panel hẹp.
- Điều chỉnh type scale: Mặc định dùng `Body Regular 13px/18px`, tiêu đề thẻ dùng `H3 14px/20px`, tiêu đề trang dùng `H2 16px/22px` (thay vì 20px/28px của web lớn).

### 2.3. Thành phần có thể tái sử dụng (Reusable Components & Design Tokens)
- Hệ thống UI Primitives thống nhất đặt tại `webview-ui/src/components/ui/`:
  - `button.tsx`: Variant Primary, Secondary, Destructive, Ghost, Link với padding chuẩn.
  - `badge.tsx`: Trạng thái status, role, urgency, count indicator.
  - `icon.tsx` (`AppIcon`): Wrapper chuẩn hóa cho toàn bộ Tabler Icons.
  - `tooltip.tsx`: Tự động căn chỉnh khi sidebar thu gọn.
- Tập trung hóa cấu hình màu và spacing vào `theme.css` và `tailwind.config.mjs`.

### 2.4. Biểu tượng (Icons): Chuẩn hóa 100% Tabler Icons
- Sử dụng duy nhất thư viện `@tabler/icons-react` (từ [tabler.io/icons](https://tabler.io/icons)).
- Tất cả icon đều có thuộc tính đồng nhất: `stroke={1.5}`, kích thước chuẩn: `12px` (micro), `14px` (small), `16px` (regular), `20px` (large).
- **Tuyệt đối cấm** emoji hoặc ký tự Unicode trang trí trong code UI (trừ nội dung text thực tế do người dùng hoặc mô hình LLM trả về).


### 2.5. Bố cục & Cuộn trang: Khóa chặt `100dvh`
- Khung gốc của Webview được thiết lập cố định: `height: 100dvh; max-height: 100dvh; overflow: hidden; display: flex; flex-direction: column`.
- Bắt buộc gắn `min-height: 0` và `min-width: 0` trên mọi phần tử flex-child để ngăn chặn lỗi flexbox ngầm định làm tràn khung nhìn.
- Không cho phép cuộn toàn bộ trang (`body` luôn `overflow: hidden`). Chỉ những vùng danh sách dữ liệu hoặc nội dung tràn mới được cấp phép cuộn độc lập.

### 2.6. Thanh cuộn mảnh chuẩn hóa (Micro Thin Scrollbar)
- Áp dụng class chuẩn `.scroller`, `.scroller-y`, `.scroller-x` kế thừa từ `specs/web/styles/scroll.md`.
- Độ rộng thanh cuộn cố định **6px**, bán kính bo tròn **3px**, nền trong suốt (`transparent`), thanh trượt (`thumb`) tiệp màu neutral tinh tế (`#C4C4C4` hoặc `var(--vscode-scrollbarSlider-background)`).

### 2.7. Cấu trúc dự án theo trách nhiệm (Folder Architecture)
- Phân định rõ ranh giới giữa View, Sub-components, Hooks, Utilities và Type definitions.
- Không viết code giao diện khổng lồ dồn vào một file đơn lẻ; chia tách thành các module dưới 250 dòng để dễ bảo trì và kiểm thử.

---

## 3. Ma Trận 4 Trang Chính & Danh Mục Đặc Tả Chi Tiết

Phiên bản v0.0.5 được chia thành 4 tài liệu đặc tả độc lập, tương ứng với 4 tab chính trên thanh điều hướng `OrvantaShell`:

| Trang | File Đặc Tả | Trách Nhiệm Chính | Mẫu Bố Cục Áp Dụng |
|---|---|---|---|
| **Home** | [`01-SPEC-UI-HOME.md`](./01-SPEC-UI-HOME.md) | Tổng hành dinh công ty, Mục tiêu (Purpose), Bảng nhiệm vụ (Work Now), Trạng thái nhân sự & Cảnh báo | Dashboard / Overview (`layout.md`) |
| **Agents** | [`02-SPEC-UI-AGENTS.md`](./02-SPEC-UI-AGENTS.md) | Sơ đồ cây phân cấp tổ chức tương tác (`AgentTreeChart`) & Trình chỉnh sửa cấu hình chuyên sâu 5 tabs (`AgentEditor`) | Master trên / Detail dưới (`layout.md`) |
| **Inbox** | [`03-SPEC-UI-INBOX.md`](./03-SPEC-UI-INBOX.md) | Hộp thư phê duyệt tối cao của CEO, Bộ lọc loại & độ khẩn cấp, Chi tiết quyết định & Modal xác nhận rủi ro | Master trái / Detail phải (`layout.md`) |
| **Console** | [`04-SPEC-UI-CONSOLE.md`](./04-SPEC-UI-CONSOLE.md) | Trung tâm tác chiến hợp nhất, Kênh `#team-feed` (War Room + Timeline), Kênh riêng `@agent`, Định danh Agent | Collapsible Sidebar + Docked Chat (`sidebar.md` + `chatbox-ai-agent.md`) |

---

## 4. Bảng Tham Chiếu Ánh Xạ Design System (`specs/web` → VS Code Extension)

| Thành phần | File gốc trong `specs/web` | Điều chỉnh cho VS Code Extension |
|---|---|---|
| **Màu sắc** | `styles/color.md` | Dùng token `--vscode-*` làm nền tảng; bổ sung biến thể semantic (Success `#12A248`, Danger `#D82424`, Warning `#EA540C`, Info `#2563EB`) |
| **Kiểu chữ** | `styles/typography.md` | Font hệ thống VS Code (`font-sans`), cỡ Body Regular giảm còn `13px/18px`, H3 `14px/20px`, H2 `16px/22px` |
| **Vùng cuộn** | `styles/scroll.md` | Áp dụng `.scroller-y` và `.scroller-x`, độ rộng thanh cuộn WebKit cố định `6px`, `scrollbar-width: thin` |
| **Biểu tượng** | `styles/icons.md` | `@tabler/icons-react`, nét mảnh `stroke={1.5}`, kích thước `12px` - `16px` |
| **Nút bấm** | `components/button.md` | Chiều cao `28px` (compact) hoặc `32px` (default), bo góc `rounded-md` (4px/6px), thứ tự action `[Secondary] [Primary]` |
| **Thanh bên** | `patterns/sidebar.md` | Collapsible: Mini-mode `48px` (icon avatar + dot) ↔ Expanded `180px - 260px` |
| **Hộp thoại** | `communication/dialog.md` | Nền modal `var(--vscode-editor-background)`, viền `border-panel`, nút hành động rõ ràng không Yes/No |

---

## 5. Checklist Nghiệm Thu Tổng Thể v0.0.5

- [ ] Đọc và đối chiếu toàn bộ 4 file đặc tả (`01` đến `04`) đảm bảo tính đồng bộ 100%.
- [ ] Không còn bất kỳ emoji trang trí nào trong các file giao diện `webview-ui/src/orvanta/`.
- [ ] Mọi icon đều sử dụng `@tabler/icons-react` với `stroke={1.5}`.
- [ ] Webview đạt chuẩn `100dvh`, không xuất hiện thanh cuộn bao ngoài toàn trang.
- [ ] Mọi vùng cuộn nội dung đều sử dụng class `.scroller-y` hoặc `.scroller-x`.
- [ ] Các thao tác chuyển tab trên `OrvantaShell` mượt mà, lưu giữ trạng thái form đang chỉnh sửa.
- [ ] Toàn bộ unit tests và e2e verification tests pass 100% (`bun run test`).
- [ ] TypeScript typecheck pass 100% không cảnh báo (`bun run tsc --noEmit`).
