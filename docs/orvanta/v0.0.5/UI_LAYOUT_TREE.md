# CÂY CẤU TRÚC GIAO DIỆN & LAYOUT THỰC TẾ ORVANTA (UI LAYOUT TREE)

> **Mục đích tài liệu**: Khảo sát, truy vết source code thực tế và vẽ cây cấu trúc phân cấp linh kiện (DOM / Component hierarchy) của các trang **Home**, **Agents** (Profile, Thông số, Tools, Rules, Skills), **Inbox**, và **Console** trong Webview UI của Orvanta.  
> **Phạm vi**: Chỉ ghi nhận hiện trạng cấu trúc và thuộc tính layout (`display`, `flex`, `flex-direction`, `height`, `min-height`, `overflow`, quản lý scroll). Không phân tích nguyên nhân lỗi, không đề xuất giải pháp, không can thiệp sửa đổi code runtime.

---

## 1. Trạng Thái Xác Minh (Verification Status)

Tất cả các node và thuộc tính layout trong tài liệu này được truy vết và đối chiếu trực tiếp 100% từ mã nguồn trong workspace:
- `apps/vscode/webview-ui/index.html`
- `apps/vscode/webview-ui/src/main.css` & `src/index.css`
- `apps/vscode/webview-ui/src/main.tsx`
- `apps/vscode/webview-ui/src/App.tsx`
- `apps/vscode/webview-ui/src/orvanta/OrvantaShell.tsx`
- `apps/vscode/webview-ui/src/orvanta/HomeView.tsx`
- `apps/vscode/webview-ui/src/orvanta/AgentsView.tsx`
- `apps/vscode/webview-ui/src/orvanta/AgentTreeChart.tsx`
- `apps/vscode/webview-ui/src/orvanta/AgentEditor.tsx`
- `apps/vscode/webview-ui/src/orvanta/ModelParamsTab.tsx`
- `apps/vscode/webview-ui/src/orvanta/ToolsPermissionsTab.tsx`
- `apps/vscode/webview-ui/src/orvanta/InstructionsRulesTab.tsx`
- `apps/vscode/webview-ui/src/orvanta/SkillsTab.tsx`
- `apps/vscode/webview-ui/src/orvanta/InboxView.tsx`
- `apps/vscode/webview-ui/src/orvanta/inbox/InboxList.tsx`
- `apps/vscode/webview-ui/src/orvanta/inbox/InboxDetail.tsx`
- `apps/vscode/webview-ui/src/orvanta/inbox/InboxConfirmModal.tsx`
- `apps/vscode/webview-ui/src/orvanta/ConsoleView.tsx`
- `apps/vscode/webview-ui/src/orvanta/TeamSidebar.tsx`
- `apps/vscode/webview-ui/src/orvanta/TeamFeedView.tsx`
- `apps/vscode/webview-ui/src/components/chat/ChatView.tsx`
- `apps/vscode/webview-ui/src/components/chat/chat-view/components/layout/ChatLayout.tsx`
- `apps/vscode/webview-ui/src/components/chat/chat-view/components/layout/MessagesArea.tsx`

**Mức độ xác minh**: `[XÁC MINH 100% TỪ SOURCE CODE]`. Không có thành phần giả định.

---

## 2. Cây Cấu Trúc Tổng Thể (Master Component Hierarchy Tree)

```text
html (main.css:19)
└── body (index.html:8, main.css:25, index.css:19)
    └── div#root (index.html:9, main.css:35)
        └── StrictMode (main.tsx:8)
            └── App (App.tsx:318)
                └── Providers (App.tsx:320)
                    └── ChatErrorBoundary (App.tsx:321)
                        └── AppContent (App.tsx:22, 221)
                            ├── [Overlays conditionally rendered: Settings, History, Marketplace, Mcp, Account, Worktrees]
                            │
                            ├── OrvantaShell (App.tsx:245, OrvantaShell.tsx:17)
                            │   ├── nav (Điều hướng chính: Home | Agents | Inbox | Console) (OrvantaShell.tsx:78)
                            │   └── div.flex-1.min-h-0.overflow-hidden (OrvantaShell.tsx:117) [Chỉ hiện khi tab = home|agents|inbox]
                            │       │
                            │       ├── [TRANG 1: HOME] HomeView (HomeView.tsx:74, OrvantaShell.tsx:119)
                            │       │   └── (company.status === "ready") div.flex.h-full.w-full.min-h-0.flex-col.overflow-y-auto.scroller-y (HomeView.tsx:226)
                            │       │       ├── header (Tiêu đề, Purpose tagline, Sync, Dots menu) (HomeView.tsx:227)
                            │       │       ├── div (Banner cảnh báo interrupted nếu có) (HomeView.tsx:342)
                            │       │       ├── div (Notice message nếu có) (HomeView.tsx:355)
                            │       │       ├── section (Quyết định chờ - Inbox pending) (HomeView.tsx:364)
                            │       │       ├── section (Work now - Danh sách task đang làm, nghẽn, chờ) (HomeView.tsx:398)
                            │       │       │   └── TaskRow[] (HomeView.tsx:433, 444, 451, 789)
                            │       │       ├── section (Purpose - Locked) (HomeView.tsx:459)
                            │       │       │   └── div (collapsible) -> MarkdownBlock (HomeView.tsx:491-492)
                            │       │       ├── section (Đội ngũ Agents thống kê & liên kết sang tab Agents) (HomeView.tsx:496)
                            │       │       └── [Modals: EditPurposeModal, ViewCompanyJsonModal, DeleteCompanyModal] (HomeView.tsx:571, 588, 623)
                            │       │
                            │       ├── [TRANG 2: AGENTS] AgentsView (AgentsView.tsx:132, OrvantaShell.tsx:137)
                            │       │   └── div.flex.h-full.min-h-0.flex-1.flex-col.overflow-hidden (AgentsView.tsx:324)
                            │       │       ├── div[data-testid="agents-tree-panel"] (AgentsView.tsx:329) [Chiều cao: treeHeight]
                            │       │       │   └── AgentTreeChart (AgentTreeChart.tsx:313, AgentsView.tsx:332)
                            │       │       │       └── div.relative.flex.flex-col.h-full.w-full.overflow-hidden (AgentTreeChart.tsx:344)
                            │       │       │           ├── div (Toolbar: Sơ đồ tổ chức, zoom controls, Thêm Agent) (AgentTreeChart.tsx:348)
                            │       │       │           ├── div.flex-1.min-h-0.w-full.overflow-auto.scroller (AgentTreeChart.tsx:409) [VIEWPORT SCROLL]
                            │       │       │           │   └── div.min-w-fit.min-h-fit (Canvas transform scale) (AgentTreeChart.tsx:411)
                            │       │       │           │       └── TreeNodeItem (Cây đệ quy) -> AgentCard (AgentTreeChart.tsx:116, 233)
                            │       │       │           └── [Modal: TemplatePickerModal] (AgentTreeChart.tsx:436)
                            │       │       │
                            │       │       ├── div[role="separator"] (Split Divider kéo thả đổi kích thước) (AgentsView.tsx:341)
                            │       │       │
                            │       │       └── div.flex.min-h-0.flex-1.flex-col.overflow-hidden (AgentsView.tsx:359)
                            │       │           └── AgentEditor (AgentEditor.tsx:83, AgentsView.tsx:361)
                            │       │               └── div.relative.flex.h-full.flex-col.overflow-hidden (AgentEditor.tsx:319)
                            │       │                   ├── div (Top Action Bar: Title, Avatar, Dirty status, Xóa, Lưu, Đóng) (AgentEditor.tsx:320)
                            │       │                   ├── div (Sub-tabs Bar: Profile | Thông số | Tools | Rules | Skills) (AgentEditor.tsx:411)
                            │       │                   ├── div.flex.min-h-0.flex-1.flex-col.gap-4.scroller-y (AgentEditor.tsx:433) [NỘI DUNG SCROLL]
                            │       │                   │   ├── [Tab 1: Profile] div[data-testid="tab-panel-profile"] (AgentEditor.tsx:459)
                            │       │                   │   ├── [Tab 2: Thông số] ModelParamsTab (ModelParamsTab.tsx:23, AgentEditor.tsx:633)
                            │       │                   │   ├── [Tab 3: Tools] ToolsPermissionsTab (ToolsPermissionsTab.tsx:72, AgentEditor.tsx:654)
                            │       │                   │   ├── [Tab 4: Rules] InstructionsRulesTab (InstructionsRulesTab.tsx:59, AgentEditor.tsx:668)
                            │       │                   │   └── [Tab 5: Skills] SkillsTab (SkillsTab.tsx:84, AgentEditor.tsx:679)
                            │       │                   └── [Modals: DiscardConfirmModal, DeleteConfirmModal] (AgentEditor.tsx:684, 719)
                            │       │
                            │       └── [TRANG 3: INBOX] InboxView (InboxView.tsx:20, OrvantaShell.tsx:144)
                            │           └── div.flex.h-full.min-h-0.flex-1.flex-col.overflow-hidden (InboxView.tsx:90)
                            │               ├── div (Sub-tabs: Chờ duyệt | Để sau | Lịch sử + Làm mới) (InboxView.tsx:92)
                            │               ├── div (Filter bar: Loại quyết định & Mức độ khẩn cấp) (InboxView.tsx:139)
                            │               ├── div.flex.min-h-0.flex-1.overflow-x-auto.overflow-y-hidden.scroller-x (Master-Detail Split) (InboxView.tsx:179)
                            │               │   ├── div.w-2/5.min-w-[140px].max-w-[360px].flex-col.border-r.min-h-0.h-full.overflow-hidden (InboxView.tsx:180) [CỘT DANH SÁCH]
                            │               │   │   └── InboxList (InboxList.tsx:11, InboxView.tsx:181)
                            │               │   │       └── div.scroller-y.h-full.min-h-0.w-full.p-2.space-y-1.5 (InboxList.tsx:43) [SCROLL DANH SÁCH]
                            │               │   │           └── button[] (Decision item cards) (InboxList.tsx:52)
                            │               │   │
                            │               │   └── div.flex.flex-1.min-w-[160px].min-h-0.flex-col.overflow-hidden (InboxView.tsx:188) [CỘT CHI TIẾT]
                            │               │       └── InboxDetail (InboxDetail.tsx:26, InboxView.tsx:189)
                            │               │           └── div.flex.flex-col.min-h-0.flex-1.h-full.overflow-hidden (InboxDetail.tsx:69)
                            │               │               ├── div.shrink-0.border-b (Detail Header cố định) (InboxDetail.tsx:71)
                            │               │               ├── div.scroller-y.flex-1.min-h-0.p-3.space-y-3 (InboxDetail.tsx:110) [SCROLL CHI TIẾT]
                            │               │               │   ├── Section 1: Tóm tắt & Lý do đề xuất (InboxDetail.tsx:112)
                            │               │               │   ├── Section 2: Maker-Checker Audit (DoD Verified) (InboxDetail.tsx:123)
                            │               │               │   ├── Section 3: Bằng chứng sản phẩm & Dữ liệu kỹ thuật (InboxDetail.tsx:167)
                            │               │               │   ├── Section 4: Đánh giá tác động & Rủi ro (Impact Analysis) (InboxDetail.tsx:476)
                            │               │               │   └── Section 5: Kết quả giải quyết (chỉ hiện ở tab history) (InboxDetail.tsx:502)
                            │               │               └── div.shrink-0.border-t (Sticky Action Footer: Để sau, Từ chối, Phê duyệt) (InboxDetail.tsx:526)
                            │               │
                            │               └── [Modal: InboxConfirmModal] (InboxConfirmModal.tsx:13, InboxView.tsx:195)
                            │
                            └── [TRANG 4: CONSOLE] Container Console/ChatView (App.tsx:251-313)
                                └── div.flex.h-full.min-h-0.flex-1.w-full.overflow-hidden [display: flex khi activeTab = console] (App.tsx:251)
                                    └── ConsoleView (ConsoleView.tsx:18, App.tsx:255)
                                        └── div.flex.flex-1.h-full.min-h-0.w-full.overflow-hidden (ConsoleView.tsx:35)
                                            ├── TeamSidebar (TeamSidebar.tsx:104, ConsoleView.tsx:37) [CỘT TRÁI: CHANNELS SIDEBAR]
                                            │   └── aside.relative.flex.h-full.shrink-0.flex-col.border-r (TeamSidebar.tsx:373) [width: effectiveWidth]
                                            │       ├── div (Header thanh bên / Nút toggle Ctrl+B) (TeamSidebar.tsx:382)
                                            │       ├── nav.flex-1.scroller-y.p-1 (TeamSidebar.tsx:410) [SCROLL DANH SÁCH AGENT]
                                            │       │   ├── Kênh chung #team-feed button (TeamSidebar.tsx:425 / 470)
                                            │       │   ├── Danh sách Persistent agents (TeamSidebar.tsx:447 / 489)
                                            │       │   ├── Danh sách Ephemeral agents (TeamSidebar.tsx:452 / 498)
                                            │       │   └── Danh sách Stopped agents accordion (TeamSidebar.tsx:457 / 516)
                                            │       ├── div.shrink-0 (Nút Tuyển nhân sự mới) (TeamSidebar.tsx:527)
                                            │       └── div.absolute.top-0.right-0.h-full.w-1 (Resizer Handle kéo rộng/hẹp) (TeamSidebar.tsx:563)
                                            │
                                            └── div.flex.flex-1.min-w-0.min-h-0.flex-col.overflow-hidden (ConsoleView.tsx:47) [CỘT PHẢI: NỘI DUNG KÊNH]
                                                ├── [Trường hợp 1: Chọn #team-feed] div.flex.flex-1.min-h-0.w-full.overflow-hidden.flex-col (ConsoleView.tsx:50)
                                                │   └── TeamFeedView (TeamFeedView.tsx:28, ConsoleView.tsx:51)
                                                │       └── div.flex.flex-1.min-h-0.h-full.w-full.flex-col.overflow-hidden (TeamFeedView.tsx:84)
                                                │           ├── div.shrink-0 (Channel Header: #team-feed, running agents count) (TeamFeedView.tsx:87)
                                                │           ├── div.shrink-0 (Section Mini War Room Cards) (TeamFeedView.tsx:117)
                                                │           │   └── div.grid.grid-cols-1.sm:grid-cols-2.md:grid-cols-3.lg:grid-cols-4 (TeamFeedView.tsx:132)
                                                │           └── div.flex-1.min-h-0.flex.flex-col.overflow-hidden (Section Global Timeline) (TeamFeedView.tsx:189)
                                                │               ├── div.shrink-0 (Timeline subheader) (TeamFeedView.tsx:190)
                                                │               └── div.flex-1.min-h-0.scroller-y (TeamFeedView.tsx:199) [SCROLL TIMELINE]
                                                │                   └── Timeline entries list (TeamFeedView.tsx:212)
                                                │
                                                └── [Trường hợp 2: Chọn kênh @agent 1:1] div.flex-col.flex-1.min-h-0.w-full.overflow-hidden (ConsoleView.tsx:57)
                                                    ├── div.shrink-0.h-[36px].min-h-[36px] (Agent Channel Header) (ConsoleView.tsx:60)
                                                    │   ├── Nút quay lại #team-feed + AgentBadge + @id
                                                    │   └── Status running/idle + Nhãn "Chỉ đạo 1:1 qua Mailbox"
                                                    └── div.flex.flex-col.flex-1.min-h-0.w-full.overflow-hidden.relative (ConsoleView.tsx:107)
                                                        └── ChatView (ChatView.tsx:57, App.tsx:261, ConsoleView.tsx:107)
                                                            └── ChatLayout (ChatLayout.tsx:12, ChatView.tsx:449)
                                                                └── div.flex.flex-col.flex-1.min-h-0.h-full.w-full.overflow-hidden.relative (ChatLayout.tsx:14)
                                                                    ├── div.flex-1.min-h-0.w-full.overflow-hidden.flex.flex-col.relative (ChatView.tsx:451)
                                                                    │   ├── Navbar (nếu showNavbar = true) (ChatView.tsx:452)
                                                                    │   ├── TaskSection / WelcomeSection (ChatView.tsx:454, 465)
                                                                    │   └── MessagesArea (MessagesArea.tsx:40, ChatView.tsx:477)
                                                                    │       └── div.overflow-hidden.flex.flex-col.h-full.relative (MessagesArea.tsx:203)
                                                                    │           ├── div.absolute.top-0 (StickyUserMessage) (MessagesArea.tsx:205)
                                                                    │           └── div.grow.flex.relative (MessagesArea.tsx:217)
                                                                    │               └── Virtuoso.scrollable.grow.overflow-y-scroll (MessagesArea.tsx:240) [SCROLL VIRTUALIZED CHAT]
                                                                    └── footer.shrink-0.w-full.flex.flex-col.z-10 (Chat Footer cố định) (ChatView.tsx:506)
                                                                        ├── AutoApproveBar (ChatView.tsx:507)
                                                                        ├── ActionButtons (ChatView.tsx:508)
                                                                        ├── QueuedPrompts (ChatView.tsx:515)
                                                                        └── InputSection (Composer textarea + tools buttons) (ChatView.tsx:516)
```

---

## 3. Khảo Sát Chi Tiết Từng Tầng (Node-by-Node Layout Specification)

### 3.0. Tầng Shell Gốc (Host DOM -> App -> OrvantaShell)

| Node | File nguồn & Vị trí | Thuộc tính Layout thực tế | Quản lý Scroll |
| :--- | :--- | :--- | :--- |
| `html` | `webview-ui/index.html:2`<br>`src/main.css:19-23` | `height: 100%`<br>`width: 100%`<br>`overflow: hidden` | Không scroll (toàn bộ trang bị khóa cuộn ngoài) |
| `body` | `webview-ui/index.html:8`<br>`src/main.css:25-33`<br>`src/index.css:19-21` | `height: 100%`<br>`width: 100%`<br>`margin: 0`<br>`padding: 0`<br>`line-height: 1.25`<br>`overflow: hidden`<br>`background-color: var(--vscode-sideBar-background)`<br>`@apply bg-background text-foreground` | Không scroll |
| `div#root` | `webview-ui/index.html:9`<br>`src/main.css:35-41` | `display: flex`<br>`flex-direction: column`<br>`height: 100%`<br>`width: 100%`<br>`overflow: hidden` | Không scroll, con tự quản lý |
| `StrictMode` / `App` | `src/main.tsx:8`<br>`src/App.tsx:318` | React Provider wrapper (không sinh thêm DOM wrapper ngoài Providers/ErrorBoundary) | Không |
| `AppContent` Root Container | `src/App.tsx:221` | `<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `min-height: 0`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll |
| `OrvantaShell` Container | `src/orvanta/OrvantaShell.tsx:77`<br>(render tại `App.tsx:245`) | Khi `isFullView` (Home, Agents, Inbox):<br>`className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `min-height: 0`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `overflow: hidden`<br><br>Khi `activeTab = console` (`isFullView = false`):<br>`className="shrink-0"`<br>- `flex-shrink: 0` | Không scroll |
| `OrvantaShell` Nav Bar | `src/orvanta/OrvantaShell.tsx:78-115` | `<nav className="flex shrink-0 items-center gap-1 border-b border-border-panel bg-(--vscode-sideBar-background) px-2 py-1">`<br>- `display: flex`<br>- `flex-shrink: 0`<br>- `align-items: center`<br>- `gap: 0.25rem` | Không scroll |
| `OrvantaShell` View Container | `src/orvanta/OrvantaShell.tsx:117` | `<div className="flex-1 min-h-0 overflow-hidden">`<br>- `display: block` (hoặc con kế thừa flex container)<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `overflow: hidden` | Không scroll (con Home/Agents/Inbox tự scroll) |
| `App.tsx` Console Container | `src/App.tsx:251-253` | `<div className="flex h-full min-h-0 flex-1 w-full overflow-hidden" style={{ display: overlayOpen \|\| orvantaTab !== "console" \|\| showWelcome ? "none" : "flex" }}>`<br>- `display: flex` (hoặc `none`)<br>- `height: 100%`<br>- `min-height: 0`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll |

---

### 3.1. Trang 1: Home (`HomeView.tsx`)

| Node | File & Vị trí | Thuộc tính Layout thực tế | Quản lý Scroll |
| :--- | :--- | :--- | :--- |
| `HomeView` Root (ready) | `src/orvanta/HomeView.tsx:226` | `<div className="flex h-full w-full min-h-0 flex-col gap-3 overflow-y-auto scroller-y p-3 pb-6 text-sm">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `width: 100%`<br>- `min-height: 0`<br>- `gap: 0.75rem`<br>- `overflow-y: auto`<br>- class `scroller-y` | **Quản lý scroll chính** cho toàn trang Home bằng class `.scroller-y` (cuộn dọc) |
| Header công ty | `src/orvanta/HomeView.tsx:227` | `<header className="flex items-start justify-between">`<br>- `display: flex`<br>- `justify-content: space-between` | Không scroll |
| Interrupted Banner | `src/orvanta/HomeView.tsx:342` | `<div className="flex items-center gap-2 rounded border ...">` | Không scroll |
| Section Quyết định chờ (Inbox) | `src/orvanta/HomeView.tsx:364` | `<section className="flex flex-col gap-1.5 rounded border ...">`<br>- Hiển thị tối đa 3 item chờ | Không scroll độc lập |
| Section Work now (Tasks) | `src/orvanta/HomeView.tsx:398` | `<section className="flex flex-col gap-2 rounded border ...">`<br>- Danh sách TaskRow (In progress, Blocked, Queue) | Nội dung chảy theo scroll của container HomeView |
| TaskRow | `src/orvanta/HomeView.tsx:831` | `<div className="flex items-center justify-between rounded border ...">` | Không scroll |
| Section Purpose | `src/orvanta/HomeView.tsx:459` | `<section className="flex flex-col gap-1.5 rounded border ...">` | Không scroll độc lập |
| Purpose Content Container | `src/orvanta/HomeView.tsx:491` | `className={expandedPurpose ? "" : "max-h-48 overflow-hidden line-clamp-8"}` | Khi thu gọn: `max-height: 12rem` và `overflow: hidden`. Khi mở rộng: bung theo dòng |
| Section Đội ngũ Agents | `src/orvanta/HomeView.tsx:496` | `<section className="rounded border ...">`<br>- Thẻ thống kê + Nút điều hướng sang tab Agents | Không scroll |
| Modal Xem JSON | `src/orvanta/HomeView.tsx:588` | `<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">` | Modal backdrop |
| Code block company.json | `src/orvanta/HomeView.tsx:596` | `<pre className="scroller max-h-64 rounded border ...">`<br>- `max-height: 16rem`<br>- class `scroller` (`overflow: auto`) | Scroll nội bộ cho block JSON |
| Modal Xóa công ty | `src/orvanta/HomeView.tsx:623` | `<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">` | Modal backdrop |
| Form Tạo công ty (chưa ready) | `src/orvanta/HomeView.tsx:726` | `<form className="flex h-full w-full min-h-0 flex-col gap-3 overflow-y-auto scroller-y p-3 pb-6 text-sm">` | Cuộn dọc bằng `scroller-y` |

---

### 3.2. Trang 2: Agents (`AgentsView.tsx`, `AgentTreeChart.tsx`, `AgentEditor.tsx` & 5 Tabs)

#### A. Cấu trúc tổng thể AgentsView (Split View)
| Node | File & Vị trí | Thuộc tính Layout thực tế | Quản lý Scroll |
| :--- | :--- | :--- | :--- |
| `AgentsView` Root | `src/orvanta/AgentsView.tsx:324` | `<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-(--vscode-editor-background) text-(--vscode-foreground)" data-testid="agents-view" ref={containerRef}>`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `min-height: 0`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `overflow: hidden` | Không scroll container ngoài |
| Nửa trên: Sơ đồ cây Panel | `src/orvanta/AgentsView.tsx:329` | `<div className="flex shrink-0 flex-col overflow-hidden border-b border-border-panel" data-testid="agents-tree-panel" style={{ height: treeHeight }}>`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex-shrink: 0`<br>- `height: treeHeight` (biến state thay đổi động qua divider kéo thả)<br>- `overflow: hidden` | Không scroll cấp panel |
| Thanh kéo Divider | `src/orvanta/AgentsView.tsx:341` | `<div role="separator" aria-label="Kéo để đổi kích thước sơ đồ và chi tiết agent" className="group flex h-3 w-full shrink-0 cursor-row-resize items-center justify-center border-y border-border-panel/40 bg-slate-900 select-none touch-none ...">`<br>- `display: flex`<br>- `height: 0.75rem` (12px)<br>- `width: 100%`<br>- `flex-shrink: 0` | Không scroll |
| Nửa dưới: Soạn thảo Panel | `src/orvanta/AgentsView.tsx:359` | `<div className="flex min-h-0 flex-1 flex-col overflow-hidden">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `overflow: hidden` | Không scroll cấp panel |

#### B. Component con: Sơ đồ cây (`AgentTreeChart.tsx`)
| Node | File & Vị trí | Thuộc tính Layout thực tế | Quản lý Scroll |
| :--- | :--- | :--- | :--- |
| `AgentTreeChart` Root | `src/orvanta/AgentTreeChart.tsx:344` | `<div className="relative flex flex-col h-full w-full bg-(--vscode-editor-background) overflow-hidden select-none ..." data-testid="agent-tree-chart">`<br>- `position: relative`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll |
| Toolbar Sơ đồ | `src/orvanta/AgentTreeChart.tsx:348` | `<div className="flex items-center justify-between px-3 py-2 border-b border-border-panel bg-(--vscode-sideBar-background)/90 backdrop-blur-xs shrink-0 z-10">`<br>- `display: flex`<br>- `flex-shrink: 0`<br>- `z-index: 10` | Không scroll |
| **Chart Viewport** | `src/orvanta/AgentTreeChart.tsx:409` | `<div className="flex-1 min-h-0 w-full overflow-auto scroller p-4">`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `width: 100%`<br>- `overflow: auto`<br>- class `scroller` | **Quản lý scroll 2 chiều (ngang & dọc)** của sơ đồ cây tổ chức bằng class `.scroller` |
| Khung Canvas & Scale Wrapper | `src/orvanta/AgentTreeChart.tsx:411-417` | `<div className="min-w-fit min-h-fit mx-auto flex items-start justify-center p-2">`<br>`<div style={{ transform: "scale(...)", transformOrigin: "top center", transition: "transform 0.15s ease-out" }}>` | Co giãn theo zoom state |
| Cây đệ quy `TreeNodeItem` | `src/orvanta/AgentTreeChart.tsx:251` | `<div className="flex flex-col items-center">` | Xếp thẻ cha, cuống nối dọc, hàng ngang con |
| Thẻ `AgentCard` | `src/orvanta/AgentTreeChart.tsx:139` | `<div className="relative group w-46.25 min-w-42.5 max-w-50 rounded-lg p-2.5 ... flex flex-col gap-1.5 ...">`<br>- `width: 185px`<br>- `min-width: 170px`<br>- `max-width: 200px` | Không scroll |
| Template Picker Modal | `src/orvanta/AgentTreeChart.tsx:437` | `<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">`<br>Dialog: `<div className="w-full max-w-md max-h-[90%] overflow-y-auto scroller-y ...">` | Modal backdrop; Dialog cuộn bằng `scroller-y` |

#### C. Component con: Soạn thảo Agent (`AgentEditor.tsx` & 5 Tabs)
| Node | File & Vị trí | Thuộc tính Layout thực tế | Quản lý Scroll |
| :--- | :--- | :--- | :--- |
| `AgentEditor` Root | `src/orvanta/AgentEditor.tsx:319` | `<div className="relative flex h-full flex-col overflow-hidden bg-(--vscode-editor-background) text-(--vscode-foreground)" data-testid="agent-editor">`<br>- `position: relative`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `overflow: hidden` | Không scroll |
| Sticky Action Bar | `src/orvanta/AgentEditor.tsx:320` | `<div className="flex items-center justify-between border-b border-border-panel bg-(--vscode-sideBar-background)/80 px-4 py-2.5 shrink-0 backdrop-blur-xs">`<br>- `display: flex`<br>- `flex-shrink: 0` | Không scroll (cố định trên cùng của Editor) |
| Sub-tabs Bar | `src/orvanta/AgentEditor.tsx:411` | `<div className="flex items-center gap-1 border-b border-border-panel bg-(--vscode-sideBar-background)/30 px-4 py-1.5 shrink-0 scroller-x">`<br>- `display: flex`<br>- `flex-shrink: 0`<br>- `overflow-x: auto`<br>- class `scroller-x` | Cuộn ngang khi màn hình hẹp (`scroller-x`) |
| **Vùng nội dung Form Tab** | `src/orvanta/AgentEditor.tsx:433` | `<div className="flex min-h-0 flex-1 flex-col gap-4 scroller-y p-4">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `gap: 1rem`<br>- `overflow-y: auto`<br>- class `scroller-y` | **Quản lý scroll dọc chính** cho toàn bộ 5 tab của AgentEditor |
| **Tab 1: Profile** Panel | `src/orvanta/AgentEditor.tsx:460` | `<div className="flex flex-col gap-4" data-testid="tab-panel-profile">` | Cuộn theo Vùng nội dung Form Tab |
| Overview Card | `src/orvanta/AgentEditor.tsx:462` | `<div className="flex items-center justify-between rounded-lg border ... p-3.5">` | Không scroll |
| Inputs Grid | `src/orvanta/AgentEditor.tsx:522` | `<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">` | Không scroll |
| Danger Zone | `src/orvanta/AgentEditor.tsx:610` | `<div className="flex items-center justify-between pt-3 border-t border-border-panel">` | Không scroll |
| **Tab 2: Thông số** (`ModelParamsTab.tsx`) | `src/orvanta/ModelParamsTab.tsx:53` | `<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-model">`<br>- Card 1: Model & Provider (`ModelPickerCombobox`)<br>- Card 2: Capabilities (Reasoning 5 buttons + Vision toggle)<br>- Card 3: Context Window & Output Tokens (inputs + presets)<br>- Card 4: Temperature & Max Iterations (slider + input) | Cuộn theo Vùng nội dung Form Tab |
| **Tab 3: Tools** (`ToolsPermissionsTab.tsx`) | `src/orvanta/ToolsPermissionsTab.tsx:130` | `<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-tools">`<br>- Grid 1: Allow & Deny Tools (`grid grid-cols-1 sm:grid-cols-2 gap-3.5`)<br>- Grid 2: Scope Allow & Deny Write (`grid grid-cols-1 sm:grid-cols-2 gap-3.5`) | Cuộn theo Vùng nội dung Form Tab |
| Chips container (Tools / Scope) | `src/orvanta/ToolsPermissionsTab.tsx:144, 227, 312, 382` | `<div className="flex flex-wrap gap-1.5 min-h-9 p-1.5 rounded border ...">`<br>- `min-height: 2.25rem` (36px)<br>- `display: flex`<br>- `flex-wrap: wrap` | Không scroll (tự rớt dòng) |
| **Tab 4: Rules** (`InstructionsRulesTab.tsx`) | `src/orvanta/InstructionsRulesTab.tsx:130` | `<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-rules">` | Cuộn theo Vùng nội dung Form Tab |
| Instructions Textarea | `src/orvanta/InstructionsRulesTab.tsx:215` | `<textarea className="min-h-36 max-h-72 w-full resize-y rounded border ... p-3 font-mono text-xs ... scroller-y">`<br>- `min-height: 9rem` (144px)<br>- `max-height: 18rem` (288px)<br>- class `scroller-y` | Textarea có scroll dọc nội bộ khi văn bản dài |
| Instructions Preview Div | `src/orvanta/InstructionsRulesTab.tsx:229` | `<div className="min-h-36 max-h-72 w-full rounded border ... p-3.5 text-xs ... overflow-y-auto scroller-y">` | Cuộn dọc nội bộ khi preview Markdown dài |
| Rules Checklist Container | `src/orvanta/InstructionsRulesTab.tsx:302` | `<div className="flex flex-col gap-1.5" data-testid="rules-checklist">` | Chảy dọc theo form tab |
| **Tab 5: Skills** (`SkillsTab.tsx`) | `src/orvanta/SkillsTab.tsx:142` | `<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-skills">`<br>- Header (count badge, enable/disable all, tooltip)<br>- Ô tìm kiếm<br>- Skills Checklist container (`flex flex-col gap-1.5`)<br>- Ô thêm custom skill | Cuộn theo Vùng nội dung Form Tab |
| Modals (Discard/Delete) | `src/orvanta/AgentEditor.tsx:685, 720` | `<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 ...">` | Modal backdrop |

---

### 3.3. Trang 3: Inbox (`InboxView.tsx`, `InboxList.tsx`, `InboxDetail.tsx`, `InboxConfirmModal.tsx`)

| Node | File & Vị trí | Thuộc tính Layout thực tế | Quản lý Scroll |
| :--- | :--- | :--- | :--- |
| `InboxView` Root | `src/orvanta/InboxView.tsx:90` | `<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `min-height: 0`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `overflow: hidden` | Không scroll container ngoài |
| Sub-tabs Header | `src/orvanta/InboxView.tsx:92` | `<div className="flex shrink-0 items-center justify-between border-b border-border-panel px-3 py-1.5 bg-(--vscode-sideBar-background)/50">`<br>- `display: flex`<br>- `flex-shrink: 0`<br>- Tabs: `pending`, `deferred`, `history` + nút "Làm mới" | Không scroll |
| Filter Bar | `src/orvanta/InboxView.tsx:139` | `<div className="flex shrink-0 gap-2 border-b border-border-panel bg-(--vscode-sideBar-background)/30 px-3 py-1.5 text-xs">`<br>- `display: flex`<br>- `flex-shrink: 0` | Không scroll |
| Master-Detail Split Container | `src/orvanta/InboxView.tsx:179` | `<div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden scroller-x">`<br>- `display: flex`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `overflow-x: auto`<br>- `overflow-y: hidden`<br>- class `scroller-x` | Cho phép cuộn ngang (`scroller-x`) nếu cả hai cột vượt chiều ngang khả dụng |
| Cột Trái: Danh sách (Master) | `src/orvanta/InboxView.tsx:180` | `<div className="flex w-2/5 min-w-[140px] max-w-[360px] flex-col border-r border-border-panel min-h-0 h-full overflow-hidden bg-(--vscode-sideBar-background)/20 shrink-0">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `width: 40%`<br>- `min-width: 140px`<br>- `max-width: 360px`<br>- `height: 100%`<br>- `min-height: 0`<br>- `flex-shrink: 0`<br>- `overflow: hidden` | Không scroll cấp wrapper ngoài cột |
| **`InboxList` List View** | `src/orvanta/inbox/InboxList.tsx:43` | `<div className="scroller-y h-full min-h-0 w-full p-2 space-y-1.5">`<br>- `height: 100%`<br>- `min-height: 0`<br>- `width: 100%`<br>- `overflow-y: auto`<br>- class `scroller-y` | **Quản lý scroll dọc riêng của danh sách quyết định ở cột trái** (`.scroller-y`) |
| Decision Item Button | `src/orvanta/inbox/InboxList.tsx:53` | `<button className="w-full text-left p-2.5 rounded-md border ... flex flex-col gap-1.5">` | Không scroll |
| Cột Phải: Chi tiết (Detail) | `src/orvanta/InboxView.tsx:188` | `<div className="flex flex-1 min-w-[160px] min-h-0 flex-col overflow-hidden bg-(--vscode-editor-background)">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-width: 160px`<br>- `min-height: 0`<br>- `overflow: hidden` | Không scroll cấp wrapper ngoài |
| `InboxDetail` Root | `src/orvanta/inbox/InboxDetail.tsx:69` | `<div className="flex flex-col min-h-0 flex-1 h-full overflow-hidden bg-(--vscode-editor-background) text-foreground">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `min-height: 0`<br>- `flex: 1 1 0%`<br>- `overflow: hidden` | Không scroll |
| Detail Header cố định | `src/orvanta/inbox/InboxDetail.tsx:71` | `<div className="shrink-0 border-b border-border-panel p-3 bg-(--vscode-sideBar-background)/30 space-y-2">`<br>- `flex-shrink: 0` | Không scroll (cố định trên cùng của chi tiết) |
| **Detail Body cuộn dọc** | `src/orvanta/inbox/InboxDetail.tsx:110` | `<div className="scroller-y flex-1 min-h-0 p-3 space-y-3 text-xs leading-relaxed">`<br>- `display: block` (hoặc con flex)<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `overflow-y: auto`<br>- class `scroller-y` | **Quản lý scroll dọc riêng của nội dung chi tiết quyết định ở cột phải** (`.scroller-y`) |
| Section 1: Motivation & Lý do | `src/orvanta/inbox/InboxDetail.tsx:112` | `<section className="rounded-md border ... p-3 space-y-2">` | Cuộn theo Detail Body |
| Section 2: Maker-Checker Audit | `src/orvanta/inbox/InboxDetail.tsx:123` | `<section className="rounded-md border ... p-3 space-y-2.5">` | Cuộn theo Detail Body |
| Section 3: Deliverables & Data | `src/orvanta/inbox/InboxDetail.tsx:167` | `<section className="rounded-md border ... p-3 space-y-3">` | Cuộn theo Detail Body |
| Pre Raw JSON Payload | `src/orvanta/inbox/InboxDetail.tsx:468` | `<pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded ... text-[10px] font-mono ...">` | Scroll dọc nội bộ khi xem JSON payload dài |
| Section 4: Impact & Risk Analysis | `src/orvanta/inbox/InboxDetail.tsx:476` | `<section className="rounded-md border ... p-3 space-y-2">` | Cuộn theo Detail Body |
| Section 5: History Resolution | `src/orvanta/inbox/InboxDetail.tsx:502` | `<section className="rounded-md border ... p-3 text-xs space-y-1.5">` | Cuộn theo Detail Body |
| Detail Sticky Footer | `src/orvanta/inbox/InboxDetail.tsx:526` | `<div className="shrink-0 border-t border-border-panel p-2.5 bg-(--vscode-sideBar-background)/80 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2">`<br>- `display: flex`<br>- `flex-shrink: 0`<br>- Nút: "Để sau", "Từ chối", "Phê duyệt" / "Mở lại" | Không scroll (cố định đáy chi tiết) |
| `InboxConfirmModal` Dialog | `src/orvanta/inbox/InboxConfirmModal.tsx:49-50` | Backdrop: `<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">`<br>Dialog: `<div className="w-full max-w-md max-h-[90%] overflow-y-auto scroller-y rounded-lg border ...">` | Dialog modal có `max-height: 90%` và cuộn bằng `scroller-y` nếu nội dung dài |

---

### 3.4. Trang 4: Console (`ConsoleView.tsx`, `TeamSidebar.tsx`, `TeamFeedView.tsx`, `ChatView.tsx`, `MessagesArea.tsx`)

| Node | File & Vị trí | Thuộc tính Layout thực tế | Quản lý Scroll |
| :--- | :--- | :--- | :--- |
| Console Root Container (`App.tsx`) | `src/App.tsx:251-253` | `<div className="flex h-full min-h-0 flex-1 w-full overflow-hidden" style={{ display: overlayOpen \|\| orvantaTab !== "console" \|\| showWelcome ? "none" : "flex" }}>`<br>- `display: flex`<br>- `height: 100%`<br>- `min-height: 0`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll container ngoài |
| `ConsoleView` Root | `src/orvanta/ConsoleView.tsx:35` | `<div className="flex flex-1 h-full min-h-0 w-full overflow-hidden" data-testid="console-view">`<br>- `display: flex`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `height: 100%`<br>- `min-height: 0`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll |
| **`TeamSidebar` (Cột Trái)** | `src/orvanta/TeamSidebar.tsx:373` | `<aside aria-label="Đội" className="relative flex h-full shrink-0 flex-col border-r border-border-panel bg-(--vscode-sideBar-background) select-none ..." style={{ width: effectiveWidth }}>`<br>- `position: relative`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `flex-shrink: 0`<br>- `width: effectiveWidth` (160px–280px, mặc định 190px, thu gọn 48px) | Không scroll cấp aside ngoài |
| Sidebar Header | `src/orvanta/TeamSidebar.tsx:382, 395` | `<div className="flex items-center justify-between border-b ... px-2.5 py-2 ... w-full">` | Không scroll |
| **Sidebar Agent Nav List** | `src/orvanta/TeamSidebar.tsx:410` | `<nav aria-label="Danh sách agent" className="flex-1 scroller-y p-1">`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `overflow-y: auto`<br>- class `scroller-y` | **Quản lý scroll dọc riêng cho danh sách agent ở sidebar** (`.scroller-y`) |
| Sidebar Quick Hire Button | `src/orvanta/TeamSidebar.tsx:527` | `<div className="shrink-0 p-2 border-t border-border-panel/40 ...">`<br>- `flex-shrink: 0` | Không scroll (cố định đáy sidebar) |
| Sidebar Resizer Handle | `src/orvanta/TeamSidebar.tsx:563` | `<div className="absolute top-0 right-0 h-full w-1 cursor-col-resize ...">` | Thanh kéo resize chuột |
| **Vùng Nội Dung Kênh (Cột Phải)** | `src/orvanta/ConsoleView.tsx:47` | `<div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-width: 0`<br>- `min-height: 0`<br>- `overflow: hidden` | Không scroll container ngoài |
| **Phân nhánh 1: `#team-feed` Active** | `src/orvanta/ConsoleView.tsx:50` | `<div className="flex flex-1 min-h-0 w-full overflow-hidden flex-col">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll wrapper |
| `TeamFeedView` Root | `src/orvanta/TeamFeedView.tsx:84` | `<div className="flex flex-1 min-h-0 h-full w-full flex-col overflow-hidden bg-(--vscode-editor-background) text-(--vscode-editor-foreground)" data-testid="team-feed-view">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `height: 100%`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll |
| Channel Header `#team-feed` | `src/orvanta/TeamFeedView.tsx:87` | `<div className="flex shrink-0 items-center justify-between border-b border-border-panel bg-(--vscode-sideBar-background)/50 px-4 py-2.5">`<br>- `flex-shrink: 0` | Không scroll |
| Mini War Room Cards Section | `src/orvanta/TeamFeedView.tsx:117` | `<div className="shrink-0 border-b border-border-panel/40 bg-(--vscode-sideBar-background)/20 p-2.5">`<br>- `flex-shrink: 0` | Không scroll (cố định trên timeline) |
| Global Timeline Section Wrapper | `src/orvanta/TeamFeedView.tsx:189` | `<div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-(--vscode-editor-background)">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `overflow: hidden` | Không scroll |
| **Global Timeline Scroll Container** | `src/orvanta/TeamFeedView.tsx:199` | `<div className="flex-1 min-h-0 scroller-y p-3 space-y-1.5 pb-6" data-testid="timeline-container" ref={timelineScrollRef}>`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `overflow-y: auto`<br>- class `scroller-y` | **Quản lý scroll dọc cho dòng thời gian sự kiện của toàn đội** (`.scroller-y` + tự cuộn xuống đáy khi có event mới) |

| **Phân nhánh 2: Kênh `@agent` Active** | `src/orvanta/ConsoleView.tsx:57` | `<div className="flex-col flex-1 min-h-0 w-full overflow-hidden" style={{ display: isTeamFeed ? "none" : "flex" }}>`<br>- `display: flex` (hoặc `none`)<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll |
| Agent Channel Header | `src/orvanta/ConsoleView.tsx:60` | `<div className="shrink-0 h-[36px] min-h-[36px] border-b border-border-panel bg-(--vscode-sideBar-background) px-3 flex items-center justify-between select-none z-10 gap-2 overflow-hidden text-xs" data-testid="agent-channel-header">`<br>- `display: flex`<br>- `flex-shrink: 0`<br>- `height: 36px`<br>- `min-height: 36px`<br>- `overflow: hidden` | Không scroll (cố định đỉnh kênh chat) |
| ChatView Holder | `src/orvanta/ConsoleView.tsx:107` | `<div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden relative">`<br>- `position: relative`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll |
| `ChatView` / `ChatLayout` Root | `src/components/chat/chat-view/components/layout/ChatLayout.tsx:14`<br>(tại `ChatView.tsx:449`) | `<div className="flex flex-col flex-1 min-h-0 h-full w-full overflow-hidden relative">`<br>- `position: relative`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `height: 100%`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll |
| Chat Body (Messages + Header) | `src/components/chat/ChatView.tsx:451` | `<div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">`<br>- `position: relative`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex: 1 1 0%` (`flex-1`)<br>- `min-height: 0`<br>- `width: 100%`<br>- `overflow: hidden` | Không scroll cấp ngoài |
| `MessagesArea` Wrapper | `src/components/chat/chat-view/components/layout/MessagesArea.tsx:203` | `<div className="overflow-hidden flex flex-col h-full relative">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `height: 100%`<br>- `overflow: hidden`<br>- `position: relative` | Không scroll |
| Sticky User Message | `src/components/chat/chat-view/components/layout/MessagesArea.tsx:205` | `<div className="absolute top-0 left-0 right-0 z-10 pl-[15px] pr-[14px] bg-background">` | Cố định phía trên khi cuộn qua tin nhắn người dùng |
| Virtuoso Wrapper Div | `src/components/chat/chat-view/components/layout/MessagesArea.tsx:217` | `<div className="grow flex relative" ref={scrollContainerRef}>`<br>- `display: flex`<br>- `flex-grow: 1`<br>- `position: relative` | Không scroll |
| **`Virtuoso` Virtualized Scroller** | `src/components/chat/chat-view/components/layout/MessagesArea.tsx:240-266` | `<Virtuoso className="scrollable grow overflow-y-scroll" ... style={{ scrollbarWidth: "none", msOverflowStyle: "none", overflowAnchor: "none" }} />`<br>- `flex-grow: 1`<br>- `overflow-y: scroll` (virtualized list) | **Quản lý scroll dọc ảo hóa (virtualized scroll) cho toàn bộ tin nhắn chat** của kênh 1:1 / Coordinator |
| Chat Footer (Composer & Actions) | `src/components/chat/ChatView.tsx:506` | `<footer className="shrink-0 w-full bg-(--vscode-sideBar-background) border-t border-border-panel/40 flex flex-col z-10">`<br>- `display: flex`<br>- `flex-direction: column`<br>- `flex-shrink: 0`<br>- `width: 100%`<br>- `z-index: 10` | Không scroll (cố định sát đáy vùng chat) |

---

## 4. Bảng Tổng Hợp Vị Trí Quản Lý Scroll (Scroll Container Summary Matrix)

Bảng tổng hợp vị trí cuộn thực tế theo từng trang:

| Trang / Phân hệ | Vị trí Node quản lý Scroll | Thuộc tính CSS tạo cuộn | Hướng cuộn | Đối tượng cuộn |
| :--- | :--- | :--- | :--- | :--- |
| **Gốc (Host)** | `html`, `body`, `#root` | `overflow: hidden` (trong `main.css`) | Khóa cuộn | Chặn toàn bộ cuộn full-page ngoài ý muốn của VSCode Webview |
| **Home** | Container gốc `HomeView` (`HomeView.tsx:226`) | `overflow-y: auto`, class `.scroller-y` | Dọc (Y) | Toàn bộ trang Home (Header, Alert, Pending Inbox, Work now tasks, Purpose, Team stats) |
| **Home** | Pre JSON Viewer (`HomeView.tsx:596`) | `max-height: 16rem`, class `.scroller` (`overflow: auto`) | Cả 2 hướng | Khối JSON dữ liệu công ty |
| **Agents** | Viewport Sơ đồ cây (`AgentTreeChart.tsx:409`) | `flex-1 min-h-0 w-full`, `overflow: auto`, class `.scroller` | Cả 2 hướng (X & Y) | Sơ đồ cây tổ chức phân cấp các Agent (hỗ trợ zoom & pan) |
| **Agents** | Sub-tabs Bar (`AgentEditor.tsx:411`) | `shrink-0`, `overflow-x: auto`, class `.scroller-x` | Ngang (X) | Thanh 5 tab: Profile, Thông số, Tools, Rules, Skills khi khung editor hẹp |
| **Agents** | Vùng nội dung Form Editor (`AgentEditor.tsx:433`) | `flex-1 min-h-0`, `overflow-y: auto`, class `.scroller-y` | Dọc (Y) | Toàn bộ nội dung form của 5 Tab đang chọn trong `AgentEditor` |
| **Agents (Tab Rules)** | Textarea soạn thảo (`InstructionsRulesTab.tsx:215`) | `min-h-36 max-h-72 resize-y`, class `.scroller-y` | Dọc (Y) | Văn bản hướng dẫn System Prompt markdown |
| **Agents (Tab Rules)** | Preview div (`InstructionsRulesTab.tsx:229`) | `min-h-36 max-h-72 overflow-y-auto`, class `.scroller-y` | Dọc (Y) | Bản render Markdown của Instructions |
| **Inbox** | Master-Detail Split (`InboxView.tsx:179`) | `flex-1 min-h-0`, `overflow-x: auto overflow-y-hidden`, class `.scroller-x` | Ngang (X) | Cho phép cuộn ngang bộ đôi Cột danh sách + Cột chi tiết khi chiều rộng cửa sổ nhỏ |
| **Inbox (Cột trái)** | Danh sách quyết định (`InboxList.tsx:43`) | `h-full min-h-0 w-full`, `overflow-y: auto`, class `.scroller-y` | Dọc (Y) | Toàn bộ các thẻ quyết định chờ/để sau/lịch sử |
| **Inbox (Cột phải)** | Nội dung chi tiết (`InboxDetail.tsx:110`) | `flex-1 min-h-0`, `overflow-y: auto`, class `.scroller-y` | Dọc (Y) | Toàn bộ 5 section chi tiết quyết định (Header và Footer cố định) |
| **Inbox (Cột phải)** | Pre Raw Payload Viewer (`InboxDetail.tsx:468`) | `max-h-40 overflow-y-auto` | Dọc (Y) | Dữ liệu thô JSON của quyết định |
| **Console (Sidebar)** | Nav Danh sách Agent (`TeamSidebar.tsx:410`) | `flex-1`, `overflow-y: auto`, class `.scroller-y` | Dọc (Y) | Kênh #team-feed, Persistent agents, Ephemeral agents, Stopped agents |
| **Console (`#team-feed`)** | Timeline Container (`TeamFeedView.tsx:199`) | `flex-1 min-h-0`, `overflow-y: auto`, class `.scroller-y` | Dọc (Y) | Dòng thời gian các sự kiện hoạt động của toàn đội |
| **Console (`@agent`)** | Messages Area (`MessagesArea.tsx:240`) | `<Virtuoso>` với `overflow-y: scroll`, `flex-grow: 1` | Dọc (Y) | Danh sách tin nhắn hội thoại 1:1 ảo hóa (Header và Footer cố định) |

---
*Tài liệu được khởi tạo và xác minh hoàn tất từ mã nguồn thực tế tại commit hiện tại.*


