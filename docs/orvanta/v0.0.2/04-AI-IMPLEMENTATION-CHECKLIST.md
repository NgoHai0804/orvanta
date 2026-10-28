# Checklist Triển Khai Chi Tiết Cho AI (AI Implementation Checklist) — Orvanta v0.0.2

Tài liệu này là nguồn chỉ dẫn hành động (Actionable Guide) chuẩn xác cho AI Agent hoặc kỹ sư phần mềm khi tiến hành viết code cho phiên bản v0.0.2. Hãy tích `[x]` vào từng mục sau khi đã hoàn thành và vượt qua toàn bộ các bài kiểm tra tương ứng.

---

## Giai Đoạn 1: Cập Nhật Hợp Đồng Dữ Liệu & Backend (Data Contract & Backend)

### 1.1. Cập nhật Protobuf (`proto/cline/orvanta.proto`)
- [x] Mở file `proto/cline/orvanta.proto`.
- [x] Thêm trường `optional string reports_to = 5;` vào message `OrvantaRosterAgent`.
- [x] Thêm các trường sau vào message `OrvantaAgentProfile`:
  - `optional string reports_to = 12;`
  - `optional string reasoning_effort = 13;`
  - `optional bool supports_images = 14;`
  - `optional int32 context_window = 15;`
  - `optional int32 max_output_tokens = 16;`
  - `repeated string rules = 17;`
  - `repeated string skills = 18;`
  - `optional string provider_id = 19;`
- [x] Chạy lệnh `bun run protos` từ thư mục gốc hoặc `apps/vscode` để sinh mã TypeScript:
  - Sinh types trong `apps/vscode/src/generated/`
  - Sinh client trong `apps/vscode/src/shared/proto/`
- [x] Kiểm tra kết quả biên dịch: Không có lỗi type do xung đột proto.

### 1.2. Mở rộng Zod Schema & Parser (`sdk/packages/shared/src/orvanta/agent-profile.ts`)
- [x] Thêm `ReasoningEffortSchema = z.enum(["none", "low", "medium", "high", "max"]).nullable().default(null)`.
- [x] Thêm các trường mới vào `AgentProfileFrontmatterSchema`:
  - `reportsTo: z.string().nullable().default(null)`
  - `providerId: z.string().nullable().default(null)`
  - `modelId: z.string().nullable().default(null)`
  - `reasoningEffort: ReasoningEffortSchema`
  - `supportsImages: z.boolean().nullable().default(null)`
  - `contextWindow: z.number().int().positive().nullable().default(null)`
  - `maxOutputTokens: z.number().int().positive().nullable().default(null)`
  - `rules: z.array(z.string()).default([])`
  - `skills: z.array(z.string()).default([])`
- [x] Cập nhật hàm `parseYamlFrontmatter` và `parseAgentProfile`:
  - Hỗ trợ phân tích cú pháp scalar và array cho `rules`, `skills`.
  - Đảm bảo các giá trị `null`, boolean và number được parse đúng kiểu.
- [x] Cập nhật hàm `serializeAgentProfile`:
  - Xuất các trường `reportsTo`, `reasoningEffort`, `supportsImages`, `contextWindow`, `maxOutputTokens`, `rules`, `skills` ra phần đầu YAML frontmatter.
- [x] Cập nhật file test `sdk/packages/shared/src/orvanta/agent-profile.test.ts`:
  - Thêm test case round-trip serialize & parse bảo toàn đầy đủ các trường mới.
  - Chạy `bun test sdk/packages/shared/src/orvanta/agent-profile.test.ts` và đảm bảo pass 100%.

### 1.3. Cập nhật Chuyển Đổi Proto & Workspace Store
- [x] Sửa file `apps/vscode/src/orvanta/agent-proto-conversions.ts`:
  - Map đầy đủ các trường mới giữa Proto và TypeScript Interface `AgentProfile`.
- [x] Sửa file `apps/vscode/src/orvanta/workspace-store.ts`:
  - Khi lưu profile xuống đĩa (`writeAgentProfile`), đảm bảo lưu đầy đủ các trường mới.
  - Khi cập nhật `roster.json`, lưu thêm trường `reportsTo` vào từng mục trong `agents`.
- [x] Chạy suite test backend Orvanta: `bun test apps/vscode/src/orvanta/` đảm bảo toàn bộ tests pass.


---

## Giai Đoạn 2: Tách Tab & Tái Cấu Trúc Shell (`OrvantaShell` & `HomeView`)

### 2.1. Cập nhật `OrvantaShell.tsx`
- [x] Cập nhật kiểu `OrvantaTab`:
  ```typescript
  export type OrvantaTab = "home" | "agents" | "inbox" | "chat" | "war-room"
  ```
- [x] Bổ sung tab `agents` vào mảng `tabs`:
  - `id: "agents"`
  - `label: "Agents"`
  - `enabled: isCompanyReady` (Chỉ mở khi công ty đã sẵn sàng)
  - `title: isCompanyReady ? "Sơ đồ tổ chức & quản lý Agents" : "Lập công ty để mở Agents"`
- [x] Cập nhật biến `isFullView`:
  ```typescript
  const isFullView = activeTab === "home" || activeTab === "agents" || activeTab === "inbox" || activeTab === "war-room"
  ```
- [x] Render component `<AgentsView />` khi `activeTab === "agents"`.

### 2.2. Thu gọn Roster khỏi `HomeView.tsx`
- [x] Tại `HomeView.tsx`, xóa bỏ khối code danh sách Roster phẳng cũ (`<section className="relative flex flex-col gap-2">` và modal `showTemplatePicker`).
- [x] Thay thế bằng widget tóm tắt **"Đội ngũ Agents"**:
  - Hiển thị tổng số agents, số lượng đang `running`, số lượng `idle`.
  - Nút bấm *"Xem sơ đồ cây & Quản lý Agents →"* điều hướng thẳng sang tab `agents` (`onTabChange("agents")`).
- [x] Cập nhật `HomeView.test.tsx` đảm bảo test pass sau khi thu gọn Roster.

---

## Giai Đoạn 3: Xây Dựng Sơ Đồ Cây Tương Tác (`AgentsView` & `AgentTreeChart`)

### 3.1. Thuật toán Cây & Chống Chu Trình (`apps/vscode/webview-ui/src/orvanta/tree-utils.ts`)
- [x] Tạo file mới `tree-utils.ts`.
- [x] Viết hàm `buildAgentTree(agents, profiles)`:
  - Trả về cấu trúc cây với Root là `coordinator`.
  - Fallback về root nếu `reportsTo` trỏ tới ID không tồn tại.
- [x] Viết hàm `willCauseCycle(agentId, proposedParentId, profiles)`:
  - Thuật toán DFS phát hiện chu trình, ngăn chặn việc tạo vòng lặp quan hệ.
- [x] Viết hàm `getAllowedManagers(agentId, agents, profiles)`:
  - Trả về danh sách các agent hợp lệ có thể làm cha của `agentId`.
- [x] Viết unit test riêng cho `tree-utils.test.ts` kiểm thử mọi trường hợp chu trình.

### 3.2. Component Sơ Đồ Cây (`AgentTreeChart.tsx`)
- [x] Tạo file mới `AgentTreeChart.tsx`.
- [x] Render các node theo phân cấp:
  - Node Root ở đỉnh (Coordinator với icon 👑).
  - Các nhánh con tỏa ra bên dưới kết nối bằng SVG Bezier lines hoặc Flexbox lines.
- [x] Styling chuẩn theo `01-SPEC-UI-UX-EFFECTS.md`:
  - Hover: đổi viền nhẹ, nâng nhẹ thẻ.
  - Active: viền phát sáng tím Indigo `ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20`.
  - Running indicator: đèn vàng nhấp nháy (`animate-pulse`).
- [x] Tương tác:
  - Click vào node bất kỳ gọi callback `onSelectAgent(agentId)`.
  - Nút `+ Thêm Agent` ở góc phải mở modal chọn template để thêm agent mới.

---

## Giai Đoạn 4: Tái Cấu Trúc Form Chi Tiết Agent 5 Tabs (`AgentEditor.tsx`)

### 4.1. Cấu trúc Tabs & State
- [x] Thêm state active sub-tab:
  ```typescript
  type EditorTab = "profile" | "model" | "tools" | "rules" | "skills"
  const [activeTab, setActiveTab] = useState<EditorTab>("profile")
  ```
- [x] Render thanh chuyển Tab ở đầu form chi tiết với icon và hiệu ứng active.

### 4.2. Tab 1: Profile (Thông Tin Chung)
- [x] Input `Id` (Disabled nếu là agent đã tạo hoặc là coordinator).
- [x] Input `Tên hiển thị` (Validation 1-48 ký tự).
- [x] Select `Vai trò` (`lead` hoặc `teammate`).
- [x] Select `Quản lý bởi (reportsTo)`:
  - Gọi `getAllowedManagers` để loại bỏ các node gây chu trình.
  - Hiển thị danh sách agent hợp lệ.
  - Nếu là `coordinator` -> disable field này.
- [x] Input `Mô tả` nhiệm vụ.
- [x] Hàng hành động nhanh: Nút "Chat", "War room", "Sa thải agent".

### 4.3. Tab 2: Model & Thông Số AI
- [x] **Combobox Model**:
  - Tích hợp hook `useProviderModels` lấy danh sách model theo provider.
  - Dropdown có thanh tìm kiếm, nhóm theo nhà cung cấp (Anthropic, OpenAI, OpenRouter...).
  - Badge thông số: Context window, Vision, Reasoning.
  - Gợi ý tự động (auto-populate) khi chọn model mới.
- [x] **Reasoning Effort Segmented Control**: 5 nút chọn `None | Low | Medium | High | Max`.
- [x] **Supports Images Toggle Switch**: Bật/tắt đọc ảnh với animation mượt mà.
- [x] **Context Window Size**: Input số kèm preset `64K`, `128K`, `200K`, `1M`.
- [x] **Max Output Tokens**: Input số tokens tối đa (default: 4096 / 8192 / 16384).
- [x] **Temperature Slider**: Slider từ `0.0` đến `2.0` kèm live bubble.
- [x] **Max Iterations**: Input số từ 1 đến 200 (default: 40).

### 4.4. Tab 3: Tools & Quyền Hạn
- [x] **Tools Cho Phép (allow)**: Multi-select chips kèm dropdown phân nhóm danh mục tool.
- [x] **Tools Bị Cấm (deny)**: Multi-select chips (tự động loại bỏ khỏi allow khi thêm vào deny).
- [x] **Scope Paths**:
  - `allow`: Chips danh sách pattern (default `**/*`).
  - `denyWrite`: Danh sách đường dẫn cấm ghi. 3 đường dẫn bắt buộc có icon khóa `🔒` và không thể xóa.

### 4.5. Tab 4: Instructions & Rules
- [x] Textarea soạn thảo Instructions Markdown (có tab xem trước Preview).
- [x] Checklist Rules: Quét các rules từ workspace (`.cline/rules/`, `.cursorrules`), cho phép bật/tắt gán cho agent.

### 4.6. Tab 5: Skills
- [x] Checklist Skills: Quét các skills từ `.agents/skills/` hoặc `.cline/skills/`.
- [x] Switch toggle kích hoạt từng skill cho agent.

### 4.7. Unsaved Changes Guard & Action Footer
- [x] Nút `Lưu`: Có spinner khi saving, hiển thị thông báo thành công.
- [x] Bắt sự kiện chuyển agent hoặc đổi tab khi `isDirty === true` -> hiển thị modal xác nhận bỏ thay đổi.

---

## Giai Đoạn 5: Kiểm Thử Tự Động & Nghiệm Thu (Testing & Acceptance)

- [x] **Unit Tests Tree Utils**:
  - Test dựng cây đúng khi `reportsTo` hợp lệ.
  - Test fallback về Coordinator khi `reportsTo` trỏ tới agent không tồn tại.
  - Test `willCauseCycle` phát hiện chính xác mọi chu trình đa tầng (A -> B -> C -> A).
- [x] **Unit Tests AgentEditor**:
  - Test render đủ 5 tabs.
  - Test Combobox model lọc đúng theo từ khóa tìm kiếm.
  - Test auto-populate thông số khi chọn model.
  - Test không cho phép xóa 3 đường dẫn mandatory denyWrite.
  - Test dirty state cảnh báo khi chuyển agent chưa lưu.
- [x] **Integration Tests**:
  - Test chuyển đổi mượt mà giữa Home, Agents, Inbox, Chat, War room trên `OrvantaShell`.
  - Test lưu agent cập nhật thành công cả file `profile.md` trên đĩa và hiển thị tức thì trên cây.
- [x] **Manual Verification**:
  - Mở workspace Orvanta trên VS Code extension.
  - Kiểm tra giao diện dark theme, màu sắc, font chữ, hover và animation sắc nét không lag giật.

