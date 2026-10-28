# Orvanta v0.0.4 — Đặc Tả Kiến Trúc Trung Tâm Tác Chiến Đa Tác Nhân (Multi-Agent Mission Console)
## Hợp Nhất Chat & War Room Theo Mô Hình Kênh (Channels), Định Danh Tác Nhân (Agent Attribution) & Thanh Điều Hướng Thu Gọn Linh Hoạt (Collapsible Sidebar)

---

## 1. Bối cảnh & Các Vấn Đề Lớn Cần Giải Quyết (Problem Statement)

Sau khi Orvanta v0.0.2 hoàn thiện sơ đồ cây tổ chức (`reportsTo`) và v0.0.3 xây dựng thành công bộ máy thực thi tự động (Hub-and-Spoke, Deliverable Artifacts, Maker-Checker Review), quá trình trải nghiệm thực tế bộc lộ 3 nhược điểm trải nghiệm (UX) và kiến trúc giao diện nghiêm trọng:

### 1.1. Vấn đề 1: Trải nghiệm "Vô danh" — Luôn hiện "Cline edit file" (The Attribution Deficit)
* **Thực trạng:** Khi nhiều Agent trong công ty cùng làm việc (ví dụ `@coordinator` phân rã việc, `@implementer` viết code, `@reviewer` kiểm tra), toàn bộ giao diện chat của Cline chỉ hiển thị một avatar robot chung chung mang tên "Cline".
* **Hậu quả:** 
  * Khi file bị sửa hoặc lệnh terminal được chạy, người dùng không thể biết **chính xác Agent nào đã thực hiện hành động đó** (là Coordinator hay Coder Dave?).
  * Mọi message, suy nghĩ (`reasoning`), tool call (`editedExistingFile`, `execute_command`) đều bị gộp chung vào một danh sách phẳng (`clineMessages`).
  * Trải nghiệm "Đội ngũ AI chuyên nghiệp" bị phá vỡ hoàn toàn, biến hệ thống thành một chatbot thông thường với những hành động ngẫu nhiên khó kiểm soát.

### 1.2. Vấn đề 2: Sự phân mảnh giữa Tab Chat và Tab War Room (The Fragmented Workspace)
* **Thực trạng:** Người dùng phải nhảy qua nhảy lại giữa hai màn hình tách biệt:
  * Tab **War Room**: Chỉ là các thẻ tĩnh tóm tắt tối đa 20 dòng log, không có khả năng tương tác, không xem được diff code chi tiết, không chat được.
  * Tab **Chat**: Là một luồng transcript dài dằng dặc, thiếu cái nhìn bao quát về tình trạng sức khỏe, token, chi phí và trạng thái chạy song song của các thành viên.
* **Hậu quả:** Người dùng mất thời gian chuyển tab liên tục; không có một "Trung tâm chỉ huy" (Command Center) duy nhất hội tụ cả khả năng **Giám sát trực quan (Monitoring)** lẫn **Chỉ đạo trực tiếp (Steering)**.

### 1.3. Vấn đề 3: Thanh điều hướng chiếm diện tích và không thể thu gọn (Rigid Sidebar)
* **Thực trạng:** Sidebar VS Code có chiều ngang tương đối hạn hẹp (thường từ 250px - 400px). Thanh `TeamSidebar` hiện tại cố định chiều rộng từ 140px đến 280px, chiếm tới 50% - 70% không gian hiển thị, làm phần xem code diff và chat bị bóp nghẹt.
* **Hậu quả:** Người dùng không thể thu gọn sidebar thành dạng icon tinh gọn (Mini-mode) khi cần tập trung xem code hoặc đọc báo cáo.

---

## 2. Tầm Nhìn & 4 Trụ Cột Nâng Cấp v0.0.4

Phiên bản **v0.0.4** giải quyết triệt để các vấn đề trên thông qua **4 trụ cột kiến trúc**:

1. **Hợp nhất Tab [Console] (Unified Mission Console):** Thay thế 2 tab `chat` và `war-room` trên `OrvantaShell` bằng một tab duy nhất: **`Console`**.
2. **Mô hình Kênh (Channels Architecture):** Tương tự Slack/Discord chuyên biệt cho Multi-Agent:
   * Kênh toàn đội `📢 #team-feed`: Giám sát toàn cảnh (War Room Grid live cards) + Activity Timeline toàn công ty.
   * Kênh riêng từng Agent `🤖 @agent-id`: Transcript làm việc độc lập của riêng Agent đó + các file diff do chính Agent đó sửa + ô chat chỉ đạo 1:1 trực tiếp (Direct Steer qua Mailbox).
3. **Định danh Tác nhân (Agent Attribution Engine):** Mọi khối nội dung trong giao diện (`DiffEditRow`, `CommandOutputRow`, `ThinkingRow`, `UserMessage`) đều được trang bị **`AgentBadge`** nhận diện tức thì (Màu sắc theo vai trò, Icon, Tên hiển thị).
4. **Sidebar Thu Gọn Linh Hoạt (Collapsible Sidebar):** Nút toggle thu gọn thanh kênh về dạng **Icon-only (48px)** để tiết kiệm diện tích tối đa trên VS Code sidebar, tự động bung tooltip khi hover.



---

## 3. Kiến Trúc Bố Cục Giao Diện (Layout & Wireframes)

### 3.1. Cấu trúc Top Bar của OrvantaShell
Thanh điều hướng cấp cao nhất rút gọn từ 5 tab xuống còn **4 tab chuẩn mực**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [ 🏠 Home ]   [ 👥 Agents ]   [ 📥 Inbox (3) ]   [ 💬 Console (War Room) ]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Home:** Tổng quan công ty, Tuyên ngôn Sứ mệnh (Purpose), 3 quyết định chờ mới nhất.
* **Agents:** Sơ đồ cây phân cấp tổ chức (`reportsTo`) & cấu hình 5 tab của từng nhân sự.
* **Inbox:** Hộp thư phê duyệt quyết định của CEO (Hire/Fire, Scope conflict, Purpose change).
* **Console:** Trung tâm tác chiến đa kênh (Channels + War Room + Per-Agent Chat).

---

### 3.2. Bố cục Tổng thể Tab Console (Chế độ Sidebar Mở rộng - Expanded Mode)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [ 🏠 Home ]   [ 👥 Agents ]   [ 📥 Inbox ]   [ 💬 Console ★ ]                  │
├─────────────────────────┬──────────────────────────────────────────────────────────────┤
│ ◀ [Thu gọn «]  KÊNH ĐỘI │ 📢 #team-feed (TOÀN ĐỘI)                                     │
├─────────────────────────┼──────────────────────────────────────────────────────────────┤
│ 📢 KÊNH CHUNG           │ ┌─ MINI WAR ROOM GRID ─────────────────────────────────────┐ │
│  # #team-feed           │ │ ┌─ Coordinator ┐ ┌─ Implementer ┐ ┌─ Reviewer ─────────┐ │ │
│                         │ │ │ ★ running    │ │ 💻 running   │ │ 🔍 idle            │ │ │
│ 🤖 NHÂN SỰ CHÍNH THỨC   │ │ │ Task: #042   │ │ Task: #042   │ │                    │ │ │
│  ★ @coordinator         │ │ └──────────────┘ └──────────────┘ └────────────────────┘ │ │
│  💻 @implementer    ●   │ └──────────────────────────────────────────────────────────┘ │
│  🔍 @reviewer           │                                                              │
│  📝 @copywriter         │ ┌─ GLOBAL ACTIVITY TIMELINE (Thời gian thực) ──────────────┐ │
│                         │ │ [14:20:05] ★ Coordinator đã chia việc: Task #042 -> @dev │ │
│ ⚡ KHÁCH TẠM THỜI       │ │ [14:20:30] 💻 Implementer bắt đầu sửa: src/auth.ts        │ │
│  👻 @scout-1            │ │ [14:21:10] 💻 Implementer nộp artifact: .orvanta/artif... │ │
│                         │ │ [14:21:15] 🔍 Reviewer bắt đầu chạy: `bun test`           │ │
│                         │ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────┴──────────────────────────────────────────────────────────────┘
```

---

### 3.3. Bố cục Kênh Riêng Từng Agent (Kèm Sidebar Thu Gọn - Collapsed Mini Mode)

Khi người dùng bấm nút **« Thu gọn**, sidebar chuyển sang dạng mini 48px. Khi bấm vào `@implementer`, màn hình chính hiển thị transcript và các file diff riêng biệt:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [ 🏠 Home ]   [ 👥 Agents ]   [ 📥 Inbox ]   [ 💬 Console ★ ]                  │
├──────┬─────────────────────────────────────────────────────────────────────────────────┤
│ [»]  │ 💻 Dave (Implementer) · running (2m15s) · Model: Claude 3.5 Sonnet              │
│      │ Nhiệm vụ: "Tích hợp API Login JWT & Viết Unit Test" (Task #042)                 │
│  #   ├─────────────────────────────────────────────────────────────────────────────────┤
│      │ 💭 [💻 Implementer · Dave] (Reasoning)                                          │
│  ★   │    "Cần kiểm tra schema user trong DB trước khi viết hàm xác thực..."           │
│      │                                                                                 │
│  💻● │ 📝 [💻 Implementer · Dave] ĐÃ SỬA FILE (Diff Editor)                            │
│      │    ┌──────────────────────────────────────────────────────────────────────────┐ │
│  🔍  │    │ src/auth/jwt.ts                                       (+24 dòng, -3 dòng)│ │
│      │    │ ------------------------------------------------------------------------ │ │
│  📝  │    │ - const token = createLegacyToken(user.id);                              │ │
│      │    │ + const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1d' }); │ │
│  👻  │    └──────────────────────────────────────────────────────────────────────────┘ │
│      │                                                                                 │
│      │ ⚡ [💻 Implementer · Dave] CHẠY LỆNH TEST                                       │
│      │    `bun test src/auth/jwt.test.ts` -> PASSED (5/5 tests)                        │
│      │                                                                                 │
│      │ 📦 [💻 Implementer · Dave] ĐÃ TẠO ARTIFACT                                      │
│      │    Bàn giao file: `.orvanta/artifacts/build/jwt-report.md`                      │
│      ├─────────────────────────────────────────────────────────────────────────────────┤
│      │ 💬 Chỉ đạo riêng cho Dave: "Nhớ thêm hàm verifyRefreshToken..."          [Gửi]  │
└──────┴─────────────────────────────────────────────────────────────────────────────────┘


---

## 4. Đặc Tả Chi Tiết Thanh Điều Hướng Thu Gọn (Collapsible Channel Sidebar)

Thanh Channel Sidebar được thiết kế lại toàn diện để đạt độ linh hoạt tối đa trên màn hình hẹp của VS Code:

### 4.1. Hai Chế độ Hiển thị (Display Modes)

| Tiêu chí | Chế độ Mở Rộng (Expanded Mode) | Chế độ Thu Gọn (Collapsed Mini Mode) |
|---|---|---|
| **Chiều rộng** | Resizable: 160px – 280px (mặc định 190px) | Cố định 48px |
| **Kênh `#team-feed`** | Icon `#` + Tiêu đề `team-feed` + Badge unread | Chỉ icon `#` viền bo tròn |
| **Danh sách Agent** | Icon Avatar + Tên hiển thị + Role badge + Status dot | Chỉ icon Avatar + Status dot nhỏ góc dưới |
| **Nhóm hiển thị** | Phân chia rõ ràng: KÊNH CHUNG / NHÂN SỰ / KHÁCH | Ngăn cách bằng 1 đường kẻ mờ 1px |
| **Tương tác hover** | Highlight hàng thông thường | Bung **Tooltip chi tiết dạng Popover** |
| **Chỉ báo đang chạy** | Viền phát sáng + Text "running (XXs)" | Status dot màu tím nhấp nháy (`animate-pulse`) |

### 4.2. Cơ chế Thu Gọn & Mở Rộng (Collapse / Expand Interaction)
1. **Nút Toggle chuyên dụng:** 
   * Đặt ở header đầu sidebar: Nút biểu tượng mũi tên kép `«` (Thu gọn) và `»` (Mở rộng).
   * Có tooltip: `Thu gọn thanh kênh (Ctrl+B)` hoặc `Mở rộng thanh kênh`.
2. **Kéo giãn mượt mà (Smooth Resizing & Animation):**
   * Sử dụng transition CSS `width 200ms cubic-bezier(0.4, 0, 0.2, 1)`.
   * Khi ở Expanded Mode: Kéo thanh biên phải (resizer border) để thay đổi chiều rộng tự do.
3. **Lưu trạng thái bền vững (Persistence):**
   * Lưu vào `localStorage` với 2 key:
     * `orvanta_sidebar_collapsed`: boolean (`true` / `false`).
     * `orvanta_sidebar_width`: number (clamped giữa 160 và 280).
   * Khi mở lại VS Code hoặc chuyển tab, trạng thái thu gọn/mở rộng được phục hồi nguyên vẹn.

### 4.3. Tooltip Thông Minh khi ở Chế độ Thu Gọn (Mini Mode Tooltip)
Khi người dùng rê chuột vào một icon Agent trong chế độ 48px, một thẻ Tooltip nổi (Flyout Card) xuất hiện lập tức:
```
┌──────────────────────────────────────────────────┐
│ 💻 Dave (Implementer)                     [Lead] │
│ Trạng thái: ● running (1m45s)                    │
│ Nhiệm vụ: Tích hợp API Login JWT & Test          │
│ Tiêu thụ: 12.4k tokens · Chi phí: $0.038        │
│ Click để mở kênh chat riêng                      │
└──────────────────────────────────────────────────┘
```

---

## 5. Cơ Chế Định Danh Tác Nhân (Agent Attribution Engine)

Để loại bỏ triệt để việc mọi thứ đều hiển thị "Cline" vô danh, Orvanta v0.0.4 thiết lập bộ máy định danh tác nhân trên toàn bộ các thành phần hiển thị:

### 5.1. Bảng Nhận Diện Thương Hiệu Theo Vai Trò (Role-based Visual Identity)

Mỗi Agent khi được hiển thị đều mang một bộ nhận diện hình ảnh nhất quán xuyên suốt:

| Vai trò (Role) | Ký hiệu / Icon | Màu chủ đạo | Viền thẻ khi Running | Ví dụ Agent mẫu |
|---|---|---|---|---|
| **Coordinator / Lead** | ⭐ `Star` | Vàng ánh kim (`#eab308`) / Violet | Viền Tím hoàng gia 1.5px | `@coordinator` |
| **Architect / System** | 📐 `Compass` | Xanh Indigo (`#6366f1`) | Viền Indigo 1.5px | `@architect` |
| **Implementer / Coder** | 💻 `Code2` | Xanh Cyan (`#06b6d4`) | Viền Cyan sáng 1.5px | `@implementer` |
| **Reviewer / Auditor** | 🔍 `ShieldCheck` | Hổ phách (`#f59e0b`) | Viền Hổ phách 1.5px | `@reviewer` |
| **Copywriter / Content** | 📝 `Feather` | Xanh Lục Emerald (`#10b981`) | Viền Emerald 1.5px | `@copywriter` |
| **Sales / Outreach** | 🎯 `Target` | Đỏ Hồng Rose (`#f43f5e`) | Viền Rose 1.5px | `@sales-rep` |
| **Guest / Ephemeral** | ⚡ `Zap` | Xám Khói (`#71717a`) | Viền Xám đứt đoạn 1px | `@scout-1` |

### 5.2. Chuẩn Hóa Khối Sửa File (DiffEditRow) Có Định Danh
* **Trước đây:** Chỉ hiện icon bút chì + tên file + Cline diff.
* **v0.0.4:** Header của khối diff được nâng cấp thành:
  ```tsx
  <div className="flex items-center justify-between px-3 py-1.5 bg-surface-secondary border-b border-border-panel">
    <div className="flex items-center gap-2">
      <AgentBadge agentId="implementer" displayName="Dave" role="implementer" />
      <span className="text-xs font-mono font-medium">src/auth/jwt.ts</span>
      <span className="text-[10px] text-emerald-400 font-mono">(+24)</span>
      <span className="text-[10px] text-rose-400 font-mono">(-3)</span>
    </div>
    <span className="text-[10px] text-muted-foreground">Task #042 · vừa xong</span>
  </div>
  ```

### 5.3. Chuẩn Hóa Khối Chạy Lệnh (CommandOutputRow) Có Định Danh
* Header dòng terminal hiển thị rõ:
  `[💻 Implementer · Dave] chạy lệnh: bun test src/auth/jwt.test.ts`
* Kết quả terminal hiển thị thụt lề chuẩn, có status badge `PASSED (0)` hoặc `FAILED (1)`.


---

## 6. Cơ Chế Hoạt Động Của Từng Kênh (Channels Execution Model)

### 6.1. Kênh Chung: `📢 #team-feed` (War Room + Global Activity)
Kênh chung là màn hình tổng hợp toàn bộ năng lực giám sát của công ty, bao gồm 3 khối:
1. **Khối 1: Mini War Room Grid (Lưới thẻ trạng thái):**
   * Lấy trực tiếp snapshot từ `globalWarRoomTracker`.
   * Hiển thị lưới card nhỏ gọn: Avatar, Tên, Trạng thái (đèn pulse khi running), Task title, Thời gian elapsed.
   * **Tương tác 1-Click:** Bấm vào bất kỳ card nào sẽ tự động chuyển kênh sang xem chi tiết Agent đó.
2. **Khối 2: Global Activity Timeline (Dòng thời gian sự kiện):**
   * Nối các sự kiện cấp cao của công ty theo trình tự thời gian:
     * `[Giao việc]`: ★ Coordinator đã giao Task #042 cho 💻 Implementer.
     * `[Bắt đầu]`: 💻 Implementer bắt đầu phiên chạy (Model: Claude 3.5 Sonnet).
     * `[Sửa file]`: 💻 Implementer đã sửa 2 file (`src/auth.ts`, `src/jwt.ts`).
     * `[Artifact]`: 💻 Implementer đã bàn giao file `.orvanta/artifacts/build/jwt-report.md`.
     * `[Review Pass]`: 🔍 Reviewer đã nghiệm thu ĐẠT biên bản review #042.
     * `[Decision]`: 📥 Coordinator gửi đề xuất tuyển dụng nhân sự mới vào CEO Inbox.
   * Dòng thời gian hoạt động chiếm trọn 100% chiều cao màn hình xuống tận đáy, tối ưu hóa không gian quan sát.

---

### 6.2. Kênh Riêng Từng Agent: `🤖 @agent-id` (Dedicated Agent Workspace)
Kênh riêng là không gian làm việc chuyên sâu 1:1 giữa CEO và Agent đó:
1. **Lọc Transcript Theo Từng Agent (Per-Agent Transcript Isolation):**
   * Chỉ hiển thị chuỗi tin nhắn, khối suy nghĩ, tool calls và kết quả của riêng `agentId` được chọn.
   * Không còn tình trạng một luồng chat chung bị spam bởi hàng chục tool call từ nhiều sub-agent khác nhau.
2. **Direct Steer 1:1 (Chỉ đạo trực tiếp qua Mailbox):**
   * Ô composer ở chân màn hình mang nhãn: `Chỉ đạo riêng cho @{displayName}...`
   * Khi CEO bấm gửi:
     * Nếu là `@coordinator`: Gửi vào session chính của Cline.
     * Nếu là Teammate (`@implementer`, `@reviewer`...): Gửi thông điệp vào Mailbox nội bộ của Agent đó thông qua tool `team_send_message`.
     * Agent sẽ nhận được chỉ đạo trong chu kỳ tiếp theo mà không làm gián đoạn Coordinator.
3. **Hiển thị Sản Phẩm Bàn Giao (Artifacts Showcase):**
   * Khi Agent tạo file trong `.orvanta/artifacts/`, kênh này hiển thị một khối Preview đẹp mắt:
     * Tên file artifact, kích thước, thời gian tạo.
     * Nút "Xem file trên Editor" hoặc "Mở bản xem trước Markdown".

---

## 7. Đặc Tả Hợp Đồng Dữ Liệu & Protobuf (Data Contracts)

### 7.1. Mở rộng `ClineMessage` trong Protobuf (`proto/cline/ui.proto`)
Để truyền tải thông tin tác giả từ Backend sang Webview mà không phá vỡ tính tương thích ngược:

```protobuf
message ClineMessage {
  int64 ts = 1;
  ClineMessageType type = 2;
  ClineAsk ask = 3;
  ClineSay say = 4;
  string text = 5;
  // ... các trường hiện có ...

  // MỞ RỘNG CHO ORVANTA v0.0.4:
  optional string agent_id = 30;           // ID của agent thực thi (vd: "implementer")
  optional string agent_display_name = 31; // Tên hiển thị (vd: "Dave")
  optional string agent_role = 32;         // Vai trò (vd: "implementer", "lead", "reviewer")
}
```

### 7.2. Định nghĩa Kênh trong Protobuf (`proto/cline/orvanta.proto`)

```protobuf
message OrvantaChannelItem {
  string id = 1;             // "team-feed" hoặc agentId (vd: "implementer")
  string name = 2;           // "#team-feed" hoặc "Dave"
  string role = 3;           // "channel" | "lead" | "implementer" | "reviewer"...
  string status = 4;         // "idle" | "running" | "failed" | "completed"
  bool is_channel = 5;       // true nếu là #team-feed
  bool is_ephemeral = 6;     // true nếu là agent tạm thời
  int32 unread_count = 7;    // số lượng sự kiện chưa đọc
  int64 running_elapsed = 8; // số giây đã chạy nếu running
  string current_task = 9;   // tiêu đề task đang thực hiện
}

message OrvantaConsoleStateSnapshot {
  string active_channel_id = 1;
  repeated OrvantaChannelItem channels = 2;
  bool is_sidebar_collapsed = 3;
}
```


---

## 8. Kế Hoạch Triển Khai Chi Tiết Cho AI (Actionable Implementation Checklist)

Dưới đây là checklist hành động chuẩn xác theo từng file để thực thi mã nguồn cho phiên bản v0.0.4:

### Giai Đoạn 1: Hợp Đồng Dữ Liệu & Protobuf (Data Contract)
- [x] **1.1. Cập nhật `proto/cline/ui.proto`:**
  - Thêm các trường `optional string agent_id = 30;`, `optional string agent_display_name = 31;`, `optional string agent_role = 32;` vào message `ClineMessage`.
- [x] **1.2. Cập nhật `proto/cline/orvanta.proto`:**
  - Thêm `OrvantaChannelItem` và `OrvantaConsoleStateSnapshot`.
  - Thêm RPC `subscribeConsoleState` (server streaming) và `sendAgentDirectMessage`.
- [x] **1.3. Biên dịch lại Protobuf:**
  - Chạy lệnh: `cd apps/vscode && bun run protos`.
  - Xác minh `src/generated/` và `src/shared/proto/` không có lỗi compile.

---

### Giai Đoạn 2: Backend Attribution & Phân Luồng Sự Kiện
- [x] **2.1. Cập nhật `apps/vscode/src/sdk/message-translator.ts`:**
  - Khi dịch sự kiện `AgentEvent` từ `AgentTeamsRuntime`, trích xuất `agentId` từ event metadata.
  - Gắn `agent_id`, `agent_display_name`, `agent_role` vào đối tượng `ClineMessage` trước khi gửi tới Webview.
- [x] **2.2. Nâng cấp `apps/vscode/src/orvanta/war-room-tracker.ts`:**
  - Mở rộng để lưu trữ lịch sử tin nhắn tóm tắt theo từng `agentId`.
  - Bổ sung phương thức `getAgentTranscript(agentId: string)`.
- [x] **2.3. Bổ sung Controller Handlers (`src/core/controller/orvanta/`):**
  - Tạo `subscribeConsoleState.ts`: Stream danh sách channels và trạng thái của toàn bộ Agent.
  - Tạo `sendAgentDirectMessage.ts`: Xử lý gửi tin nhắn trực tiếp tới Agent qua `team_send_message`.

---

### Giai Đoạn 3: Component Thanh Điều Hướng Thu Gọn (Collapsible Sidebar)
- [x] **3.1. Nâng cấp `apps/vscode/webview-ui/src/orvanta/TeamSidebar.tsx`:**
  - Bổ sung state `isCollapsed` (mặc định đọc từ `localStorage.getItem("orvanta_sidebar_collapsed")`).
  - Thêm nút toggle `«` / `»` trên thanh tiêu đề sidebar.
  - Khi `isCollapsed === true`: Render dạng thanh mini rộng 48px, chỉ hiển thị icon avatar tròn kèm đèn status dot.
  - Thêm Tooltip popover khi hover vào từng agent icon trong trạng thái thu gọn.
  - Hỗ trợ phím tắt `Ctrl + B` (hoặc `Cmd + B`) để đóng/mở nhanh sidebar.
- [x] **3.2. Viết Unit Test `TeamSidebar.test.tsx`:**
  - Test chuyển đổi giữa Expanded mode (190px) và Collapsed mode (48px).
  - Test lưu và phục hồi trạng thái từ `localStorage`.

---

### Giai Đoạn 4: Giao Diện Định Danh Tác Nhân (Agent Attribution UI)
- [x] **4.1. Tạo Component `AgentBadge.tsx` (`webview-ui/src/components/common/AgentBadge.tsx`):**
  - Hiển thị Icon, Tên, Màu sắc phân loại theo `role` (Lead, Implementer, Reviewer, Marketer, Ephemeral).
- [x] **4.2. Cập nhật `apps/vscode/webview-ui/src/components/chat/DiffEditRow.tsx`:**
  - Hiển thị `AgentBadge` trên thanh header của khối diff.
  - Hiển thị văn bản: `[💻 Implementer · Dave] đã sửa 14 dòng trong src/auth.ts`.
- [x] **4.3. Cập nhật `apps/vscode/webview-ui/src/components/chat/CommandOutputRow.tsx`:**
  - Gắn badge tên Agent đã thực thi lệnh terminal.
- [x] **4.4. Cập nhật `apps/vscode/webview-ui/src/components/chat/ThinkingRow.tsx`:**
  - Gắn badge tên Agent đang suy nghĩ / lập luận logic.

---

### Giai Đoạn 5: Tái Cấu Trúc Shell & Điều Hướng Kênh (Console Router)
- [x] **5.1. Cập nhật `OrvantaShell.tsx`:**
  - Rút gọn kiểu `OrvantaTab = "home" | "agents" | "inbox" | "console"`.
  - Hợp nhất tab `chat` và `war-room` thành tab `console` (nhãn hiển thị: `Console`).
- [x] **5.2. Tạo Component `TeamFeedView.tsx`:**
  - Hiển thị Mini War Room Grid (các thẻ card trạng thái running/idle).
  - Hiển thị Global Activity Timeline chiếm trọn 100% chiều cao màn hình xuống tận đáy (không dùng CEO broadcast).
- [x] **5.3. Tạo Component `ConsoleView.tsx`:**
  - Ghép `ConsoleChannelSidebar` (bên trái, collapsible) với màn hình chính (bên phải).
  - Nếu chọn `#team-feed` -> Hiển thị `TeamFeedView`.
  - Nếu chọn `@agent` -> Hiển thị `ChatView` được lọc riêng cho Agent đó, kèm thanh composer 1:1 Direct Steer.

---

### Giai Đoạn 6: Kiểm Thử Tự Động & Nghiệm Thu (Verification)
- [x] **6.1. Unit Tests Webview:**
  - Chạy `cd apps/vscode/webview-ui && bun test` đảm bảo 100% tests pass.
- [x] **6.2. Kiểm Thử Trải Nghiệm Thực Tế (Manual E2E):**
  - [x] Khởi chạy công ty, giao một nhiệm vụ code cho `@implementer`.
  - [x] Quan sát trên kênh `#team-feed`: Thấy card của Implementer chuyển sang tím nhấp nháy, timeline báo `Implementer bắt đầu sửa code`.
  - [x] Bấm vào thẻ Implementer: Tự động nhảy sang kênh `@implementer`.
  - [x] Kiểm tra thẻ sửa file: Thấy rõ badge `[💻 Implementer · Dave] đã sửa src/...`, hoàn toàn không còn chữ "Cline" chung chung.
  - [x] Bấm nút `« Thu gọn`: Sidebar thu gọn mượt mà về 48px, chỉ còn các avatar tròn với đèn pulse, không gian xem diff mở rộng tối đa.
  - [x] Nhập tin nhắn vào ô chỉ đạo 1:1: Tin nhắn gửi trực tiếp tới Implementer qua mailbox mà không làm ảnh hưởng Coordinator.

