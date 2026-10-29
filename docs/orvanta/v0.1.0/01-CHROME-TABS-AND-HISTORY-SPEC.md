# Orvanta v0.1.0 — Đặc Tả Kỹ Thuật: Chrome-like Tabs & Lịch Sử Cuộc Trò Chuyện
## Hệ Thống Đa Phiên Chat (Multi-Session Tabs) & Quản Lý Lịch Sử Trực Quan Trên Console

---

## 1. Tổng Quan & Mục Tiêu Phiên Bản v0.1.0

### 1.1. Bối cảnh & Vấn đề hiện tại
- **Phiên làm việc đơn lẻ (Single Active Session):** Trong các phiên bản trước (v0.0.5 trở về trước), giao diện chat của Console chỉ hiển thị một phiên làm việc (Task) duy nhất tại một thời điểm. Khi người dùng muốn thực hiện một tác vụ khác hoặc trao đổi về một vấn đề độc lập, họ phải xóa task hiện tại hoặc chuyển màn hình, làm gián đoạn luồng suy nghĩ và mạch làm việc.
- **Lịch sử bị cô lập:** Khi hệ thống có công ty AI hoạt động (`hasCompany = true`), giao diện `HistoryView` bị ẩn (`showHistory && !hasCompany`), khiến người dùng không có cách nào xem lại, duyệt hoặc tiếp tục trò chuyện với các task trước đó ngay trên trang Console.
- **Thiếu tính đa nhiệm (Multitasking):** Trong môi trường phát triển thực tế, người dùng (CEO / Tech Lead) thường xuyên cần song hành nhiều cuộc hội thoại: ví dụ Tab 1 đang thảo luận kiến trúc với `@coordinator`, Tab 2 yêu cầu `@implementer` sửa một bug nhỏ, Tab 3 đang mở lại một task cũ từ hôm qua để tiếp tục chat.

### 1.2. Mục tiêu giải pháp v0.1.0
1. **Thanh Tab phong cách Chrome bao trùm ConsoleView Root (Chrome-like Session Tabs):**
   - Đặt ở cấp cao nhất của trang Console (ngay dưới `OrvantaShell`, **bao trùm toàn bộ `ConsoleView Root`** bao gồm cả `TeamSidebar` và vùng làm việc bên phải).
   - Mỗi tab là một **Phiên Làm Việc Hoàn Chỉnh (Console Session Workspace)**: Khi chuyển tab hoặc mở một phiên từ lịch sử, toàn bộ Console (gồm cây kênh `#team-feed`, trạng thái các Agent `@coordinator`, `@implementer`, `@reviewer` và transcript riêng của từng Agent) đều được đồng bộ theo đúng phiên đó.
   - Hỗ trợ giao diện bo tròn, vát cạnh tinh tế, nút đóng `[x]`, nút `[+]` tạo phiên mới và nút `🕒 Lịch sử`.
2. **Khay Lịch Sử Tích Hợp (Console History Drawer / Slide-Over):**
   - Nút **"Lịch sử"** (`IconHistory`) nổi bật ngay trên thanh Tab Bar.
   - Khi bấm, mở một ngăn kéo (Drawer/Slide-over) từ cạnh phải hiển thị danh sách các phiên làm việc trong quá khứ.
   - Bấm vào bất kỳ phiên nào trong lịch sử: Tự động mở một Tab mới (hoặc nạp vào tab hiện tại), khôi phục toàn bộ transcript của tất cả Agent trong phiên đó để người dùng có thể click từng Agent xem lại lịch sử và tiếp tục chat.
3. **Lưu trữ Lịch Sử Trực Tiếp Tại Thư Mục Dự Án (`.orvanta/history/`):**
   - Lưu trữ toàn bộ dữ liệu lịch sử các phiên (`sessions.json`, `tasks/<taskId>/ui_messages.json`) trực tiếp trong thư mục `.orvanta/history/` tại gốc của repository hiện tại thay vì chỉ lưu global.
   - Đảm bảo mỗi dự án sở hữu trọn vẹn lịch sử riêng của nó, có thể commit vào Git hoặc lưu trữ bền vững theo workspace.
4. **Lưu trữ trạng thái hiển thị bền vững (Persistence & State Hydration):**
   - Danh sách các tabs đang mở và tab active được lưu vào `localStorage`. Khi reload webview hoặc đổi tab trang, các tabs được khôi phục nguyên vẹn.

---


## 2. Kiến Trúc & Luồng Dữ Liệu (Architecture & Data Flow)

### 2.1. Sơ đồ khối kiến trúc

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ORVANTA COMMAND SHELL                           │
│     [ 🏠 Home ]   [ 👥 Agents ]   [ 📥 Inbox ]   [ 🎮 Console (Active) ]│
├────────────────────────────────────────────────────────────────────────┤
│ CHROME-LIKE SESSION TAB BAR (Bao trùm toàn bộ Console Workspace)       │
│ ┌───────────────┐ ┌───────────────┐ ┌───┐ ┌──────────────────────────┐ │
│ │  Tab 1 (●)    │ │  Tab 2 [x]    │ │ + │ │  🕒 Lịch sử              │ │
│ │  Task A (Impl)│ │  Task B (Coord│ │   │ │  (.orvanta/history/)     │ │
│ └───────────────┘ └───────────────┘ └───┘ └──────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ ConsoleView Root (Ứng với Phiên Chat / Tab đang Active)                │
│ ┌──────────────────────┬─────────────────────────────────────────────┐ │
│ │ TeamSidebar          │ Right Work Area (Chat / TeamFeed)           │ │
│ │ (Ngữ cảnh của Tab 1) │ (Hiển thị Agent được chọn trong Tab 1)      │ │
│ │                      │                                             │ │
│ │ 📢 #team-feed        │ [Trường hợp chọn @implementer]:             │ │
│ │ 🤖 @coordinator      │ - Agent Channel Header (@implementer)       │ │
│ │ 🤖 @implementer (●)  │ - Transcript trao đổi với @implementer      │ │
│ │ 🤖 @reviewer         │   TRONG PHIÊN LÀM VIỆC CỦA TAB 1            │ │
│ │                      │ - 1:1 Direct Steer Composer                 │ │
│ └──────────────────────┴─────────────────────────────────────────────┘ │
│                                  ▲                                     │
│                                  │ (Bấm "Lịch sử" trượt từ phải sang)  │
│                 ┌────────────────┴───────────────────┐                 │
│                 │ HistoryDrawer (Slide-Over Panel)   │                 │
│                 │ - Nguồn: .orvanta/history/         │                 │
│                 │ - Search & Filter theo ngày/agent  │                 │
│                 │ - Bấm mở phiên cũ vào Tab mới      │                 │
│                 └────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Luồng hoạt động chính (User Workflows)

#### Workflow 1: Mở một Tab mới `[+]`
1. Người dùng bấm vào nút `[+]` trên `ChromeTabBar`.
2. Hệ thống tạo một instance `ChatTab` mới với `id` duy nhất (ví dụ: `tab_1730000000_abc`), trạng thái: `taskId = undefined`, `title = "Cuộc trò chuyện mới"`, `agentId = focusAgentId`.
3. Tab mới được đặt làm `activeTabId`.
4. Gọi `TaskServiceClient.clearTask({})` tới backend để làm sạch bộ nhớ phiên hiện tại trong state của Controller. Khung chat chuyển về trạng thái ban đầu (Welcome / Empty input) sẵn sàng nhận lệnh mới.
5. Danh sách tabs được cập nhật tức thì vào `localStorage`.

#### Workflow 2: Gửi tin nhắn đầu tiên trong Tab mới (Auto-linking Task ID)
1. Người dùng nhập nội dung và bấm gửi tin nhắn trong Tab mới.
2. Extension backend nhận lệnh và khởi tạo task mới (`startTask` / `newTask`), tạo ra một `taskId` ngẫu nhiên.
3. Controller thông báo state mới về webview qua `getStateToPostToWebview()`, chứa `currentTaskItem` với `taskId` vừa sinh và tiêu đề lấy từ prompt đầu tiên.
4. Hook `useChatTabs` lắng nghe sự thay đổi của `currentTaskItem`: nếu tab đang active chưa có `taskId`, hệ thống tự động gán `tab.taskId = currentTaskItem.id` và cập nhật `tab.title = currentTaskItem.task`.
5. Tab hiển thị tiêu đề thực tế và liên kết chặt chẽ với task vừa tạo.

#### Workflow 3: Chuyển đổi qua lại giữa các Tab (Tab Switching)
1. Người dùng click vào Tab B (đang có `taskId = task_0123`).
2. Nếu tab hiện tại có nội dung soạn dở (draft text chưa gửi), lưu draft vào `currentTab.draftInput`.
3. Đặt Tab B thành `activeTabId`.
4. Gọi `TaskServiceClient.showTaskWithId({ value: "task_0123" })`.
5. Backend tải toàn bộ transcript tin nhắn, lịch sử api metrics của task `task_0123`, khôi phục vào `clineMessages` và post state về Webview.
6. Webview hiển thị đúng nội dung cuộc hội thoại của Tab B.

#### Workflow 4: Mở cuộc trò chuyện cũ từ Khay Lịch Sử (History Drawer)
1. Người dùng bấm nút `IconHistory` (Lịch sử) trên góc phải thanh tab bar.
2. `HistoryDrawer` trượt ra từ bên phải với danh sách các task lấy từ `TaskServiceClient.getTaskHistory`.
3. Người dùng tìm kiếm hoặc cuộn tìm task mong muốn.
4. Khi bấm chọn một task trong lịch sử:
   - Kiểm tra xem task đó đã được mở ở một tab nào chưa:
     - Nếu đã mở ở Tab X: chỉ cần kích hoạt chuyển sang Tab X.
     - Nếu chưa mở: tự động tạo một Tab mới đại diện cho task đó, gán `taskId = selectedTask.id`, `title = selectedTask.task`, và gọi `TaskServiceClient.showTaskWithId({ value: selectedTask.id })`.
   - Đóng `HistoryDrawer`.
   - Người dùng có thể xem lại toàn bộ tin nhắn và tiếp tục chat (resume task) bình thường.

#### Workflow 5: Đóng một Tab `[x]`
1. Người dùng bấm nút `x` (hoặc click chuột giữa) trên Tab.
2. Nếu số lượng tab hiện tại > 1:
   - Xóa tab đó khỏi mảng tabs.
   - Nếu tab bị đóng là tab đang active: tự động chuyển active sang tab kề trước (hoặc kề sau).
   - Nếu tab chuyển sang có `taskId`, gọi nạp task đó (`showTaskWithId`). Nếu tab mới là tab trống, gọi `clearTask`.
3. Nếu tab bị đóng là tab duy nhất còn lại:
   - Reset tab về trạng thái rỗng ("Cuộc trò chuyện mới"), gọi `clearTask`.

---

## 3. Thiết Kế Chi Tiết Giao Diện (UI/UX Specification)

### 3.1. Thiết kế Thanh Tab Chrome (`ChromeTabBar`)
Thanh tab được thiết kế theo đúng phong cách **Chrome / Modern IDE Tabs**:
- **Chiều cao cố định:** `34px` (gọn gàng, không lãng phí không gian dọc của VS Code).
- **Màu nền thanh tab:** Đồng bộ `--vscode-sideBar-background` hoặc sắc thái dịu nhẹ `bg-(--vscode-sideBar-background)/80 backdrop-blur-sm`.
- **Đường viền đáy:** `border-b border-border-panel/60`.
- **Cấu trúc Tab Item (`ChatTabItem`):**
  - Hình dáng: Bo góc trên (`rounded-t-md`), vát nhẹ tạo cảm giác tab trình duyệt Chrome.
  - Chiều rộng: Co giãn thông minh (`min-w-[110px] max-w-[180px]`), chữ dài tự động cắt `truncate` kèm tooltip.
  - **Tab Active:**
    - Nền: `--vscode-editor-background` (hòa nhập liền mạch với khung chat bên dưới).
    - Viền: Viền trên hoặc vạch highlight màu Indigo/Accent (`border-t-2 border-indigo-500`).
    - Màu chữ: Màu sáng rõ nét `--vscode-editor-foreground`, font-medium text-xs.
    - Đèn trạng thái / Icon: Icon Agent thu nhỏ hoặc icon chat, chấm xanh/tím nếu task đang chạy.
    - Nút đóng `[x]`: Luôn hiển thị, hover đổi màu nền nhẹ (`hover:bg-surface-secondary`).
  - **Tab Inactive:**
    - Nền: Trong suốt hoặc mờ nhẹ, có đường phân cách mỏng giữa các tab.
    - Màu chữ: `text-muted-foreground hover:text-foreground`.
    - Nút đóng `[x]`: Ẩn mặc định, chỉ hiện khi hover chuột vào tab (giống Chrome).
- **Nút Tạo Tab Mới `[+]`:**
  - Nằm ngay sau tab cuối cùng: nút vuông nhỏ `24x24`, icon `<IconPlus size={14} stroke={1.5} />`, bo tròn nhẹ, hover có tooltip: *"Cuộc trò chuyện mới (Ctrl+T)"*.
- **Vùng Điều Hướng Phải (Right Action Cluster):**
  - **Nút Lịch Sử:** Nút bấm pill/outline nhỏ gọn: `<IconHistory size={14} stroke={1.5} />` kèm nhãn *"Lịch sử"* và số lượng task gần đây. Tooltip: *"Lịch sử cuộc trò chuyện"*.
  - **Phím cuộn trái/phải:** Tự động xuất hiện dạng mũi tên nhỏ khi số lượng tab vượt quá chiều rộng màn hình.

### 3.2. Thiết Kế Khay Lịch Sử (`HistoryDrawer`)
Khay lịch sử được thiết kế dạng **Slide-Over Panel (Ngăn kéo trượt)** xuất hiện từ mép phải của khung làm việc:
- **Chiều rộng:** `100%` trên màn hình hẹp (< 380px) hoặc `320px – 360px` trên khung nhìn rộng.
- **Vị trí & Lớp hiển thị:** Nằm trọn vẹn trong Right Work Area của `ConsoleView` với `z-index: 40`, có lớp backdrop mờ nhẹ `bg-black/30` khi mở trên mobile/narrow view.
- **Cấu trúc Drawer:**
  1. **Header:**
     - Tiêu đề: Icon `<IconHistory size={16} stroke={1.5} className="text-indigo-400" />` + *"Lịch sử cuộc trò chuyện"*.
     - Nút đóng `<IconX size={15} stroke={1.5} />` ở góc phải.
  2. **Search & Filter Bar:**
     - Ô input tìm kiếm nhanh: Icon kính lúp `<IconSearch size={13} />`, placeholder: *"Tìm kiếm tác vụ, nội dung..."*.
     - Chip lọc nhanh: *"Tất cả"*, *"Yêu thích ⭐"*, *"Workspace này"*.
  3. **Danh Sách Cuộc Trò Chuyện (`.scroller-y`):**
     - Nhóm theo mốc thời gian: *"Hôm nay"*, *"Hôm qua"*, *"7 ngày trước"*, *"Cũ hơn"*.
     - Mỗi Item hiển thị:
       - Tiêu đề task (trích từ prompt đầu tiên).
       - Thời gian tạo (ví dụ: `14:25` hoặc `28/10/2026`).
       - Thống kê: Số token đã dùng, chi phí tích lũy (nếu có), số lượng tin nhắn.
       - Nút thao tác nhanh: Nút mở vào Tab mới, nút sao (Favorite), nút xóa.
  4. **Footer:**
     - Hiển thị tổng số tác vụ đã lưu và tổng dung lượng lưu trữ trên đĩa.

---

## 4. Mô Hình Dữ Liệu & Quản Lý State (State Model)

### 4.1. TypeScript Interface cho Chat Tab

```typescript
export interface ChatTab {
	/** Định danh duy nhất của tab trên Webview UI (uuid hoặc timestamp string) */
	id: string

	/** Task ID tương ứng lưu trữ trong hệ thống Cline/Orvanta (undefined nếu là tab mới chưa gửi prompt) */
	taskId?: string

	/** Tiêu đề hiển thị trên thanh tab */
	title: string

	/** Agent ID đang phụ trách phiên này (ví dụ: "coordinator", "implementer", hoặc undefined) */
	agentId?: string

	/** Thời điểm tạo tab (timestamp) */
	createdAt: number

	/** Thời điểm tương tác cuối cùng (timestamp) */
	lastActiveAt: number

	/** Nội dung draft đang nhập dở trong composer nhưng chưa gửi */
	draftInput?: string

	/** Trạng thái cờ đang chạy (running) hay chờ người dùng */
	isRunning?: boolean
}

export interface ChatTabsState {
	/** Danh sách các tab đang mở */
	tabs: ChatTab[]

	/** ID của tab đang được chọn hiển thị */
	activeTabId: string

	/** Trạng thái mở/đóng của History Drawer */
	isHistoryOpen: boolean
}
```

### 4.2. Custom Hook `useChatTabs`

Hook tập trung toàn bộ logic quản lý đa tab và kết nối với backend gRPC:

```typescript
export function useChatTabs(initialFocusAgentId?: string) {
	// 1. Khởi tạo state từ localStorage hoặc mặc định 1 tab
	// 2. Hàm createNewTab(agentId?: string, autoActivate?: boolean): ChatTab
	// 3. Hàm closeTab(tabId: string): void
	// 4. Hàm selectTab(tabId: string): Promise<void> (gọi TaskServiceClient.showTaskWithId hoặc clearTask)
	// 5. Hàm openTaskInTab(taskId: string, title?: string): Promise<void>
	// 6. Hàm updateActiveTabTitle(title: string): void
	// 7. Hàm linkCurrentTaskToActiveTab(taskId: string, title: string): void
	// 8. Tự động persist vào localStorage key: "orvanta_console_tabs_state"
}
```

### 4.3. Persistence Schema (`localStorage`)
Dữ liệu được lưu trữ tự động vào `localStorage` dưới khóa `"orvanta_console_tabs_state"`:
```json
{
  "tabs": [
    {
      "id": "tab_1730190000_1",
      "taskId": "01JBE94AKZ7K3M1N8P",
      "title": "Khảo sát và sửa lỗi scroll VirtualList",
      "agentId": "implementer",
      "createdAt": 1730190000000,
      "lastActiveAt": 1730190500000
    },
    {
      "id": "tab_1730190600_2",
      "title": "Cuộc trò chuyện mới",
      "agentId": "coordinator",
      "createdAt": 1730190600000,
      "lastActiveAt": 1730190600000
    }
  ],
  "activeTabId": "tab_1730190000_1"
}
```

---


## 5. Quy Chuẩn Kỹ Thuật: Lưu Trữ Lịch Sử Tại `.orvanta/history/` & Tương Thích Backend

### 5.1. Cấu trúc Lưu Trữ Lịch Sử Tại Thư Mục Dự Án (`.orvanta/history/`)
Toàn bộ lịch sử các phiên làm việc và cuộc hội thoại của các Agent được lưu trữ trực tiếp trong thư mục gốc của repository tại đường dẫn `<workspaceRoot>/.orvanta/history/`:

```
.orvanta/
└── history/
    ├── sessions.json               # Index danh sách toàn bộ các phiên làm việc của repo
    └── tasks/
        ├── 01JBE94AKZ7K3M1N8P/     # Thư mục riêng cho từng Task ID
        │   ├── ui_messages.json   # Toàn bộ transcript tin nhắn của tất cả Agent trong phiên
        │   └── metadata.json      # Metadata: Agent tham gia, model, token usage, cost
        └── 01JBF83XYZ992K2L1A/
            ├── ui_messages.json
            └── metadata.json
```

- **Định dạng `sessions.json`:**
  ```json
  [
    {
      "id": "01JBE94AKZ7K3M1N8P",
      "title": "Khảo sát và xây dựng module xác thực JWT",
      "createdAt": 1730190000000,
      "updatedAt": 1730190500000,
      "tokensIn": 15420,
      "tokensOut": 3200,
      "totalCost": 0.045,
      "agentIds": ["coordinator", "implementer", "reviewer"],
      "activeAgentId": "implementer",
      "status": "completed",
      "isFavorited": false
    }
  ]
  ```

### 5.2. Cơ Chế Đồng Bộ & Đọc Ghi (Read/Write Mechanism)
1. **Ghi Lịch Sử Tự Động (Auto-persist to `.orvanta/history/`):**
   - Khi có tin nhắn mới hoặc khi task hoàn thành / tạm dừng, Controller tự động đồng bộ bản sao lịch sử tin nhắn vào `.orvanta/history/tasks/<taskId>/ui_messages.json` và cập nhật thông tin phiên vào `sessions.json`.
   - Nếu thư mục `.orvanta/history/` chưa tồn tại, hệ thống tự động khởi tạo thư mục và các file index cần thiết.
2. **Đọc & Nạp Lịch Sử (Load from `.orvanta/history/`):**
   - Khay Lịch Sử (`ConsoleHistoryDrawer`) ưu tiên đọc danh sách các task từ `.orvanta/history/sessions.json` của workspace hiện tại.
   - Khi người dùng bấm mở lại một phiên từ lịch sử, hệ thống nạp lại toàn bộ danh sách `clineMessages` từ `.orvanta/history/tasks/<taskId>/ui_messages.json`, cập nhật state để toàn bộ `ConsoleView` (bao gồm `#team-feed` và từng Agent `@agent`) lọc và hiển thị chính xác toàn bộ lịch sử trao đổi của phiên đó.

### 5.3. Tương tác gRPC Services
- **Xem task cũ:** Gọi `TaskServiceClient.showTaskWithId(StringRequest.create({ value: taskId }))`.
  - Backend đọc transcript từ `.orvanta/history/` (hoặc fallback storage), khôi phục tin nhắn và bắn state update về Webview.
- **Tạo task mới / Làm sạch:** Gọi `TaskServiceClient.clearTask(EmptyRequest.create({}))`.
  - Backend hủy phiên làm việc hiện thời, đưa task về trạng thái rỗng sẵn sàng nhận prompt mới.
- **Lấy danh sách lịch sử:** Gọi `TaskServiceClient.getTaskHistory(GetTaskHistoryRequest.create({ ... }))`.
- **Xóa task:** Gọi `TaskServiceClient.deleteTasksWithIds(StringArrayRequest.create({ values: [taskId] }))` để xóa cả trong index và thư mục `.orvanta/history/tasks/<taskId>`.

---

## 6. Kế Hoạch Triển Khai Chi Tiết (Actionable Checklist)

### 📋 Phase 1: Kiến Trúc Lưu Trữ Lịch Sử Dự Án Tại `.orvanta/history/`
- [x] **1.1.** Cập nhật hằng số đường dẫn trong `sdk/packages/shared/src/orvanta/paths.ts`:
  - `HISTORY_DIRNAME = "history"`
  - `HISTORY_SESSIONS_FILE = "history/sessions.json"`
  - `HISTORY_TASKS_DIR = "history/tasks"`
- [x] **1.2.** Xây dựng service lưu trữ lịch sử workspace `OrvantaWorkspaceHistoryStore`:
  - Đọc/ghi `sessions.json` trong `.orvanta/history/`.
  - Lưu và nạp `ui_messages.json` theo từng `taskId`.
  - Tự động đồng bộ và export lịch sử từ runtime vào `.orvanta/history/`.
- [x] **1.3.** Tích hợp hook đồng bộ lịch sử vào Controller để mỗi khi task cập nhật tin nhắn thì tự động đồng bộ vào `.orvanta/history/`.
- [x] **1.4.** Viết unit tests kiểm thử ghi và đọc lịch sử tại `.orvanta/history/`.

### 📋 Phase 2: Kiến Trúc Dữ Liệu & Hook Quản Lý Tab
- [x] **2.1.** Tạo file types `apps/vscode/webview-ui/src/orvanta/tabs/types.ts`:
  - Định nghĩa interface `ChatTab`, `ChatTabsState` với thông tin đầy đủ về phiên (`taskId`, `title`, `activeAgentId`, `agentIds`, `draftInput`).
  - Định nghĩa constants: `MAX_TABS_COUNT = 15`, `DEFAULT_TAB_TITLE = "Phiên làm việc mới"`, `STORAGE_KEY = "orvanta_console_tabs_state"`.
- [x] **2.2.** Xây dựng custom hook `apps/vscode/webview-ui/src/orvanta/tabs/useChatTabs.ts`:
  - Logic đọc và parse trạng thái ban đầu từ `localStorage`.
  - Actions: `createNewTab`, `closeTab`, `selectTab`, `openTaskInTab`, `updateActiveTabTask`, `setDraftInput`.
  - Debounce auto-save vào `localStorage`.
  - Viết unit tests cho `useChatTabs.test.ts`.

### 📋 Phase 3: Giao Diện Thanh Tab Chrome Bao Trùm Console
- [x] **3.1.** Xây dựng component `apps/vscode/webview-ui/src/orvanta/tabs/ChatTabItem.tsx`:
  - Bo tròn vát cạnh Chrome-style, icon Agent/task, tiêu đề cắt gọn `truncate`, nút đóng `[x]` (click chuột giữa để đóng).
- [x] **3.2.** Xây dựng component `apps/vscode/webview-ui/src/orvanta/tabs/ChromeTabBar.tsx`:
  - Đặt ở cấp cao nhất bao trùm toàn bộ Console.
  - Thanh cuộn ngang tabs `.scroller-x`.
  - Nút thêm tab mới `[+]` và nút `🕒 Lịch sử (.orvanta)`.
  - Viết unit tests cho `ChromeTabBar.test.tsx`.

### 📋 Phase 4: Khay Lịch Sử Cuộc Trò Chuyện (History Drawer)
- [x] **4.1.** Xây dựng component `apps/vscode/webview-ui/src/orvanta/tabs/ConsoleHistoryDrawer.tsx`:
  - Slide-over panel trượt từ phải sang.
  - Thanh tìm kiếm, bộ lọc theo ngày và theo Agent tham gia.
  - Hiển thị danh sách các phiên đọc từ `.orvanta/history/`.
  - Nhấp vào phiên: Mở phiên vào một tab mới, khôi phục toàn bộ transcript của các Agent trong phiên đó để người dùng có thể xem lại và tiếp tục chat.
- [x] **4.2.** Viết unit tests cho `ConsoleHistoryDrawer.test.tsx`.

### 📋 Phase 5: Tích Hợp Vào ConsoleView Root & App.tsx
- [x] **5.1.** Chỉnh sửa `apps/vscode/webview-ui/src/orvanta/ConsoleView.tsx`:
  - Bố trí `ChromeTabBar` nằm trên đỉnh bao trùm toàn bộ `ConsoleView` (chứa cả `TeamSidebar` và Right Work Area).
  - Kết nối active tab với ngữ cảnh của các Agent trong `TeamSidebar`.
  - Gắn `ConsoleHistoryDrawer` vào bên trong container.
- [x] **5.2.** Chỉnh sửa `apps/vscode/webview-ui/src/App.tsx`:
  - Kích hoạt tính năng lịch sử cho Console kể cả khi có công ty (`hasCompany`).
  - Đồng bộ `currentTaskItem` từ backend vào tab đang active.
- [x] **5.3.** Đảm bảo layout 100dvh và cuộn độc lập:
  - Khóa chặt chiều cao thanh tab (`34px shrink-0`).
  - Đảm bảo `TeamSidebar` và `ChatView` giữ nguyên cơ chế scroll độc lập.

### 📋 Phase 6: Kiểm Thử Toàn Diện & Đóng Gói v0.1.0
- [x] **6.1.** Viết test integration kiểm thử luồng: Tạo nhiều tabs -> Chuyển đổi tab -> Mở phiên từ `.orvanta/history/` -> Xem lịch sử của từng Agent trong phiên đó.
- [x] **6.2.** Chạy `bun run check-types` và toàn bộ test suites đảm bảo không có lỗi TypeScript hay hồi quy giao diện.
- [x] **6.3.** Cập nhật tài liệu `docs/orvanta/README.md` và `ORVANTA_OVERVIEW.md`.

---

## 7. Tiêu Chí Nghiệm Thu (Definition of Done - DoD)

1. **Thanh Tab bao trùm Console:** `ChromeTabBar` nằm ở trên đỉnh ConsoleView, bao trùm toàn bộ `TeamSidebar` và vùng làm việc. Chuyển tab đồng bộ toàn bộ Console sang phiên đó.
2. **Lịch sử lưu tại `.orvanta/history/`:** Mỗi phiên chat được lưu đầy đủ vào thư mục `.orvanta/history/` tại gốc của repository hiện tại.
3. **Đa nhiệm mượt mà:** Người dùng có thể mở đồng thời nhiều tab chat, bấm chuyển đổi giữa các tab mà không làm đơ giao diện hay mất dữ liệu đang soạn thảo.
4. **Tra cứu lịch sử tức thì:** Bấm nút "Lịch sử" mở ngay ngăn kéo, tìm kiếm và nhấp chọn task cũ để mở lại vào một tab và xem trọn vẹn transcript của từng Agent.
5. **Bền vững qua reload:** Đóng/mở VS Code hoặc đổi tab Orvanta (Home, Agents, Inbox, Console) thì các tabs đang mở vẫn được lưu giữ và hiển thị đúng.
6. **Code quality & Tests:** Đầy đủ unit tests cho các component và hooks mới, zero TypeScript error, pass 100% build checks.


