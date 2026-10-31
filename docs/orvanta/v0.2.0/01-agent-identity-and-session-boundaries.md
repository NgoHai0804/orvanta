# Orvanta v0.2.0 — Ý tưởng: Agent độc lập và phiên CEO có lịch sử đầy đủ

> **Trạng thái (2026-10-31):** Product intent vẫn giữ nguyên. **Đã implement** theo playbook [`02-implementation-steps.md`](./02-implementation-steps.md) + quyết định [`04-phase-0-decisions.md`](./04-phase-0-decisions.md): layout `.orvanta/local/{db,history,memory,sdk}`, Gate 1 SDK seam, CEO `ceo_*` ≠ SDK session, sticky transcript mapping, TeamStore War Room hydrate, pause/resume/`needs-attention`, isolation tests, git ignore toàn bộ `.orvanta/`. Các đoạn dưới đây vẫn dùng chữ “đề xuất” ở chỗ mô tả ý tưởng ban đầu — **không** nghĩa là chưa ship; xem mục *Trạng thái triển khai* cuối file và checklist Phase 8–9 trong `02`. Nghiệm thu E2E đại diện (Phase 9) và một số mục “nghiệm thu tay” còn mở. Audit baseline: [`03-phase-0-baseline.md`](./03-phase-0-baseline.md).

## 1. Ý tưởng ban đầu

Hai điều mong muốn cho v0.2.0:

1. Mỗi Agent là một cá nhân AI riêng dựa trên năng lực của Cline: có danh tính, cấu hình/thông số, bàn làm việc và lịch sử riêng; các Agent không vô tình dùng chung trạng thái hội thoại hoặc dữ liệu cá nhân.
2. Mỗi cuộc chat mới của CEO mở một phiên Orvanta mới. Phiên là đơn vị công việc cấp cao chứa/lần theo lịch sử của CEO và tất cả Agent thực sự tham gia phiên đó, để có thể mở lại phiên và hiểu đầy đủ ai đã làm gì.

### Quyết định người dùng đã xác nhận

- **Transcript và memory:** Không dùng transcript cũ làm hội thoại của CEO session mới. Memory project-scoped được dùng giữa các session trong cùng project, không chia sẻ giữa project; Agent đề xuất thay đổi memory và CEO được xem/sửa/xóa.
- **Không có source checkout/worktree riêng cho mỗi Agent.** Các Agent làm trên project chung; sự độc lập cần có là profile, memory và transcript riêng.
- **Mỗi project có company và đội ngũ riêng.** Agent/mẫu cấu hình dùng lại ở cấp user được copy thành instance thuộc project; dữ liệu runtime của project không phải trạng thái chung.
- **Hai phạm vi lưu trữ:** Thông tin chung và mẫu lưu local trong `%LOCALAPPDATA%\Orvanta`; project `.orvanta` giữ company/đội riêng cùng transcript, CEO history, memory theo project và trạng thái chạy. Tải mẫu là copy độc lập; không tự đồng bộ ngược.
- **Git:** Không commit transcript, history, memory, secrets hay runtime state. Chỉ commit cấu hình theo allowlist rõ ràng. Tên file cấu hình riêng lẻ vẫn cần review nội dung trước khi được allowlist.
- **Session/chat:** Tab mới là draft; tạo CEO session khi gửi tin nhắn đầu tiên. Coordinator mặc định; mọi chat trực tiếp Agent thuộc CEO session đang mở. Mỗi cặp `(CEO session, Agent)` có một transcript canonical, các task/run chỉ là liên kết.
- **Khôi phục:** Kết nối lại runtime còn sống. Sau khi runtime dừng, tự resume phần có trạng thái đã persist và có thể chứng minh an toàn; không replay mù side effect không rõ kết quả. Chuyển phần mơ hồ sang `needs-attention` và báo lỗi rõ nếu persist thất bại.
- **Chạy đồng thời và pause (Product approved):** Nhiều Agent có thể chạy song song. Pause có scope toàn CEO session: chặn việc mới cho Coordinator/Agents/runs/queue, drain tool có side effect tới safe boundary, không kill; chỉ báo `Paused` sau durable acknowledgement và mọi participant an toàn. Partial drain/persist failure phải hiện trạng thái aggregate chưa-paused và trạng thái từng Agent. Đây là contract sản phẩm; runtime semantics chưa implement/prove.
- **Hiển thị Agent đang chạy (UX Product approved):** Agent detail là projection chỉ đọc từ trạng thái authoritative chung với Team Feed. Điều hướng, Agent selection và view unmount không dừng run/subscription; scroll lịch sử chỉ tắt auto-scroll; remount/reconnect hội tụ về snapshot mới nhất và báo `stale/reconnecting` cho tới khi hội tụ. Acceptance criteria và gap hiện trạng ở [`03-phase-0-baseline.md`](./03-phase-0-baseline.md); đây là contract được duyệt, chưa phải behavior đã implement.
- **History legacy:** Xóa dữ liệu history Orvanta cũ trong giai đoạn phát triển; chỉ xóa đúng các store legacy đã xác định, không xóa company/config hiện tại, file project khác hay SDK session data không thuộc phạm vi đã kiểm kê.

### Mô hình hai phạm vi lưu trữ đang được đề xuất

| Phạm vi | Vai trò đề xuất | Dữ liệu dự kiến |
|---|---|---|
| `<project>/.orvanta/` | Nguồn sự thật của company/đội và hoạt động trong project này. | Cấu hình allowlist; dữ liệu local bị ignore gồm transcript, CEO sessions, memory project-scoped, task/run, events và recovery state. |
| `%LOCALAPPDATA%\Orvanta\` | Kho local cấp user, không phải company đang chạy của project. | Cài đặt chung và thư viện mẫu company/Agent; không lưu transcript, runtime state hoặc memory project-scoped. |

Mặc định an toàn được đề xuất: cấu hình trong project là authoritative khi đang chạy; cập nhật thông tin chung không âm thầm ghi đè các project đã khởi tạo; chỉ đưa thay đổi từ project trở lại thư viện user qua thao tác lưu/publish rõ ràng.

### Cấu trúc `.orvanta` project đề xuất

Giữ phần cấu hình dễ đọc dưới dạng file nhỏ, có schema/version; tách hẳn trạng thái riêng tư và dữ liệu hoạt động vào `local/`. Không tạo bản sao transcript do Orvanta tự quản nếu SDK đã là nguồn transcript chuẩn.

```text
.orvanta/
├── VERSION                         # phiên bản schema/layout
├── company.json                    # identity company của project
├── purpose.md                      # mục tiêu/phạm vi company
├── org/
│   ├── roster.json                 # danh sách Agent và thứ tự/role
│   └── agents/
│       └── <agent-id>/
│           ├── profile.md          # profile + cấu hình được phép chia sẻ
│           └── ...                 # chỉ thêm config file khi có nhu cầu rõ
└── local/                           # luôn gitignored; mọi dữ liệu runtime/private
    ├── history/
    │   ├── index.json               # projection để liệt kê CEO sessions
    │   └── sessions/
    │       └── <ceo-session-id>/
    │           └── session.json    # manifest/link/status, KHÔNG nhúng messages
    ├── db/
    │   └── teams.db                # TeamStore: events, tasks, runtime snapshots
    ├── sdk/
    │   ├── db/sessions.db          # SDK session metadata/index riêng project
    │   └── sessions/
    │       └── <sdk-session-id>/   # SDK-owned canonical transcript artifacts
    │           ├── <sdk-session-id>.json
    │           ├── <sdk-session-id>.messages.json
    │           └── <sdk-session-id>.compaction.json
    ├── memory/
    │   └── agents/<agent-id>/
    │       ├── memory.md            # memory đã được chấp nhận, project + Agent scoped
    │       └── proposals/           # đề xuất chờ CEO duyệt/từ chối
    └── artifacts/                   # output phụ trợ/cache Orvanta, không phải source checkout riêng
```

**Quy tắc storage đi kèm:**

1. **Quyết định v0.2.0:** allowlist rỗng; toàn bộ `.orvanta/**` tiếp tục ignored. Chỉ một thay đổi được owner duyệt sau này mới có thể mở path cụ thể. Các ví dụ như `VERSION`, `company.json`, `purpose.md`, `org/roster.json` và `org/agents/*/profile.md` dưới đây là ứng viên cho lần review sau, không phải quyền commit hiện tại. File mới mặc định không được commit; `local/`, secrets, transcript, history và memory luôn bị loại trừ.
2. Dùng ignore rule deny-by-default + allowlist cấu hình ở `.gitignore` cấp project; rule rộng `.orvanta/` không thể được override bằng `.orvanta/.gitignore` bên trong thư mục đã bị ignore. Mẫu rule:

   ```gitignore
   .orvanta/*
   !.orvanta/VERSION
   !.orvanta/company.json
   !.orvanta/purpose.md
   !.orvanta/org/
   .orvanta/org/*
   !.orvanta/org/roster.json
   !.orvanta/org/agents/
   .orvanta/org/agents/*
   !.orvanta/org/agents/*/
   .orvanta/org/agents/*/*
   !.orvanta/org/agents/*/profile.md
   ```

   **Lưu ý:** Đây chỉ là ví dụ minh họa cho một allowlist có thể được review trong tương lai, không phải rule được chấp thuận/triển khai cho v0.2.0. Quyết định hiện tại là allowlist rỗng và blanket-ignore toàn bộ `.orvanta/**`.
3. Giữ manifest/index session JSON nhỏ, validate bằng schema, ghi atomic và serialize concurrent updates bằng history lock. Manifest chỉ giữ session/participant/status/link; TeamStore là nguồn event/task/runtime state, không sao chép event stream vào manifest.
4. Dùng `local/db/teams.db` cho TeamStore (đã là SQLite trong SDK) với WAL/busy timeout, versioned migrations, transaction/idempotency; các file `-wal`/`-shm` luôn ignored. Truyền project-specific `teamDir` khi khởi tạo store; tránh thêm một DB Orvanta khác nếu manifest/index + TeamStore đủ ownership rõ ràng.
5. Transcript canonical vẫn do SDK quản lý theo SDK session ID. SDK metadata DB và artifacts phải được cấu hình theo project tại `local/sdk/`; manifest chỉ lưu mapping tường minh `(CEO session, Agent) -> sdkSessionId`. Không sao chép messages sang DB/manifest thứ hai.
6. **Điều kiện trước khi triển khai:** SDK hiện mặc định lấy session DB/artifact directories từ Cline data dir (`resolveDbDataDir()`/`resolveSessionDataDir()`). Cần tìm seam để inject project-scoped paths vào host/store mà không đổi process-wide env hoặc làm rò session giữa các workspace. Nếu không thể làm an toàn, dừng ở architecture review; không tuyên bố transcript đã nằm trong project chỉ vì Orvanta lưu mapping.
7. Ghi file cấu hình/JSON qua validate + write-temp + atomic rename. Không lưu transcript lớn thành SQLite blob chỉ để gom thành một file.
8. Backup SQLite khi đang chạy phải dùng SQLite backup/checkpoint hoặc đóng writer trước khi copy; không copy riêng `teams.db` mà bỏ `-wal` đang chứa dữ liệu mới.
9. `%LOCALAPPDATA%\Orvanta\` giữ `settings.json` và `companies/<slug>/` là snapshot/mẫu copy chủ động. Tải template tạo cấu hình project độc lập; không symlink và không sync thay đổi từ project về user library nếu chưa có thao tác “Lưu làm mẫu”.

### Realtime và nhất quán khi mở Agent — đề xuất UX/runtime

Mục tiêu là **một trạng thái sống cho cùng một Agent/session**, không phải một bản chụp giao diện được làm mới. Team Feed, danh sách Agent và chi tiết Agent phải lấy từ cùng trạng thái có thẩm quyền; khi mở chi tiết, chọn Agent theo ID rồi đọc snapshot mới nhất và tiếp tục nhận thay đổi. Không giữ object Agent cũ làm state riêng khiến khung chi tiết đứng yên trong khi Feed đã đổi.

- Khi mở Agent đang hoạt động, hiển thị ngay trạng thái/task/activity mới nhất sẵn có; tiếp tục cập nhật status, tiến độ, tool/activity và transcript theo sự kiện mới. Không bắt CEO đóng/mở lại panel để thấy thay đổi.
- Chuyển qua lại giữa Agent và Team Feed chỉ đổi màn hình đang xem. Không tạo lượt chạy mới, không đổi participant/session, không pause/cancel task, và không làm mất subscription hoặc dữ liệu đã tải.
- Realtime là mặc định; không đóng băng dữ liệu trong Agent detail. Nếu người dùng đang đọc nội dung cũ thì chỉ tắt auto-scroll, không ngừng nhận/cập nhật trạng thái. Nút “Pause” hiện tại chỉ pause stream UI nhưng runtime vẫn chạy; không giữ nhãn Pause mơ hồ này. Chỉ hiển thị nút pause khi nó thật sự gửi lệnh pause runtime có xác nhận và lưu bền vững.
- Sau reconnect/webview reload, tải snapshot authoritative trước, sau đó tiếp tục live updates mà không nhảy lùi, nhân đôi hay bỏ sự kiện. Nếu chưa bắt kịp hoặc stream mất kết nối, hiển thị `reconnecting/stale` và mốc cập nhật cuối; không giả vờ rằng dữ liệu đang live.
- Giữ rõ ranh giới giữa activity feed ngắn/gọn và transcript hội thoại canonical. Ring buffer trên card/detail không thay transcript SDK đã persist. Nội dung tool/log cần policy về redaction trước khi hiển thị hoặc lưu.
- Cập nhật phải có thứ tự/revision có thể đối chiếu, hoặc dùng cơ chế snapshot + cursor tương đương; nếu event bị thiếu/không liên tục thì yêu cầu resync snapshot thay vì tin state cục bộ có thể đã cũ.

**Hiện trạng cần tính đến (không phải cam kết đã triển khai):** War Room hiện stream snapshot từ `globalWarRoomTracker` trong bộ nhớ; đây chưa phải durable source sau restart. Webview có một nút “Pause” chỉ buffer snapshot mới nhất ở phía UI trong khi runtime vẫn chạy; nhãn này dễ khiến CEO tưởng công việc đã dừng. Khung mở rộng hiện nhận card object tại thời điểm mở; cần bảo đảm nó được render lại theo Agent ID từ snapshot mới thay vì giữ object cũ. Vì vậy realtime đa view, reconnect/resync và khôi phục sau restart là các yêu cầu kiến trúc + UX, không chỉ là chỉnh giao diện.

Đây là **đề xuất cấu trúc**, chưa phải schema/API đã triển khai. Repo hiện có file company và history ở root `.orvanta/`; config được giữ theo allowlist, còn legacy history được người dùng cho phép xóa sau khi inventory chính xác. Không di chuyển/xóa tự động trong lượt này.

### Câu hỏi sản phẩm trung tâm

**Làm thế nào để một Agent có danh tính và dữ liệu riêng bền vững, đồng thời mọi phiên CEO có một lịch sử tổng hợp đáng tin cậy mà không làm lẫn transcript, mất dữ liệu, hoặc tạo hai nguồn sự thật?**

## 2. Thực trạng trong repository — điểm xuất phát, không phải ràng buộc thiết kế

Các ghi nhận dưới đây là hiện trạng code/tài liệu tại thời điểm tạo bản nháp. Chúng không có nghĩa là v0.2.0 phải giữ nguyên kiến trúc cũ.

| Khu vực | Đã có | Khoảng trống/rủi ro đã ghi nhận |
|---|---|---|
| Hồ sơ Agent | `.orvanta/org/roster.json`, `org/agents/<id>/profile.md`; profile có model, tools, scope, rules, skills và các tham số khác. Đã có `workspace/` dưới thư mục Agent. | Có hồ sơ/cấu hình chưa đồng nghĩa Agent có một runtime và một transcript bền vững riêng. Cần định nghĩa dữ liệu nào là identity, cấu hình, bộ nhớ lâu dài và dữ liệu của từng phiên. |
| Runtime nhóm | Agent Teams có run/task, runtime ID, conversation ID và TeamStore lưu một phần trạng thái/lifecycle. | Các ID này mang ý nghĩa khác nhau. Gắn nhầm chúng hoặc tạo manifest mapping không đủ để tự sinh ra transcript có thể phục hồi. |
| Transcript Agent | Có API SDK để đọc một SDK session đã được persist; đã có adapter truy vấn transcript theo liên kết tường minh. | Tài liệu v0.1.1 ghi nhận teammate runtime chưa được bảo đảm persist thành SDK session có thể đọc lại; transcript trong runtime/bộ nhớ không phải lịch sử bền vững sau restart. |
| Phiên Orvanta | Có history manifest/index mới với `sessionId`, participants và mapping Agent/task/transcript; tab UI có session ID và cache local. | Không được coi tab, CEO session, Agent identity, SDK session, conversation, task hay run là một ID. Các luồng lịch sử cũ cũng có dạng session/task chồng lấn. |
| Kho lịch sử cũ | Có thêm một store legacy `workspace-history-store.ts` ghi danh sách JSON và task messages. | Tài liệu v0.1.1 đã chỉ ra rủi ro parse lỗi thành danh sách rỗng, ghi trực tiếp không atomic, và phân biệt xóa task với xóa session chưa đủ. Tránh mặc định lấy store cũ làm nguồn chuẩn mới. |
| Lịch sử theo phiên | Manifest có thể ghi participant và liên kết transcript; TeamStore giữ dữ liệu vận hành khác. | Cần chứng minh từng lượt chat/run/event được persist và liên kết bền vững trước khi hứa “lịch sử tất cả Agent trong phiên”. Metadata/link không phải transcript. |
| Kho dùng chung cấp user | `userOrvantaRoot()` hiện là `homedir()/.orvanta`; thư viện company hiện nằm trong `.orvanta/companies/<slug>/`. ADR hai kho định nghĩa đây là snapshot có tên, được lưu/tải chủ động. | Người dùng đã chọn đích sản phẩm `%LOCALAPPDATA%\Orvanta\` cho settings và templates; cần triển khai migration path từ vị trí thư viện cũ, không đổi ngầm hoặc xóa snapshot cũ. |
| Vị trí transcript SDK | SDK `sessions.db` hiện ở `resolveDbDataDir()` (mặc định Cline data dir); artifact manifest/messages hiện ở `resolveSessionDataDir()`; `SdkSessionHost` hỗ trợ start/get/read nhưng không công khai cấu hình storage path ở adapter hiện tại. | Yêu cầu muốn transcript và runtime state nằm trong project `.orvanta`; cần injection per-project vào SDK session DB/artifact store. Không dùng env process-wide khi có thể mở nhiều project; không tạo transcript mirror. |

Tài liệu tham chiếu nội bộ:

- [`v0.1.1/01-session-agent-history-redesign.md`](../v0.1.1/01-session-agent-history-redesign.md)
- [`v0.1.1/agent-history-v0.1.1.md`](../v0.1.1/agent-history-v0.1.1.md)
- [`v0.1.2/RELEASE-NOTES.md`](../v0.1.2/RELEASE-NOTES.md)
- [`03-phase-0-baseline.md`](./03-phase-0-baseline.md) — inventory code/storage hiện trạng và contract còn chờ owner duyệt.

## 3. Phân biệt các khái niệm — điều kiện tiên quyết

Đây là mô hình khái niệm để thảo luận, **không phải schema đã quyết định**:

```text
`%LOCALAPPDATA%\Orvanta\` (local user library/settings)
└── App settings + reusable company/Agent templates (copy into a project explicitly)

Project A/.orvanta/                         Project B/.orvanta/
└── Company A + team A                     └── Company B + team B
    ├── Agent instances                         ├── Agent instances
    │   ├── profile/config                       │   ├── profile/config
    │   └── project-only memory                  │   └── project-only memory
    └── CEO session                              └── CEO session
        ├── CEO ↔ Agent conversations                 ├── CEO ↔ Agent conversations
        ├── per-Agent transcripts                      ├── per-Agent transcripts
        └── participant/run links + recovery state    └── participant/run links + recovery state
```

Phải giữ riêng các identity sau, không suy diễn ID này từ ID khác:

- **Agent ID:** định danh ổn định của nhân sự qua nhiều phiên; slug/tên hiển thị có thể đổi.
- **CEO session ID:** định danh một cuộc làm việc tổng thể của CEO.
- **Agent conversation/session ID:** định danh cuộc trò chuyện của Agent trong ngữ cảnh đã chọn; khác Agent ID và CEO session ID.
- **Cline/SDK session ID:** định danh transcript thực sự được lưu bởi Cline SDK.
- **Task ID / run ID / runtime agent ID / conversation store ID:** ID thực thi hoặc lưu trữ riêng; chỉ liên kết khi có bằng chứng từ runtime bền vững.
- **Tab ID:** trạng thái giao diện; không phải session lưu trữ.

Profile/template có thể được khởi tạo từ kho user, nhưng một khi được tải vào project thì Agent đó thuộc company/project đó. Memory và transcript không được dùng chung xuyên project. Một CEO session mới không tiếp tục transcript hội thoại của session trước; memory cùng project là một lớp riêng và không phải transcript.

## 4. Các hướng thiết kế đã chọn và phương án loại trừ

### A. Agent là một nhân sự thuộc project; runtime được tạo theo nhu cầu — hướng đã chọn

Giữ profile/config/memory của Agent qua các phiên; mỗi lượt làm việc chạy qua runtime/session phù hợp. Transcript Agent được tách riêng theo ngữ cảnh đã chọn. CEO session sở hữu danh sách participant và các liên kết tới transcript/task/run; không sao chép transcript vào manifest.

**Đã chốt ở mức sản phẩm:** Mỗi project có company/team riêng; Agent không có checkout riêng; profile, memory và transcript được tách theo Agent; transcript gắn vào CEO session; memory cùng project được dùng giữa các session, nhưng transcript cũ không được nối vào session mới. Runtime dùng Cline và không cần daemon thường trực.
**Còn phải xác minh kỹ thuật:** SDK có thể lưu session metadata và canonical transcript trong project `local/sdk/` an toàn qua nhiều workspace/process hay không.

### B. Một hội thoại dài hạn duy nhất của Agent xuyên các CEO session — không chọn

Một Agent tiếp tục cùng một hội thoại cho mọi nhiệm vụ; CEO session mới chỉ tham chiếu tới đoạn/turns xảy ra trong phiên đó.

Không chọn: user đã xác nhận không tiếp tục dùng chung transcript giữa các CEO session. Memory project-scoped là lớp riêng, nạp theo Agent/project nhưng không nối transcript cũ.

### C. Chỉ lưu cấu hình Agent, không có memory bền vững — không chọn

Mỗi CEO session tạo transcript mới; nếu không có memory bền vững thì chỉ profile/config được giữ.

Không chọn làm hướng MVP: memory project-scoped được dùng giữa các CEO session cùng project; Agent đề xuất update, CEO xem/sửa/xóa.

### D. Mỗi Agent có runtime/daemon thường trực

Giữ một tiến trình runtime luôn sẵn sàng cho mỗi Agent và nhiều CEO session gửi việc tới runtime đó.

**Ưu điểm:** Có thể đem lại cảm giác nhân sự luôn hiện diện.
**Rủi ro:** Chi phí tài nguyên, shutdown/restart, nhiều workspace, account/model thay đổi, runtime bị kẹt, tính đồng thời và cách ranh giới transcript vẫn phải giải quyết. Không nên chọn chỉ vì muốn mô phỏng “một người thật”.

**Hướng hiện tại:** Chọn A, không dùng B; Agent chạy cùng checkout project và có profile/memory/transcript riêng. Không mặc định cần D.

## 5. Nguyên tắc kiến trúc sơ bộ để stress-test

1. **Độc lập không có nghĩa là fork Cline:** Agent là định nghĩa/nhân sự dùng khả năng runtime Cline, không phải một bản sao của toàn bộ ứng dụng, credentials hay process state.
2. **Phân lớp dữ liệu:** Tách profile/config, memory lâu dài, workspace code/artifact, transcript hội thoại, event/activity và trạng thái runtime. Không gọi tất cả là “workspace riêng”.
3. **Một nguồn transcript chuẩn:** Nếu SDK session là canonical transcript thì Orvanta session chỉ giữ identity/link/summary được tính lại; không lưu thêm bản sao message mà không có lý do và giao thức nhất quán rõ ràng.
4. **Participant là thực tế đã xảy ra:** Chỉ đưa Agent vào phiên khi có hành động/nhận việc được xác nhận; roster không phải participant list.
5. **Lịch sử phải sống qua restart:** Persist transcript, mapping, lifecycle, timestamps và thứ tự trước khi xác nhận với UI. Team Feed là projection, không thay cho transcript.
6. **Cô lập có thể kiểm chứng:** Không fallback sang task đang active, Agent khác, slug gần giống hoặc workspace khác khi thiếu mapping.
7. **Lỗi phải hiện rõ:** Phân biệt transcript chưa được liên kết, không tồn tại, bị hỏng, sai workspace và lỗi đọc/ghi. Không biến lỗi thành “chưa có lịch sử” rồi ghi đè dữ liệu.
8. **An toàn khi chạy song song:** Nhiều Agent được phép chạy đồng thời trên cùng project. Event/metadata phải ghi durable với transaction/idempotency; thay đổi file chung có thể conflict và cần test. CEO có thể pause session từ Team Feed; định nghĩa chính xác điểm dừng an toàn và phản hồi UI phải thống nhất.
9. **Quyền hạn không nhập nhằng:** Default từ Cline/user/provider khác với quyền Agent trong company; việc Agent có config riêng không tự cấp quyền cao hơn CEO policy/approval.
10. **Không phá dữ liệu legacy:** Migration, cutover, import, resume, archive và delete phải có chính sách rõ; không âm thầm đọc lại/di chuyển/xóa lịch sử cũ.

## 6. Baseline sản phẩm đã chốt và phạm vi MVP đề xuất

MVP có thể thử nghiệm một đường đi tối thiểu:

1. Tab CEO mới là draft; gửi message đầu mới tạo/persist session. Coordinator là đối tượng mặc định; chat trực tiếp Agent cũng nằm trong session CEO đó.
2. Mỗi cặp `(CEO session, Agent)` có một transcript canonical. Nhiều task/run của Agent là các link/events trong cùng transcript/session, không tạo danh tính transcript mới.
3. Memory riêng của Agent được nạp trong các session cùng project, không lấy từ transcript cũ. Agent đề xuất memory change; CEO có quyền xem/sửa/xóa.
4. Company/team và runtime là theo project. User library tại `%LOCALAPPDATA%\Orvanta\` chứa app settings và company/Agent templates; việc tải là copy độc lập, không có auto-sync ngược.
5. Cho phép nhiều Agent chạy song song. CEO pause từ Team Feed: đề xuất pause bền vững, ngăn dispatch task mới và yêu cầu runtime dừng hợp tác ở safe checkpoint; không kill process hoặc ngắt tool đang có side effect ở giữa chừng. Resume tiếp tục các run đã pause an toàn.
6. Khi khởi động lại, reconnect runtime còn sống; nếu runtime đã dừng, tự resume phần khôi phục được từ checkpoint và durable event. Không replay side effect có kết quả không rõ; đánh dấu `needs-attention`, báo CEO và chờ xử lý.
7. Mọi transcript/session/memory/runtime state đều local và không commit. Chỉ file cấu hình allowlist được phép commit. Xóa có phạm vi các history stores Orvanta cũ trong giai đoạn phát triển; không xóa cấu hình/current company hay dữ liệu không nằm trong inventory.

Các mục 1–7 phản ánh quyết định sản phẩm đã nêu hoặc khuyến nghị đang được đề xuất; cấu trúc và cách triển khai cần review.

## 7. Tiêu chí thành công dự kiến

- Mỗi project có company/đội riêng; sửa Agent trong một project không đổi Agent của project khác hoặc kho user-level.
- Dữ liệu profile/memory/transcript của Agent không bị lẫn nhau; memory/transcript không đi theo Agent sang project khác.
- CEO tạo hai phiên độc lập; participant/transcript/task/run của hai phiên không bị ghép nhầm.
- Một CEO session khôi phục đúng transcript của các Agent tham gia và timeline, kể cả khi nhiều Agent chạy song song.
- Restart kết nối lại đúng runtime nếu còn sống; nếu đã chết thì tự resume phần có durable checkpoint/event rõ mà không phát lại side effect đã commit.
- Side effect không rõ kết quả chuyển sang `needs-attention`; không replay mù, không báo hoàn tất giả.
- Pause từ Team Feed lưu trạng thái qua restart, dừng nhận task mới và không cắt ngang tool đang thực thi; resume tiếp tục run theo safe checkpoint.
- Corrupt store, workspace mismatch, task thiếu, mapping thiếu và Agent đổi tên có kết quả xác định; không có fallback chéo.
- Hai writer/process đồng thời không làm mất session, participant, event hoặc transcript đã commit.
- Test chứng minh một message được persist đúng một lần vào nguồn chuẩn; projection tổng hợp không nhân đôi message.
- Khi đang mở chi tiết một Agent, status/task/activity/transcript cập nhật theo cùng nguồn mới nhất với Team Feed; mở/đóng/chuyển Agent không làm gián đoạn run.
- Mất kết nối rồi reconnect hoặc reload webview: snapshot + live stream hội tụ đúng trạng thái; UI báo stale/reconnecting khi chưa hội tụ, không hiển thị dữ liệu cũ như live.
- Nội dung đang mở tiếp tục nhận live updates; kéo lên đọc nội dung cũ không làm ngừng đồng bộ. Mọi nút “Pause” hiển thị cho CEO phải pause runtime thật, có trạng thái durable và tác động nhất quán trên mọi view.

## 8. Các giới hạn và quyết định chưa thiết kế

- Không chia sẻ memory hoặc transcript xuyên project; không tiếp tục transcript từ CEO session cũ vào CEO session mới. Memory cùng project được nạp; Agent đề xuất update và CEO quản lý.
- Đã chọn không tạo checkout/worktree riêng theo Agent; các Agent dùng source project chung và có thể chạy song song. File conflict là rủi ro đã biết; lock/worktree/merge policy sẽ được thiết kế sau.
- Không yêu cầu runtime/daemon thường trực theo Agent. Resume không hứa exactly-once cho side effect bên ngoài; khi không thể chứng minh trạng thái, phải dừng phần đó ở `needs-attention` thay vì retry mù.
- Mọi chat trực tiếp với Agent thuộc CEO session đang mở; không có conversation Agent độc lập nằm ngoài CEO session.
- User-level store là `%LOCALAPPDATA%\Orvanta\` cho cài đặt và templates/snapshots; templates tải vào project bằng copy, không tự đồng bộ.
- Chỉ project config theo allowlist được commit. Transcript/history/memory/secrets/runtime state luôn local/ignored.
- Chưa quyết định chi tiết event/tool calls hiện trên Team Feed và Agent detail, retention, redaction, cùng giao thức revision/cursor cho snapshot + live stream.
- Chưa quyết định Agent sử dụng chung API keys/secrets của Cline hay có credential identity riêng.
- Người dùng cho phép xóa history Orvanta cũ vì đang phát triển. Trước khi dọn phải inventory chính xác legacy history locations, phân biệt SDK session artifacts và dữ liệu project khác; không dùng glob rộng để xóa `.orvanta/` hoặc `.cline/`.
- Vẫn cần thiết kế backup/retention và delete/archive transcript/session theo nguồn canonical.
- Chưa chốt schema, storage engine, RPC, UI hoặc implementation order. Không nên làm trước khi ownership, lifecycle, privacy, concurrency và lỗi phục hồi được trả lời.

## 9. Giả định còn cần review trước implementation

Các quyết định sản phẩm nền tảng đã chốt. Còn các chi tiết kỹ thuật sau; chúng không phủ định lựa chọn đã chốt:

1. **Pause chính xác:** Đề xuất Team Feed pause là pause vận hành (không phải UI stream pause): persist `pause_requested`; ngăn cấp run/task mới; Agent đang chạy kết thúc tool hiện tại rồi dừng tại boundary/checkpoint an toàn; không kill runtime/process. Chọn Resume để tiếp tục từ checkpoint. Nếu muốn “pause ngay lập tức” cả tool đang chạy, cần chấp nhận hủy/mất tiến độ hoặc side effect không rõ — không khuyến nghị.
2. **SDK project-scoped storage:** Cline SDK hiện mặc định dùng Cline data dir cho `sessions.db` và thư mục session artifacts. Cần thiết kế injection rõ ràng qua session host/runtime theo project; không dùng biến môi trường toàn process nếu process có thể mở nhiều project. Đây là blocker kỹ thuật cần giải quyết trước khi hứa transcript thật sự nằm trong `<project>/.orvanta/local/sdk/`.
3. **Schema/version/layout:** Chọn phiên bản schema DB, cách giữ compatibility với file company hiện có và migrations có rollback/recovery.
4. **Conflict khi chạy song song:** Chấp nhận nhiều Agent chạy đồng thời trên cùng checkout; chọn hậu kiểm conflict + file/change attribution ban đầu hay thêm per-file lock/coordination.
5. **Pause và shutdown:** CEO đã chọn có thể pause ở Team Feed. Cần xác định đóng tab/VS Code khác pause: đóng tab không cancel run; pause là thao tác tường minh và durable.
6. **Legacy cleanup:** Người dùng cho phép xóa history cũ do Orvanta tạo vì đang phát triển. Trước khi làm, inventory paths cụ thể và loại trừ SDK history, current company/config, memory/artifacts không thuộc cleanup; chỉ xóa bằng migration/cleanup có phạm vi và test.
7. **Nghiệm thu:** Một tình huống đại diện nên gồm CEO chat với Coordinator, giao song song cho hai Agent, pause từ Team Feed, restart, mở lại transcript đầy đủ, xác minh memory proposal và đảm bảo không replay command mơ hồ.

### Không thuộc v0.2.0 trừ khi được mở rộng phạm vi

- Checkout/Git worktree/sandbox riêng cho Agent.
- Tự động đồng bộ cập nhật project về user template.
- Chia sẻ session/history/memory xuyên project hoặc qua cloud.

## 10. Trạng thái triển khai (cập nhật sau playbook)

Các bước “trước plan” ở bản nháp đã xong — kế hoạch nằm ở [`02-implementation-steps.md`](./02-implementation-steps.md).

| Khối | Trạng thái |
|---|---|
| Layout / Gate 1 / user library / legacy inventory | Done (`04`, Phase 0–1) |
| Memory + proposal CEO UI | Done (Phase 2) |
| Draft → CEO session → sticky transcript | Done (Phase 3) |
| Reopen history + TeamStore ownership | Done (Phase 4) |
| Realtime một nguồn / stale-resync | Done (Phase 5; nghiệm thu tay còn mở) |
| Pause durable + drain + resume + needs-attention + reconnect plan | Done code (Phase 6); E2E tay còn mở |
| Isolation / concurrency tests | Done (Phase 7) |
| Git ignore + backup docs | Done (Phase 8) |
| E2E đại diện mục 7 / 9.7 | **Pass** trên fixture (`ceo-session-phase9-scenario` + user-library + drain); nghiệm thu tay Feed/reload vẫn khuyến nghị |

## 11. Bước tiếp theo (còn lại)

1. (Tuỳ chọn) Nghiệm thu tay Phase 5: Feed↔detail liên tục + reload stale→live trên VS Code host.
2. (Tuỳ chọn) War Room LLM song song end-to-end ngoài CI nếu muốn xác nhận UX runtime thật.
