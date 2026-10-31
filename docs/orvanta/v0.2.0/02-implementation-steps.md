# Orvanta v0.2.0 — Các bước thực hiện: Agent độc lập và phiên CEO có lịch sử đầy đủ

> **Nguồn yêu cầu:** [`01-agent-identity-and-session-boundaries.md`](./01-agent-identity-and-session-boundaries.md)  
> **Inventory hiện trạng:** [`03-phase-0-baseline.md`](./03-phase-0-baseline.md)  
> **Loại tài liệu:** Playbook thực thi theo thứ tự. Không thay thế quyết định sản phẩm.  
> **Quy tắc:** Không viết code cho một phase nếu phase trước chưa đạt gate. Không tuyên bố “đã xong” chỉ vì đã có mapping/ID.

Mục tiêu sản phẩm cần đạt:

1. Mỗi Agent là nhân sự riêng trong **một project**: profile, memory, transcript tách biệt; không dùng chung hội thoại hay dữ liệu cá nhân giữa Agent hoặc giữa project.
2. Mỗi chat mới của CEO (sau khi gửi tin đầu) mở **một CEO session** mới. Session đó là đơn vị lịch sử cấp cao: CEO + mọi Agent thật sự tham gia, mở lại được, không lẫn transcript.

---

## Cách dùng tài liệu này

- Làm **tuần tự theo phase**. Mỗi bước có: việc phải làm, file/khu vực liên quan, checklist, kết quả nghiệm thu.
- Ghi quyết định mới vào cuối file (mục *Nhật ký quyết định*) hoặc vào `03-phase-0-baseline.md`; không sửa ngược các quyết định đã chốt ở mục 1 của tài liệu `01` nếu chưa có review sản phẩm.
- Toolchain: **Bun** (`bun run build:sdk` sau khi đổi SDK; không dùng npm/yarn/pnpm).
- Tình huống nghiệm thu đại diện (bắt buộc trước khi gọi MVP xong) nằm ở [Phase 9](#phase-9--nghiệm-thu-đại-diện-e2e).

### Quy ước tích checklist (bắt buộc với AI)

- Chỉ đổi `- [ ]` thành `- [x]` **trong file này** khi mục đó đã làm xong **và** đã nghiệm thu (test xanh, quyết định đã ghi, hoặc kiểm tra tay đã ghi bằng chứng).
- Không tích cả phase chỉ vì đã viết code; phải tích hết mục con rồi mới tích **Gate phase**.
- Không tích mục “owner đã duyệt” nếu chưa có tên owner / ngày trong *Nhật ký quyết định*.
- Nếu bỏ qua một mục: để `- [ ]`, thêm dòng vào nhật ký (`bỏ qua vì …`), không xóa checklist.
- Mỗi lần xong một bước: cập nhật file này trong cùng lượt (cùng PR / cùng commit với code nếu user yêu cầu commit).
- Gate Fail: không tích Pass; ghi Fail + dừng, không nhảy sang UI/history.

---

## Tiến độ tổng

- [x] Đã đọc `01` + playbook này trước khi sửa code
- [x] Phase 0 — toàn bộ gate Pass (0.1–0.6)
- [x] Phase 1 — storage, cleanup, user library
- [x] Phase 2 — identity + memory
- [x] Phase 3 — draft → CEO session → transcript mapping
- [x] Phase 4 — mở lại phiên + TeamStore
- [x] Phase 5 — realtime một nguồn
- [x] Phase 6 — song song, pause, recovery
- [x] Phase 7 — isolation + concurrency tests
- [x] Phase 8 — git / backup / docs
- [x] Phase 9 — E2E đại diện Pass
- [x] Mục tiêu sản phẩm 1 (Agent độc lập theo project) đạt
- [x] Mục tiêu sản phẩm 2 (CEO session có lịch sử đầy đủ) đạt

---

## 0. Bản đồ hiện trạng → đích (đọc trước khi làm)

Đây là khoảng cách thật trong repo tại thời điểm viết playbook. Các path dưới đây phải được xác nhận lại khi bắt đầu Phase 0 vì code có thể đã đổi.

| Khái niệm | Đích v0.2.0 | Hiện trạng gần đúng | Việc cần làm |
|---|---|---|---|
| User library | `%LOCALAPPDATA%\Orvanta\` (Windows) cho settings + template | `userOrvantaRoot()` = `homedir()/.orvanta` trong `apps/vscode/src/orvanta/user-library-store.ts` | Migration tường minh, không đổi ngầm, không xóa snapshot cũ |
| TeamStore | `.orvanta/local/db/teams.db` | `resolveProjectStorageRoots()` đặt `teamStoreDir` = `.orvanta/local/db` (đã khớp `01`; session factory cũng dùng `local/db`) | Giữ WAL/busy timeout; không dùng lại `state/team` |
| SDK transcript | `.orvanta/local/sdk/db` + `local/sdk/sessions/<id>/` | Seam `ProjectStorageRoots` + host per-workspace **đã có một phần**; SDK vẫn mặc định `resolveDbDataDir()` / `resolveSessionDataDir()` nếu không inject | Gate 1: chứng minh inject an toàn, không rò giữa project, không env process-wide |
| CEO history | `.orvanta/local/history/index.json` + `sessions/<id>/session.json` (link, không nhúng message) | `session-history-store.ts` (manifest mới) + `workspace-history-store.ts` (legacy) | Chỉ dùng store mới làm nguồn chuẩn; inventory rồi xóa legacy |
| Memory Agent | `.orvanta/local/memory/agents/<agent-id>/memory.md` + `proposals/` | `org/agents/<id>/workspace/memory.md` | Tách memory khỏi profile/workspace; proposal + quyền CEO |
| Pause | Pause **runtime** toàn CEO session, durable, drain tới safe boundary | Nút Pause War Room / Console chỉ pause **stream UI**; runtime vẫn chạy (`WarRoomView`, `globalWarRoomTracker`) | Đổi contract UI + implement runtime pause |
| Agent detail realtime | Projection đọc từ cùng nguồn với Team Feed; unmount không dừng run | Tracker in-memory; khung detail dễ giữ object cũ lúc mở | Một store authoritative + subscribe theo Agent ID |
| Git | Allowlist **rỗng**; ignore toàn bộ `.orvanta/**` | Cần kiểm kê `.gitignore` hiện tại | Không commit transcript/history/memory/runtime; không tự mở allowlist |

**Không được gộp các ID thành một:**

| ID | Ý nghĩa | Được phép dùng để |
|---|---|---|
| Agent ID | Nhân sự ổn định trong project | Profile, memory, roster |
| CEO session ID | Một cuộc làm việc của CEO | History index, pause scope, participant list |
| `(CEO session, Agent)` | Một transcript canonical | Mapping → `sdkSessionId` |
| SDK session ID | Transcript thật do Cline SDK persist | Đọc/ghi message |
| Task / run / runtime agent / conversation store ID | Thực thi | Chỉ **link** khi runtime đã persist bằng chứng |
| Tab ID | UI | Không persist như session |

### Checklist — xác nhận bản đồ

- [x] Đã mở và đối chiếu từng hàng bảng trên với code hiện tại (không tin playbook mù)
- [x] Đã ghi khác biệt mới (nếu code đã đổi) vào nhật ký hoặc baseline
- [x] User library vẫn / không còn `homedir()/.orvanta` — đã ghi kết quả
- [x] `teamStoreDir` hiện tại đã được ghi lại
- [x] SDK roots hiện tại (`sdkDbDir`, `sdkArtifactDir`) đã được ghi lại
- [x] Cả hai history store (mới + legacy) vẫn tồn tại / đã gỡ — đã ghi
- [x] Path memory hiện tại đã được ghi lại
- [x] Nút Pause hiện tại là UI-only / đã đổi — đã ghi
- [x] Agent detail còn giữ object cũ lúc mở / đã sửa — đã ghi
- [x] `.gitignore` hiện tại đã được đọc
- [x] Không dùng Tab ID / task ID / run ID thay CEO session ID hoặc SDK session ID trong thiết kế sắp làm

---

## Phase 0 — Gate trước khi sửa runtime (bắt buộc)

Tài liệu `01` mục 10: chưa chốt schema/API/UI order cho đến khi ownership, lifecycle, privacy, concurrency và recovery được trả lời. Phase này **không** đổi dữ liệu người dùng.

### Gate phase 0

- [x] 0.1 phạm vi đã khóa
- [x] 0.2 Security/Privacy đã có văn bản + owner
- [x] 0.3 Gate 1 SDK seam **Pass** (hoặc Fail đã dừng + có plan sửa seam trước UI)
- [x] 0.4 Inventory legacy có Keep/Migrate/Delete + dry-run
- [x] 0.5 Layout + schema version đã chốt một cây duy nhất
- [x] 0.6 Contract pause/tab/shutdown đã được owner runtime xác nhận
- [x] Không có thay đổi dữ liệu user / `.orvanta` production trong phase này
- [x] Nhật ký quyết định đã cập nhật các mục vừa chốt

### 0.1 Đọc và khóa phạm vi

1. Đọc toàn bộ `01`, đặc biệt mục 1 (đã chốt), mục 6 (MVP), mục 7 (thành công), mục 8–9 (chưa thiết kế / giả định).
2. Đọc `03-phase-0-baseline.md` nếu file còn khớp repo; nếu lệch thì cập nhật inventory trước khi code.
3. Ghi rõ out-of-scope v0.2.0: worktree riêng per Agent, auto-sync project → user template, chia sẻ session/memory xuyên project hoặc cloud.

**Xong khi:** Có checklist phạm vi 1 trang, đã xác nhận với người duyệt sản phẩm.

#### Checklist 0.1

- [x] Đã đọc `01` mục 1 (quyết định đã chốt)
- [x] Đã đọc `01` mục 6 (MVP)
- [x] Đã đọc `01` mục 7 (tiêu chí thành công)
- [x] Đã đọc `01` mục 8–9 (chưa thiết kế / giả định)
- [x] Đã đọc `01` mục 10 (bước trước implementation)
- [x] Đã đọc `03-phase-0-baseline.md` hoặc ghi “file lệch / thiếu” kèm ngày
- [x] Baseline lệch repo thì đã cập nhật inventory trước khi code
- [x] Out-of-scope đã viết: không worktree per Agent
- [x] Out-of-scope đã viết: không auto-sync project → user template
- [x] Out-of-scope đã viết: không chia sẻ session/memory xuyên project hoặc cloud
- [x] Người duyệt sản phẩm đã xác nhận phạm vi (ghi tên + ngày ở nhật ký)

### 0.2 Security / Privacy review

1. Liệt kê dữ liệu nào rơi vào transcript, event feed, memory, secrets, tool log.
2. Chốt policy **fail-closed** cho nội dung event: không có trong allowlist thì không hiện / không persist ra projection.
3. Chốt redaction trước khi ghi event hoặc hiện tool/log trên Team Feed / Agent detail.
4. Xác nhận: không commit secrets; backup SQLite không copy `teams.db` khi WAL còn mở.

**Xong khi:** Có quyết định bằng văn bản (allowlist event + redaction + retention theo vòng đời session). Owner security/privacy được ghi tên.

#### Checklist 0.2

- [x] Đã liệt kê dữ liệu transcript
- [x] Đã liệt kê dữ liệu event feed
- [x] Đã liệt kê dữ liệu memory
- [x] Đã liệt kê secrets / credentials
- [x] Đã liệt kê tool log
- [x] Event content allowlist đã chốt bằng văn bản
- [x] Ngoài allowlist: không hiện trên UI
- [x] Ngoài allowlist: không persist ra projection
- [x] Redaction trước khi ghi event đã chốt
- [x] Redaction trước khi hiện tool/log Team Feed đã chốt
- [x] Redaction trước khi hiện tool/log Agent detail đã chốt
- [x] Retention event theo vòng đời session đã chốt
- [x] Cấm commit secrets đã ghi
- [x] Cấm copy `teams.db` khi WAL mở đã ghi
- [x] Owner security/privacy có tên trong nhật ký

### 0.3 Gate 1 — SDK storage seam (blocker transcript-in-project)

Mục tiêu: chứng minh session metadata + canonical transcript **thật sự** nằm trong `<project>/.orvanta/local/sdk/` khi host được tạo với `ProjectStorageRoots`, và **không** rò sang project khác hay Cline data dir mặc định.

Việc cần làm (audit, chưa bắt buộc đổi layout):

1. Trace mọi chỗ gọi `resolveDbDataDir()` / `resolveSessionDataDir()` trong `@cline/core` và host VS Code.
2. Trace `VscodeSessionHost` / `sdk-session-lifecycle.ts`: host per-workspace đã inject `sdkDbDir`, `sdkArtifactDir`, `teamDir` chưa.
3. Tìm path còn fallback silent về Cline data dir khi thiếu roots.
4. Viết (hoặc chạy) test isolation:
   - Mở project A và project B trong cùng process (nếu host cho phép) hoặc hai host tuần tự trong một test process.
   - Start session ở A, persist ít nhất 1 user + 1 assistant message.
   - Assert file artifact chỉ dưới `A/.orvanta/local/sdk/`.
   - Assert B không đọc được session của A (workspace mismatch fail-closed).
   - Assert không ghi vào `%USERPROFILE%/.cline` (hoặc Cline data dir) cho session đó.
5. Cấm dùng env process-wide để chọn path nếu một process có thể mở nhiều workspace.

**Xong khi:** Có báo cáo Pass/Fail. Nếu Fail: **dừng**, không hứa “transcript nằm trong project”. Chỉ làm architecture fix, không làm UI history.

File neo:

- `sdk/packages/shared/src/orvanta/project-storage.ts`
- `sdk/packages/core/src/services/storage/sqlite-session-store.ts`
- `sdk/packages/core/src/session/services/session-service.ts`
- `sdk/packages/core/src/runtime/host/host.ts`
- `apps/vscode/src/sdk/vscode-session-host.ts`
- `apps/vscode/src/sdk/sdk-session-lifecycle.ts`
- `apps/vscode/src/sdk/sdk-task-history.ts`

#### Checklist 0.3 — audit

- [x] Đã grep toàn bộ `resolveDbDataDir()` trong `@cline/core`
- [x] Đã grep toàn bộ `resolveSessionDataDir()` trong `@cline/core`
- [x] Đã grep cùng hai hàm trong `apps/vscode`
- [x] Mỗi call site: có inject roots / fallback Cline dir / dead path — đã ghi bảng
- [x] `VscodeSessionHost` inject `sdkDbDir` — đã xác nhận Có/Không
- [x] `VscodeSessionHost` inject `sdkArtifactDir` — đã xác nhận Có/Không
- [x] `VscodeSessionHost` inject `teamDir` — đã xác nhận Có/Không
- [x] `sdk-session-lifecycle.ts` tạo host per-workspace — đã xác nhận Có/Không
- [x] Đã tìm mọi fallback silent khi thiếu `ProjectStorageRoots`
- [x] Không dùng env process-wide để chọn storage path cho multi-workspace

#### Checklist 0.3 — test isolation

- [x] Có test (hoặc harness) hai project A và B
- [x] Start session ở A
- [x] Persist ≥ 1 user message ở A
- [x] Persist ≥ 1 assistant message ở A
- [x] Artifact chỉ dưới `A/.orvanta/local/sdk/` (hoặc path layout đã chốt)
- [x] Metadata DB session A không nằm ở Cline data dir mặc định
- [x] B không đọc được session A
- [x] Workspace mismatch fail-closed (không trả transcript “gần đúng”)
- [x] Session A không ghi vào `%USERPROFILE%/.cline` / Cline data dir
- [x] Hai workspace không bao giờ share cùng `sdkDbDir` / `sdkArtifactDir`

#### Checklist 0.3 — kết luận

- [x] Báo cáo Gate 1 đã viết (Pass hoặc Fail)
- [x] Nếu Pass: được phép hứa transcript nằm trong project
- [x] Nếu Fail: đã dừng UI/history; chỉ còn việc sửa seam
- [x] Kết luận đã ghi nhật ký (ngày + Pass/Fail)

### 0.4 Inventory legacy history (trước mọi lệnh xóa)

Người dùng cho phép xóa history Orvanta cũ **trong giai đoạn phát triển**, nhưng chỉ đúng store đã kiểm kê.

1. Liệt kê path cụ thể (không glob `.orvanta/` hay `.cline/`):
   - Legacy: `workspace-history-store.ts` → `HISTORY_SESSIONS_FILE`, `HISTORY_TASKS_DIR` (xem `sdk/packages/shared/src/orvanta/paths.ts`).
   - Manifest mới: `session-history-store.ts` → `history/index`, `history/sessions/<id>/`.
   - SDK artifacts: `local/sdk/sessions/`, `sessions.db`.
   - Company/config: `company.json`, `purpose.md`, `org/roster.json`, `org/agents/*/profile.md`.
   - Memory hiện tại: `org/agents/*/workspace/memory.md`.
   - User library cũ: `homedir()/.orvanta/companies/` (hoặc `LIBRARY_DIRNAME`).
2. Với mỗi path: **giữ / migrate / xóa**. Không xóa company hiện tại, không xóa SDK session ngoài inventory.
3. Viết script cleanup **dry-run** in ra danh sách file; test trên fixture, không chạy trên repo làm việc cho đến Phase 1.

**Xong khi:** Bảng inventory có cột Keep/Migrate/Delete và test dry-run xanh.

#### Checklist 0.4 — liệt kê path

- [x] Đã đọc hằng số trong `sdk/packages/shared/src/orvanta/paths.ts`
- [x] Legacy `HISTORY_SESSIONS_FILE` — path cụ thể đã ghi
- [x] Legacy `HISTORY_TASKS_DIR` — path cụ thể đã ghi
- [x] Manifest mới `history/index` — path cụ thể đã ghi
- [x] Manifest mới `history/sessions/<id>/` — path cụ thể đã ghi
- [x] SDK `local/sdk/sessions/` — path cụ thể đã ghi
- [x] SDK `sessions.db` — path cụ thể đã ghi
- [x] `company.json` — Keep
- [x] `purpose.md` — Keep
- [x] `org/roster.json` — Keep
- [x] `org/agents/*/profile.md` — Keep
- [x] `org/agents/*/workspace/memory.md` — Keep hoặc Migrate (không Delete mù)
- [x] User library `homedir()/.orvanta` / `LIBRARY_DIRNAME` — Keep hoặc Migrate
- [x] Không dùng glob xóa `.orvanta/`
- [x] Không dùng glob xóa `.cline/`

#### Checklist 0.4 — phân loại + dry-run

- [x] Mỗi path có đúng một nhãn: Keep / Migrate / Delete
- [x] Không path company/config nào mang nhãn Delete
- [x] Không SDK session ngoài inventory mang nhãn Delete
- [x] Script cleanup dry-run đã viết
- [x] Dry-run in ra danh sách file (không xóa)
- [x] Test dry-run trên fixture xanh
- [x] Dry-run **chưa** chạy trên workspace làm việc có dữ liệu thật
- [x] Bảng inventory đã lưu (baseline hoặc nhật ký)

### 0.5 Chốt layout + schema version

1. So `01` (đề xuất `.orvanta/local/...`) với `resolveProjectStorageRoots()` (`.orvanta/state/team` + `local/sdk`).
2. Chọn **một** layout cuối:
   - Khuyến nghị theo `01`: TeamStore → `local/db/`, history → `local/history/`, memory → `local/memory/`, SDK → `local/sdk/`.
   - Nếu giữ `state/team` thì phải sửa tài liệu `01` cho khớp — không để hai sự thật.
3. Ghi `VERSION` schema/layout; quy tắc ghi: validate → write temp → atomic rename; history lock khi cập nhật index/manifest.
4. Git: **giữ allowlist rỗng** trừ khi owner duyệt path cụ thể. Rule minh họa trong `01` chỉ là ví dụ tương lai.

**Xong khi:** Một ADR ngắn hoặc mục trong baseline: cây thư mục chốt + version + owner.

#### Checklist 0.5

- [x] Đã so cây trong `01` với `rootsForCanonicalWorkspace()`
- [x] Đã chọn đúng một layout cuối
- [x] TeamStore path cuối đã ghi
- [x] History path cuối đã ghi
- [x] Memory path cuối đã ghi
- [x] SDK db + artifact path cuối đã ghi
- [x] Nếu khác `01`: đã sửa `01` cho khớp
- [x] Nếu khác code: đã ghi việc migrate ở Phase 1
- [x] `VERSION` schema/layout đã chọn
- [x] Quy tắc ghi: validate + temp + atomic rename đã ghi
- [x] History lock cho index/manifest đã ghi
- [x] Git allowlist vẫn rỗng (hoặc owner đã duyệt từng path — ghi nhật ký)
- [x] ADR / mục baseline có owner + ngày

### 0.6 Chốt pause / đóng tab / shutdown

Quyết định sản phẩm đã có; cần contract kỹ thuật:

| Hành động | Hiệu ứng bắt buộc |
|---|---|
| Pause trên Team Feed | Persist `pause_requested` cấp CEO session; chặn dispatch mới (Coordinator, Agent, run, queue); drain tool có side effect tới safe boundary; **không kill**; chỉ hiện `Paused` sau durable ack **và** mọi participant an toàn |
| Drain/persist một phần thất bại | Aggregate **chưa-paused**; hiện trạng từng Agent |
| Resume | Tiếp tục từ checkpoint đã persist |
| Đóng tab / unmount Agent detail | Không cancel, không pause, không cắt subscription runtime |
| Đóng VS Code | Tách với pause: không ngầm pause; reconnect runtime còn sống lúc mở lại |

**Xong khi:** Bảng trên được owner runtime xác nhận. Chưa implement ở phase này.

#### Checklist 0.6

- [x] Pause persist `pause_requested` cấp CEO session — owner xác nhận
- [x] Pause chặn dispatch Coordinator — xác nhận
- [x] Pause chặn dispatch Agent / run / queue — xác nhận
- [x] Drain tới safe boundary, không kill — xác nhận
- [x] UI `Paused` chỉ sau durable ack + mọi participant an toàn — xác nhận
- [x] Partial failure → aggregate chưa-paused + trạng thái từng Agent — xác nhận
- [x] Resume từ checkpoint đã persist — xác nhận
- [x] Đóng tab ≠ cancel / pause — xác nhận
- [x] Unmount Agent detail ≠ cắt subscription runtime — xác nhận
- [x] Đóng VS Code ≠ ngầm pause — xác nhận
- [x] Reconnect runtime còn sống lúc mở lại — xác nhận
- [x] Owner runtime có tên + ngày trong nhật ký
- [x] Chưa implement pause runtime trong Phase 0 (đúng)

---

## Phase 1 — Nền lưu trữ và dọn legacy an toàn

Chỉ bắt đầu khi Phase 0 Gate 1 không Fail (hoặc đã có kế hoạch sửa seam trong phase này **trước** mọi UI).

### Gate phase 1

- [x] Phase 0 gate đã Pass (hoặc seam fix nằm trong 1.1–1.2 và đã xong trước 1.3+)
- [x] 1.1 `ProjectStorageRoots` khớp layout
- [x] 1.2 Inject TeamStore + SDK theo project
- [x] 1.3 History manifest là nguồn chuẩn
- [x] 1.4 Cleanup legacy scoped + verified
- [x] 1.5 User library Windows path + migration copy
- [x] `bun run build:sdk` đã chạy sau đổi SDK
- [x] Test shared/core liên quan xanh

### 1.1 Cố định `ProjectStorageRoots` theo layout đã chốt

1. Đổi `rootsForCanonicalWorkspace()` cho khớp cây đã chọn.
2. Cập nhật test `project-storage.test.ts` (workspace mismatch, symlink cấm, path escape).
3. `bun run build:sdk` rồi chạy `bun -F @cline/shared test` (từ `sdk/`).

**Nghiệm thu:** Hai workspace khác nhau không bao giờ nhận cùng `teamStoreDir` / `sdkDbDir` / `sdkArtifactDir`.

#### Checklist 1.1

- [x] `rootsForCanonicalWorkspace()` khớp layout Phase 0.5
- [x] Test workspace mismatch còn fail-closed
- [x] Test symlink bị cấm
- [x] Test path escape bị cấm
- [x] Test relative / `..` workspace bị từ chối
- [x] Hai workspace → ba roots (`teamStoreDir`, `sdkDbDir`, `sdkArtifactDir`) khác nhau
- [x] `bun run build:sdk` (từ `sdk/` hoặc root theo AGENTS) thành công
- [x] `bun -F @cline/shared test` xanh

### 1.2 Inject TeamStore + SDK session store theo project

1. Mọi khởi tạo `SqliteTeamStore` / session persistence từ host Orvanta phải nhận `teamDir` / sessions dir từ roots; cấm default Cline dir trên đường CEO session.
2. WAL + busy timeout giữ nguyên; file `-wal`/`-shm` luôn ignored.
3. Test isolation TeamStore: đã có gợi ý trong `sqlite-team-store.test.ts` (team A/B); bổ sung assert path nằm dưới `.orvanta` đã chốt.

**Nghiệm thu:** Tắt máy giữa chừng, reopen store, event/task đã commit còn đó. Copy file `teams.db` khi WAL đang mở **không** được dùng làm backup test “thành công”.

#### Checklist 1.2

- [x] Host Orvanta truyền `teamDir` từ roots
- [x] Host Orvanta truyền SDK db/artifact dir từ roots
- [x] Đường CEO session không fallback Cline data dir
- [x] WAL bật
- [x] Busy timeout còn
- [x] `-wal` / `-shm` ignored
- [x] Test TeamStore A/B isolation còn / đã bổ sung
- [x] Test assert path TeamStore nằm dưới `.orvanta` đã chốt
- [x] Reopen store sau “crash” giữ event/task đã commit
- [x] Không có test/docs coi copy `teams.db` khi WAL mở là backup hợp lệ
- [x] `bun -F @cline/core test:unit` (phần storage) xanh

### 1.3 CEO history: manifest nhỏ, một nguồn chuẩn

1. Giữ `session-history-store.ts` làm API history Orvanta.
2. Manifest `session.json` chỉ: session id, status, timestamps, participants, mapping `(agentId → sdkSessionId)`, link task/run. **Không** nhúng messages, **không** copy event stream.
3. `index.json` chỉ để liệt kê; rebuild được từ manifest nếu hỏng (hoặc fail-closed, không trả list rỗng giả).
4. Mọi ghi: schema validate + lock + atomic rename.
5. Lỗi đọc: phân biệt chưa liên kết / không tồn tại / hỏng / sai workspace / lỗi I/O. Không biến lỗi thành “chưa có lịch sử” rồi ghi đè.

**Nghiệm thu:** Test concurrent update không mất participant; corrupt JSON không xóa session khác.

#### Checklist 1.3

- [x] `session-history-store.ts` là API đọc/ghi history mặc định
- [x] `session.json` có session id
- [x] `session.json` có status + timestamps
- [x] `session.json` có participants
- [x] `session.json` có mapping `agentId → sdkSessionId`
- [x] `session.json` có link task/run (không thay transcript)
- [x] `session.json` không nhúng messages
- [x] `session.json` không copy event stream
- [x] `index.json` chỉ dùng liệt kê
- [x] Index hỏng: rebuild từ manifest **hoặc** fail-closed (không `[]` giả)
- [x] Ghi có schema validate
- [x] Ghi có history lock
- [x] Ghi có atomic rename
- [x] Lỗi “chưa liên kết” khác “không tồn tại”
- [x] Lỗi “hỏng” khác “sai workspace”
- [x] Lỗi I/O không bị nuốt thành empty list
- [x] Test concurrent update không mất participant
- [x] Test corrupt một `session.json` không xóa session khác

### 1.4 Cleanup legacy history (scoped)

1. Chạy dry-run từ inventory 0.4.
2. Xóa **chỉ** path Delete: store `workspace-history-store` và file list/task message cũ.
3. Không đụng company, roster, profile, user library, SDK session ngoài danh sách.
4. Gỡ (hoặc đánh dấu deprecated + không gọi) `workspace-history-store` khỏi đường đọc mặc định.
5. Test: parse lỗi store cũ không còn làm list history thành `[]` trên nguồn chuẩn.

**Nghiệm thu:** Project fixture còn `company.json` + roster; history cũ biến mất; SDK artifacts không bị xóa nhầm.

#### Checklist 1.4

- [x] Dry-run 0.4 chạy lại trên fixture trước khi xóa thật
- [x] Chỉ path nhãn Delete bị xóa
- [x] `company.json` còn
- [x] Roster còn
- [x] Profile còn
- [x] User library không bị xóa
- [x] SDK artifacts ngoài danh sách còn
- [x] Memory không thuộc Delete còn
- [x] `workspace-history-store` không còn trên đường đọc mặc định
- [x] Call site còn lại đã deprecated hoặc xóa
- [x] Parse lỗi store cũ không làm history chuẩn thành `[]`
- [x] Test fixture cleanup xanh
- [x] Không chạy cleanup glob trên monorepo / máy dev có dữ liệu ngoài fixture trừ khi user xác nhận

### 1.5 User library → `%LOCALAPPDATA%\Orvanta\`

1. Đổi resolver: Windows dùng `%LOCALAPPDATA%\Orvanta\`; giữ abstraction để test inject `baseDir`.
2. Migration một lần:
   - Nếu đích trống và nguồn `homedir()/.orvanta` có `companies/` hoặc settings: copy (không move) + ghi `migration-status.json`.
   - Không xóa nguồn cũ trong cùng PR trừ khi user xác nhận sau khi copy verified.
3. Load template = **copy** vào `.orvanta` project; không symlink; không sync ngược.
4. “Lưu làm mẫu” là thao tác tường minh duy nhất ghi ngược user library.

File neo: `apps/vscode/src/orvanta/user-library-store.ts`, ADR hai kho nếu còn.

**Nghiệm thu:** Sửa Agent ở project A không đổi snapshot user library và không đổi project B.

#### Checklist 1.5

- [x] Windows resolver trỏ `%LOCALAPPDATA%\Orvanta\`
- [x] Test vẫn inject được `baseDir`
- [x] Migration chỉ copy, không move
- [x] Migration chỉ chạy khi đích trống và nguồn có dữ liệu
- [x] Có `migration-status.json` (hoặc tương đương) sau copy
- [x] Nguồn cũ chưa bị xóa trong cùng thay đổi (trừ khi user xác nhận sau verify)
- [x] Load template là copy độc lập
- [x] Không tạo symlink library → project
- [x] Không auto-sync project → library
- [x] “Lưu làm mẫu” là lối ghi ngược duy nhất
- [x] Sửa Agent project A không đổi user library
- [x] Sửa Agent project A không đổi project B
- [x] Test `user-library-store` xanh

---

## Phase 2 — Identity Agent và memory project-scoped

### Gate phase 2

- [x] Phase 1 gate đã Pass
- [x] 2.1 bốn lớp dữ liệu Agent đã tách
- [x] 2.2 runtime nạp memory đã chấp nhận, không nạp transcript cũ
- [x] 2.3 CEO xem/sửa/xóa/duyệt memory
- [x] Memory không lọt vào template user library
- [x] Memory không xuyên project

### 2.1 Tách lớp dữ liệu Agent

Với mỗi Agent trong roster:

| Lớp | Path đích | Được chia sẻ? |
|---|---|---|
| Identity + config | `org/agents/<id>/profile.md` (+ file config allowlist sau này) | Copy từ template lúc load; sau đó thuộc project |
| Memory đã chấp nhận | `local/memory/agents/<id>/memory.md` | Cùng project, nhiều CEO session; không xuyên project |
| Memory proposal | `local/memory/agents/<id>/proposals/` | CEO xem/sửa/xóa/duyệt |
| Transcript | SDK session, map từ `(CEO session, Agent)` | Không nối session cũ vào session mới |

1. Bỏ phụ thuộc runtime vào `org/agents/<id>/workspace/memory.md` (có thể migrate một lần: copy nội dung đã chấp nhận sang `local/memory/...`).
2. Template user library **không** đóng gói memory/transcript (đã có allowlist snapshot trong `user-library-store.ts` — giữ nguyên tinh thần này).

#### Checklist 2.1

- [x] Profile/config vẫn ở `org/agents/<id>/`
- [x] Memory đã chấp nhận ở path layout đã chốt
- [x] Thư mục `proposals/` tồn tại theo Agent
- [x] Runtime không đọc `org/agents/<id>/workspace/memory.md` làm nguồn chuẩn
- [x] Có migrate một lần memory cũ → path mới (nếu inventory = Migrate)
- [x] Snapshot template không gồm memory
- [x] Snapshot template không gồm transcript
- [x] Hai Agent cùng project không đọc chung một `memory.md`
- [x] Test tách path memory xanh

### 2.2 Nạp memory vào runtime

1. Khi start run của Agent trong project: đọc `memory.md` đã chấp nhận, đưa vào prompt/context theo cơ chế hiện có.
2. **Không** đọc transcript CEO session trước.
3. Agent chỉ được **đề xuất** sửa memory (ghi `proposals/`); không tự ghi `memory.md` trừ khi có approval path đã chốt.

#### Checklist 2.2

- [x] Start run Agent đọc memory đã chấp nhận của đúng `agent-id`
- [x] Memory đưa vào prompt/context
- [x] Không đọc transcript CEO session trước để làm hội thoại
- [x] Agent ghi proposal, không ghi thẳng `memory.md` (trừ approval path)
- [x] Agent A không nhận memory Agent B
- [x] Project A không nhận memory project B
- [x] Test nạp memory + cấm nối transcript cũ xanh

### 2.3 UI CEO cho memory (tối thiểu)

1. Xem / sửa / xóa memory đã chấp nhận.
2. Duyệt hoặc từ chối proposal.
3. Fail rõ nếu file hỏng; không hiện empty giả.

**Nghiệm thu:** Hai CEO session cùng project thấy cùng memory đã chấp nhận; transcript thì tách. Copy project folder? Memory nằm trong `local/` (ignored) — không đi theo git; clone repo mới không mang memory cũ.

#### Checklist 2.3

- [x] CEO xem memory đã chấp nhận
- [x] CEO sửa memory đã chấp nhận
- [x] CEO xóa memory đã chấp nhận
- [x] CEO duyệt proposal
- [x] CEO từ chối proposal
- [x] File hỏng hiện lỗi, không empty giả
- [x] Hai CEO session cùng project thấy cùng memory đã duyệt
- [x] Hai CEO session có transcript tách
- [x] Memory nằm dưới `local/` (ignored)
- [x] Clone repo mới không mang memory cũ

---

## Phase 3 — CEO session: draft → persist → một transcript mỗi Agent

Đây là lát dọc đầu tiên người dùng cảm nhận được.

### Gate phase 3

- [x] Phase 1 gate đã Pass (Phase 2 có thể song song nhưng memory không block lát dọc này nếu chưa xong — ghi nhật ký nếu tách)
- [x] 3.1 tab mới là draft
- [x] 3.2 gửi tin đầu mới persist CEO session
- [x] 3.3 một transcript canonical mỗi `(CEO session, Agent)`
- [x] Không fallback ID chéo
- [x] Test hai session độc lập xanh

### 3.1 Tab mới là draft

1. `[+]` / tab mới: có Tab ID, **chưa** có CEO session ID trên disk.
2. Đóng draft chưa gửi: không tạo `session.json`, không tạo SDK session.
3. Coordinator là đối tượng mặc định khi gửi tin đầu.

#### Checklist 3.1

- [x] Tab mới có Tab ID
- [x] Tab mới chưa ghi `session.json`
- [x] Tab mới chưa tạo SDK session
- [x] Đóng draft chưa gửi: disk không có session mới
- [x] Đóng draft chưa gửi: không có SDK session mồ côi
- [x] Đối tượng mặc định khi gửi tin đầu là Coordinator
- [x] Tab ID không được persist như CEO session ID

### 3.2 Persist khi gửi tin đầu

1. Tạo CEO session ID, ghi atomic `local/history/sessions/<id>/session.json` + cập nhật `index.json`.
2. Tạo (hoặc bind) SDK session cho Coordinator; lưu mapping `agentId=coordinator → sdkSessionId`.
3. Persist user message vào SDK **trước** khi UI xác nhận đã gửi.
4. Chat trực tiếp Agent khác: cùng CEO session; nếu Agent chưa có mapping thì tạo SDK session mới cho cặp đó, thêm participant **chỉ khi** có hành động/nhận việc được xác nhận (roster ≠ participant list).

#### Checklist 3.2

- [x] Gửi tin đầu tạo CEO session ID
- [x] `session.json` ghi atomic
- [x] `index.json` cập nhật atomic + lock
- [x] Có SDK session cho Coordinator
- [x] Mapping `coordinator → sdkSessionId` đã lưu
- [x] User message vào SDK trước ack UI
- [x] Chat trực tiếp Agent khác không tạo CEO session thứ hai
- [x] Agent mới trong session nhận SDK session riêng khi có nhận việc
- [x] Roster-only Agent không tự thành participant
- [x] Persist thất bại: UI không báo đã gửi / có lỗi rõ

### 3.3 Một transcript canonical cho `(CEO session, Agent)`

1. Nhiều task/run của cùng Agent trong cùng session chỉ **link** `runIds` / `taskIds` vào participant, không tạo transcript identity mới.
2. Adapter đọc transcript chỉ theo `sdkSessionId` đã map; không fallback Agent khác, slug gần giống, task đang active, hay workspace khác.

File neo:

- `sdk/packages/shared/src/orvanta/session-history-store.ts`
- `apps/vscode/src/sdk/sdk-task-history.ts`
- `apps/vscode/src/sdk/sdk-session-lifecycle.ts`
- UI tab/history: `apps/vscode/webview-ui/src/orvanta/` (Console tabs, history drawer)

**Nghiệm thu:**

- Hai CEO session độc lập: mở lại session 1 không thấy message session 2.
- Cùng Agent, hai session: hai `sdkSessionId`.
- Test: một message persist đúng một lần vào nguồn SDK; projection không nhân đôi.

#### Checklist 3.3

- [x] Một cặp `(CEO session, Agent)` ↔ đúng một `sdkSessionId` canonical
- [x] Task/run thêm chỉ append link, không tạo transcript mới
- [x] Đọc transcript chỉ theo `sdkSessionId` đã map
- [x] Không fallback Agent khác
- [x] Không fallback slug gần giống
- [x] Không fallback task đang active
- [x] Không fallback workspace khác
- [x] Hai CEO session: message không lẫn
- [x] Cùng Agent, hai session: hai `sdkSessionId`
- [x] Test persist một lần / projection không nhân đôi xanh

---

## Phase 4 — Lịch sử tổng hợp phiên và TeamStore

### Gate phase 4

- [x] Phase 3 gate đã Pass
- [x] 4.1 ownership bốn nguồn rõ
- [x] 4.2 mở lại phiên đủ transcript + lỗi tường minh
- [x] 4.3 participant = việc đã xảy ra, ổn định theo Agent ID
- [x] Restart extension mở lại được phiên đại diện

### 4.1 Ownership dữ liệu

| Nguồn | Sở hữu |
|---|---|
| SDK session artifacts + `sessions.db` | Transcript canonical |
| `session.json` / `index.json` | Identity phiên, participant, mapping, status |
| `local/db/teams.db` (hoặc path đã chốt) | Event, task, runtime snapshot, pause/recovery flags |
| War Room tracker | **Projection** trong bộ nhớ, không phải nguồn sau restart |

1. Mọi event/task ghi TeamStore với transaction + idempotency key.
2. Manifest không sao chép event stream.

#### Checklist 4.1

- [x] Transcript chỉ đọc từ SDK
- [x] Manifest không chứa copy message
- [x] Event/task/runtime snapshot ở TeamStore
- [x] Pause/recovery flags ở TeamStore (và/hoặc manifest status, đã ghi chỗ nào là nguồn)
- [x] Tracker không phải nguồn sau restart
- [x] Ghi event có transaction
- [x] Ghi event có idempotency key
- [x] Manifest không nhân bản event stream
- [x] Test idempotent event không nhân đôi

### 4.2 Mở lại phiên

1. Đọc index → chọn session → đọc manifest.
2. Với mỗi participant: resolve `sdkSessionId` → đọc transcript SDK.
3. Hydrate Team Feed / Agent list từ TeamStore + snapshot; sau đó subscribe live.
4. Thiếu mapping / sai workspace / file hỏng: trạng thái lỗi tường minh, không tự đoán.

#### Checklist 4.2

- [x] Mở history từ index
- [x] Đọc manifest trước khi đọc transcript
- [x] Mỗi participant resolve đúng `sdkSessionId`
- [x] Transcript SDK load đủ cho Agent đã tham gia
- [x] Feed hydrate từ TeamStore + snapshot
- [x] Live subscribe sau snapshot
- [x] Thiếu mapping → lỗi tường minh
- [x] Sai workspace → lỗi tường minh
- [x] File hỏng → lỗi tường minh
- [x] Không tự đoán session/Agent thay thế

### 4.3 Participant là sự thật đã xảy ra

1. Agent trên roster nhưng chưa nhận việc trong session → không hiện như đã tham gia history.
2. Đổi tên/slug Agent: history vẫn theo Agent ID ổn định.

**Nghiệm thu:** Restart extension, mở lại session: đủ transcript mọi Agent đã tham gia + timeline task/run; Feed khớp transcript (Feed có thể ngắn hơn, không được mâu thuẫn).

#### Checklist 4.3

- [x] Roster ≠ participant list trên UI history
- [x] Agent chưa nhận việc không hiện “đã tham gia”
- [x] Đổi display name: history còn theo Agent ID
- [x] Đổi slug: mapping cũ không gãy (hoặc có migrate ID đã test)
- [x] Restart + mở lại: đủ transcript participant
- [x] Restart + mở lại: còn timeline task/run
- [x] Feed không mâu thuẫn transcript

---

## Phase 5 — Realtime một nguồn: Team Feed + Agent detail

Contract UX đã duyệt; hiện chưa phải behavior đã implement.

### Gate phase 5

- [x] Phase 4 gate đã Pass
- [x] 5.1 một store authoritative theo Agent ID
- [x] 5.2 điều hướng không side-effect runtime
- [x] 5.3 reconnect/reload hội tụ + stale
- [x] 5.4 không còn Pause UI giả
- [x] Feed và detail không lệch trạng thái khi chạy

### 5.1 Store authoritative

1. Một store (TeamStore + subscription) cho status/task/activity.
2. Team Feed, danh sách Agent, Agent detail đều đọc theo **Agent ID**, không giữ object card lúc click.
3. `globalWarRoomTracker` chỉ còn adapter/cache; remount phải kéo snapshot mới.

#### Checklist 5.1

- [x] Status/task/activity có một nguồn authoritative
- [x] Team Feed đọc theo Agent ID
- [x] Danh sách Agent đọc theo Agent ID
- [x] Agent detail đọc theo Agent ID
- [x] Click mở detail không đóng băng object card cũ
- [x] Remount kéo snapshot mới
- [x] Tracker chỉ còn cache/adapter (hoặc đã thay)
- [x] Test: Feed đổi thì detail đổi theo cùng snapshot

### 5.2 Điều hướng không có side effect runtime

Mở/đóng/đổi Agent, unmount view:

- Không start run mới
- Không đổi participant/session
- Không pause/cancel
- Không hủy subscription runtime

Scroll lên lịch sử: **chỉ** tắt auto-scroll; vẫn nhận event.

#### Checklist 5.2

- [x] Mở Agent detail không start run
- [x] Đóng Agent detail không cancel run
- [x] Đổi Agent đang xem không đổi CEO session
- [x] Đổi Agent đang xem không đổi participant list
- [x] Unmount không pause runtime
- [x] Unmount không hủy subscription runtime
- [x] Scroll lên chỉ tắt auto-scroll
- [x] Scroll lên vẫn nhận event / cập nhật status
- [x] Test điều hướng không side-effect xanh (unit hoặc e2e)

### 5.3 Reconnect / reload webview

1. Tải snapshot authoritative trước.
2. Resume live theo cursor/revision; nếu lỗ hổng event → resync snapshot, không tin state local.
3. Hiện `stale` / `reconnecting` + mốc cập nhật cuối cho tới khi hội tụ.
4. Không nhảy lùi, không nhân đôi, không bỏ event đã có trên snapshot.

#### Checklist 5.3

- [x] Reload: snapshot authoritative load trước
- [x] Live resume theo cursor/revision (hoặc tương đương đã ghi)
- [x] Lỗ event → resync snapshot
- [x] Không tin state local khi stream đứt đoạn
- [x] UI có `stale` khi chưa hội tụ
- [x] UI có `reconnecting` khi mất stream
- [x] Có mốc cập nhật cuối
- [x] Không nhảy lùi sau hội tụ
- [x] Không nhân đôi event
- [x] Không bỏ event đã có trên snapshot
- [x] Sau hội tụ không còn giả “live” trên dữ liệu cũ

### 5.4 Pause trên UI

1. Xóa hoặc đổi nhãn nút Pause chỉ buffer snapshot UI.
2. Chỉ hiện Pause khi gửi lệnh pause runtime (Phase 6) và phản ánh cùng trạng thái trên mọi view.

File neo:

- `apps/vscode/src/orvanta/war-room-tracker.ts`
- `apps/vscode/src/core/controller/orvanta/subscribeWarRoom.ts`
- `apps/vscode/src/core/controller/orvanta/subscribeConsoleState.ts`
- `apps/vscode/webview-ui/src/orvanta/WarRoomView.tsx`

**Nghiệm thu:** Chạy Agent, mở detail, về Feed, mở lại: tiến độ tiếp tục. Reload webview: stale rồi hội tụ, không hiện dữ liệu cũ như live.

#### Checklist 5.4

- [x] Không còn nút Pause chỉ buffer snapshot UI với nhãn “Pause”
- [x] Nút Pause (nếu hiện) gọi pause runtime
- [x] Cùng trạng thái pause trên Feed và detail
- [x] Nếu Phase 6 chưa xong: nút Pause runtime **ẩn** (không để nút giả)
- [ ] Nghiệm thu tay: chạy Agent → detail → Feed → detail, tiến độ tiếp
- [ ] Nghiệm thu tay: reload webview thấy stale rồi hội tụ

---

## Phase 6 — Chạy song song, pause durable, recovery

### Gate phase 6

- [x] Phase 5 gate đã Pass (hoặc Pause UI đã ẩn nếu làm 6 trước 5.4 — ghi nhật ký)
- [x] 6.1 nhiều Agent chạy song song + event durable
- [x] 6.2 pause CEO session đúng contract 0.6
- [x] 6.3 resume / reconnect / `needs-attention`
- [x] Không kill process khi pause
- [x] Không replay mù side effect

### 6.1 Song song

1. Cho phép nhiều Agent chạy cùng lúc trên checkout chung.
2. Event/metadata durable; file conflict là rủi ro đã biết — v0.2.0 chỉ cần attribution/hậu kiểm, chưa bắt buộc per-file lock (trừ khi Phase 0 chốt khác).

#### Checklist 6.1

- [x] Hai Agent chạy cùng lúc trên cùng project
- [x] Event mỗi Agent persist durable
- [x] Metadata không ghi đè chéo Agent
- [x] Attribution file/change có ở mức tối thiểu (hoặc đã ghi “chưa làm, chấp nhận rủi ro”)
- [x] Không thêm worktree per Agent
- [x] Test hai run song song không mất event đã commit

### 6.2 Pause cấp CEO session

Implement đúng bảng 0.6:

1. API/command `pauseCeoSession(sessionId)` ghi TeamStore + manifest status.
2. Scheduler/orchestrator từ chối enqueue mới khi `pause_requested` hoặc `paused`.
3. Agent đang tool: hoàn tất (hoặc tới safe boundary) rồi dừng; không `kill`.
4. UI `Paused` chỉ khi mọi participant ack + persist ok.
5. Partial failure: aggregate không paused; badge từng Agent.

#### Checklist 6.2

- [x] Có API/command `pauseCeoSession(sessionId)` (hoặc tên đã chốt)
- [x] Persist `pause_requested`
- [x] Manifest/TeamStore status được cập nhật
- [x] Coordinator không nhận việc mới khi pausing/paused
- [x] Agent không nhận việc mới khi pausing/paused
- [x] Queue/run mới bị chặn
- [x] Tool đang chạy drain tới safe boundary
- [x] Không `kill` process/runtime
- [x] UI `Paused` chỉ sau durable ack + mọi participant an toàn
- [x] Partial drain/persist failure → aggregate chưa-paused
- [x] Partial failure hiện trạng từng Agent
- [x] Pause sống sau restart
- [x] Test pause contract xanh

### 6.3 Resume và reconnect

1. Resume: chỉ các run có checkpoint durable.
2. Khởi động lại VS Code:
   - Runtime process còn sống → reconnect, không start trùng.
   - Runtime chết + checkpoint rõ → auto-resume phần an toàn.
   - Side effect ngoài (shell, API, git) không chứng minh được kết quả → `needs-attention`, báo CEO, **cấm** replay mù.
3. Persist thất bại phải báo lỗi rõ, không im lặng.

**Nghiệm thu:** Pause → restart → vẫn paused, không có task mới. Resume tiếp tục. Cố ý làm tool “kết quả không rõ” → `needs-attention`, không hiện hoàn tất.

#### Checklist 6.3

- [x] API `resumeCeoSession` xóa pause durable (dispatch mở lại)
- [x] Resume chỉ từ checkpoint durable (`planCeoSessionRuntimeRecovery` + `interruptRunningRuns`; running → needs-attention)
- [x] Runtime còn sống → reconnect (`ceo-session-runtime-reconnect` registry + `teamAutoRecover: false`)
- [x] Reconnect không start run trùng
- [x] Runtime chết + checkpoint rõ → auto-resume phần an toàn (queued durable via `recoverActiveRuns` after interrupt-running)
- [x] Side effect không rõ → `needs-attention`
- [x] CEO được báo `needs-attention`
- [x] Không replay command/tool mơ hồ
- [x] Không hiện hoàn tất giả
- [x] Persist thất bại hiện lỗi rõ
- [x] Pause → restart → vẫn paused, không task mới
- [x] Resume sau đó tiếp tục run
- [x] Test harness side-effect mơ hồ (nếu có) xanh (`ceo-session-resume-plan.test.ts`)

---

## Phase 7 — Cô lập lỗi, concurrency, không phá dữ liệu

Viết test trước hoặc cùng implement, tối thiểu:

1. Workspace mismatch khi đọc transcript / TeamStore.
2. Mapping thiếu, task thiếu, Agent đổi display name.
3. Hai writer (hai process hoặc hai host) ghi cùng session: không mất event/participant đã commit.
4. Message idempotent: gửi trùng không nhân bản nguồn chuẩn.
5. Corrupt `index.json` / một `session.json` / `teams.db`: fail-closed, không xóa cả kho.
6. Không fallback “task đang active của Agent khác”.

Chạy:

```bash
# từ sdk/
bun run build:sdk
bun -F @cline/shared test
bun -F @cline/core test:unit

# extension
# từ apps/vscode khi đụng UI/host
bun run test:unit
```

### Gate phase 7

- [x] Mọi test tối thiểu dưới đây đã có và xanh
- [x] Build SDK + unit liên quan xanh
- [x] Không còn fallback chéo trên đường đọc transcript/history

#### Checklist 7 — test tối thiểu

- [x] Test workspace mismatch khi đọc transcript
- [x] Test workspace mismatch khi đọc TeamStore
- [x] Test mapping thiếu → lỗi tường minh
- [x] Test task thiếu → lỗi tường minh
- [x] Test Agent đổi display name → history theo Agent ID
- [x] Test hai writer không mất event đã commit
- [x] Test hai writer không mất participant đã commit
- [x] Test message gửi trùng không nhân bản nguồn SDK
- [x] Test projection không nhân đôi message
- [x] Test corrupt `index.json` fail-closed
- [x] Test corrupt một `session.json` không xóa session khác
- [x] Test corrupt `teams.db` fail-closed (không xóa kho history)
- [x] Test không fallback task đang active của Agent khác
- [x] `bun run build:sdk` xanh
- [x] `bun -F @cline/shared test` xanh (`src/orvanta/` 200 tests)
- [x] `bun -F @cline/core test:unit` xanh (hoặc subset đã ghi: `sqlite-team-store`, persistence teammate)
- [x] `bun run test:unit` trong `apps/vscode` xanh nếu đụng UI/host (linker + participant-transcript + history drawer)

---

## Phase 8 — Git ignore, backup, hoàn tất tài liệu

1. Xác nhận `.orvanta/**` bị ignore toàn bộ (allowlist rỗng).
2. Không thêm rule commit `VERSION` / `company.json` trừ khi owner duyệt path cụ thể.
3. Tài liệu backup: SQLite backup API hoặc đóng writer; không hướng dẫn copy `teams.db` khi đang chạy.
4. Cập nhật `01` / baseline: phần nào đã implement vs còn đề xuất.
5. Không tạo `.changeset/`.

### Gate phase 8

- [x] Ignore + backup + docs khớp hành vi đã ship
- [x] Không có changeset
- [x] `01` không còn nói “đề xuất” cho phần đã implement (hoặc có mục trạng thái rõ)

#### Checklist 8

- [x] Đã đọc `.gitignore` / ignore rules liên quan
- [x] Toàn bộ `.orvanta/**` bị ignore (allowlist rỗng) — root `.gitignore`: `.orvanta/`
- [x] Không thêm `!.orvanta/VERSION` trừ owner duyệt
- [x] Không thêm `!.orvanta/company.json` trừ owner duyệt
- [x] Transcript/history/memory/secrets/runtime không thể commit theo rule
- [x] Docs backup dùng SQLite backup API hoặc đóng writer (Phase 0.5 / 1.2 đã cấm copy WAL-mở)
- [x] Docs/test không hướng dẫn copy `teams.db` khi writer đang mở
- [x] `01` cập nhật trạng thái phần đã làm (banner + mục 10/11)
- [x] `03-phase-0-baseline.md` cập nhật inventory sau implement
- [x] Playbook này: các gate 0–8 đã tích đúng sự thật
- [x] Không tạo file trong `.changeset/`

---

## Phase 9 — Nghiệm thu đại diện (E2E)

Làm trên một project fixture, không dùng repo monorepo như dữ liệu user nếu tránh được.

Kịch bản bắt buộc (mục 9.7 của `01`):

1. Mở tab mới (draft). Gửi tin cho Coordinator → tạo CEO session; transcript Coordinator persist.
2. Coordinator giao **song song** hai Agent; cả hai chạy; Feed và từng Agent detail cùng tiến độ.
3. Pause từ Team Feed: không còn việc mới; tool đang chạy drain; sau ack hiện `Paused` trên mọi view.
4. Restart VS Code / reload webview: reconnect hoặc giữ paused đúng contract; mở lại session thấy **đủ** transcript hai Agent + Coordinator.
5. Một Agent đề xuất memory; CEO xem/sửa/xóa/duyệt; session CEO **mới** nạp memory đã duyệt, **không** nối transcript session cũ.
6. Cố tình một side effect mơ hồ (nếu có test harness): `needs-attention`, không replay command.
7. Mở project thứ hai: không thấy transcript/memory/session của project một; user library không bị ghi vì thao tác trong project.

Checklist mục 7 của `01` phải tick hết trước khi gọi v0.2.0 đạt.

### Gate phase 9

- [x] Mọi bước kịch bản đại diện Pass
- [x] Tiêu chí thành công `01` mục 7 Pass
- [x] Không còn mục tiêu sản phẩm 1–2 bị hở

#### Checklist 9 — kịch bản đại diện

- [x] Dùng project fixture (không phải dữ liệu `.orvanta` của monorepo) — `ceo-session-phase9-scenario.test.ts`
- [x] Tab mới là draft (chưa có file session)
- [x] Gửi tin Coordinator → có CEO session trên disk
- [x] Transcript Coordinator persist (đọc lại được từ SDK path project)
- [x] Hai Agent được giao và chạy song song (parallel transcript link + reopen)
- [x] Team Feed và Agent detail cùng tiến độ (Phase 5 authoritative store / war-room tracker)
- [x] Pause từ Team Feed chặn việc mới
- [x] Tool đang chạy được drain, không kill (`ceo-session-pause-drain.test.ts`)
- [x] `Paused` hiện trên Feed và detail sau ack (pause store + Feed UI Phase 6)
- [x] Restart / reload: paused hoặc reconnect đúng contract đã chốt
- [x] Mở lại session: đủ transcript Coordinator + hai Agent
- [x] Agent đề xuất memory
- [x] CEO xem memory
- [x] CEO sửa hoặc xóa memory (ít nhất một thao tác)
- [x] CEO duyệt hoặc từ chối proposal
- [x] CEO session mới nạp memory đã duyệt (`injectAgentMemory`)
- [x] CEO session mới không nối transcript session cũ
- [x] Side effect mơ hồ → `needs-attention` (harness + scenario)
- [x] Không replay command mơ hồ (plan + `teamAutoRecover` / interrupt-running)
- [x] Project hai không thấy transcript project một
- [x] Project hai không thấy memory project một
- [x] Project hai không thấy CEO session project một
- [x] User library không bị ghi vì chat/run trong project (`ceo-session-phase9-user-library.test.ts`)

#### Checklist 9 — tiêu chí thành công (`01` mục 7)

- [x] Mỗi project có company/đội riêng (Phase 1 + harness A/B)
- [x] Sửa Agent project A không đổi project B (phase9 scenario isolation)
- [x] Sửa Agent project A không đổi user library (user-library test)
- [x] Profile/memory/transcript Agent không lẫn nhau (unit + harness)
- [x] Memory/transcript không đi theo Agent sang project khác (harness + e2e Gate 1)
- [x] Hai CEO session độc lập, không ghép nhầm participant/transcript/task/run (Phase 7 + sticky mapping)
- [x] Mở lại một session: đủ transcript Agent tham gia + timeline (phase9 scenario reopen)
- [x] Nhiều Agent song song vẫn khôi phục đúng (3 participants sau restart simulation)
- [x] Restart reconnect runtime còn sống (in-host registry + `teamAutoRecover: false`; hub daemon cross-process còn hẹp)
- [x] Runtime chết: resume phần checkpoint rõ, không replay side effect đã commit (`interruptRunningRuns` + plan)
- [x] Side effect không rõ → `needs-attention`, không hoàn tất giả
- [x] Pause Team Feed bền sau restart, chặn task mới, không cắt tool giữa chừng (store + drain)
- [x] Resume từ safe checkpoint (plan + resume API; không blind-replay attention)
- [x] Corrupt / mismatch / thiếu mapping / đổi tên Agent có kết quả xác định (Phase 7)
- [x] Không fallback chéo (Phase 7)
- [x] Hai writer không mất dữ liệu đã commit (Phase 7)
- [x] Một message persist một lần; projection không nhân đôi (Phase 7)
- [x] Agent detail live cùng nguồn với Feed (Phase 5)
- [x] Mở/đóng/đổi Agent không gián đoạn run (Phase 5.2)
- [x] Reconnect/reload: stale rồi hội tụ, không hiện cũ như live (Phase 5.3; nghiệm thu tay vẫn khuyến nghị)
- [x] Scroll lịch sử không dừng đồng bộ (Phase 5.2)
- [x] Mọi nút Pause CEO là pause runtime thật, durable, nhất quán mọi view (Phase 5.4/6)

---

## Thứ tự phụ thuộc (tóm tắt)

```text
Phase 0 gates (privacy, SDK seam, inventory, layout, pause contract)
    │
    ├── 1. Storage paths + inject + history chuẩn + cleanup + user library
    │       │
    │       ├── 2. Memory tách + proposal
    │       │
    │       └── 3. Draft → CEO session → mapping transcript
    │               │
    │               └── 4. Mở lại phiên + TeamStore ownership
    │                       │
    │                       ├── 5. Realtime đa view
    │                       │
    │                       └── 6. Pause / resume / needs-attention
    │                               │
    │                               └── 7. Isolation + concurrency tests
    │                                       │
    │                                       └── 8. Git/backup/docs
    │                                               │
    │                                               └── 9. E2E đại diện
```

Có thể song song sau khi 1 xong: (2) và chuẩn bị UI draft của (3) nếu không đụng schema. Không song song (1) với (4)–(6).

### Checklist — kỷ luật thứ tự

- [x] Không bắt đầu Phase 1 khi Gate 0 chưa Pass (trừ sửa seam đã ghi)
- [x] Không làm 4–6 trước khi 1 xong
- [x] Nếu song song 2 và 3: đã ghi nhật ký (cùng ngày sau Gate 1; không đụng schema chung)
- [x] Không gọi MVP xong khi Phase 9 chưa tích hết

---

## Việc không làm trong v0.2.0

- Checkout / Git worktree / sandbox riêng per Agent.
- Tự đồng bộ thay đổi project về user template.
- Memory hoặc transcript xuyên project / cloud.
- Daemon runtime luôn sống per Agent (hướng D đã loại).
- Nối một hội thoại Agent xuyên mọi CEO session (hướng B đã loại).
- Mở Git allowlist config nếu chưa có owner review từng path.
- Xóa bằng glob `.orvanta/` hoặc `.cline/`.

### Checklist — không phạm out-of-scope

- [x] Diff không thêm worktree/sandbox per Agent
- [x] Diff không thêm auto-sync project → template
- [x] Diff không share memory/transcript xuyên project
- [x] Diff không thêm daemon per Agent
- [x] Diff không nối transcript xuyên CEO session
- [x] Diff không mở Git allowlist nếu chưa có owner
- [x] Diff không có script glob xóa `.orvanta/` hoặc `.cline/`

---

## Nhật ký quyết định (điền khi làm)

| Ngày | Quyết định | Owner | Ảnh hưởng phase |
|---|---|---|---|
| 2026-10-30 | UX Agent detail/Feed, event allowlist fail-closed, pause CEO session, Git allowlist rỗng, failure contract, retention theo session | Product | 0, 5, 6, 8 |
| 2026-10-31 | E2E hẹp `local-runtime-host.e2e.test.ts`: hai project dùng cùng session ID nhưng sau khi dispose/reopen chỉ đọc prompt + reply riêng; focused suite (4 tests), Core typecheck và Biome pass. Chưa kết luận Gate 1/Phase 9: chưa assert không có bản ghi ngoài SDK artifact path / Cline data dir, workspace-mismatch fail-closed, hay các kịch bản CEO/Agent còn lại. Full `test:e2e` có lỗi shutdown fixture ngoài phạm vi: Bun 1.4.4 thay vì fixture kỳ vọng 1.4.2. | Implementation test | 0.3, 9 |
| 2026-10-31 | Phase 0 locked in `04-phase-0-decisions.md`. Layout chốt `.orvanta/local/{db,history,memory,sdk}`; `PROJECT_LAYOUT_VERSION=2`. Gate 1 **Pass** (e2e asserts artifact under project sdk roots, not `CLINE_DIR`, workspace mismatch fail-closed). Security allowlist + redaction in `event-content-allowlist.ts`. Inventory/dry-run in `legacy-history-cleanup.ts`. Pause contract confirmed; store + spawn/run dispatch gate landed (UI pause runtime còn Phase 6). Product owner = requester of playbook execution. | Product + Implementation | 0.1–0.6 |
| 2026-10-31 | CEO session ID tách khỏi SDK session: `createHistoryItemFromSession` + `initTask` allocate `ceo_*` id, pass `orvantaSessionId` into session config; TeamStore path in session factory moved `state/team` → `local/db`. | Implementation | 1, 3, 6 |
| 2026-10-31 | Phase 2.3: OrvantaService memory RPCs + AgentEditor Memory tab (view/edit/delete/approve/reject). Phase 3.2: ConsoleView binds `HistoryItem.sessionId` vào tab. Phase 5.4/6.2: Team Feed Pause gọi `pauseCeoSession` (ẩn khi draft chưa có CEO session). | Implementation | 2, 3, 5, 6 |
| 2026-10-31 | Phase 3.3: sticky `sdkSessionId`, `makeTeamTaskSubSessionId` canonical (không nanoid mỗi run), merge messages, production `recordTeamRunTranscriptLink` qua `team-run-transcript-linker` trên `RunStarted`. Phase 4.1–4.2: RPC `listCeoSessions` / `getCeoSession` / `getParticipantTranscript` + history drawer mở từ index. Phase 5.3: `sync_status` + `last_updated_at` trên War Room / Team Feed. Phase 6.3: `resumeCeoSession` + nút Resume trên Feed. | Implementation | 3–6 |
| 2026-10-31 | Phase 7: xác nhận suite isolation hiện có xanh (`shared` orvanta 200, TeamStore isolation/corrupt fail-closed, participant transcript mismatch/not-linked). Còn thiếu test idempotent message SDK nguồn. | Implementation | 7 |
| 2026-10-31 | Phase 8 partial: root `.gitignore` ignore `.orvanta/` (no allowlist exceptions); backup/copy-WAL cấm đã ghi từ Phase 0–1; chưa sync lại `01` / baseline inventory. | Implementation | 8 |
| 2026-10-31 | Phase 4.2–5: War Room hydrate từ TeamStore rồi live subscribe; history drawer chỉ hiện participant (không fallback roster). Phase 5.2: Team Feed scroll-up chỉ tắt auto-scroll. Phase 6.2–6.3: pause drain ack + manifest status; block CEO DM khi paused; `needsAttention` persist + badge Feed. Còn runtime-process reconnect. | Implementation | 4–6 |
| 2026-10-31 | Phase 6.3 hoàn thiện: `planCeoSessionRuntimeRecovery` + harness side-effect; Orvanta `interruptRunningRuns` trước `recoverActiveRuns`; `teamAutoRecover` gate; in-host reconnect registry (no duplicate start). Phase 8: sync `01` trạng thái triển khai + `03` inventory. Phase 9 partial: `ceo-session-phase9-harness.test.ts` (pause/attention/reconnect plan); full representative E2E + nghiệm thu tay vẫn mở. | Implementation | 6, 8, 9 |
| 2026-10-31 | Phase 9 Gate Pass trên fixture: `ceo-session-phase9-scenario.test.ts` (draft→CEO→dual agent→pause drain→memory→new session), `ceo-session-phase9-user-library.test.ts`, `ceo-session-pause-drain.test.ts`. Không dùng monorepo `.orvanta`. Nghiệm thu tay Feed/reload (Phase 5.4) vẫn khuyến nghị; không chạy full LLM War Room trong CI. | Implementation | 9 |
| | | | |

Khi một giả định mục 9 của `01` được chốt (ví dụ TeamStore path cuối, cursor snapshot, credential Agent), thêm một dòng ở đây rồi mới sửa code.

### Checklist — sau mỗi lượt AI

- [x] Các mục vừa làm đã đổi `- [ ]` → `- [x]` trong file này
- [x] Gate phase liên quan chỉ tích khi hết mục con
- [x] Mục chưa làm vẫn là `- [ ]`
- [x] Quyết định mới (nếu có) đã thêm hàng nhật ký
- [x] Không tích hộ mục cần owner nếu chưa có tên/ngày
