# ĐẶC TẢ KỸ THUẬT: LỊCH SỬ PHIÊN CHAT CEO & ĐA AGENT TRONG CONSOLE (v0.1.0)
> **Tài liệu**: `docs/orvanta/v0.1.0/03-CEO-SESSION-MULTI-AGENT-HISTORY-SPEC.md`  
> **Trạng thái**: Bản thảo thiết kế kiến trúc (Draft Architecture)  
> **Phiên bản mục tiêu**: `v0.1.0`  
> **Ngày cập nhật**: 29/10/2026

---

## 1. TỔNG QUAN & BỐI CẢNH (OVERVIEW & REQUIREMENTS)

### 1.1. Yêu Cầu Cốt Lõi Của Người Dùng (CEO)
Trong Orvanta, người dùng đóng vai trò là **CEO / Leader** điều hành một đội ngũ AI Agent (gồm `@coordinator` - Lead, và các Teammates như `@implementer`, `@reviewer`, `@qa`...).
- Mỗi lần CEO mở một phiên làm việc (tương ứng với một **Chrome Tab** trên thanh tab bar), CEO đưa ra một bài toán hoặc một kế hoạch công việc lớn.
- Trong **cùng một phiên làm việc đó**, CEO có thể trao đổi, giao nhiệm vụ hoặc kiểm tra tiến độ trực tiếp với **nhiều Agent khác nhau**:
  - Chat với `@coordinator` để lập kế hoạch, phân chia công việc.
  - Chat trực tiếp 1:1 với `@implementer` để chỉ đạo chi tiết mã nguồn, review code.
  - Chat với `@reviewer` để kiểm tra chất lượng.
- **Mong muốn của CEO**:
  1. **Lịch sử của lần chat với CEO** được lưu lại như một **Phiên làm việc tổng thể (CEO Session)**.
  2. **Lịch sử hội thoại của TẤT CẢ các Agent** tham gia trong lần chat đó phải được **gắn chặt với chính phiên chat đó**.
  3. Khi xem lại phiên trong khay **Lịch sử** hoặc khi chuyển đổi giữa các Agent ở thanh bên trái (`TeamSidebar`):
     - Bấm vào `@coordinator` -> Xem lại đúng cuộc trao đổi của CEO với Coordinator trong phiên đó.
     - Bấm vào `@implementer` -> Xem lại đúng cuộc trao đổi của CEO với Implementer trong phiên đó.
     - Bấm vào `@reviewer` -> Xem lại đúng cuộc trao đổi của CEO với Reviewer trong phiên đó.
     - CEO có thể tiếp tục gõ tin nhắn để chat tiếp với bất kỳ Agent nào trong phiên đó mà không bị lẫn lộn dữ liệu giữa các Agent hay giữa các phiên khác nhau!

---

## 2. MÔ HÌNH KIẾN TRÚC & DỮ LIỆU (DATA MODEL & ARCHITECTURE)

### 2.1. Phân Biệt "CEO Session" (Phiên Cấp Cao) vs "Agent Task" (Hội Thoại 1:1)

```
┌────────────────────────────────────────────────────────────────────────┐
│               CEO WORKSPACE SESSION (1 Tab trên Chrome Tab Bar)        │
│          Session ID: "session-01JBE94AKZ" | Title: "Xây dựng Auth"     │
├────────────────────────────────────────────────────────────────────────┤
│ Bản đồ hội thoại Agent (agentTasks Map):                               │
│                                                                        │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────┐ │
│ │ @coordinator (Lead)  │  │ @implementer (Dev)   │  │ @reviewer (QA) │ │
│ │ Task ID: "task-001"  │  │ Task ID: "task-002"  │  │ Task ID: ""    │ │
│ │ Transcript: 12 msgs  │  │ Transcript: 8 msgs   │  │ (Chưa chat)    │ │
│ └──────────────────────┘  └──────────────────────┘  └────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

- **CEO Session (`sessionId`)**: Đại diện cho 1 Tab làm việc trên `ChromeTabBar`. Một phiên có thể kéo dài qua nhiều cuộc trao đổi với nhiều Agent khác nhau.
- **Agent Task (`taskId`)**: Mỗi Agent trong một Session khi được CEO gửi tin nhắn sẽ sở hữu một `taskId` riêng của Cline/Orvanta backend.
- **Quan hệ 1 - N (One-to-Many)**: 1 CEO Session sở hữu nhiều Agent Tasks thông qua bản đồ `agentTasks: Record<string, string>` (Key là `agentId`, Value là `taskId`).

### 2.2. Cấu Trúc Dữ Liệu Chi Tiết (TypeScript Interfaces)

#### A. Trạng Thái Tab Trong Webview (`apps/vscode/webview-ui/src/orvanta/tabs/types.ts`)
```typescript
export interface ChatTab {
  /** ID duy nhất của Tab/Session trên giao diện Webview */
  id: string;

  /** Tiêu đề hiển thị trên tab (thường lấy theo yêu cầu đầu tiên của CEO) */
  title: string;

  /** Agent đang được focus trong tab này (vd: "coordinator", "implementer", "team-feed") */
  activeAgentId: string;

  /** 
   * BẢN ĐỒ AGENT TASK: Gắn kết từng Agent với Task ID tương ứng trong phiên này
   * Ví dụ: { "coordinator": "task-c1", "implementer": "task-i2" }
   */
  agentTasks: Record<string, string>;

  /**
   * BẢN ĐỒ DRAFT INPUT: Lưu nội dung đang gõ dở theo từng Agent để không bị mất khi chuyển đổi
   * Ví dụ: { "coordinator": "", "implementer": "Hãy viết thêm test..." }
   */
  agentDrafts?: Record<string, string>;

  /** Danh sách ID các Agent đã tham gia chat trong phiên này */
  agentIds: string[];

  /** Thời điểm tạo phiên (timestamp) */
  createdAt: number;

  /** Thời điểm hoạt động gần nhất (timestamp) */
  lastActiveAt: number;

  /** Trạng thái cờ đang chạy tiến trình của phiên */
  isRunning?: boolean;

  /** @deprecated Tương thích ngược: trỏ vào task của activeAgentId */
  taskId?: string;
  /** @deprecated Tương thích ngược: trỏ vào draft của activeAgentId */
  draftInput?: string;
}
```

#### B. Cấu Trúc Lưu Trữ Phiên Tại Thư Mục `.orvanta/history/` (`@cline/shared`)
```typescript
export interface OrvantaSessionAgentConversation {
  agentId: string;
  displayName: string;
  role: "lead" | "teammate";
  taskId: string;
  lastMessage?: string;
  tokensIn?: number;
  tokensOut?: number;
  totalCost?: number;
  updatedAt: number;
}

export interface OrvantaSessionRecord {
  /** Session ID duy nhất */
  id: string;

  /** Tiêu đề của phiên làm việc với CEO */
  title: string;

  /** Thời điểm tạo và cập nhật */
  createdAt: number;
  updatedAt: number;

  /** Tổng token và chi phí cộng dồn từ tất cả các Agent trong phiên */
  tokensIn: number;
  tokensOut: number;
  totalCost: number;

  /** Bản đồ agentId -> taskId */
  agentTasks: Record<string, string>;

  /** Danh sách chi tiết các Agent đã tham gia và tiến trình hội thoại của từng Agent */
  agentConversations: OrvantaSessionAgentConversation[];

  /** Danh sách các Agent IDs tham gia */
  agentIds: string[];

  /** Trạng thái hoàn thành hoặc đang xử lý */
  status?: "active" | "completed" | "archived";
}
```

### 2.3. Cấu Trúc Lưu Trữ File Trên Ổ Đĩa (`.orvanta/history/`)

Lịch sử toàn bộ phiên của CEO và các Agent được lưu trữ có cấu trúc rõ ràng tại thư mục gốc của dự án:

```
<Thư mục dự án>/
└── .orvanta/
    └── history/
        ├── sessions.json           # Danh mục index toàn bộ các phiên của CEO
        └── sessions/
            └── 01JBE94AKZ7K3M1N8P/ # Thư mục riêng của Phiên làm việc (Session)
                ├── session.json    # Metadata phiên, bản đồ agentTasks, thông tin Agent
                └── agents/         # Hội thoại 1:1 với từng Agent trong phiên
                    ├── coordinator/
                    │   └── ui_messages.json   # Transcript CEO trao đổi với Coordinator
                    ├── implementer/
                    │   └── ui_messages.json   # Transcript CEO trao đổi với Implementer
                    └── reviewer/
                        └── ui_messages.json   # Transcript CEO trao đổi với Reviewer
```

---

## 3. CƠ CHẾ ĐIỀU HƯỚNG & ĐỒNG BỘ GIAO DIỆN (INTERACTION & SYNC)

### 3.1. Luồng Chuyển Đổi Agent Trong Cùng Một Phiên (Agent Switching Flow)
Khi người dùng đang ở một Tab (ví dụ: Tab 1) và nhấp chọn một Agent ở `TeamSidebar`:

1. **Lưu lại ngữ cảnh cũ**:
   - Nếu CEO đang gõ dở một nội dung trong ô chat chưa gửi, lưu nội dung đó vào `tab.agentDrafts[oldAgentId]`.
2. **Cập nhật Agent đang active**:
   - `tab.activeAgentId = newAgentId`.
3. **Tra cứu Task ID của Agent mới**:
   - `const targetTaskId = tab.agentTasks[newAgentId]`.
   - **Nếu đã có `targetTaskId`**: Gọi `TaskServiceClient.showTaskWithId({ value: targetTaskId })`. Backend nạp lại toàn bộ tin nhắn trước đó giữa CEO và Agent này trong phiên.
   - **Nếu chưa có `targetTaskId`**: Gọi `TaskServiceClient.clearTask({})`. Khung chat trở về trạng thái trống ban đầu, sẵn sàng để CEO bắt đầu cuộc trò chuyện đầu tiên với Agent này.
4. **Khôi phục bản nháp (Draft Input)**:
   - Nếu `tab.agentDrafts[newAgentId]` có dữ liệu, khôi phục lại vào ô soạn thảo.

### 3.2. Luồng CEO Gửi Prompt Đầu Tiên Cho Một Agent Mới
Khi CEO gửi prompt cho một Agent chưa có task trong phiên:
1. `ChatView` gửi prompt tới backend, backend tạo mới một Task với `taskId` mới.
2. Hook `useChatTabs` bắt được `currentTaskItem.id` mới từ `ExtensionStateContext`.
3. Cập nhật vào Tab hiện tại:
   ```typescript
   tab.agentTasks[activeAgentId] = currentTaskItem.id;
   tab.agentIds = Array.from(new Set([...tab.agentIds, activeAgentId]));
   ```
4. Nếu tab chưa có tiêu đề riêng (`title === DEFAULT_TAB_TITLE`), cập nhật tiêu đề tab theo nội dung prompt đầu tiên của CEO.
5. Bản ghi phiên được đồng bộ tự động vào `.orvanta/history/`.

### 3.3. Luồng Chuyển Đổi Giữa Các Chrome Tab (Tab Switching Flow)
Khi CEO chuyển từ Tab 1 sang Tab 2:
1. Lưu `draftInput` hiện tại của Agent đang active vào `tab1.agentDrafts[tab1.activeAgentId]`.
2. Kích hoạt Tab 2:
   - Đọc `tab2.activeAgentId` (ví dụ: `@implementer`).
   - Cập nhật `focusAgentId` trên Console sang `@implementer`.
   - Tra cứu `tab2.agentTasks["implementer"]`:
     - Nếu có: gọi `showTaskWithId({ value: taskId })`.
     - Nếu chưa có: gọi `clearTask({})`.
   - Khôi phục `draftInput` của `@implementer` trong Tab 2 vào khung soạn thảo.

---

## 4. KHAY LỊCH SỬ CUỘC TRÒ CHUYỆN (SESSION HISTORY DRAWER)

### 4.1. Giao Diện & Trải Nghiệm Khay Lịch Sử
- Nút **`🕒 Lịch sử`** ở góc phải thanh `ChromeTabBar` hiển thị danh sách tất cả các **Phiên làm việc của CEO** đọc từ `.orvanta/history/sessions.json`.
- **Thông tin trên mỗi thẻ phiên**:
  - Tiêu đề phiên (nội dung yêu cầu lớn của CEO).
  - Mốc thời gian (ví dụ: "10 phút trước", "Hôm qua").
  - Hàng **Agent Badges** hiển thị tất cả các Agent đã tham gia vào phiên đó (kèm vai trò: `[@coordinator Lead]`, `[@implementer Dev]`...).
  - Thống kê token và chi phí USD tiêu thụ của toàn bộ phiên.
  - Nút **Mở vào tab mới** (`IconExternalLink`) và Nút **Xóa** (`IconTrash` với inline confirmation).

### 4.2. Trải Nghiệm Khi Mở Lại Một Phiên Cũ Từ Lịch Sử
1. CEO bấm vào một phiên cũ trong danh sách.
2. Hệ thống:
   - Mở một Tab mới trên thanh `ChromeTabBar`.
   - Nạp toàn bộ bản đồ `agentTasks` của phiên đó vào tab mới.
   - Mặc định focus vào Agent có tương tác gần nhất (hoặc Lead `@coordinator`).
   - Gọi `showTaskWithId` để nạp ngay transcript của Agent đó.
3. **CEO kiểm tra các Agent khác trong phiên đó**:
   - CEO chỉ cần bấm vào `@coordinator`, `@implementer`, `@reviewer` ở `TeamSidebar` bên trái.
   - Mỗi lần bấm, Console nạp đúng transcript trao đổi của chính Agent đó trong phiên lịch sử này.
   - CEO có thể tiếp tục gõ prompt vào ô chat để **tiếp tục trao đổi và chỉ đạo thêm** cho Agent đó!


---

## 5. BỘ CHECKLIST TRIỂN KHAI CHI TIẾT (ACTIONABLE CHECKLIST)

### 📋 Phase 1: Nâng Cấp Data Contracts & Type Definitions
- [x] **1.1.** Cập nhật `apps/vscode/webview-ui/src/orvanta/tabs/types.ts`:
  - Bổ sung `agentTasks: Record<string, string>` vào `ChatTab`.
  - Bổ sung `agentDrafts: Record<string, string>` vào `ChatTab`.
  - Đảm bảo tương thích ngược với các trường `taskId`, `draftInput`.
- [x] **1.2.** Cập nhật `sdk/packages/shared/src/orvanta/workspace-history-store.ts`:
  - Khai báo interface `OrvantaSessionAgentConversation`.
  - Mở rộng `OrvantaSessionRecord` hỗ trợ `agentTasks: Record<string, string>` và `agentConversations: OrvantaSessionAgentConversation[]`.
  - Xây dựng các hàm `saveSessionAgentMessage`, `loadSessionAgentMessages`.
- [x] **1.3.** Viết unit tests kiểm thử schema và chuyển đổi dữ liệu trong `workspace-history-store.test.ts`. Chạy `bun run build:sdk`.

### 📋 Phase 2: Nâng Cấp Quản Lý Đa Agent Trong Hook `useChatTabs`
- [x] **2.1.** Cập nhật hàm khởi tạo tab mặc định `createDefaultTab`:
  - Khởi tạo `agentTasks: {}` và `agentDrafts: {}`.
- [x] **2.2.** Xây dựng hàm `switchAgentInActiveTab(newAgentId: string)`:
  - Lưu draft của agent cũ.
  - Cập nhật `activeAgentId` của tab sang `newAgentId`.
  - Kiểm tra `agentTasks[newAgentId]`: nếu có thì gọi `showTaskWithId`, nếu không thì gọi `clearTask`.
- [x] **2.3.** Xây dựng hàm `bindTaskToActiveAgent(taskId: string, title?: string)`:
  - Gán `taskId` vào `tab.agentTasks[tab.activeAgentId]`.
  - Thêm `activeAgentId` vào danh sách `tab.agentIds`.
  - Cập nhật tiêu đề tab nếu là prompt đầu tiên.
- [x] **2.4.** Xây dựng hàm `openSessionInTab(sessionRecord: OrvantaSessionRecord)` / `openTaskInTab`:
  - Tạo tab mới với toàn bộ `agentTasks = sessionRecord.agentTasks`.
  - Thiết lập `activeAgentId` là Agent lead hoặc Agent tương tác cuối cùng.
  - Gọi nạp transcript của Agent đó.
- [x] **2.5.** Cập nhật unit tests cho `useChatTabs.test.ts`.

### 📋 Phase 3: Tích Hợp Vào ConsoleView & App.tsx
- [x] **3.1.** Chỉnh sửa `ConsoleView.tsx`:
  - Khi người dùng click chọn Agent ở `TeamSidebar` (`onSelectAgent`): Gọi `switchAgentInActiveTab` để hoán chuyển ngữ cảnh transcript tương ứng với Agent đó trong phiên hiện tại.
  - Hiển thị thông báo trạng thái hoặc nhãn Agent rõ ràng trên thanh `agent-channel-header`.
- [x] **3.2.** Chỉnh sửa `App.tsx`:
  - Tự động bắt sự kiện `currentTaskItem` thay đổi từ backend để gọi `bindTaskToActiveAgent`, đảm bảo task mới sinh ra luôn được gán đúng vào Agent đang chọn của phiên.
- [x] **3.3.** Đảm bảo tính nhất quán của giao diện:
  - Khi chuyển qua lại giữa các Agent hoặc các Tab, không gây hiện tượng chớp nháy (flicker) hoặc mất dữ liệu đang nhập.

### 📋 Phase 4: Cập Nhật Khay Lịch Sử (History Drawer) & Persistence
- [x] **4.1.** Cập nhật `ConsoleHistoryDrawer.tsx`:
  - Hiển thị danh sách các phiên làm việc của CEO.
  - Thể hiện rõ danh sách các Agent tham gia trong từng phiên (kèm badge).
  - Khi click mở phiên: Gọi `openTaskInTab` để nạp toàn bộ các cuộc trò chuyện của các Agent trong phiên đó.
- [x] **4.2.** Cập nhật backend `SdkTaskHistory` (`apps/vscode/src/sdk/sdk-task-history.ts`):
  - Tự động đồng bộ các cuộc trò chuyện của từng Agent vào thư mục `.orvanta/history/`.

### 📋 Phase 5: Kiểm Thử Toàn Diện & Đóng Gói
- [x] **5.1.** Viết integration test:
  - Tạo 1 Tab mới -> Chat với `@coordinator` -> Chuyển sang `@implementer` chat tiếp -> Chuyển lại `@coordinator` kiểm tra transcript còn nguyên vẹn.
  - Mở lại phiên từ Lịch sử -> Bấm lần lượt các Agent kiểm tra xem lại đầy đủ lịch sử của từng Agent.
- [x] **5.2.** Chạy `bunx tsc -p apps/vscode/webview-ui/tsconfig.json --noEmit` đảm bảo 0 lỗi type.
- [x] **5.3.** Chạy toàn bộ test suites của webview (184 tests passed) và SDK (7 tests passed).
- [x] **5.4.** Build hoàn tất extension bundle và cập nhật tài liệu tổng thể `ORVANTA_OVERVIEW.md`.

---

## 6. KẾT LUẬN & BƯỚC TIẾP THEO

Kiến trúc này giải quyết trọn vẹn yêu cầu của CEO:
1. **Một Phiên làm việc (Session) duy nhất** bao trùm toàn bộ bài toán của CEO.
2. **Mỗi Agent có một luồng hội thoại 1:1 độc lập** với CEO được gắn chặt vào chính phiên đó.
3. **Lưu trữ chuẩn xác tại `.orvanta/history/`** và dễ dàng mở lại để xem hoặc chat tiếp với bất kỳ Agent nào.

