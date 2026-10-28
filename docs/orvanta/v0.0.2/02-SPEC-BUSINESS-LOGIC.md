# Spec Logic Nghiệp Vụ Chuẩn Xác — Orvanta v0.0.2

Tài liệu đặc tả toàn bộ thuật toán logic, quy tắc dữ liệu, vòng đời xử lý trạng thái và cơ chế đồng bộ cho hệ thống Quản lý Agents dạng cây.

---

## 1. Thuật Toán Dựng Cây & Quản Lý Phân Cấp (Tree Construction)

### 1.1. Cấu trúc Node Cây (TreeNode Data Structure)
```typescript
export interface AgentTreeNode {
  id: string
  displayName: string
  role: "lead" | "teammate"
  status: "idle" | "running" | "stopped" | "pending_hire" | "pending_fire"
  reportsTo: string | null
  profile?: OrvantaAgentProfile
  children: AgentTreeNode[]
  depth: number
}
```

### 1.2. Thuật toán Xây dựng Cây (Build Tree Algorithm)
Đầu vào: Danh sách phẳng `agents: OrvantaRosterAgent[]` và bảng hồ sơ `profiles: Record<string, OrvantaAgentProfile>`.
1. **Khởi tạo Map**: Tạo bản đồ `nodeMap: Map<string, AgentTreeNode>` cho từng agent trong roster. Gán `children = []`.
2. **Xác định Root Node**:
   - Agent có `role === "lead"` hoặc `id === "coordinator"` được chỉ định làm **Root Node**.
   - Bắt buộc `rootNode.reportsTo = null`.
3. **Liên kết Cha - Con (Parent-Child Linking)**:
   - Với mỗi agent không phải là root:
     - Đọc `parentId = profile.reportsTo`.
     - Nếu `parentId` tồn tại trong `nodeMap` và `parentId !== agent.id`:
       - Thêm node hiện tại vào `nodeMap.get(parentId).children`.
     - Ngược lại (nếu `reportsTo` bị rỗng, null, hoặc trỏ tới agent không tồn tại):
       - Tự động fallback: Gán node hiện tại vào `rootNode.children` (Coordinator trực tiếp quản lý).
4. **Sắp xếp thứ tự nhánh con**:
   - Nhánh con của mỗi node được sắp xếp: `running` trước, rồi đến `idle`, rồi đến `pending`, cuối cùng theo thứ tự bảng chữ cái của `displayName`.

---

## 2. Thuật Toán Phát Hiện & Ngăn Chặn Chu Trình (Cycle Detection)

Trong mô hình đa cấp, tuyệt đối không được phép xảy ra hiện tượng lặp vòng (ví dụ: A quản lý B, B quản lý C, C lại quản lý A).

### 2.1. Thuật toán DFS Kiểm Tra Chu Trình (DFS Cycle Check)
```typescript
export function willCauseCycle(
  agentId: string,
  proposedParentId: string | null,
  allProfiles: Record<string, { reportsTo?: string | null }>
): boolean {
  if (!proposedParentId) return false
  if (proposedParentId === agentId) return true

  let current: string | null | undefined = proposedParentId
  const visited = new Set<string>()

  while (current) {
    if (current === agentId) {
      return true // Phát hiện chu trình: proposedParentId là hậu duệ của agentId
    }
    if (visited.has(current)) {
      return true // Phát hiện vòng lặp nội bộ khác
    }
    visited.add(current)
    current = allProfiles[current]?.reportsTo
  }

  return false
}
```

### 2.2. Lọc Danh Sách Người Quản Lý Cho Phép (Allowed Managers Dropdown)
Khi mở dropdown "Quản lý bởi" trong form sửa agent `agentId`:
- Loại trừ chính `agentId`.
- Loại trừ toàn bộ các agent là **hậu duệ (descendants)** trực tiếp hoặc gián tiếp của `agentId`.
- Chỉ hiển thị danh sách các agent hợp lệ đảm bảo cấu trúc cây luôn là Directed Acyclic Tree.

### 2.3. Quy Tắc Fallback Khi Xóa / Sa Thải Node Cha
Khi một agent quản lý bị xóa hoặc sa thải:
- Toàn bộ các agent con trực tiếp của agent đó sẽ được tự động cập nhật `reportsTo = "coordinator"`.
- Đảm bảo không bao giờ có agent bị cô lập hoặc trở thành "mồ côi" ngoài cây.


---

## 3. Logic Lựa Chọn Agent & Quản Lý Dirty State

### 3.1. Selection State (`selectedAgentId`)
- Khi người dùng vào tab `Agents`, state `selectedAgentId` mặc định chọn `coordinator` (hoặc agent đầu tiên).
- Khi nhấp vào bất kỳ node nào trên cây: Cập nhật `selectedAgentId` để nạp dữ liệu vào panel chi tiết bên dưới.

### 3.2. Dirty State & Xác Nhận Bỏ Thay Đổi (Unsaved Changes Guard)
- Trạng thái `isDirty` được tính toán bằng cách so sánh sâu (`deepEqual`) giữa giá trị hiện tại của form và `initialProfile`.
- Nếu `isDirty === true` mà người dùng:
  - Bấm chọn một agent khác trên sơ đồ cây
  - Bấm chuyển sang tab khác trên thanh OrvantaShell (ví dụ sang Inbox hoặc Chat)
  - Bấm nút "Đóng / Hủy"
- **Xử lý**: Hiển thị modal xác nhận *"Bạn có thay đổi chưa lưu trên Agent này. Bạn có muốn bỏ thay đổi không?"* với 2 nút:
  - `Bỏ thay đổi`: Reset form về dữ liệu ban đầu và thực hiện thao tác chuyển.
  - `Tiếp tục chỉnh sửa`: Giữ nguyên ở agent hiện tại để lưu.

---

## 4. Logic Combobox Model & Tự Động Điền Thông Số (Auto-Populate Specs)

### 4.1. Tích hợp Provider Catalog RPC
- Sử dụng hook `useProviderModels(providerId)` gọi `ModelsServiceClient.resolveProviderModels`.
- Nhận về `models: Record<string, ModelInfo>` chứa siêu dữ liệu của từng model:
  - `contextWindow`: Kích thước context (ví dụ: `200000`)
  - `maxTokens`: Token output tối đa (ví dụ: `8192`)
  - `supportsImages`: Boolean hỗ trợ multimodal
  - `supportsReasoning`: Boolean hỗ trợ suy luận/thinking

### 4.2. Logic Tự Động Gợi Ý (Auto-populate Helper)
Khi người dùng chọn một Model mới từ combobox:
```typescript
function handleModelSelect(newModelId: string, modelInfo?: ModelInfo) {
  setModelId(newModelId)
  if (modelInfo) {
    if (contextWindow === undefined || contextWindow === null) {
      setContextWindow(modelInfo.contextWindow)
    }
    if (maxOutputTokens === undefined || maxOutputTokens === null) {
      setMaxOutputTokens(modelInfo.maxTokens)
    }
    if (supportsImages === undefined || supportsImages === null) {
      setSupportsImages(Boolean(modelInfo.supportsImages))
    }
    if (modelInfo.supportsReasoning && reasoningEffort === "none") {
      setReasoningEffort("medium")
    }
  }
}
```

---

## 5. Logic Tools Precedence & Scope Path Protection

### 5.1. Quy tắc Tool Deny Luôn Thắng Tool Allow
- Nếu một tool vừa xuất hiện trong `allow` vừa xuất hiện trong `deny`, hệ thống Purpose-Lock và Agent runtime **bắt buộc coi tool đó là bị cấm**.
- Trong giao diện, khi người dùng thêm một tool vào danh sách `deny`, tool đó sẽ tự động bị loại bỏ khỏi danh sách `allow` để tránh mâu thuẫn.

### 5.2. Bảo Vệ Tuyệt Đối Đường Dẫn Cốt Lõi (Mandatory DenyWrite)
- Ba đường dẫn bảo vệ tối thượng không thể gỡ bỏ:
  1. `.orvanta/purpose.md`
  2. `.orvanta/company.json`
  3. `.orvanta/org/roster.json`
- Khi lưu hồ sơ agent, hàm `ensureMandatoryDenyWrite` luôn tự động chèn 3 đường dẫn này vào đầu mảng `denyWrite`.
- Trong UI, 3 đường dẫn này được hiển thị dưới dạng chip có biểu tượng khóa `🔒` và không có nút xóa `×`.

---

## 6. Logic Quyết Định Runtime & Đồng Bộ Khi Team Đang Chạy

### 6.1. Kiểm Tra Trạng Thái Hoạt Động (Live Activity Check)
```typescript
const isLive = isTeamSessionActive || Boolean(company.agents?.some(a => a.status === "running"))
```

### 6.2. Phân Nhánh Lưu Dữ Liệu
1. **Khi KHÔNG có session đang chạy (`isLive === false`)**:
   - Thao tác lưu agent: Ghi trực tiếp vào file `.orvanta/org/agents/<agentId>/profile.md` và cập nhật `.orvanta/org/roster.json` thông qua `OrvantaServiceClient.upsertAgentProfile`.
   - Cập nhật state nội bộ và refresh cây ngay lập tức.
2. **Khi CÓ session đang chạy (`isLive === true`)**:
   - Thao tác tạo agent mới: Gửi đề xuất `hire_agent` vào Inbox của CEO thông qua `onRequestDecision`. Trạng thái agent là `pending_hire`.
   - Thao tác sa thải agent: Gửi đề xuất `fire_agent` vào Inbox. Trạng thái agent là `pending_fire`.
   - Coordinator không bị shutdown hay ảnh hưởng cho đến khi CEO phê duyệt trên Inbox.
