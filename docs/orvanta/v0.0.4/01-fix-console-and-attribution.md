# TÀI LIỆU KỸ THUẬT: PHÂN TÍCH NGUYÊN NHÂN & HƯỚNG DẪN SỬA LỖI CONSOLE, ĐỊNH DANH AGENT VÀ TRẢI NGHIỆM ĐIỀU HÀNH
**Tài liệu tham chiếu phiên bản**: Orvanta v0.0.4  
**Ngày lập**: 28/10/2026  
**Trạng thái**: Kế hoạch sửa lỗi & Tối ưu hóa kiến trúc (Bugfix & UX Enhancement)

---

## MỤC LỤC
1. [Tổng Quan Các Vấn Đề Ghi Nhận](#1-tổng-quan-các-vấn-đề-ghi-nhận)
2. [Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis)](#2-phân-tích-nguyên-nhân-gốc-rễ-root-cause-analysis)
   - 2.1. Lỗi không xem được kênh chung & Lỗi xuất hiện 2 ô nhập text
   - 2.2. Lỗi bấm chọn Agent không chuyển đến đúng giao diện Agent đang làm
   - 2.3. Lỗi giật lag (stutter) khi kéo dãn thanh Sidebar
   - 2.4. Lỗi sót chữ "Cline" & Hiện tượng lặp tên trong khối suy nghĩ
   - 2.5. Hiện tượng Agent tự sửa `profile.md` & Thiếu card báo lỗi Purpose-Lock
   - 2.6. Vấn đề thẻ giao việc cộc lốc: `📋 Đã giao __nhiệm vụ__ → @agent`
3. [Giải Pháp & Hướng Dẫn Sửa Chi Tiết (Implementation Guide)](#3-giải-pháp--hướng-dẫn-sửa-chi-tiết-implementation-guide)
   - [Fix 1] Tái cấu trúc Shell & Console: Hợp nhất ChatView, xóa bỏ ô nhập thừa
   - [Fix 2] Phân luồng dữ liệu & Bộ lọc tin nhắn theo Agent (Agent Chat Filtering)
   - [Fix 3] Triệt tiêu 100% Lag khi kéo dãn Sidebar (Drag Resize Optimization)
   - [Fix 4] Xóa sạch tàn dư chữ "Cline" & Chuẩn hóa định danh AgentBadge
   - [Fix 5] Bổ sung Thẻ Cảnh Báo Vi Phạm Mục Tiêu (Purpose-Lock Denial Card)
   - [Fix 6] Nâng cấp Thẻ Giao Việc thông minh có Accordion xem chi tiết Task
4. [Bảng Phân Công & Danh Sách File Cần Chỉnh Sửa](#4-bảng-phân-công--danh-sách-file-cần-chỉnh-sửa)
5. [Quy Trình Kiểm Thử & Nghiệm Thu (Verification Checklist)](#5-quy-trình-kiểm-thử--nghiệm-thu-verification-checklist)

---

## 1. TỔNG QUAN CÁC VẤN ĐỀ GHI NHẬN

Trong quá trình vận hành thực tế Orvanta v0.0.4 với mô hình công ty AI đa tác nhân, hệ thống ghi nhận 5 lỗi kỹ thuật và 1 bất cập lớn về trải nghiệm người dùng (UX):

| STT | Vấn Đề / Hiện Tượng | Mức Độ | Vị Trí Ảnh Hưởng |
|---|---|---|---|
| **1** | **Không xem được kênh chung (`#team-feed`)** | Nghiêm trọng | `App.tsx`, `ConsoleView.tsx` |
| **2** | **Màn hình xuất hiện 2 ô nhập text đồng thời** | Nghiêm trọng | `App.tsx`, `ConsoleView.tsx`, `ChatView.tsx` |
| **3** | **Bấm chọn Agent không hiển thị luồng việc của Agent đó** | Nghiêm trọng | `ChatView.tsx`, `message-translator.ts`, `war-room-tracker.ts` |
| **4** | **Bị giật lag nặng khi kéo dãn biên thanh Sidebar** | Trung bình | `TeamSidebar.tsx` |
| **5** | **Vẫn hiện "Cline read", "Cline wants to edit", thiếu báo lỗi khi edit file** | Cao | `ChatRow.tsx`, `ToolGroupRenderer.tsx`, `DiffEditRow.tsx` |
| **6** | **Thẻ giao việc `📋 Đã giao __nhiệm vụ__ → @agent` khó hiểu, thiếu xem chi tiết** | UX / Giao diện | `ChatRow.tsx` (`team_run_task` handler) |

---

## 2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

### 2.1. Lỗi không xem được kênh chung & Lỗi xuất hiện 2 ô nhập text
* **Cơ chế lỗi layout song song**:
  Trong `apps/vscode/webview-ui/src/App.tsx`, cấu trúc DOM cấp cao nhất đang dựng dạng flex hàng ngang:
  ```tsx
  <div className="flex h-full w-full overflow-hidden">
    <OrvantaShell ...>
      {activeTab === "console" && (
        <ConsoleView activeChannelId={consoleChannelId} onSelectChannel={setConsoleChannelId} />
      )}
    </OrvantaShell>

    {/* ChatView bị tách rời, nằm BÊN NGOÀI OrvantaShell! */}
    <div
      className="flex-1 flex flex-col min-w-0"
      style={{
        display: activeTab === "console" && consoleChannelId !== "team-feed" ? "flex" : "none",
      }}>
      <ChatView ... />
    </div>
  </div>
  ```
* **Tại sao có 2 ô nhập text?**
  Khi người dùng chọn một Agent (ví dụ `@coder`), `consoleChannelId !== "team-feed"`:
  1. Cột bên trái (`ConsoleView`) render phần Header kênh và **tự render một ô `<textarea>` Direct Steer ở dưới đáy**.
  2. Cột bên phải (`ChatView`) được bật `display: flex`, bên trong lại có sẵn ô nhập chat mặc định của Cline (`AutoGrowingTextarea`).
  3. Kết quả: Màn hình bị chia làm 2 nửa kỳ lạ và có tới **2 ô nhập văn bản** khiến người điều hành không biết gõ vào đâu!
* **Tại sao không xem được kênh chung `#team-feed`?**
  Khi click vào `#team-feed`, state `consoleChannelId` trong `App.tsx` và state nội bộ của `ConsoleView` bị lệch nhịp (desynchronized) hoặc `OrvantaShell` bị chiếm toàn bộ bề ngang nhưng CSS flex-child của `TeamFeedView` không kích hoạt re-render đúng vùng scroll, khiến màn hình bị trống hoặc đơ.

### 2.2. Lỗi bấm chọn Agent không chuyển đến đúng giao diện Agent đang làm
* **Cơ chế luồng dữ liệu của Cline**:
  Cline ban đầu được thiết kế cho mô hình đơn tác nhân (Single-Agent). Toàn bộ tin nhắn trên màn hình được đọc từ mảng `messages: clineMessages` (chỉ ghi lại lượt chat giữa CEO và Coordinator).
* **Vấn đề khi có Agent Teams**:
  Khi Coordinator spawn `@coder` qua lệnh `team_run_task`, Agent `@coder` chạy trong một tiến trình con (sub-session) của `AgentTeamsRuntime`.
* **Nguyên nhân**:
  1. `ChatView.tsx` hiện tại **không có thuộc tính lọc theo `agentId`**. Bất kể đang chọn kênh `@coder` hay `@reviewer`, `ChatView` vẫn luôn hiển thị toàn bộ tin nhắn tổng của Coordinator.
  2. Các sự kiện streaming (suy nghĩ, đọc file, viết code) của `@coder` mặc dù đã được backend ghi nhận vào `war-room-tracker`, nhưng frontend chưa gom nhóm transcript theo từng kênh riêng của Agent.
  3. Khi bấm vào `@coder`, người dùng thấy giao diện vẫn là đoạn chat cũ của Coordinator, tạo cảm giác "bấm không có tác dụng".

### 2.3. Lỗi giật lag (stutter) khi kéo dãn thanh Sidebar
* **Nguyên nhân trong `TeamSidebar.tsx`**:
  Container của sidebar đang được gắn class transition CSS:
  ```tsx
  className={cn(
    "relative flex flex-col border-r border-editor-group-border bg-sidebar-background select-none shrink-0 transition-[width] duration-200 ease-in-out",
    className
  )}
  style={{ width: `${effectiveWidth}px` }}
  ```
* **Hiện tượng xung đột Frame Rate**:
  Khi người dùng click vào mép và kéo chuột (`mousemove`), sự kiện phát sinh liên tục 60–120 lần/giây, mỗi lần đều gọi `setWidth(newWidth)`.
  Tuy nhiên, CSS `transition-[width] duration-200` bắt trình duyệt phải chạy hiệu ứng chuyển động dài 200ms cho từng pixel thay đổi. 120 animation bị khởi tạo và hủy liên tục đè lên nhau, làm nghẽn Main Thread của trình duyệt và gây hiện tượng giật lag rất khó chịu!

---
### 2.4. Lỗi sót chữ "Cline" & Hiện tượng lặp tên trong khối suy nghĩ
Codebase vẫn còn nhiều vị trí hardcode cố định tên sản phẩm cũ:
1. **Lỗi `ToolGroupRenderer.tsx` (dòng 397)**:
   ```typescript
   return parts.length === 0 ? "Context" : "Cline" + action + parts.join(", ")
   ```
   $\rightarrow$ Sinh ra văn bản: `Cline read 3 files, performed 1 search:` thay vì định danh Agent.
2. **Lỗi `ChatRow.tsx` (dòng 416–417)**:
   ```typescript
   const editToolTitle = isApplyingPatch
       ? "Cline is creating patches to edit this file:"
       : "Cline wants to edit this file:"
   ```
   $\rightarrow$ Sinh ra tiêu đề: `Cline wants to edit this file:`.
3. **Lỗi `ChatRow.tsx` (dòng 717)**:
   ```tsx
   <span className="font-bold">Cline loaded the skill:</span>
   ```
4. **Lỗi lặp tên trong `ThinkingRow.tsx` (dòng 80–98)**:
   ```tsx
   {hasAgent && <AgentBadge agentId={agentId} displayName={agentDisplayName} role={agentRole} />}
   <span>
     {hasAgent ? `${agentDisplayName || agentId} (Suy nghĩ)` : title}
   </span>
   ```
   `AgentBadge` đã hiển thị `💻 Implementer · coder`. Thẻ `<span>` ngay phía sau lại in tiếp `coder (Suy nghĩ)` $\rightarrow$ Tạo ra chuỗi hiển thị thừa thãi: `💻 Implementer · coder coder (Suy nghĩ)`.

### 2.5. Hiện tượng Agent tự sửa `profile.md` & Thiếu card báo lỗi Purpose-Lock

Đây là hiện tượng logic rất quan trọng về hành vi của LLM trong môi trường tự quản:
1. **Nguyên nhân Agent cố sửa profile**:
   - Agent `@coder` được giao nhiệm vụ code, nhưng trong quá trình làm việc cần một công cụ (ví dụ `fetch_web` hoặc `search`) mà trong `.orvanta/org/agents/coder/profile.md` chưa được cấp phép.
   - Khi gọi công cụ đó, hệ thống phân quyền (Role Enforcement) chặn lại.
   - Mô hình LLM tự suy luận trong đầu:
     > *"The error indicates an attempt to use a disallowed tool... The access denial of the tool is confirmed by the role enforcement system. Reviewing the coder's profile, the denied tool isn't listed as allowed... Let's edit profile.md to add this tool!"*
   - LLM liền gọi tool `apply_diff` hoặc `write_to_file` để **tự sửa file cấu hình quyền của chính nó** (`.orvanta/org/agents/coder/profile.md`).
2. **Hệ thống Purpose-Lock đã bảo vệ thành công**:
   - Bộ lọc Purpose-Lock (Lớp 2) trong `purpose-lock.ts` phát hiện đường dẫn `org/agents/.../profile.md` và chặn đứng ngay lập tức:
     `{ allowed: false, code: "purpose_lock_denied", reason: "Sửa profile.md của chính mình hoặc agent khác bị cấm bởi Purpose-lock." }`.
   - **File thực tế KHÔNG HỀ BỊ SỬA.**
3. **Tại sao giao diện lại gây hiểu lầm và thiếu báo lỗi?**
   - **Giao diện nói dối**: Trong `DiffEditRow.tsx`, tiêu đề hiển thị:
     `💻 Implementer · coder đã sửa 179 dòng trong .orvanta/org/agents/coder/profile.md`.
     Từ **"đã sửa"** là sai hoàn toàn về mặt ngữ nghĩa! Lúc này Agent mới chỉ đang gửi bản diff đề xuất, công cụ chưa thực thi hoặc vừa bị chặn.
   - **Thiếu thẻ cảnh báo**: Khi công cụ bị Purpose-Lock từ chối, kết quả lỗi chỉ được trả kín về cho LLM đọc. Giao diện Webview **không hiển thị một Error Card màu đỏ nào** để cảnh báo cho CEO biết Agent vừa có hành vi cố tình vượt quyền và đã bị chặn. Người dùng chỉ thấy Agent "đã sửa" rồi ngồi suy nghĩ một tràng tiếng Anh khó hiểu!

### 2.6. Vấn đề thẻ giao việc cộc lốc: `📋 Đã giao __nhiệm vụ__ → @agent`
* Trong `ChatRow.tsx` (case `team_run_task`):
  ```typescript
  const taskName = parsed.task || parsed.taskId || tool.path || "nhiệm vụ"
  ```
  Khi payload của Coordinator chỉ có `instruction` hoặc `description` mà không có field `.task`, code bị fallback về chữ `"nhiệm vụ"`.
* Dòng hiển thị trở thành: `📋 Đã giao nhiệm vụ → @coder` $\rightarrow$ Vô nghĩa, không cung cấp thông tin gì về việc được giao.
* Đồng thời, toàn bộ phần nội dung quan trọng: Mục tiêu (Context), Yêu cầu chi tiết (Instructions), Tiêu chuẩn bàn giao (Definition of Done - DoD) và Danh sách file bàn giao (Deliverables) bị ẩn hoàn toàn, không có nút mũi tên để người điều hành mở ra kiểm tra.

---
## 3. GIẢI PHÁP & HƯỚNG DẪN SỬA CHI TIẾT (IMPLEMENTATION GUIDE)

### [Fix 1] Tái Cấu Trúc Shell & Console: Hợp Nhất ChatView, Xóa Bỏ Ô Nhập Thừa

#### Mục tiêu:
* Duy nhất **1 container điều phối** bên phải Sidebar.
* Khi ở `#team-feed`: Hiển thị `TeamFeedView`.
* Khi ở `@agent`: Hiển thị `ChatView` được cấu hình riêng cho Agent đó.
* **Chỉ có duy nhất 1 ô nhập text** ở chân màn hình.

#### Thực hiện:
1. **Chuyển `ChatView` vào bên trong `ConsoleView.tsx`**:
   Không để `ChatView` là anh-em nằm ngoài `OrvantaShell` trong `App.tsx`.
   Trong `ConsoleView.tsx`, cấu trúc hiển thị theo cơ chế giữ DOM không unmount (`display: none` / `display: flex`):
   ```tsx
   <div className="flex h-full w-full overflow-hidden">
     {/* Sidebar bên trái */}
     <TeamSidebar
       selectedChannelId={activeChannelId}
       onSelectChannel={onSelectChannel}
       isCollapsed={isSidebarCollapsed}
       onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
     />

     {/* Màn hình chính bên phải */}
     <div className="flex-1 flex flex-col min-w-0 h-full relative">
       {/* 1. Kênh chung #team-feed */}
       <div
         className="flex-1 h-full overflow-auto"
         style={{ display: activeChannelId === "team-feed" ? "flex" : "none" }}>
         <TeamFeedView onSelectAgent={(agentId) => onSelectChannel(agentId)} />
       </div>

       {/* 2. Kênh chuyên biệt @agent */}
       <div
         className="flex-1 flex flex-col h-full overflow-hidden"
         style={{ display: activeChannelId !== "team-feed" ? "flex" : "none" }}>
         {/* Sub-header kênh Agent */}
         <div className="h-10 px-3 border-b border-editor-group-border flex items-center justify-between bg-sidebar-background/50">
           <div className="flex items-center gap-2">
             <button
               onClick={() => onSelectChannel("team-feed")}
               className="text-xs text-description hover:text-foreground cursor-pointer">
               ← #team-feed
             </button>
             <span className="text-editor-group-border">/</span>
             <AgentBadge agentId={activeChannelId} size="sm" />
           </div>
         </div>

         {/* ChatView hiển thị tại đây - KHÔNG CÓ Ô TEXTAREA THỨ HAI */}
         <div className="flex-1 min-h-0">
           {/* ChatView component của Cline */}
         </div>
       </div>
     </div>
   </div>
   ```
2. **Loại bỏ ô textarea trùng lặp trong `ConsoleView.tsx`**:
   Xóa bỏ hoàn toàn khối `p-2 border-t ... <textarea placeholder="Chỉ đạo 1:1..." />` ở cuối `ConsoleView.tsx`. Sử dụng trực tiếp ô nhập chính của `ChatView`.
3. **Đổi Placeholder thông minh**:
   Khi `activeChannelId === "coordinator"`: Placeholder = `"Chỉ đạo Coordinator điều phối..."`.  
   Khi `activeChannelId === "coder"`: Placeholder = `"Chỉ đạo 1:1 tới Implementer (Dave)..."`.

### [Fix 2] Phân Luồng Dữ Liệu & Bộ Lọc Tin Nhắn Theo Agent

#### Mục tiêu:
Khi bấm chọn `@coder`, người dùng phải nhìn thấy đúng các công việc mà `@coder` đang làm (không bị lẫn với các agent khác).

#### Thực hiện:
1. Trong `ChatView.tsx`, nhận thêm prop `selectedAgentId?: string`.
2. Lọc danh sách tin nhắn `visibleMessages` trước khi render danh sách `ChatRow`:
   ```typescript
   const filteredMessages = useMemo(() => {
     if (!selectedAgentId || selectedAgentId === "team-feed") {
       return clineMessages; // Kênh tổng hiển thị tất cả
     }
     if (selectedAgentId === "coordinator" || selectedAgentId === "lead") {
       // Hiển thị tin nhắn của Coordinator và các lệnh điều phối
       return clineMessages.filter(m => !m.agentId || m.agentId === "coordinator" || m.say === "task");
     }
     // Kênh riêng của Agent con: Chỉ hiển thị tin nhắn được tạo bởi Agent này
     return clineMessages.filter(m => m.agentId === selectedAgentId);
   }, [clineMessages, selectedAgentId]);
   ```
3. Nếu Agent chưa có tin nhắn nào trong phiên: Hiển thị Empty State đẹp mắt:
   `[💻 Implementer · Dave đang sẵn sàng. Chưa có tác vụ nào được giao hoặc Agent đang ở trạng thái idle]`.

---
### [Fix 3] Triệt Tiêu 100% Lag Khi Kéo Dãn Sidebar

#### Mục tiêu:
Kéo chuột thay đổi kích thước Sidebar mượt mà ở tốc độ 60fps/120fps, không giật lag.

#### Thực hiện trong `TeamSidebar.tsx`:
1. **Tách biệt class animation**:
   Chỉ bật hiệu ứng `transition-[width] duration-200` khi người dùng bấm nút thu gọn `«` / `»`.  
   Khi đang thực hiện kéo thả chuột (`isResizing === true`), **BẮT BUỘC tắt hoàn toàn transition** bằng `transition-none`!
   ```tsx
   <div
     className={cn(
       "relative flex flex-col border-r border-editor-group-border bg-sidebar-background shrink-0 select-none",
       isResizing ? "transition-none pointer-events-none" : "transition-[width] duration-200 ease-in-out",
       className
     )}
     style={{ width: `${effectiveWidth}px` }}
   >
   ```
2. **Khóa chọn văn bản toàn trang trong lúc drag**:
   Trong hàm `handleMouseDown`:
   ```typescript
   document.body.style.userSelect = "none";
   document.body.style.cursor = "col-resize";
   ```
   Trong hàm `handleMouseUp`:
   ```typescript
   document.body.style.userSelect = "";
   document.body.style.cursor = "";
   ```

### [Fix 4] Xóa Sạch Tàn Dư Chữ "Cline" & Chuẩn Hóa Định Danh AgentBadge

#### 1. Cập nhật `ToolGroupRenderer.tsx`:
Tìm hàm định dạng dòng tóm tắt công cụ (dòng 397) và thay đổi:
```typescript
// Trước:
return parts.length === 0 ? "Context" : "Cline" + action + parts.join(", ")

// Sau:
const agentName = message?.agentDisplayName || message?.agent_display_name || "Tác nhân"
return parts.length === 0 ? "Context" : `${agentName}${action}${parts.join(", ")}`
```

#### 2. Cập nhật `ChatRow.tsx` cho thao tác sửa file:
Tìm đoạn gán `editToolTitle` (dòng 416):
```typescript
// Trước:
const editToolTitle = isApplyingPatch
    ? "Cline is creating patches to edit this file:"
    : "Cline wants to edit this file:"

// Sau:
const agentLabel = message?.agentDisplayName || message?.agent_display_name || "Tác nhân"
const editToolTitle = isApplyingPatch
    ? `${agentLabel} đang tạo bản vá để sửa file này:`
    : `${agentLabel} muốn sửa file này:`
```

#### 3. Cập nhật `ChatRow.tsx` cho thao tác tải kỹ năng (Skill):
Tìm dòng 717:
```tsx
// Trước:
<span className="font-bold">Cline loaded the skill:</span>

// Sau:
<span className="font-bold">{message?.agentDisplayName || "Hệ thống"} đã kích hoạt kỹ năng:</span>
```

#### 4. Khử lặp tên trong `ThinkingRow.tsx`:
Trong `ThinkingRow.tsx` (dòng 94–98):
```tsx
// Trước:
{hasAgent
  ? isStreaming
    ? `${agentDisplayName || agentId} đang suy nghĩ...`
    : `${agentDisplayName || agentId} (Suy nghĩ)`
  : title}

// Sau: Khi đã có AgentBadge bên cạnh, chỉ hiển thị trạng thái ngắn gọn
{hasAgent
  ? isStreaming
    ? "đang suy nghĩ..."
    : "(Suy nghĩ)"
  : title}
```
Kết quả hiển thị chuẩn: `[💻 Implementer · coder] đang suy nghĩ...` (không còn lặp `coder coder`).

### [Fix 5] Bổ Sung Thẻ Cảnh Báo Vi Phạm Mục Tiêu (Purpose-Lock Denial Card)

#### 1. Chỉnh sửa nhãn trạng thái trong `DiffEditRow.tsx`:
Không bao giờ dùng từ "đã sửa" khi file đang trong giai đoạn đề xuất hoặc chờ duyệt:
```tsx
<span className="font-medium truncate">
  {hasAgent
    ? isStreaming
      ? `đang đề xuất sửa ${totalChangedLines > 0 ? `${totalChangedLines} dòng trong ` : ""}${file.path}`
      : `yêu cầu sửa ${totalChangedLines > 0 ? `${totalChangedLines} dòng trong ` : ""}${file.path}`
    : file.path}
</span>
```

#### 2. Tạo Component Card cảnh báo đỏ khi bị Purpose-Lock chặn:
Khi backend trả về sự kiện `purpose_lock_denied` hoặc `error` do Purpose-Lock, `ChatRow.tsx` phải render một khối cảnh báo nổi bật:
```tsx
{isPurposeLockDenied && (
  <div className="rounded border border-red-500/40 bg-red-500/10 p-3 my-2 text-xs">
    <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
      <span className="text-base">🚫</span>
      <span>BẢO VỆ MỤC TIÊU: HÀNH VI BỊ CHẶN (PURPOSE-LOCK)</span>
    </div>
    <div className="text-foreground/90 pl-6 space-y-1">
      <p>
        Tác nhân <strong className="text-indigo-300">@{message.agentId}</strong> vừa cố gắng thực hiện hành vi trái thẩm quyền:
      </p>
      <div className="font-mono bg-black/30 p-1.5 rounded text-[11px] text-red-300 border border-red-500/20">
        {denialReason || "Sửa file cấu hình hệ thống / profile của chính mình bị cấm."}
      </div>
      <p className="text-description text-[11px] mt-1">
        ℹ️ Để bảo vệ điều lệ công ty, chỉ có CEO mới có quyền chỉnh sửa hồ sơ Agent hoặc điều lệ tại tab <strong>Agents / Settings</strong>.
      </p>
    </div>
  </div>
)}
```

---
### [Fix 6] Nâng Cấp Thẻ Giao Việc Thông Minh Có Accordion Xem Chi Tiết Task

#### Vấn đề hiện tại:
Thẻ hiển thị dòng chữ cụt lốc: `📋 Đã giao __nhiệm vụ__ → @coder`.

#### Thiết kế mới trong `ChatRow.tsx` (case `team_run_task`):
1. **Thuật toán trích xuất tiêu đề thông minh**:
   ```typescript
   let taskTitle = parsed.taskTitle || parsed.title || parsed.task
   if (!taskTitle && parsed.instruction) {
     // Lấy dòng đầu tiên của instruction làm tiêu đề
     const firstLine = parsed.instruction.trim().split("\n")[0].replace(/^[#\-* ]+/, "")
     taskTitle = firstLine.length > 60 ? firstLine.slice(0, 60) + "..." : firstLine
   }
   if (!taskTitle) {
     taskTitle = parsed.taskId ? `Nhiệm vụ #${parsed.taskId}` : "Thực thi công việc chuyên môn"
   }
   ```
2. **Bổ sung Accordion xem chi tiết**:
   Thêm nút mũi tên `▶` / `▼` cho phép người điều hành bấm vào để bung ra toàn bộ:
   - **Mục tiêu & Hướng dẫn (Instruction)**.
   - **Tiêu chuẩn nghiệm thu (Definition of Done - DoD)**.
   - **Sản phẩm bàn giao dự kiến (Deliverables)**.
3. **Mã nguồn JSX mẫu cho Thẻ Giao Việc Nâng Cấp**:
   ```tsx
   case "team_run_task": {
     let parsed: any = {}
     try {
       parsed = JSON.parse(tool.content || "{}")
     } catch {}

     const [isExpanded, setIsExpanded] = useState(false)
     const taskTitle = extractTaskTitle(parsed, tool)
     const agentName = parsed.agentId || parsed.assignee || "agent"

     return (
       <div className="rounded border border-indigo-500/30 bg-indigo-500/10 overflow-hidden my-2 text-xs">
         {/* Thanh tiêu đề có nút bấm bung mở */}
         <div
           className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-indigo-500/15 transition-colors select-none"
           onClick={() => setIsExpanded(prev => !prev)}>
           <div className="flex items-center gap-2 min-w-0 flex-1">
             <span className="text-indigo-400 font-bold">📋 GIAO VIỆC:</span>
             <span className="font-semibold text-foreground truncate">{taskTitle}</span>
             <span className="text-description">→</span>
             <AgentBadge agentId={agentName} size="sm" />
           </div>
           <div className="flex items-center gap-1.5 shrink-0">
             <button
               className="text-indigo-300 hover:text-white px-1.5 py-0.5 rounded text-[11px] bg-indigo-500/20 cursor-pointer"
               onClick={(e) => {
                 e.stopPropagation();
                 window.postMessage({ type: "orvanta_switch_channel", channelId: agentName }, "*");
               }}>
               Xem kênh Agent
             </button>
             <span className="text-indigo-400 font-mono text-[10px] w-4 text-center">
               {isExpanded ? "▼" : "▶"}
             </span>
           </div>
         </div>

         {/* Khối chi tiết nhiệm vụ (Accordion Panel) */}
         {isExpanded && (
           <div className="border-t border-indigo-500/20 p-3 bg-black/20 space-y-2 text-[12px] leading-relaxed">
             {parsed.taskId && (
               <div>
                 <span className="text-description font-mono">Mã nhiệm vụ:</span>{" "}
                 <span className="font-mono text-indigo-300">#{parsed.taskId}</span>
               </div>
             )}
             {parsed.instruction && (
               <div>
                 <div className="text-description font-semibold mb-1">Nội dung chỉ đạo:</div>
                 <div className="bg-code/60 p-2 rounded border border-editor-group-border whitespace-pre-wrap font-mono text-[11px]">
                   {parsed.instruction}
                 </div>
               </div>
             )}
             {parsed.dod && (
               <div>
                 <div className="text-description font-semibold mb-1">Tiêu chuẩn hoàn thành (DoD):</div>
                 <div className="text-foreground/90 pl-2 border-l-2 border-indigo-500/40">
                   {parsed.dod}
                 </div>
               </div>
             )}
           </div>
         )}
       </div>
     )
   }
   ```

---
## 4. BẢNG PHÂN CÔNG & DANH SÁCH FILE CẦN CHỈNH SỬA

| File Cần Chỉnh Sửa | Hạng Mục Chỉnh Sửa | Nội Dung Thay Đổi |
|---|---|---|
| `apps/vscode/webview-ui/src/App.tsx` | Fix 1 & 2 | Bỏ khối `ChatView` đặt độc lập bên ngoài. Nhúng toàn quyền điều phối vào `ConsoleView`. |
| `apps/vscode/webview-ui/src/orvanta/ConsoleView.tsx` | Fix 1 & 2 | Xóa ô `textarea` thứ hai. Nhúng `ChatView` với cơ chế giữ DOM và đồng bộ `selectedAgentId`. |
| `apps/vscode/webview-ui/src/orvanta/TeamSidebar.tsx` | Fix 3 | Bổ sung class `transition-none` khi `isResizing === true`, khóa chọn văn bản body. |
| `apps/vscode/webview-ui/src/components/chat/ChatView.tsx` | Fix 2 | Bổ sung bộ lọc tin nhắn `filteredMessages` theo `selectedAgentId`. |
| `apps/vscode/webview-ui/src/components/chat/ChatRow.tsx` | Fix 4, 5, 6 | Thay chữ "Cline", thêm Card cảnh báo Purpose-Lock Denied, Accordion xem chi tiết Task. |
| `apps/vscode/webview-ui/src/components/chat/ThinkingRow.tsx` | Fix 4 | Bỏ in trùng tên `coder coder (Suy nghĩ)` khi đã có `AgentBadge`. |
| `apps/vscode/webview-ui/src/components/chat/DiffEditRow.tsx` | Fix 4 & 5 | Đổi từ "đã sửa" thành "yêu cầu sửa / đang đề xuất sửa", căn chỉnh lề badge. |
| `apps/vscode/webview-ui/src/components/chat/chat-view/components/messages/ToolGroupRenderer.tsx` | Fix 4 | Đổi `"Cline read..."` thành `"[AgentDisplayName] đã đọc..."`. |

---

## 5. QUY TRÌNH KIỂM THỬ & NGHIỆM THU (VERIFICATION CHECKLIST)

Sau khi hoàn tất chỉnh sửa mã nguồn, tiến hành kiểm tra theo quy trình 6 bước sau:

- [ ] **Kiểm thử 1: Kiểm tra kênh chung `#team-feed`**:
  - Mở tab Console $\rightarrow$ mặc định hiển thị `#team-feed`.
  - Grid card toàn bộ Agent hiển thị đúng trạng thái.
  - Timeline hiển thị các sự kiện hoạt động chung của toàn công ty.
- [ ] **Kiểm thử 2: Kiểm tra duy nhất 1 ô nhập text**:
  - Click vào bất kỳ Agent nào (ví dụ `@coder`).
  - Xác nhận trên toàn bộ màn hình **chỉ xuất hiện duy nhất 1 ô nhập text** ở chân màn hình với placeholder: `Chỉ đạo 1:1 tới Implementer (Dave)...`.
- [ ] **Kiểm thử 3: Kiểm tra chuyển kênh Agent**:
  - Bấm chọn `@coder`: Toàn bộ tin nhắn, khối suy nghĩ và thao tác code của `@coder` xuất hiện đầy đủ, không bị lẫn các câu lệnh điều phối của Coordinator.
  - Bấm nút `← #team-feed`: Quay lại màn hình tổng một cách trơn tru, không bị giật hay mất dữ liệu.
- [ ] **Kiểm thử 4: Kiểm tra độ mượt kéo dãn Sidebar**:
  - Dùng chuột kéo thanh resizer qua lại với tốc độ nhanh.
  - Xác nhận không có hiện tượng giật cục (lag/stutter), độ trễ dưới 16ms (chuẩn 60fps).
- [ ] **Kiểm thử 5: Kiểm tra định danh & Báo lỗi Purpose-Lock**:
  - Kiểm tra các dòng đọc file: Không còn bất kỳ chữ "Cline read..." nào.
  - Khối suy nghĩ hiển thị đẹp mắt: `[💻 Implementer · coder] đang suy nghĩ...`.
  - Thử ra lệnh cho Agent sửa file `.orvanta/org/agents/coder/profile.md`:
    - Thao tác bị Purpose-Lock chặn ngay lập tức.
    - Xuất hiện **Card Cảnh Báo Vi Phạm Mục Tiêu màu đỏ** nêu rõ lý do bị chặn.
- [ ] **Kiểm thử 6: Kiểm tra Thẻ Giao Việc thông minh**:
  - Khi Coordinator giao việc qua `team_run_task`, thẻ hiển thị tiêu đề rõ ràng (ví dụ: `📋 GIAO VIỆC: Tích hợp API Login JWT → [💻 Implementer]`).
  - Bấm mũi tên `▶` mở ra xem được toàn bộ nội dung chỉ đạo, tiêu chí DoD và Deliverables bàn giao.





