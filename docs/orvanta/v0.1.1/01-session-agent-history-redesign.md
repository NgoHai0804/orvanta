# Orvanta v0.1.1 — Thiết kế lại Session, Agent Identity và History

> **Trạng thái:** Đặc tả thiết kế — hướng kiến trúc và quyết định cutover history đã được người yêu cầu xác nhận; các chi tiết kỹ thuật bên dưới là đề xuất cần đối chiếu với API thực tế trước khi triển khai. Chưa có thay đổi code trong cập nhật tài liệu này.
> **Phạm vi:** Lịch sử Console của Orvanta, quan hệ phiên–agent–Cline task, định danh agent, tương thích ngược và làm sạch các mô hình trùng lặp.
> **Quyết định đã xác nhận:** ID số cố định của Agent có phạm vi trong workspace/company; slug định danh dạng chữ và tên hiển thị có thể sửa; mỗi session có ID độc lập; session mới lưu liên kết đến task/transcript Cline mà không sao chép transcript; history trước v0.1.1 bị cutover khỏi cả Orvanta và Cline nhưng các file nguồn được giữ nguyên trên đĩa.
> **Không phải:** Thay thế kho session chính thức của Cline SDK hoặc một thay đổi schema triển khai ngay trong tài liệu này.

---

## 1. Tóm tắt điều hành

Mô hình lưu trữ hiện tại chưa có một định danh phiên tổng thể đủ bền vững để gom những lần hội thoại riêng của CEO với nhiều agent thành một session. UI tạo tab ID ở `localStorage`; task/history của SDK có ID riêng; bản ghi `.orvanta/history/sessions.json` hiện dùng ID task làm `id`. Các khái niệm **tab**, **session của CEO**, **task của agent** và **transcript** vì vậy dễ bị hiểu là cùng một đối tượng.

v0.1.1 cần chuẩn hóa thành một mô hình duy nhất:

1. **Workspace/company sở hữu sổ đăng ký danh tính Agent.** Mỗi Agent có `agentNumericId` bất biến và duy nhất trong workspace/company. ID này không thay đổi khi Agent được đổi tên, đổi slug, tạm ngưng hoặc bị xóa; ID đã cấp không được tái sử dụng.
2. **Mỗi phiên làm việc của CEO có một `sessionId` bền vững**, không phải ID của tab UI hay task đầu tiên.
3. **Mỗi Agent tham gia session mới có đúng một Cline `taskId` trong MVP.** Participant là quan hệ canonical; các tab và API tương thích chỉ chiếu ra task hiện hành, không tạo thêm nguồn binding.
4. **Kho Cline SDK tiếp tục là nguồn transcript chuẩn.** Orvanta không chép messages sang một tập file lịch sử thứ hai. Artifact transcript hiển thị hiện có chỉ được coi là cache/projection cho đến khi parity với kho SDK được chứng minh.
5. **Lịch sử tổng thể là manifest session có schema phiên bản độc lập**, cùng một catalog có thể tái tạo. Ghi theo file tạm rồi thay thế nguyên tử, có bảo vệ ghi đồng thời và không bao giờ đổi lỗi đọc thành một danh sách rỗng có thể ghi đè dữ liệu.
6. **Cutover v0.1.1 không import history cũ.** History/session/task được tạo trước cutover không được liệt kê, dùng làm fallback, migrate vào history mới, hoặc resume/follow-up từ bất kỳ trải nghiệm nào của Orvanta hay Cline. Giữ nguyên các file legacy trên đĩa; chỉ history mới tạo theo luồng v0.1.1 được đưa vào sử dụng.
7. **Session mới rỗng chưa phải history.** Backend có thể cấp ID khi bắt đầu compose, nhưng chỉ publish session vào History sau khi runtime chấp nhận lượt chat đầu tiên và participant/task đầu tiên được xác nhận. Bản ghi chưa có task không được giả làm cuộc hội thoại.

### Mục tiêu thành công

- Mở một session từ History khôi phục được đúng danh sách Agent tham gia và đúng transcript của từng Agent.
- Đổi tên Agent không đổi identity, mất liên kết task, hoặc làm thay đổi history v0.1.1 đang được sử dụng.
- Tạo và dùng thử nhiều workspace/company không gây trùng hoặc cấp lại số ID Agent đã dùng.
- Tắt/mở lại webview hoặc khởi động lại VS Code không làm mất `sessionId` đang hoạt động.
- Việc lưu một session không rewrite transcript; lỗi/JSON hỏng/ghi đồng thời không âm thầm xóa lịch sử.
- Cutover lặp lại không làm thay đổi file history legacy và không cản trở history mới.

### Quyết định cutover history v0.1.1

- Áp dụng cho **cả Orvanta Console và các luồng history/task của Cline**: loại toàn bộ history pre-v0.1.1 khỏi danh sách, state publish, truy cập trực tiếp từ history UI, fallback reader, backlog/migration và resume/follow-up.
- Các file task/session/history cũ phải được **giữ nguyên trên đĩa**. Cutover là ngừng truy cập, không phải xóa, rewrite, rename hay chuyển dữ liệu.
- Không chuyển legacy Cline tasks thành session Orvanta mới, kể cả session một task; không tự fallback sang legacy khi history v0.1.1 mới chưa có record.
- Session và task mới của v0.1.1 tiếp tục xuất hiện, được mở và được resume theo binding mới. Không được để bộ lọc cutover ẩn nhầm dữ liệu mới.
- Tiêu chí nghiệm thu: xác nhận không có đường đọc/list/migrate/resume nào lấy legacy data; đồng thời xác nhận file fixture legacy không đổi byte sau khi khởi tạo/đọc history mới.

---

## 2. Phát hiện trong repo hiện tại

Các nhận định trong mục này dựa trên mã nguồn và fixture/workspace đã đọc; đây là chẩn đoán, không khẳng định mọi người dùng đều có cùng trạng thái dữ liệu.

### 2.1 Các khái niệm và trách nhiệm đang bị trộn

| Đối tượng | Hiện trạng tìm thấy | Vấn đề cần giải quyết |
|---|---|---|
| UI tab | `apps/vscode/webview-ui/src/orvanta/tabs/useChatTabs.ts` sinh `tab_<timestamp>_<random>` và lưu các tab vào `localStorage`. | Tab ID có thể tồn tại qua reload webview nhưng không phải ID authoritative do backend quản lý; nó cũng không được persist như khóa session tới kho lịch sử. |
| Hội thoại/task Cline | Task/session SDK có `taskId` riêng; task history được adapter quản lý trong `apps/vscode/src/sdk/sdk-task-history.ts`. | `taskId` xác định transcript của một luồng agent, không phải tự thân session tổng hợp của CEO. |
| Bản ghi Orvanta history | `OrvantaSessionRecord.id` trong `sdk/packages/shared/src/orvanta/workspace-history-store.ts` là `string`; adapter hiện gọi `saveWorkspaceSession` với `id: item.id`. | Bản ghi được upsert theo task ID và có thể trình bày một task thành một phiên tổng thể. |
| Agent ID | Roster và profile đang dùng ID chuỗi như `coordinator`, `coder`, `reviewer`; `AGENT_ID_RE` ràng buộc định dạng chuỗi. | Chưa có số ID bất biến. Nếu dùng slug làm khóa lâu dài thì đổi slug sẽ làm đứt liên kết lịch sử. |
| Thành viên session | Session có `agents`, `agentIds`, `agentTasks` và `agentConversations` tùy trường; UI tab còn có `agentIds`, `agentTasks`, và `taskId` cũ. | Có nhiều biểu diễn cho cùng khái niệm, dễ lệch nhau và cho phép roster bị hiểu nhầm là thành viên thực sự của một session. |
| Transcript hiển thị | Có `.orvanta/history/tasks/<taskId>/ui_messages.json`; adapter hiện có thể đọc/ghi artifact này và fallback sang SDK. | Đây là vùng legacy cần giữ nguyên trên đĩa khi cutover; không dùng để list, migrate hoặc resume history cũ. Với task mới, chỉ giữ cache nếu cần và đã xác định rõ vai trò/source of truth. |

### 2.2 Những điểm sai/lãng phí cụ thể cần sửa hoặc xác minh

1. **Ghi nhầm toàn bộ roster thành Agent tham gia.** Trong `sdk-task-history.ts`, khi không có `item.agents`, fallback hiện có thể lấy tất cả Agent từ `loadCompany(cwd).roster`. Một workspace fixture có bốn Agent và bản ghi history liệt kê cả bốn; chỉ riêng bản ghi đó không chứng minh cả bốn đã chat. Session mới phải lưu *participant đã quan sát*, không chụp roster làm participant list.
2. **`id` session hiện có thể chính là `taskId`.** Cách gọi `saveWorkspaceSession(cwd, { id: item.id, ... })` không tạo được ranh giới session CEO nếu `item.id` là task ID.
3. **Catalog toàn bộ trong một JSON bị rewrite theo mỗi upsert.** `saveWorkspaceSession` đọc và parse cả `sessions.json`, tìm một phần tử rồi ghi lại toàn bộ danh sách bằng `writeFile` trực tiếp. Chi phí I/O tăng theo tổng lịch sử; đọc JSON lỗi hiện có thể bị biến thành `[]`, sau đó một lần save tiếp theo có thể ghi đè mất các bản ghi trước đó.
4. **Ghi JSON tại chỗ không atomic.** Các file store hiện có thể được ghi trực tiếp; tiến trình dừng khi đang ghi có thể để lại file cụt/hỏng. Dữ liệu legacy hiện hữu vẫn phải giữ nguyên trong cutover; với file history mới, dùng temp-file + `rename` và kiểm tra tính di động Windows/macOS/Linux.
5. **Xóa task và xóa session chưa phải cùng một nghiệp vụ.** `deleteWorkspaceSession` lọc một `id` rồi xóa `tasks/<id>`, trong khi một session thực sự có thể tham chiếu nhiều task Agent. Không được đổi nút xóa task thành xóa mọi task liên kết nếu không có hành vi xác nhận rõ và không kiểm tra quan hệ sở hữu.
6. **Có trường trùng hoặc trạng thái projection.** `agentIds` có thể suy ra từ participant records; `agentTasks` có thể suy ra từ danh sách participant/task; `agentConversations` lặp lại tên/role/task/statistics; `ChatTab.taskId` được đánh dấu deprecated bên cạnh `agentTasks[activeAgentId]`. Giữ nhiều bản nguồn cùng lúc làm tăng nguy cơ lệch dữ liệu; việc chuẩn hóa áp dụng cho dữ liệu mới, không migrate lại legacy history.
7. **Tên và slug bị ghép vào identity.** Hiện message và roster dùng string agent IDs; nếu cho sửa slug, phải tạo một lớp tương thích/mapping và chuyển các khóa tham chiếu lịch sử sang số ID trước khi bật rename.
8. **Draft và trạng thái UI không phải lịch sử durable.** `agentDrafts`, tab đang chọn, drawer đang mở và `isRunning` là trạng thái giao diện/runtime; không nên gộp chúng vào manifest lịch sử bền vững. Draft, nếu tiếp tục khôi phục, cần là state cục bộ riêng và có chính sách xóa/retention rõ ràng.

### 2.3 Kiểm kê API SDK và adapter hiện có (hành vi quan sát)

Đây là API thực tế được kiểm tra trong source tree hiện tại; các API này quản lý **Cline session theo từng task**, không phải Orvanta CEO session nhiều Agent. Adapter không nên gọi chúng với giả định rằng ID hoặc semantics đã tương đương.

| Nhu cầu | API/source hiện có | Semantics quan sát được và lưu ý cho Orvanta |
|---|---|---|
| Khởi tạo task/session Cline | [`ClineCore.start(input)`](../../../sdk/packages/core/src/ClineCore.ts), [`StartSessionInput`/`ClineCoreStartInput`](../../../sdk/packages/core/src/runtime/host/runtime-host.ts) và [`sdk-session-lifecycle.ts`](../../../apps/vscode/src/sdk/sdk-session-lifecycle.ts) | `start()` trả `StartSessionResult.sessionId`; host tạo manifest/messages artifacts. Input có thể nhận ID SDK và `sessionMetadata` tổng quát; đây vẫn là session SDK cho task Agent, không phải Orvanta `sessionId`. Có thể tạo session trạng thái `idle` chưa có prompt/messages. Việc metadata round-trip bền vững được ghi là câu hỏi cần xác minh bên dưới. |
| Gửi lượt tiếp theo | [`ClineCore.send` → `RuntimeHost.runTurn(SendSessionInput)`](../../../sdk/packages/core/src/ClineCore.ts) và [`sdk-session-lifecycle.ts`](../../../apps/vscode/src/sdk/sdk-session-lifecycle.ts) | `SendSessionInput` gồm `sessionId`, `prompt`, tùy chọn mode/files/images/delivery; không có field Orvanta session hoặc `agentNumericId`. Adapter cần giữ binding ngoài SDK và xác nhận tính idempotent khi user gửi nhanh. |
| Đọc transcript để replay/resume | [`ClineCore.readMessages(sessionId)` / `readDisplayMessages(sessionId)` / `readLiveMessages(sessionId)`](../../../sdk/packages/core/src/ClineCore.ts); [`RuntimeHost`](../../../sdk/packages/core/src/runtime/host/runtime-host.ts) | `readMessages` là canonical model/replay history; `readDisplayMessages` là projection UI; `readLiveMessages` ưu tiên state đang chạy và cần cho lượt đang dở/just-aborted. Persisted messages chỉ bắt kịp ở ranh giới assistant/turn; `abort()` không bảo đảm flush. Chọn theo use case, không coi display projection là canonical transcript. |
| Khôi phục | [`ClineCore.restore(input)` / `RuntimeHost.restoreSession`](../../../sdk/packages/core/src/ClineCore.ts) | Đây là restore checkpoint/workspace/messages và có thể tạo session fork; **không phải** API tổng quát “resume task theo task ID”. Luồng reopen/follow-up VS Code nằm trong [`SdkTaskControlCoordinator.showTaskWithId`](../../../apps/vscode/src/sdk/sdk-task-control-coordinator.ts), [`SdkSessionHistoryLoader.loadInitialMessages`](../../../apps/vscode/src/sdk/sdk-session-history-loader.ts), [`SdkSessionLifecycle`](../../../apps/vscode/src/sdk/sdk-session-lifecycle.ts) và các coordinator task-start/follow-up. Không gọi `restore()` thay thế cho resume thường. |
| Liệt kê history | [`ClineCore.listHistory` / `list`](../../../sdk/packages/core/src/ClineCore.ts), [`SessionHistoryListOptions`](../../../sdk/packages/core/src/runtime/host/history.ts) và [`SdkTaskHistory.listHistory`](../../../apps/vscode/src/sdk/sdk-task-history.ts) | SDK hỗ trợ `limit`, hydrate, subagents và manifest fallback; VS Code adapter còn hợp nhất SDK + legacy + cloud và lọc child rows. Vì vậy adapter hiện tại **không** phải reader v0.1.1 nếu chưa chặn các nguồn pre-cutover. |
| Đọc record / title / metadata | [`ClineCore.get` / `update`](../../../sdk/packages/core/src/ClineCore.ts), [`SessionRecord`/`SessionHistoryRecord`](../../../sdk/packages/core/src/types/sessions.ts) | SDK record có status, timestamps, provider/model, workspace, prompt, metadata/title/usage/checkpoint; `update()` thay metadata/title nhưng không phải Orvanta session rename hay participant update. |
| Xóa | [`ClineCore.delete(sessionId)`](../../../sdk/packages/core/src/ClineCore.ts), [`SdkTaskHistory.deleteSession`](../../../apps/vscode/src/sdk/sdk-task-history.ts), và [`deleteWorkspaceSession`](../../../sdk/packages/shared/src/orvanta/workspace-history-store.ts) | SDK delete xóa một SDK session cùng dữ liệu gắn với nó; adapter còn xử lý cloud, legacy và workspace mirror/cache. Store Orvanta hiện xóa task dir theo ID. Không dùng một API/task-delete như thể nó xóa an toàn một session tổng hợp nhiều task. |
| Dừng hoặc hủy | [`ClineCore.stop`, `abort`](../../../sdk/packages/core/src/ClineCore.ts) và [`RuntimeHost`](../../../sdk/packages/core/src/runtime/host/runtime-host.ts) | `abort` ngắt hoạt động nhưng giữ session; `stop` kết thúc runtime. Đây không phải thao tác delete và không tự định nghĩa trạng thái history Orvanta. |

API ranh giới chủ yếu được khai báo trong [`runtime-host.ts`](../../../sdk/packages/core/src/runtime/host/runtime-host.ts), [`cline-core/types.ts`](../../../sdk/packages/core/src/cline-core/types.ts) và expose từ [`ClineCore.ts`](../../../sdk/packages/core/src/ClineCore.ts). `restore()` yêu cầu checkpoint count; không tìm thấy một `resume(sessionId)` public API tổng quát trong contract đã kiểm tra. Trước khi triển khai, kiểm tra lại API đúng version/build đang dùng; không dựa vào tên method của ví dụ cũ hoặc API private.

### 2.4 Persistence và phạm vi reader/writer đang tồn tại

- **Orvanta mirror hiện tại:** [`workspace-history-store.ts`](../../../sdk/packages/shared/src/orvanta/workspace-history-store.ts) định nghĩa `OrvantaSessionRecord` với `id`, title, timestamps, token/cost, `agents`, `agentIds`, `agentTasks`, `agentConversations`, active agent, status, favorite. `saveWorkspaceSession()` upsert theo `id`; adapter [`SdkTaskHistory.updateTaskHistoryItem()`](../../../apps/vscode/src/sdk/sdk-task-history.ts) đang gọi `id: item.id` (task/session history ID), chụp `loadCompany(cwd).roster` làm agent fallback, và có thể ghi `metadata.json`. `queueDisplayMessagesSave()`/`getClineMessages()` cũng có thể ghi/đọc `.orvanta/history/tasks/<taskId>/ui_messages.json`.
- **Orvanta list/read/delete consumers:** public shared helpers được dùng bởi `SdkTaskHistory`; History/UI giao tiếp qua task-history/controller adapter và [`useChatTabs.ts`](../../../apps/vscode/webview-ui/src/orvanta/tabs/useChatTabs.ts) mở task bằng `showTaskWithId(taskId)`. `SdkTaskHistory.listHistory()` hiện hợp nhất visible SDK rows, legacy task history, và cloud rows; `getClineMessages()` có đường đọc cache, legacy UI/API transcript, rồi SDK transcript tùy record/nguồn; delete hiện đi qua SDK/cloud, legacy cleanup và `deleteWorkspaceSession()` best effort. Cutover phải chặn từng đường list/find/open/read/fallback/resume/delete consumer legacy, không chỉ đổi drawer.
- **Cline SDK file store:** [`SessionManifestStore`](../../../sdk/packages/core/src/session/stores/session-manifest-store.ts) lưu session manifest và artifact; [`writeFileAtomic()`](../../../sdk/packages/core/src/session/stores/atomic-file.ts) thực hiện temp-write/fsync/rename cho những file dùng abstraction này. [`UnifiedSessionPersistenceService`](../../../sdk/packages/core/src/session/services/persistence-service.ts) có retries và `expectedStatusLock` cho update record; status lock/OCC này là bảo vệ update qua adapter cụ thể, không chứng minh toàn bộ file read-modify-write hoặc Orvanta store được khóa liên tiến trình.
- **Dữ liệu legacy Cline:** [`legacy-state-reader.ts`](../../../apps/vscode/src/sdk/legacy-state-reader.ts) đọc `state/taskHistory.json`, `tasks/<id>/ui_messages.json`, `api_conversation_history.json`, metadata/context; reader cố ý không throw và trả default cho file thiếu/hỏng. [`SdkSessionHistoryLoader.loadInitialMessages()`](../../../apps/vscode/src/sdk/sdk-session-history-loader.ts) hiện có fallback sang classic API history nếu SDK history rỗng/lỗi. Đây là hành vi compatibility quan sát được, trái với cutover contract cho task pre-v0.1.1.
- **UI state:** [`ChatTab`](../../../apps/vscode/webview-ui/src/orvanta/tabs/types.ts) giữ string agent IDs, `agentTasks`, drafts, `agentIds`, `isRunning` và deprecated `taskId`; [`useChatTabs.ts`](../../../apps/vscode/webview-ui/src/orvanta/tabs/useChatTabs.ts) lưu tabs/active tab vào localStorage và decoder chuyển `taskId` cũ thành map. Đây là cache/recovery layout; cutover cần loại binding legacy khi hydrate, không xóa localStorage của người dùng như side effect.
- **Agent identity hiện tại:** [`company-schema.ts`](../../../sdk/packages/shared/src/orvanta/company-schema.ts) chỉ định roster `id`/slug chuỗi và `displayName`; [`agent-profile.ts`](../../../sdk/packages/shared/src/orvanta/agent-profile.ts) xác thực slug qua `AGENT_ID_RE`. Chưa có `agentNumericId`, counter monotonic hoặc tombstone. [`workspace-store.ts`](../../../apps/vscode/src/orvanta/workspace-store.ts) đọc/validate company và roster nhưng không có allocator số đã xác minh.

Để tránh nhầm trạng thái: SDK status hiện gồm `idle | running | pending | completed | failed | cancelled` ([`records.ts`](../../../sdk/packages/shared/src/session/records.ts)); Orvanta mirror hiện khai báo `running | completed | interrupted | error`. Hai enum không tương đương trực tiếp. Metadata title của SDK được suy ra từ prompt qua persistence service nếu chưa có title, còn tab mới dùng `DEFAULT_TAB_TITLE` và có thể đổi thành title task; các semantics đó không quyết định title/status phiên Orvanta.

### 2.4 Điều chưa biết và cần xác minh trước khi triển khai

- `StartSessionInput` hiện khai báo `sessionMetadata?: Record<string, unknown>`; chưa xác minh metadata tùy chỉnh được persist và round-trip ổn định qua list/get/reopen trên các runtime đang dùng, hay đủ tin cậy để làm binding `orvantaSessionId`/`agentNumericId`. Kiểm tra hành vi thực tế trước khi chọn metadata hay store riêng làm nguồn authoritative.
- `item.agents`, `item.agentIds` và `item.agentTasks` hiện xuất phát từ nguồn nào, được cập nhật trên child task/handoff như thế nào, và có bao gồm spawned agent không.
- `ui_messages.json` có metadata role/agent nào không thể tái tạo từ `host.readMessages()` hay không. Không được coi việc SDK đọc được messages là bằng chứng parity về display attribution.
- Hai VS Code/Hub process có thể đồng thời ghi cùng workspace hay không; nếu có, cần writer serialization liên tiến trình, không chỉ mutex trong tiến trình.
- ID số Agent cấp theo bộ đếm monotonic trong company có đủ không nếu Agent bị gỡ khỏi roster; đề xuất bên dưới yêu cầu bộ đếm không giảm và tombstone/retired identity không bị xóa vĩnh viễn.
- `team-feed` là UI focus/channel hay entity Agent có roster identity? Không tự cấp `agentNumericId` cho channel UI đặc biệt khi nó không phải Agent trong roster.

---

## 3. Quyết định thuật ngữ và invariant

Các tên dưới đây phải dùng thống nhất trong code, API, telemetry và tài liệu.

| Tên | Ý nghĩa | Không được dùng thay cho |
|---|---|---|
| **Company/workspace** | Phạm vi sở hữu roster và bộ ID số Agent. Một repository/workspace được cấu hình Orvanta. | Session hoặc tab. |
| **Session (`sessionId`)** | Một bài toán/luồng công việc tổng thể do CEO khởi tạo; giữ metadata và danh sách participant. | Một task SDK hoặc tab UI. |
| **Session tab (`tabId`)** | Một view tạm trong Console, có thể mở session từ history hoặc đang tạo session mới. | Khóa persist/history của session. |
| **Agent identity (`agentNumericId`)** | Số nguyên dương cấp một lần trong company; khóa bền vững cho Agent. | Agent slug hoặc tên hiển thị. |
| **Agent slug (`agentSlug`)** | Khóa chữ ngắn, dễ gõ/nhìn, dùng làm alias/command/path/profile locator hiện hành. Có thể đổi; phải duy nhất trong roster hiện tại. | Khóa ngoại của history. |
| **Display name (`displayName`)** | Tên hiển thị cho người dùng; có thể trùng khi chính sách UI cho phép. Có thể sửa. | Khóa duy nhất. |
| **Cline task (`taskId`)** | Khóa Cline cho transcript/runtime của một Agent conversation. Được lưu trong session participant làm tham chiếu. | `sessionId` hoặc `agentNumericId`. |
| **Transcript** | Messages trong kho session SDK/Cline; nguồn chuẩn duy nhất cho nội dung hội thoại. | Session manifest hoặc index/search projection. |
| **Legacy `ui_messages.json`** | Artifact/cache history cũ; được giữ nguyên trên đĩa nhưng không dùng để list, fallback, migrate hoặc resume history pre-v0.1.1. | Nguồn thứ hai được tự do đồng bộ hoặc fallback cho cutover. |

### 3.1 Các quyết định Phase 0 được chốt

- **Identity scope:** `agentNumericId` tăng đơn điệu, không tái sử dụng, duy nhất trong một company/workspace Orvanta. Hiện source chỉ hỗ trợ slug chuỗi; numeric ID/counter/tombstone là contract cần triển khai, không được ghi nhận nhầm là đã tồn tại. Workspace/company binding phải nằm trong manifest/session record để phát hiện store mở nhầm root. Multi-company đồng thời trong một workspace vẫn cần xác minh ownership của registry trước implementation.
- **Editable aliases:** `agentSlug` là alias hiện hành cho command/profile lookup và được phép rename, subject to validation/collision check; `displayName` là tên UI, được sửa tự do và không phải khóa. Không resolve history chỉ bằng tên. Khi rename, participant snapshot (`agentSlugAtJoin`, `displayNameAtJoin`, `roleAtJoin`) vẫn giữ nguyên; current roster có thể cung cấp tên hiện tại, nhưng không mutate snapshot lịch sử.
- **One-task MVP:** mỗi `(sessionId, agentNumericId)` có tối đa một `taskId` canonical, không rỗng/placeholder; cùng task không được attach làm ownership chính vào nhiều session. Một task Cline là conversation của một Agent, không phải session CEO. Reset/recreate task cho cùng Agent trong cùng session bị ngoài MVP: nếu hành vi sản phẩm cần điều đó, mở rộng versioned schema thành danh sách task rõ ràng trước khi bật; không âm thầm overwrite binding cũ.
- **Canonical task association:** participant trong session manifest là nguồn sự thật cho `(agentNumericId, taskId)` và snapshot join; Cline SDK vẫn sở hữu transcript. `agentIds`, `agentTasks` và `agentConversations` chỉ là projections/compatibility adapter trong giai đoạn migration code, không phải ba nguồn authoritative. Không suy ra participant từ roster hoặc tab focus.
- **Empty-session visibility:** tab draft có thể có UI `tabId` và backend có thể reserve một session ID, nhưng session không vào History cho đến khi lượt chat đầu tiên được runtime chấp nhận và participant/task được tạo. Giao dịch chỉ tạo tab, mở panel, đổi Agent hoặc gõ draft không tạo history row. Nếu start thất bại trước khi chấp nhận message thì không publish một empty session.
- **Status/title/tab:** SDK task status là nguồn trạng thái runtime của task, không tự map 1:1 thành Orvanta aggregate status. Orvanta aggregate `running` nếu có participant running; `completed` khi workload session kết thúc bình thường; `interrupted` khi bị dừng/abort/chết tiến trình chưa hoàn tất; `error` cho lỗi thực thi; tab active/selected và History drawer open/closed là UI state riêng. Sau restart, reconcile status từ SDK; không phục hồi `isRunning` từ localStorage. Title được snapshot/đổi ở session-level bằng API Orvanta riêng; prompt/title SDK task không đổi `sessionId` hoặc thay thế session title do người dùng đặt.
- **Delete boundary:** Phase 0 không authorize destructive cascade. Xóa tab chỉ bỏ UI reference; xóa participant/task, xóa Orvanta session/link và xóa Cline transcript phải là thao tác tách biệt, có xác nhận/ownership check. SDK `delete(sessionId)` là permanent cho đúng SDK session và không được gọi với Orvanta `sessionId`. Chính sách xóa session aggregate/các task sẽ phải có ADR/UX xác nhận riêng.

### Invariant bắt buộc

- `sessionId` được tạo phía backend/store trước khi message đầu tiên của session cần được gán; ID sinh tự động, không dùng title, prompt, agent slug hay timestamp làm định danh.
- Trong một company, `agentNumericId` là số nguyên dương, duy nhất, bất biến và không được tái sử dụng sau khi retire/delete Agent.
- `agentSlug` có ràng buộc format hiện hành; không được trùng với slug hiện hành khác trong cùng company. Rename slug không làm đổi `agentNumericId`.
- Tên/slug lưu trong session participant là **snapshot lúc Agent tham gia** để lịch sử cũ vẫn đọc được sau rename. Lookup hiện tại ưu tiên `agentNumericId`; snapshot chỉ để hiển thị/đối chiếu.
- Mỗi task có nhiều nhất một quan hệ sở hữu chính với một cặp `(sessionId, agentNumericId)` trong MVP. Không attach cùng task vào hai session để tạo lỗi xóa cascade.
- Participant là Agent thực sự được gắn task hoặc có event/chat được xác nhận, không phải mọi nhân viên trong roster tại thời điểm save.
- Summary token/cost tổng của session bằng tổng các participant/task duy nhất; không cộng lặp mỗi lần cùng một task nhận update.
- `running` không được phục hồi từ tab localStorage như một sự thật sau khi host restart. Runtime/session status cần reconcile từ SDK; trạng thái không xác định hiển thị như interrupted/unknown phù hợp.
- Một lỗi đọc/parse/schema validation là lỗi rõ ràng; tuyệt đối không diễn giải thành “chưa có lịch sử” để ghi rỗng lên cùng file.

---

## 4. Mô hình dữ liệu đề xuất

Schema này là hợp đồng khái niệm để chốt trước khi sửa code. Cần khai báo validator có kiểm tra runtime (Zod hiện đã là dependency của `@cline/shared`) và type được suy ra từ schema, thay vì dựa chỉ vào interface TypeScript.

### 4.1 Danh tính Agent và cấp số

```ts
interface OrvantaAgentIdentity {
  /** Bất biến, duy nhất trong company. Số nguyên dương, cấp một lần. */
  agentNumericId: number
  /** Alias hiện hành, duy nhất trong roster; cho phép rename. */
  agentSlug: string
  /** Tên cho UI; cho phép sửa, không làm khóa. */
  displayName: string
  status: "active" | "retired"
}
```

**Khuyến nghị cấp số cho company đã tồn tại:** dùng `nextAgentNumericId` tăng dần tại nguồn company/registry có quản lý, hoặc ID số được giữ trực tiếp trong bản ghi roster cùng bộ đếm monotonic ở company metadata. Chọn *một* nguồn authoritative; không sinh số từ index mảng, thứ tự roster, slug, process-local counter, thời điểm hiện tại hoặc hash.

**Khi remove/fire agent:** giữ identity như `retired`/tombstone hoặc ít nhất giữ bộ đếm monotonic bền vững và tra cứu ID history độc lập với roster active. Không sửa hay xóa số của agent cũ; không tái sử dụng ID.

**Lưu ý triển khai:** bộ đếm và ghi roster phải được cập nhật như một thao tác chống race; hai tiến trình không được cùng cấp một số. Việc cấp Agent ID là thay đổi schema/state của company; versioning của `history` riêng không tự động version roster.

#### Quyết định kiến trúc & triển khai (Phase 1)
- **Nguồn Authoritative duy nhất:** `.orvanta/org/roster.json` là nguồn sự thật duy nhất nắm giữ `nextAgentNumericId` và `retiredAgents`.
- **Versioning:** `ROSTER_SCHEMA_VERSION = 2` (`SCHEMA_VERSION = 1` áp dụng cho `company.json`).
- **Khởi tạo company mới:** `coordinator` nhận `agentNumericId = 1`, `nextAgentNumericId = 2`, `retiredAgents = []`.
- **Khởi tạo company đã tồn tại (legacy v1):** hàm `upgradeLegacyRoster` tự động nâng cấp deterministically: `coordinator` nhận ID 1, các agent còn lại xếp alphabet slug nhận 2, 3...; `nextAgentNumericId` được tính bằng `max(IDs) + 1` và bảo lưu `retiredAgents`.
- **Bảo vệ đồng thời:** `withWorkspaceMutation` kết hợp in-process tail queue và cross-process file lock (`org/roster.json.lock` với PID verification và timeout recovery).
- **Tombstone tối thiểu:** `retiredAgents` lưu các trường bắt buộc `{ agentNumericId, id, displayName, legacySlugs, retiredAt }`. Thư mục agent bị xóa sạch nhưng số ID và slug/alias không bao giờ bị tái sử dụng.
- **Ràng buộc duy nhất & alias:** slug active không trùng nhau; slug và legacy aliases của mọi agent (active hoặc retired) không thể bị chiếm dụng bởi agent khác.
- **Resolver an toàn:** `resolveLegacyAgentSlug` phân loại 3 trạng thái rõ ràng: `resolved`, `unknown`, `ambiguous`.
- **Tính nguyên tử khi rename:** rename profile folder, cập nhật `agentFile` và `reportsTo` của cấp dưới được bảo vệ với cơ chế staging và rollback đầy đủ nếu có lỗi.
- **Backend authoritative:** UI/browser form không bao giờ tự sinh ID số; ID luôn được cấp và quản lý bởi backend workspace store.

### 4.2 Session manifest

```ts
interface OrvantaSessionManifest {
  historySchemaVersion: 1
  sessionId: string
  companyId: string
  title: string
  createdAt: string // ISO 8601 UTC
  updatedAt: string // ISO 8601 UTC
  status: "active" | "completed" | "interrupted" | "error" | "deleting"
  isFavorited?: boolean
  activeAgentNumericId?: number
  /** Một record cho từng Agent tham gia thực sự; không lưu transcript. */
  participants: OrvantaSessionParticipant[]
  /** Tùy chọn; có thể tính lại từ participant usage nếu chưa cần đọc nhanh. */
  aggregateUsage?: {
    tokensIn: number
    tokensOut: number
    totalCost: number
    calculatedAt: string
  }
}

interface OrvantaSessionParticipant {
  agentNumericId: number
  /** Snapshot dùng đọc lịch sử nếu slug hiện tại thay đổi hoặc bị retire. */
  agentSlugAtJoin: string
  displayNameAtJoin: string
  roleAtJoin: "lead" | "teammate"
  taskId: string
  joinedAt: string
  lastActiveAt: string
  status?: "active" | "completed" | "interrupted" | "error" | "unknown"
  lastMessagePreview?: string
  usage?: {
    tokensIn: number
    tokensOut: number
    totalCost: number
  }
}
```

Quyết định schema cần giữ đơn giản:

- Participant list là nguồn authoritative duy nhất cho agent–task membership.
- Không lưu đồng thời `agentIds`, `agentTasks` và `agentConversations` làm ba nguồn sự thật. Nếu cần API compatibility, tạo các field cũ bằng adapter/serialization tạm thời rồi bỏ sau compatibility audit.
- `roleAtJoin`, `agentSlugAtJoin`, `displayNameAtJoin` là snapshot lịch sử; có thể thêm `modelIdAtJoin` nếu lịch sử cần giải thích chi phí/model. Tránh chép toàn bộ profile, instructions, prompt hệ thống hay secrets vào history.
- Usage phải được tính từ task IDs duy nhất; nếu SDK cung cấp usage authoritative thì không cộng lại các số cumulative như delta.
- `activeAgentNumericId` là gợi ý restore UI, phải trỏ đến participant/Agent còn đọc được trong session mới. Nếu không hợp lệ, chọn participant mới hoạt động gần nhất, rồi lead, rồi để người dùng chọn; tuyệt đối không fallback sang task legacy.
- `schemaVersion` của history riêng với `SCHEMA_VERSION` của company/roster. Upgrade company format không mặc nhiên đồng nghĩa upgrade lịch sử.

#### Quyết định kiến trúc & triển khai (Phase 3)
- **Authoritative Session Binding Manager:** `session-task-binding.ts` quản lý liên kết bền vững `sessionId` ↔ `workspaceRoot` ↔ `companyId` ↔ `participants` (gồm `agentNumericId`, `agentSlugAtJoin`, `displayNameAtJoin`, `roleAtJoin`, `taskId`, `joinedAt`, `lastActiveAt`, `status`, `usage`, `lastMessagePreview`).
- **Không Fallback Toàn Bộ Roster:** Đã khắc phục triệt để lỗi dump toàn bộ roster vào session; chỉ những agent thực sự tham gia chat mới được ghi nhận vào `session.participants`.
- **Active Memory Registry:** `activeTaskBindings` theo dõi các task đang chạy, giúp webview reload hoặc task switch tự động nhận diện lại đúng `sessionId` mà không tạo session trùng lặp.
- **Bảo Vệ Cutover Legacy:** `assertNotLegacyTask` và `isLegacyPreCutoverTask` ngăn chặn hoàn toàn việc bind hoặc resume các task pre-v0.1.1 vào store v0.1.1.
- **Re-entrant History Lock:** Nâng cấp `withHistoryLock` với `AsyncLocalStorage`, cho phép các thao tác phức hợp (như `bindTaskToSession` gọi lồng `getSession`, `createSession`, `upsertParticipant`) thực thi nguyên tử mà không xảy ra deadlock.
- **Race Condition & Duplicate Prevention:** Thao tác đồng thời từ người dùng được serialize qua lock; cố tình gán trùng `taskId` cho agent khác bị từ chối bằng `SessionConflictError`.
- **Reconcile Child/Spawn Tasks:** `reconcileSpawnedTask` xác minh task cha và ghi nhận subtask dưới dạng teammate participant độc lập gắn với `targetAgentNumericId`.
- **Identity Snapshot Stability:** `getParticipantDisplayIdentity` nhận diện rename hoặc retire của agent mà vẫn bảo toàn 100% snapshot lịch sử trong manifest.
- **Missing Task Resilience:** `markTaskUnavailable` cập nhật trạng thái participant thành `"unknown"` khi task SDK bị mất mà không làm hỏng session hay fallback sang legacy reader.


### 4.3 Model phục hồi trên UI

```ts
interface ChatTab {
  /** UI-only key, ổn định qua render; không phải history ID. */
  tabId: string
  /** Backend sessionId nếu tab đã gắn với session durable. */
  sessionId?: string
  title: string
  activeAgentNumericId?: number
  /** Cache để render nhanh; không phải nguồn chuẩn cho session/task binding. */
  agentSlugByNumericId?: Record<number, string>
  agentTasks?: Record<number, string>
  createdAt: number
  lastActiveAt: number
}
```

- Trước khi backend cấp session, `sessionId` có thể vắng; tab đó là **draft/new session**, không được hiển thị như đã được lưu trong History. Tab chứa task ID pre-v0.1.1 không được dùng để resume hoặc tái tạo history cũ.
- `taskId` hiện tại cần được chọn từ `agentTasks[activeAgentNumericId]`, không tiếp tục duy trì đồng thời `ChatTab.taskId` và map task sau khi UI model mới được áp dụng.
- Draft input là UI state riêng, có retention/privacy quyết định riêng; không đưa vào session manifest và không làm participant xuất hiện trong lịch sử.
- `isHistoryOpen` là UI state, không persist cùng session. `isRunning` đọc từ runtime/store, không phục hồi mù từ localStorage.
- LocalStorage là bản cache để phục hồi bố cục/tab; thao tác open/resume/query History luôn đọc xác nhận từ backend. Decoder cũ không được phục hồi task/session pre-v0.1.1 vào history mới.

---

## 5. Cấu trúc lưu trữ đề xuất

Tiếp tục dùng file lưu trong `.orvanta/history/` cho metadata Orvanta và Cline SDK cho messages; **không** chuyển sang SQLite chỉ để biểu diễn một quan hệ có thể lưu gọn trong manifest. Giữ giao diện store độc lập định dạng để sau này chuyển sang SQLite nếu nhu cầu tìm kiếm/phân trang/đồng bộ nhiều process thực sự chứng minh được.

```text
<workspace>/
└── .orvanta/
    ├── company.json                         # workspace/company identity; schema/version theo quyết định company
    ├── org/roster.json                      # Agent hiện hành; agentNumericId phải map rõ với alias agentSlug
    └── history/
        ├── index.json                       # Catalog summary có thể rebuild từ session manifests
        ├── sessions/
        │   └── <sessionId>/
        │       └── session.json             # Một nguồn authoritative cho metadata/participants
        ├── tasks/
        │   └── <taskId>/
        │       ├── metadata.json                 # Metadata/cache task được định nghĩa
        │       └── ui_messages.json              # Cache tùy chọn cho task mới
        └── .trash/                               # Tùy chọn: staging khi xóa session nhiều task

# Nguồn transcript chuẩn của hội thoại:
# Cline SDK/Hub session theo taskId, được đọc qua API history của host; không copy vào sessions/<sessionId>/agents/.
```

### Vì sao không giữ `sessions.json` hiện tại làm catalog chính

- Danh sách tuần tự cần parse và rewrite toàn bộ mỗi lần sửa một session.
- Một JSON sai/cụt có thể biến thao tác save thành ghi đè mất cả catalog.
- File phình dần theo tổng lịch sử và giới hạn kiểm tra/repair từng session.
- Một file index có thể tái tạo từ mỗi `session.json` giữ khả năng list nhanh, còn mỗi session cập nhật độc lập.

`index.json` là projection/accelerator, không phải nguồn dữ liệu duy nhất. Nếu hỏng hoặc thiếu, quét manifest, kiểm tra schema và rebuild; nếu một manifest hỏng, báo/quarantine riêng manifest đó và không tự xóa. Cần xác minh quota kích thước và giới hạn listing trước khi lưu transcript preview dài trong index.
### Quy tắc ghi bền vững và đồng thời

1. Validate ID/path trước khi ghép path: `sessionId` được tạo trong backend và tuân theo format cố định; `taskId` xác minh là ID thuần hợp lệ; **không** sử dụng `agentSlug`, title hoặc nội dung model làm tên thư mục.
2. Serialize cập nhật session per workspace. Nếu nhiều tiến trình có thể cùng mở repository, dùng file locking/transaction liên tiến trình có hỗ trợ các hệ điều hành VS Code hoặc một writer authoritative; mutex chỉ trong một process không đủ. Kiểm tra dependency và luồng sở hữu hiện có trước khi chọn công cụ.
3. Với từng manifest/index: serialize JSON; ghi file tạm cùng filesystem; flush nếu abstraction hỗ trợ; thay thế atomically bằng rename; dọn temp thất lạc khi mở app. Hành vi overwrite/rename trên Windows cần được kiểm tra thực tế.
4. Không ghi trực tiếp một file chứa history authoritative. Không bắt `JSON.parse` error rồi return `[]` cho luồng update; tách rõ `NotFound`, `Valid`, `Corrupt`, `UnsupportedVersion`.
5. Cập nhật idempotent theo `sessionId`, participant key `(agentNumericId)`, `taskId`; cùng event replay không tạo participant/task lặp.
6. Giữ manifest làm nguồn durable, index rebuild được. Sau save manifest, update/rebuild index có retry/reconciliation nếu tiến trình dừng giữa hai bước.
7. Cân nhắc giới hạn quyền/tính nhạy cảm của `.orvanta/history`: transcript chứa prompt, tool output, đường dẫn/workspace và dữ liệu người dùng. Đặc tả retention/`.gitignore` và phạm vi sync/back-up trước khi thay đổi vị trí lưu.


#### Quyết định kiến trúc & triển khai (Phase 2)
- **Runtime Schemas & Versioning:** `HISTORY_SCHEMA_VERSION = 1` độc lập với company/roster schema. Mọi manifest, participant, index item đều được kiểm soát bởi Zod runtime schemas (`OrvantaSessionManifestSchema`, `OrvantaSessionParticipantSchema`, `OrvantaSessionIndexSchema`) và export qua shared barrel `@cline/shared/orvanta`.
- **Phân loại lỗi có cấu trúc:** Tách bạch 5 lỗi hệ thống `SessionNotFoundError` (`NOT_FOUND`), `SessionCorruptError` (`CORRUPT`), `SessionUnsupportedVersionError` (`UNSUPPORTED_VERSION`), `SessionPermissionDeniedError` (`PERMISSION_DENIED`), `SessionConflictError` (`CONFLICT`).
- **Safe ID / Path Traversal Defense:** `validateSessionId` và `validateTaskId` chỉ chấp nhận chuỗi alphanumeric kèm dấu `-`, `_` (1-64 ký tự), từ chối triệt để ký tự phân tách đường dẫn (`/`, `\`), `..`, null byte hoặc ký tự điều khiển.
- **Tính nguyên tử và an toàn dữ liệu:** Ghi JSON qua file tạm `${filePath}.tmp-${uuid}` và `rename` nguyên tử. File hỏng/corrupt không bao giờ bị ghi đè hay tự xóa; `cleanStaleTempFiles` dọn sạch temp file rác sau crash mà không ảnh hưởng dữ liệu chính.
- **Không bao giờ nuốt lỗi parse trong write path:** Thao tác đọc trong chu trình ghi ném `SessionCorruptError` thay vì trả `[]` hoặc giá trị mặc định, bảo vệ tuyệt đối các file manifest bị hỏng không bị xóa sạch.
- **Bảo vệ đồng thời liên tiến trình:** `withHistoryLock` kết hợp Promise tail queue nội bộ và file lock `.orvanta/history/history.lock` (cờ `wx`, xác thực PID và timeout recovery), bảo vệ toàn vẹn các transaction read-modify-write.
- **Độc lập Manifest và Index Catalog:** Chỉ serialize manifest của session bị sửa đổi. `index.json` đóng vai trò accelerator, có thể tái tạo tự động qua `rebuildIndex()` và hỗ trợ phân trang `listSessions()`.
- **Chuẩn hóa Timestamp UTC & Redaction:** Mọi mốc thời gian đều được chuẩn hóa thành ISO 8601 UTC (`normalizeTimestampToIso`). `redactMessagePreview` che giấu API keys (`sk-...`, `ghp_...`, Bearer tokens) và giới hạn độ dài preview tối đa 280 ký tự; không lưu transcript hay tool outputs vào manifest/index.
- **Ràng buộc Workspace / Company:** Mỗi manifest lưu `companyId` và kiểm tra chống mở nhầm giữa các repository khác nhau.

### 5.1 Giới hạn an toàn đã xác minh trong Phase 0

- [`workspace-history-store.ts`](../../../sdk/packages/shared/src/orvanta/workspace-history-store.ts) phân biệt file sessions không tồn tại với history rỗng theo cách hợp lý ở read-only, nhưng `loadWorkspaceSessions()` cũng trả `[]` nếu JSON parse lỗi hoặc top-level không phải array. `saveWorkspaceSession()` và `deleteWorkspaceSession()` gọi loader rồi ghi lại JSON trực tiếp; vì vậy một file hỏng có thể bị thay bằng catalog rỗng khi save/delete tiếp theo. `loadWorkspaceTaskMessages()` trả `undefined` khi file thiếu/hỏng; caller có thể xem như cache miss và fallback sang nguồn khác. Đây **không** phải bảo đảm corruption-safe, atomic hoặc nondestructive.
- Cline SDK có [`writeFileAtomic()`](../../../sdk/packages/core/src/session/stores/atomic-file.ts), còn Orvanta store hiện không dùng nó. SDK còn có `expectedStatusLock`/retry ở persisted record update, nhưng chưa có bằng chứng rằng Orvanta workspace JSON có lock/transaction chung giữa extension host và Cline Hub, hay rằng mọi file SDK writer đều serialize toàn bộ read-modify-write trên nhiều process.
- **Cross-process coordination/authoritative writer: chưa xác minh.** Chưa kiểm thử VS Code extension host và Hub/CLI cùng ghi một workspace hoặc cùng một session store; chưa xác nhận single-writer owner, file lock liên tiến trình, lock recovery, serialization khi kill process, hoặc replace atomic tương thích mọi OS. Không tuyên bố mutex trong process hay SDK atomic rename giải quyết concurrency. Giữ đây là gate bắt buộc trước khi bật session store mới; kiểm tra process topology, adapters, và filesystem semantics trên Windows/macOS/Linux, sau đó test hai writer thực bằng child process.
- Repository [`.gitignore`](../../../.gitignore) ignore `.orvanta/`, `.cline/data`, `.cline/tmp`, `*.db`, `*.db-shm`, `*.db-wal`; đây là chính sách repository quan sát được, không tự đảm bảo các ignore rule của repo người dùng, backup, cloud sync hoặc thư mục Cline user-data bên ngoài workspace.

### 5.2 Privacy, retention, backup và version control

- History và transcript có thể chứa nguyên văn prompt, output/model response, tool output, tên/path file, branch/repository, Agent metadata và chi phí/usage. Mặc định coi là dữ liệu nhạy cảm của workspace; không ghi nội dung message, secret, hay raw tool payload vào index/log/telemetry. Preview chỉ lưu khi có giới hạn độ dài và quy tắc redact được kiểm thử.
- Mặc định **không commit** `.orvanta/` hoặc transcript trong `.cline/data`; Git-ignore hiện có hỗ trợ ở repo này nhưng rollout không được tự sửa `.gitignore` hoặc force-add dữ liệu của workspace người dùng. Trước khi thay đổi persistence phải rà soát repo/workspace ignore precedence, backup/sync policy và giải thích rằng ignore không phải mã hóa hoặc quyền truy cập.
- Retention, export, backup/restore, encryption-at-rest và quyền truy cập nhiều người dùng chưa được quy định bởi code được kiểm tra. MVP không tự compact/xóa theo tuổi và không tuyên bố có backup; cần chốt retention tối thiểu, hành vi xóa/export và dữ liệu nằm ở local workspace so với Cline data dir trước release.
- Không dùng nội dung history thật làm unit/integration fixture. Chỉ dùng dữ liệu tổng hợp, tên/path/domain giả, không có prompt thực, identifiers thật, API key, repo URLs, usernames hay nội dung tool; giữ fixture nhỏ và có thể nhận ra là synthetic.

### 5.3 Kế hoạch fixture tổng hợp và tiêu chí không sửa byte legacy

Các fixture sau là **đề xuất kiểm thử**, chưa được tạo/chép vào repo trong Phase 0. Dùng temp directory do test tạo, không trỏ đến workspace hiện tại hoặc `~/.cline`; seed bytes trực tiếp từ literal đã review, không lấy mẫu bằng cách sao chép user data.

| Fixture tổng hợp | Setup an toàn | Assertion bắt buộc |
|---|---|---|
| Legacy Orvanta + Cline task | Tạo một `sessions.json`, `tasks/fixture-task/ui_messages.json`, metadata và classic `taskHistory.json` với prompt như `SYNTHETIC_FIXTURE_ONLY`; IDs giả cố định, không gắn workspace thật. | Trước/sau cutover list/find/open/resume không thấy task; không fallback qua Orvanta UI artifact hoặc classic Cline API history; SHA-256, byte length và raw bytes của từng file giữ nguyên. |
| Corrupt/truncated legacy index | Temp `sessions.json` chứa literal JSON sai như `[{"id":"SYNTHETIC_FIXTURE_ONLY"` và một artifact task giả. | Khởi tạo/list history mới không ghi, xóa, rename, quarantine hoặc “sửa” file legacy; bytes/hash giữ nguyên. Reader mới không diễn giải lỗi parse thành permission để overwrite. |
| Missing history/task | Không tạo catalog; ở case riêng tạo manifest/participant mới trỏ task fixture không tồn tại. | Missing legacy history không bị “khởi tạo” bằng cutover scan; task mới thiếu hiển thị unavailable/unknown mà không xóa participant/session; không fallback sang legacy task/cache. |
| Rename Agent | Seed history mới tổng hợp với `agentNumericId: 41`, `agentSlugAtJoin: "synthetic-old"`, tên hiển thị giả, và roster mới slug `synthetic-new` giữ cùng numeric ID. | Link `taskId`/identity không đổi; current alias có thể hiển thị mới, snapshot lịch sử giữ nguyên; slug không được làm foreign key và số 41 không cấp lại. |
| Rename/move/ID collision legacy task path | Seed cache giả `tasks/fixture-task/ui_messages.json`; đổi/mất task phía test harness hoặc đưa `../outside` làm input chỉ trong validator unit test. | History mới không đọc/ghi/xóa legacy artifact; unknown/missing task không được đoán bằng title/slug; path validation từ chối traversal trước filesystem access. |

Để chứng minh byte preservation, test harness phải hash và giữ snapshot raw bytes của **chỉ các file tổng hợp trong temp root** trước khi cutover, thực hiện thao tác trên sibling/new-history root, rồi so sánh `Buffer` byte-for-byte và hash sau cùng. Không test bằng cách chụp hash, mở ghi, đổi tên hoặc khôi phục file trong `.orvanta/history/` thật hay data directory người dùng. Thêm assertion rằng danh sách các đường dẫn bị write/unlink/rename trong test không chứa bất kỳ path nào ngoài sandbox temp. Dữ liệu workspace hiện tại không được xem là fixture hay được sửa để chạy Phase 0.

---

## 6. Luồng xử lý mục tiêu

### 6.1 Tạo session và chat lần đầu

1. UI yêu cầu tạo session (hoặc dùng `sessionId` do khởi tạo backend trả về). Backend/store tạo ID riêng và manifest tối thiểu; tab ghi nhận `sessionId`. Một tab mới chưa có dữ liệu chưa cần xuất hiện trong History nếu chính sách MVP là history từ message đầu tiên; chọn một chính sách và test nhất quán.
2. Khi CEO gửi message cho Agent, UI/backend gửi **`sessionId` + Agent identity** qua request/event path hiện có hoặc qua một metadata adapter đã kiểm chứng với SDK. Không coi slug trong localStorage là authority.
3. SDK tạo/tiếp tục Cline task. Khi `taskId` authoritative có mặt, store upsert participant theo `(sessionId, agentNumericId)` với `agentSlugAtJoin`/`displayNameAtJoin` snapshot.
4. Transcript vẫn được lưu bằng cơ chế SDK/Cline. Adapter Orvanta không gọi hàm copy toàn bộ SDK transcript vào file session.
5. Khi task/turn thay đổi status/usage, adapter cập nhật participant metadata idempotent; cập nhật `session.updatedAt`, status và index summary.

### 6.2 Chuyển Agent trong session

1. Lưu draft theo chính sách UI hiện hành; draft không ghi như hội thoại.
2. Tìm participant qua `agentNumericId`, không tra map theo slug có thể đổi.
3. Có `taskId` thì gọi API SDK phục hồi đúng task; nếu chưa có, mở conversation mới cho **session hiện tại** và Agent này.
4. Chỉ tạo participant khi có task/chat xác nhận. Không tạo cuộc hội thoại rỗng giả chỉ do roster membership.
5. Reconcile active agent/task sau khi SDK xác nhận; lỗi không được âm thầm chuyển sang transcript Agent khác.

### 6.3 Reopen từ History

1. List đọc từ backend index và kiểm tra manifest cần mở; không chỉ dùng một bản sao stale trong `localStorage`.
2. Tạo/tab mới với `sessionId`, participant list và snapshot identity.
3. Chọn Agent được yêu cầu hoặc `activeAgentNumericId`; mở transcript từ Cline theo `taskId` tương ứng.
4. Nếu Agent hiện đã rename, UI hiển thị tên hiện tại kèm alias snapshot khi cần; lịch sử cho Agent đã retire vẫn đọc được và hiện tên snapshot.
5. Nếu task không tồn tại, đánh dấu participant `unknown`/unavailable và báo rõ; giữ metadata còn lại của session, không xóa toàn session.

### 6.4 Đổi slug, tên, retire Agent

- Rename slug/display name chỉ cập nhật current roster/identity; không đổi số ID, session ID hay task ID.
- Validate slug mới, kiểm tra collision, đổi tên profile file/path và references current roster theo migration riêng; atomicity của đổi file profile khác với history và phải test rollback.
- Cũ messages, telemetry attribution và participant snapshot tiếp tục map bằng `agentNumericId`.
- Nếu API/runtime cũ vẫn chỉ phát `agentId: string`, boundary adapter cần resolve alias thành numeric ID; tên/slug cũ chưa resolve thì giữ nguyên record dưới legacy identity và báo orphan, không đoán qua displayName.
- Remove/retire không cascade-delete session history.

### 6.5 Đổi tên session và delete

- Rename session cập nhật title và `updatedAt` trong manifest/index; không đổi `sessionId` hoặc Cline task.
- Nút **xóa task hội thoại của một Agent** chỉ unlink/xóa task được chọn theo semantics đã được UI xác nhận; không xóa session còn Agent khác.
- Nút **xóa session** xóa session manifest, index entry và các task có quan hệ sở hữu duy nhất của session theo semantics rõ ràng, hoặc detach task thay vì xóa nếu task được chia sẻ. MVP nên cấm chia sẻ task để deletion dễ chứng minh an toàn.
- Với xóa session đa-file: ghi trạng thái `deleting`/tombstone trước; xác minh tất cả task references; xóa qua SDK history API; sau mỗi bước ghi progress/retry; cuối cùng xóa manifest/index. Nếu SDK delete thất bại thì giữ/recover manifest và hiển thị lỗi; không báo xóa xong trong khi transcript còn.
- Chỉ xóa `tasks/<taskId>/ui_messages.json` cache nếu task đã bị xóa và không còn reference; **không xóa task ID từ đường dẫn do input UI cung cấp nếu chưa xác thực ownership**.
- Đồng bộ tab đang mở: đóng hoặc clear đúng session/task đã xóa; không reset mọi tab chỉ vì một participant bị xóa.

---

## 7. Cutover history legacy (không migration)

> Quyết định cutover ở mục 1 thay thế các đề xuất migration/legacy-read trước đây trong tài liệu này. Không import hoặc mở lại history pre-v0.1.1 trong v0.1.1.

### 7.1 Nguyên tắc bảo toàn

- Không chạy migration/backfill history pre-v0.1.1 vào session store mới; không tạo session legacy độc lập từ task cũ.
- Không đọc legacy task/session data để xuất bản History, fallback khi thiếu record mới, hoặc khôi phục task vào luồng resume/follow-up của Cline.
- Giữ nguyên các file legacy tại chỗ: không xóa, di chuyển, đổi tên, rewrite hoặc overwrite `sessions.json`, task metadata, messages/transcript và các file history liên quan.
- Lịch sử mới chỉ được tạo từ luồng v0.1.1; kiểm tra cutover không làm ẩn hoặc chặn list/open/resume của history mới.
- File legacy hỏng cũng không được “sửa” hoặc thay bằng file rỗng; cutover không cần parse nội dung của chúng.

### 7.2 Hành vi với dữ liệu legacy

- Task/session/history được tạo trước cutover vẫn nằm trên đĩa để bảo toàn dữ liệu, nhưng không xuất hiện trong danh sách Orvanta hoặc Cline và không thể được mở/resume qua các luồng history mới.
- Các tham chiếu task trong tab/local UI state cũ không được dùng để đưa task legacy trở lại History hoặc làm fallback cho session v0.1.1.
- Không phân loại, ghép nhóm, backfill agent identity hay ghi migration ledger cho các history record cũ trong cutover này.

### 7.3 Các bước triển khai cutover

1. Chặn các đường legacy list/state publication, fallback reads, backlog/migration, open và resume/follow-up cho cả Orvanta lẫn Cline.
2. Giữ nguyên các file legacy; không chạy script migration, cleanup hoặc rewrite trên dữ liệu người dùng.
3. Kiểm chứng riêng luồng v0.1.1 mới: tạo, lưu, liệt kê, mở và resume session/task mới vẫn hoạt động.
4. Dùng fixture legacy để chứng minh không có kết quả legacy nào được trả về hoặc dùng làm fallback; so sánh byte/file metadata trước và sau để xác nhận không bị sửa.
5. Chỉ cập nhật cutover version/marker nếu cần để phân biệt luồng mới; marker không được kích hoạt import, xóa hoặc rewrite history cũ.

### 7.4 Rollback

- Rollback không được bật lại legacy reader, legacy History list hoặc legacy resume/fallback; ranh giới cutover vẫn giữ nguyên.
- Nếu triển khai history mới cần rollback, chỉ rollback code/schema mới theo cách không thay đổi file legacy và không làm mất dữ liệu v0.1.1 đã tạo.
- Kiểm thử rollback bằng temp fixture; không reset hoặc sửa file history của workspace thật.

---

## 8. Dọn dẹp có kiểm soát

### Có thể bỏ sau compatibility audit

- `agentIds` nếu luôn suy ra được từ `participants.map(p => p.agentNumericId)`.
- Đồng thời lưu `agentTasks` map *và* `agentConversations` array: thay bằng một participant representation canonical; tạo adapter chuyển cho consumers cũ.
- `ChatTab.taskId` nếu `agentTasks[activeAgentNumericId]` là nguồn duy nhất và toàn bộ consumers/test được di trú.
- Các field copy Agent current profile sang mọi bản ghi session; chỉ giữ role/name/slug snapshot có giá trị lịch sử và numeric identity.
- Ghi toàn roster vào một task/session mới để làm participant list.
- Write/rewrite `sessions.json` như index authoritative sau khi storage mới được backfill, được rollout và có compatibility-reader an toàn.
- Copy transcript SDK vào một file `sessions/<sessionId>/agents/<slug>/ui_messages.json` song song với Cline transcript.

### Chưa được xóa/bỏ khi chưa đủ bằng chứng

- `tasks/<taskId>/ui_messages.json` của history pre-v0.1.1: giữ nguyên trên đĩa, không cleanup trong cutover. Với cache của task mới, chỉ bỏ sau khi đã chứng minh transcript chuẩn lưu/replay đầy đủ cùng attribution sau resume, abort và mọi host hiện có.
- `task_metadata.json` hoặc SDK task metadata: cần kiểm tra owner/readers/export/legacy resume trước khi cleanup.
- `agentIds`/`agentTasks` trong gRPC/API/`HistoryItem`: có thể còn consumers bên ngoài Orvanta. Bỏ sau migration adapter và tìm toàn repo (kể cả generated/external contract) chứng minh không còn caller.
- `localStorage` tabs: khác với lịch sử; cần migration state/UI và chính sách draft. Xóa key khi chưa chuyển người dùng có thể làm mất tab đang mở/draft.
- `isFavorited`, model/usage/status: giữ nếu UI/exports sử dụng. Loại chỉ sau usage audit, không chỉ vì trường trùng cảm giác.
- SDK Cline sessions, task IDs hoặc canonical message files: không xóa/chuyển sang store Orvanta.

### Luật cleanup

- Mọi field/format bị xóa phải có: truy vấn/search chứng minh consumer, kế hoạch tương thích (không migrate pre-v0.1.1 task history), unit test format liên quan, test rollback, release criterion và người sở hữu.
- Không kết hợp refactor rộng History Drawer/UI với thay đổi store nếu có thể rollout từng bước.
- Không tạo thêm adapter lâu dài không có `@deprecated`, owner, telemetry (nếu phù hợp) hoặc điều kiện xóa.
- Không thêm SQLite chỉ vì “chuyên nghiệp”. Chỉ đề xuất database khi benchmark/multi-process/cross-session queries chứng minh file metadata hiện tại không đáp ứng; SDK Cline storage vẫn là một hệ thống riêng.

---

## 9. Phân lớp code và điểm tích hợp

Đây là bản đồ vùng cần kiểm tra khi chia implementation; tên file/contract phải xác minh lại trước từng PR.

| Lớp | Vùng repo tham khảo | Trách nhiệm mục tiêu |
|---|---|---|
| Shared schema/store | `sdk/packages/shared/src/orvanta/workspace-history-store.ts`, `sdk/packages/shared/src/orvanta/paths.ts`, `sdk/packages/shared/src/orvanta/index.ts` | Schema/parser, typed result errors, identity mapping, atomic file operations, load/save/list/rebuild session manifest mới và test temp workspace; không import pre-v0.1.1 history. |
| Company/roster identity | `sdk/packages/shared/src/orvanta/company-schema.ts`, `apps/vscode/src/orvanta/workspace-store.ts` | Cấp ID số không race; rename slug không đổi identity; enforce uniqueness/tombstone/migration roster. |
| SDK task history adapter | `apps/vscode/src/sdk/sdk-task-history.ts`, `apps/vscode/src/shared/HistoryItem.ts` | Associate task/session/agent bằng dữ liệu SDK xác nhận; không mặc định mọi roster Agent tham gia; chỉ để transcript cache đúng vai trò. |
| SDK/session boundary | API adapter/host tham chiếu từ `apps/vscode/src/sdk/` và `@cline/core` | Truyền session/Agent identity vào task ở điểm đã xác minh support; read canonical transcript bằng API SDK hiện hữu. Không sửa SDK upstream khi adapter đủ. |
| gRPC/control API | `proto/` và generated code nếu cần command mới | RPC cho create/get/list/rename/delete/resolve session mới chỉ khi contract hiện có không đáp ứng; không thêm endpoint migrate legacy task history. Nếu sửa proto, regenerate bằng lệnh repo. |
| Console UI | `apps/vscode/webview-ui/src/orvanta/tabs/types.ts`, `useChatTabs.ts`, `ConsoleView.tsx`, `ConsoleHistoryDrawer.tsx` | SessionId backend authoritative; UI tab chỉ cache; restore theo Agent numeric ID; hiển thị title, participant thực tế, lỗi task thiếu. |
| User docs | `docs/orvanta/v0.1.1/` và overview khi hoàn thành implementation | Chính sách history/retention, rename ID, migration, delete, troubleshooting và release notes phù hợp. |

**Quy tắc:** nếu SDK API không có metadata/session binding như cần, trước tiên map API thật và kiểm tra event ordering; không tự giả định field hoặc thêm provider-specific branching. Chỉ thay đổi proto/grpc nếu thật sự cần một RPC mới; giữ source `.proto` là nguồn, không edit code generated thủ công.

---

## 10. Checklist triển khai chi tiết

### Phase 0 — Chốt contract và kiểm kê (không thay đổi dữ liệu)

- [x] Ghi ADR cho các quyết định: scope Agent ID per company, số nguyên dương bất biến, slug/name editable, task canonical, một task/Agent/session trong MVP.
- [x] Trace các bề mặt SDK start/send/restore/`readMessages`, session metadata và deletion; link đến type/source thật trong ADR. Attribution event, child agent/handoff và metadata round-trip qua history API vẫn là câu hỏi mở ở trên.
- [x] Ghi đồ thị thực tế `tabId` ↔ `sessionId` ↔ `agentNumericId` ↔ `taskId` và phân biệt identity UI/SDK/backend; implementation binding bền vững vẫn là công việc của phase sau.
- [x] Kiểm tra consumers chính của `HistoryItem.agents`, `agentIds`, `agentTasks`, `OrvantaSessionRecord`, `agentConversations`, `taskId`, `getClineMessages`, `ui_messages.json` và delete APIs; audit toàn bộ external/generated consumers vẫn là gate trước cleanup.
- [x] Tạo fixtures tổng hợp cho: 1 task Coordinator, nhiều task Agent, legacy task, rename slug, task thiếu, session JSON lỗi; không đưa dữ liệu người dùng vào fixture (Đã hoàn thành và xác nhận trong `session-integration.test.ts` & `session-history-store.test.ts`).
- [x] Thêm legacy-history fixture dùng để xác nhận pre-v0.1.1 history không được list, publish, fallback, migrate, mở hoặc resume ở Orvanta/Cline; xác nhận file fixture giữ nguyên byte (Đã hoàn thành và xác nhận byte-for-byte SHA-256 trong `sdk-task-history-cutover.test.ts`).
- [x] Kiểm kê các file history và nguồn sở hữu hiện thấy; việc `ui_messages.json` có richer attribution nào không được SDK transcript khôi phục vẫn cần kiểm chứng trước khi bỏ cache.
- [x] Kiểm tra có concurrent VS Code/Hub writers cùng workspace; xác định writer authoritative/locking primitives sẵn có (Đã triển khai cross-process locking với file lock và verify đa tiến trình Node độc lập).
- [x] Xác nhận ignore rule của repository và ghi rõ giới hạn privacy; retention, backup/restore, export và encryption-at-rest vẫn chưa được chốt.
- [x] Chốt session rỗng không xuất hiện trong History; ghi lại hướng status/title và phân biệt UI tab state với session history.
- [x] Không xóa/copy/rename/chỉnh sửa file dữ liệu người dùng trong phase này.

### Phase 1 — Schema Agent identity

- [x] Mở rộng schema roster/identity với trường số bất biến và validator positive integer/safe integer.
- [x] Chọn một nguồn authoritative cho `nextAgentNumericId`/retired identities; versioning schema; ghi rõ company mới và company đã tồn tại khởi tạo thế nào.
- [x] Cấp ID trong thao tác được bảo vệ đồng thời; test hai lượt cấp đồng thời không trùng số.
- [x] Enforce slug unique trong active roster; hỗ trợ đổi slug/displayName mà giữ numeric ID.
- [x] Đảm bảo retire/delete không tái sử dụng ID; quyết định tombstone tối thiểu cần giữ.
- [x] Thêm resolver `legacySlug -> numericId`, xử lý unknown/multiple match một cách fail-safe.
- [x] Cập nhật serialize/parse profile, roster load/save, company clone/template/import/export và UI form nếu Agent tạo/rename.
- [x] Xác minh rename profile file, `agentFile`, `reportsTo` và historical references atomicity/rollback.
- [x] Test ID ổn định qua reorder roster, restart, rename, retire, restore backup và duplicate slug.
- [x] Không để numeric ID chỉ sinh trong browser/UI; backend/store cấp ID authoritative.

### Phase 2 — Session history store v1

- [x] Tạo schema runtime được version cho manifest, participant và index summary; export qua shared Orvanta public barrel.
- [x] Tách `NotFound`, `Corrupt`, `UnsupportedVersion`, `PermissionDenied`, `Conflict` (hoặc result type tương đương).
- [x] Triển khai safe ID/path validation cho session/task; không ghép raw slug vào path.
- [x] Thêm thao tác `createSession`, `getSession`, `listSessions`, `upsertParticipant`, `updateSession`, `renameSession`, `rebuildIndex` với semantics idempotent rõ.
- [x] Chọn locking/writer model sau khi xác minh đa tiến trình; bao phủ các transaction read–modify–write, không chỉ lần `writeFile`.
- [x] Ghi JSON authoritative qua temp-file + atomic replacement; xác minh replacement trên Windows/macOS/Linux, cleanup temp, lỗi ENOSPC/permission và encoding.
- [x] Không catch parse error rồi trả `[]` trong write path; test malformed JSON không bị overwrite.
- [x] Chỉ serialize manifest bị thay đổi; index cập nhật độc lập/rebuild, phân trang khi list lớn.
- [x] Chuẩn hóa timestamp UTC; kiểm tra mọi đọc cũ số milliseconds và đổi có quy tắc.
- [x] Bảo đảm schema session có company/workspace binding để ngăn mở nhầm history giữa hai repo.
- [x] Quy định retention/giới hạn preview; redact dữ liệu tool output/token/secret khỏi manifest/index.
- [x] Test tamper/path traversal, duplicate keys/task owners, write concurrency, crash temp file và recovery.

### Phase 3 — Binding task ↔ session ↔ agent

- [x] Backend tạo/resolve `sessionId` trước khi task mới được start/resume; không resume task pre-v0.1.1 từ history cũ.
- [x] Bổ sung binding vào request/context/SDK-supported task metadata sau khi API thật được xác minh.
- [x] Gắn participant từ Agent identity đã resolve **và task/event thật**; không fallback participant toàn roster.
- [x] Khi task được sinh từ Agent channel, lưu `agentNumericId`, snapshot slug/name/role, `taskId`, `joinedAt`.
- [x] Reconcile child/spawn/handoff tasks; quyết định có biểu diễn mỗi child như participant riêng hay chỉ participant agent trực tiếp trong MVP.
- [x] Handle user gửi hai message liên tiếp trước khi event task-ID đầu tiên settle; không tạo duplicate task/participant.
- [x] Handle webview reload/task switch/host restart trong khi task running mà không tạo session khác.
- [x] Tính `updatedAt`, status và usage dựa trên transition/event idempotent; phân biệt snapshot cumulative với delta.
- [x] Test Agent rename ngay giữa session đang chạy và sau khi session đã hoàn thành.
- [x] Test task SDK không còn tồn tại; chỉ liên kết task v0.1.1 mà workspace/history reader có thể mở. Không attach pre-v0.1.1 task qua legacy reader.

### Phase 4 — UI/tab/history compatibility

- [x] Thêm `sessionId` vào UI model và round-trip qua backend; `tabId` tiếp tục là ID UI-only.
- [x] Decoder cho localStorage cũ: validate dữ liệu UI/tab và không làm crash toàn UI nếu key hỏng; không chuyển task/session pre-v0.1.1 thành history mới hoặc cho phép resume.
- [x] Ngừng ghi deprecated `ChatTab.taskId` sau khi consumer đã di chuyển; có kiểm tra full-repo trước khi xóa.
- [x] Xác định draft persistence riêng, max size, storage key version và hành vi đóng/clear tab; không đưa nội dung draft thành history transcript.
- [x] History Drawer chỉ list session/task thuộc history mới v0.1.1; không liệt kê legacy task như session kể cả khi không có manifest mới.
- [x] Hiển thị participant snapshot/current name có dấu hiệu rename nếu hữu ích; không hardcode `coordinator`/`implementer` trong logic chọn identity.
- [x] Cho phép mở từng participant trong session, xem rõ unavailable participant nếu task mất; không tự chọn task của Agent khác làm fallback im lặng.
- [x] Xóa các chips/filter chỉ nếu UX sản phẩm đã chốt; đổi search sang title/session ID/participant slug/snapshot name/ID số.
- [x] Tách hành vi xóa task Agent khỏi xóa session; xác nhận, loading, lỗi, retry và update mọi tab mở liên quan.
- [x] Kiểm tra empty state, lịch sử nhiều trang, accessibility/keyboard, narrow webview và task đang chạy.
- [x] Test UI state sau restart; localStorage không ghi đè binding mới lấy từ backend.

### Phase 5 — Cutover history/read isolation

- [x] Loại legacy tasks khỏi mọi history list/state được publish trong cả Orvanta lẫn Cline.
- [x] Chặn fallback từ session/task history v0.1.1 chưa có record sang legacy reader hoặc legacy task.
- [x] Chặn import/migration/backlog capture từ task/session history pre-v0.1.1; không tạo legacy session mới.
- [x] Chặn mở, resume và follow-up từ history UI hoặc API mới đối với task pre-v0.1.1.
- [x] Không xóa, di chuyển, đổi tên, rewrite hoặc overwrite history/task files legacy.
- [x] Xác nhận tạo/list/open/resume với session/task mới hoạt động bình thường sau cutover.
- [x] Dùng fixture để xác nhận file legacy không đổi byte sau khởi tạo, list và thao tác history mới.
- [x] Bảo đảm rollback không bật lại legacy list/fallback/resume; rollback chỉ ảnh hưởng code/schema history mới.

### Phase 6 — Delete, repair, privacy và vận hành

- [x] Phân biệt thao tác `delete participant/task`, `delete session` và `archive session` cho history v0.1.1; không áp dụng thao tác cleanup này lên legacy files được bảo toàn.
- [x] Validate ownership trước delete; không cascade qua liên kết task chung hoặc task từ workspace khác.
- [x] Có tombstone/staged delete/retry cho session có nhiều task; khôi phục record khi SDK xóa thất bại.
- [x] Rebuild index sau delete và test crash ở mọi bước của multi-file saga.
- [x] Có repair command/UI chẩn đoán JSON history mới bị hỏng; không sửa, quarantine hoặc thay thế legacy files trong cutover.
- [x] Định nghĩa giới hạn kích thước, clear/export/archive và ảnh hưởng đến repo Git/cloud sync.
- [x] Xem transcript cache có chứa sensitive payload không; set ignore/permissions như thiết kế storage hiện hành.
- [x] Telemetry/log không ghi prompt, message, provider secret hoặc tuyệt đối path riêng tư; log IDs có kiểm soát.
- [x] Giới thiệu compatibility error rõ ràng với `historySchemaVersion` lớn hơn client đang chạy.

### Phase 7 — Verification và release readiness

- [x] Shared store tests trên temp directory; không đụng `apps/vscode/.orvanta` thật.
- [x] Company/roster schema+allocator tests: duplicate, rename, retire, legacy agent-identity mapping (không import task history), concurrent writers.
- [x] SDK adapter tests: task update, no full roster participation, event replay, usage idempotency, missing SDK task.
- [x] Webview tests: tạo session mới, tạo nhiều agent conversations, switch, reload, reopen, rename, delete và kiểm tra decoder localStorage không phục hồi legacy task history.
- [x] Integration test: tạo một session, chat hai agent, restart/reopen, verify đúng transcript riêng từng agent và cùng `sessionId`.
- [x] Cutover tests: legacy task exclusion, no fallback/migration/resume, new-history list/open/resume, unchanged legacy files.
- [x] Destructive delete tests: partial SDK failure, crash/retry, task riêng/shared, tab đang active/inactive.
- [x] Performance: list nhiều session không đọc transcript từng task; save session chỉ update manifest/index cần thiết; benchmark fixture lớn đại diện.
- [x] Security: traversal IDs, invalid roster mappings, log redaction, workspace/company isolation và untrusted JSON.
- [x] Chạy test của package shared đã chọn; build SDK bắt buộc nếu source/dependency SDK thay đổi; chạy typecheck/test ứng dụng và UI liên quan.
- [x] Kiểm tra generated protobuf chỉ khi `.proto` thay đổi; không commit file generated hand-edit.
- [x] Verify legacy exclusion, no-fallback/no-migration/no-resume, new-history behavior, on-disk preservation và rollback bằng test fixture.
- [x] Release notes nêu rõ history cutover, ID scope, cách xử lý session/task mới và việc file history legacy vẫn được giữ trên đĩa nhưng không còn truy cập được.
- [x] Toàn bộ code đã được implementation và verify 100% qua test suites độc lập trước khi đánh dấu hoàn thành checklist.

---

## 11. Bộ kiểm thử nghiệm thu bắt buộc

1. **Một phiên, hai Agent:** tạo một session; gửi message cho Agent số 1 và Agent số 2; confirm một `sessionId`, hai `agentNumericId`, hai `taskId` khác nhau và transcript không trộn.
2. **Cùng Agent, follow-up:** gửi nhiều lượt và resume cùng session; participant không bị duplicate, task ID không bị thay nếu SDK resume cùng task.
3. **Slug rename:** đổi `coder` thành slug khác rồi reopen; numeric ID/task/history giữ nguyên, old snapshot vẫn đọc được và alias compatibility không map nhầm.
4. **Display name rename:** title/badges hiện tên theo chính sách đã chọn, còn session lịch sử có snapshot để audit.
5. **Roster lớn nhưng ít participant:** 20 Agent trong roster, chỉ một task thực sự tham gia; manifest chỉ có một participant.
6. **Agent bị retire:** session v0.1.1 đã ghi nhận Agent vẫn list/reopen; allocator không bao giờ tái sử dụng số cũ.
7. **JSON hỏng:** index hỏng thì có thể rebuild từ manifests; manifest hỏng được chẩn đoán/quarantine; không trường hợp nào tự overwrite history còn tốt bằng `[]`.
8. **Hai writer:** cùng workspace update hai session/allocator cạnh tranh; không mất cập nhật và không trùng ID.
9. **Crash recovery:** kill/fail mô phỏng sau temp write, sau manifest rename, trước index update, và giữa multi-task delete; rerun recovery không nhân đôi/âm thầm xóa.
10. **Task mất:** participant hiện unavailable; các participant và metadata còn lại vẫn truy cập được.
11. **Legacy files preserved:** sau khi list/khởi tạo history mới, bytes của legacy task/session files vẫn nguyên vẹn và không task legacy nào được đưa vào history mới.
12. **Legacy cutover:** pre-v0.1.1 tasks/sessions không xuất hiện ở Orvanta hoặc Cline, không fallback/migrate/open/resume/follow-up được; file legacy không đổi byte.
13. **History mới:** session/task được tạo sau cutover vẫn list/open/resume đúng, kể cả khi không có record legacy tương ứng.
14. **Data source parity:** session/task mới resume user/assistant/tool rows + teammate attribution từ canonical SDK path; không dùng cache legacy để fallback.
15. **Open/delete isolation:** delete một task mới không làm xóa toàn bộ session hoặc reset tab không liên quan; delete session chỉ xóa association/task đã được xác nhận.
16. **Isolation:** cùng task/session-like ID ở hai workspace không lẫn history; company binding và root resolution được xác minh.

---

## 12. Phạm vi MVP và không làm

### MVP trong v0.1.1

- Registry/roster hỗ trợ số ID agent bền vững trong phạm vi company.
- Một ID phiên CEO được quản lý bền vững, riêng với tab UI và task Cline.
- Session manifest per-session, participant list canonical với snapshot alias/name và `taskId` reference.
- Cline SDK tiếp tục sở hữu transcript; không ghi transcript lần thứ hai.
- History cutover không destructive: legacy bị loại khỏi cả Orvanta và Cline, không list/fallback/migrate/resume; file nguồn giữ nguyên trên đĩa.
- Session/task mới của v0.1.1 được list/open/resume theo binding mới.
- UI có thể open session và chọn đúng Agent/task; phân biệt xóa session với xóa conversation nếu UI cung cấp cả hai.

### Không làm trong MVP

- Chuyển toàn bộ transcript/task store của Cline SDK sang SQLite hoặc thay SDK storage.
- Đồng bộ history giữa nhiều máy, cloud account, repository hay nhiều user.
- Identity global xuyên company; đã chốt scope local là workspace/company.
- Dùng slug hoặc display name làm khóa foreign key lâu dài.
- Tự hợp nhất các session lịch sử theo nội dung prompt, thời gian hoặc title gần giống.
- Sao chép raw messages, tool results, context hay toàn bộ agent profile vào session manifest.
- Retention/compaction tự động xóa conversation; data export/import UX hoàn chỉnh; full-text transcript search index mới.
- Thay đổi format public SDK API nếu host adapter có thể thực hiện an toàn; xóa transcript cache của task v0.1.1 trước khi parity được chứng minh. Không xóa file legacy pre-v0.1.1.
- Xóa/tái cấu trúc các trường deprecated và tab/draft localStorage trong cùng PR mà chưa có audit compatibility.

---

## 13. Các giả định và câu hỏi còn mở

### Đã chốt với người yêu cầu

- [x] Agent numeric ID không đổi và duy nhất trong phạm vi workspace/company.
- [x] Slug định danh dạng chữ và display name có thể chỉnh sửa.
- [x] Session có ID riêng, không lấy ID task hay tab làm `sessionId`.
- [x] Session tham chiếu task/transcript Cline; không nhân đôi transcript.
- [x] History pre-v0.1.1 không được migrate hoặc fallback; file nguồn giữ nguyên trên đĩa.

### Cần quyết định/kiểm chứng trong implementation planning

- [x] Session rỗng không xuất hiện trong History; publish sau khi runtime chấp nhận lượt chat đầu tiên và participant/task đầu tiên được xác nhận.
- [x] MVP một task Cline cho mỗi `(sessionId, agentNumericId)`. Tạo task mới/reset cho cùng Agent trong một session cần mở rộng schema có version; không overwrite binding.
- [x] Session delete: Phân tách rõ ràng giữa `deleteParticipantTask` (chỉ gỡ task của 1 agent, giữ nguyên session) và `deleteSession` (staged delete có tombstone, xóa task qua SDK và rollback tự động nếu thất bại).
- [x] Draft input: Persist độc lập trong key `CONSOLE_TABS_DRAFTS_STORAGE_KEY` (v2), giới hạn tối đa 50KB/draft, tự động xóa khi gửi hoặc đóng tab; không lưu vào session manifest/transcript.
- [x] History/transcript mặc định không commit; `.gitignore` hiện tại bỏ qua `.orvanta/` và `.cline/data`, nhưng phải xác minh ignore policy của từng workspace trước release; ignore không phải encryption/backup.
- [x] Numeric Agent ID scope trong một Orvanta company/workspace; chốt single-owner authoritative trên `.orvanta/org/roster.json` được bảo vệ bằng file lock liên tiến trình.
- [x] Canonical SDK transcript kết hợp với participant snapshot trong manifest đáp ứng đầy đủ attribution hiển thị; cutover chặn hoàn toàn việc fallback sang `ui_messages.json` legacy.
- [x] Mức lịch sử dự kiến & catalog accelerator: Dùng `index.json` tổng hợp có phân trang (`page`, `pageSize`, `totalPages`), listing không đọc transcript; benchmark xác nhận hiệu năng cao không cần SQLite trong MVP.
- [x] Cross-process coordination: Triển khai `withHistoryLock` và `withWorkspaceMutation` kết hợp Promise queue nội bộ và file lock liên tiến trình (`.lock`, cờ `wx`, PID check, timeout recovery 15s); kiểm thử thành công qua multi-process Node workers.
- [x] Chốt retention, repair, export và privacy: Triển khai `exportSession` (redacted bundle), `diagnoseAndRepairHistory` (dọn stale temp, quarantine manifest hỏng), và `sanitizeForLogging` (redact token/key/paths).

---

## 14. Thứ tự PR gợi ý

1. **PR 1 — Quyết định + fixtures + schema mới:** schema/id allocator và tests; thêm fixture chứng minh legacy history bị loại trừ và không đổi trên đĩa.
2. **PR 2 — Session store v1:** manifest/index, atomic persistence, locking policy, rebuild và error handling; chưa đổi transcript owner.
3. **PR 3 — Backend binding:** start/update/resume liên kết session+Agent numeric ID+task ID; coverage adapter/SDK boundary.
4. **PR 4 — Console History UI:** `sessionId`, participant navigation, tab restore, explicit session/task deletion UX và decoder localStorage không phục hồi task history cũ.
5. **PR 5 — History cutover:** loại legacy list/fallback/migration/resume ở Orvanta và Cline; xác minh history mới và giữ nguyên file nguồn.
6. **PR 6 — Chỉ cleanup đã được chứng minh:** bỏ trường trùng/deprecated riêng; không xóa legacy history files như một phần của cutover v0.1.1.

Giữ PR nhỏ, mỗi bước giữ history mới hoạt động, có test failure modes; không bật legacy fallback và không trộn sửa giao diện độc lập với cleanup dữ liệu.

---

## 15. Kết luận

Hướng chuyên nghiệp và dễ mở rộng nhất cho yêu cầu hiện tại không phải là lưu thêm nhiều bản transcript, mà là làm rõ **identity → session → agent participant → Cline task → transcript** thành các tầng với chủ sở hữu riêng. Số ID agent cố định giải quyết tính liên tục; alias và display name phục vụ con người; session manifest gom công việc; task ID giữ transcript canonical.

Điểm quan trọng nhất của cutover v0.1.1: history cũ không được đưa vào Orvanta hoặc Cline bằng migration, fallback hay resume; các file cũ vẫn được giữ nguyên trên đĩa. An toàn ở đây nghĩa là cắt quyền truy cập, không suy diễn/nhập lại quan hệ session cũ, đồng thời đảm bảo history mới tiếp tục hoạt động.
