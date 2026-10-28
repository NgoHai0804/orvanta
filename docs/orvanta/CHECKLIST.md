# Checklist chức năng Orvanta

Nguồn sự thật khi implement và khi review “đã đủ chưa”. Tick khi có bằng chứng (test hoặc verify tay theo spec). Không tick vì “code đã đẩy”.

Cách dùng: làm theo [ROADMAP.md](./ROADMAP.md). Vision đủ A–D nằm hết ở đây.

---

## Agent profile (P2)

- [x] Mỗi agent một `org/agents/<id>/profile.md` đúng Zod
- [x] `workspace/` tách khỏi profile; agent không ghi profile
- [x] Nộp bài bằng `orvanta_submit_handoff`, reviewer không `write_to_file`
- [x] Editor Lưu ghi workspace, không ghi user library
- [x] Template implementer/reviewer/researcher/skeptic
- [x] Một lead; không xóa coordinator
- [x] denyWrite bắt buộc 3 path
- [x] Reload còn config

## Company library (P3)

- [x] Lưu allowlist only — không `state/` `inbox/` `runs/`
- [x] Nhiều slug không đè nhau
- [x] Path `homedir()/.orvanta/companies/<slug>`
- [x] Tải folder trống = đủ đội + purpose, id mới, idle
- [x] Tải đè: cancel giữ; confirm xóa local
- [x] `library.json` + scan folder
- [x] Xóa bản thư viện không đụng workspace

## 0. Nền — `schema` + `persistence` + `brand-shell`

### Schema & đĩa

- [x] `.orvanta/` có trong `.gitignore` gốc
- [x] Tạo công ty atomic (tmp + rename), không nửa cây khi fail giữa chừng
- [x] `company.json` validate: schemaVersion, id, name, teamName, policies, coordinatorAgentId
- [x] `purpose.md` bắt buộc sau create
- [x] `VERSION` = 1
- [x] `org/roster.json` đúng một lead
- [x] `org/agents/<id>/profile.md` frontmatter + body + `workspace/`
- [x] `inbox/pending.json` + `inbox/history.jsonl`
- [x] `state/snapshot.json` + `last-sync.json` là chiếu, không phải nguồn ghi purpose/roster
- [x] `memory/` chặn `..` và non-`.md`
- [x] Loader: không folder → empty; thiếu file → broken; schema lạ → refuse
- [x] Hai lead → broken
- [x] Thiếu coordinator → broken
- [x] `teamName` qua `sanitizeTeamName`
- [x] Không ghi API key vào `.orvanta/`
- [x] Không đưa `.orvanta/` vào telemetry

### Persistence

- [x] Khi company valid: TeamStore `teamDir` dưới `.orvanta/`, không `~/.cline/data/teams`
- [x] `teamName` session = `company.teamName`
- [x] Restore teammates từ roster (idle/stopped không spawn nhầm pending_hire)
- [x] Run `interrupted` sau khi host chết, còn đó lúc mở lại
- [x] Sync Home ghi snapshot từ TeamStore, không đè purpose
- [x] Import một chiều `.cline/agents/` → pending_hire (nếu policy)

### Brand shell

- [x] Icon Activity Bar Orvanta (Indigo)
- [x] Top bar 4 tab: Home, Inbox, Chat, War room
- [x] Tab active Indigo; nền Navy; accent Violet
- [x] Shortcut Alt+1..4 (hoặc tương đương đã ghi keymap)
- [x] Deep-link `orvanta://view/{home|inbox|chat|war-room}`
- [x] ChatView không unmount khi đổi tab
- [x] Overlay Settings/History/MCP/Account/Worktrees Cline vẫn hoạt động
- [x] Onboarding Cline không bị thay bằng Orvanta

---

## A — Company home (`company-home`)

### First-run

- [x] No folder: không form, bảo Open Folder
- [x] Empty: form name + purpose template + model coordinator
- [x] Submit tạo đủ file tối thiểu
- [x] Không tự hire teammate thứ hai
- [x] Secondary: nhập preset `.cline/agents/` nếu có
- [x] Fail ghi đĩa: banner, không folder vỡ

### Header & purpose

- [x] Tên công ty + one-liner purpose
- [x] Purpose markdown render, clamp 8 dòng, expand/collapse
- [x] Sửa purpose = draft UI, Save → decision `change_purpose`
- [x] Chưa approve: `purpose.md` trên đĩa không đổi
- [x] Menu: mở explorer `.orvanta/`, copy purpose, xóa công ty (gõ tên), xem company.json
- [x] Sync: spinner, toast, error banner stale

### Roster

- [x] Card: name, id, role, status, model, task hiện tại
- [x] Sort: lead → running → idle → pending → stopped
- [x] Hire form: id regex, template role, tools preview, maxIterations
- [x] Hire → file + pending_hire + decision, **không** spawn
- [x] Fire → decision, pending_fire, không shutdown trước approve
- [x] Không fire coordinator (ẩn/disable)
- [x] Sửa role → decision `change_role`
- [x] Menu card: Chat / War room / Sửa role / Fire
- [x] Status có chữ, không chỉ màu

### Work now

- [x] Nhóm in_progress, blocked, queue
- [x] Hàng: title, assignee, time, depends/chờ
- [x] Action: Chat context task, War room filter, Escalate nếu blocked
- [x] Empty copy đúng
- [x] Trần 20 + xem tất cả
- [x] `isReady` / blockedBy hiện đúng

### Inbox teaser & health

- [x] Số pending + 3 item, click focus Inbox
- [x] 0 pending vẫn hiện vùng
- [x] Banner interrupted + CTA Tiếp tục (steer coordinator)
- [x] Broken list lỗi + khôi phục / xóa lập lại
- [x] last-sync lệch (dot) khi > 10 phút
- [x] (Optional) số purpose-lock deny hôm nay

### Home chất lượng

- [x] Reload window giữ purpose + roster
- [x] 320px không overflow ngang
- [x] Skeleton loading, không flash empty
- [x] Running pill cập nhật ≤ 1s khi session live
- [x] Multi-root: chọn folder chứa `.orvanta/` hoặc folder đầu — hành vi đã ghi và test

---

## B — Inbox CEO (`ceo-inbox`)

### Hàng đợi

- [x] Tab Pending / Deferred / History
- [x] Filter type + urgency
- [x] Sort high → normal → low → mới trước
- [x] List + detail (narrow: push detail + back)
- [x] Deep-link `?focus=` mở đúng item

### Types — tạo đúng payload

- [x] `hire_agent`
- [x] `fire_agent`
- [x] `change_role`
- [x] `change_purpose`
- [x] `change_scope`
- [x] `merge`
- [x] `over_budget`
- [x] `over_ephemeral`
- [x] `escalate_blocked`
- [x] `change_policy`
- [x] Type lạ / payload thiếu → reject, không ghi pending
- [x] Không có type FYI/info

### Actors & tool

- [x] Tool `orvanta_request_decision` (coordinator: hire/fire/scope/merge/escalate)
- [x] Teammate chỉ escalate_blocked
- [x] Host tạo over_budget, over_ephemeral, change_scope từ lock
- [x] Tool không approve được
- [x] Dedup cùng type + khóa nghiệp vụ

### Hành động

- [x] Approve thực thi đúng bảng SPEC-B
- [x] Reject thực thi đúng bảng SPEC-B
- [x] Reject merge: note ≥ 8 ký tự → mailbox
- [x] Defer: ra khỏi badge, nhóm Deferred
- [x] Re-open deferred → pending
- [x] Không Approve all
- [x] Confirm 2 bước: change_purpose, nới policy `allow`, fire (không phải lead)
- [x] Không fire coordinator
- [x] Approve hire → A/C/D hiện agent
- [x] Reject hire → không member runtime
- [x] Approve purpose → đĩa đổi; reject → không
- [x] Reject change_scope → task canceled
- [x] Reject over_budget → không run mới

### Badge & history

- [x] Badge tab + Activity Bar = pending only
- [x] `99+`
- [x] aria-label có số
- [x] history.jsonl append-only, reload còn
- [x] History filter type/status/ngày
- [x] Deferred không trộn history

### Empty

- [x] Chưa công ty: tab disabled + tooltip
- [x] 0 pending: copy “đội không cần bạn”

---

## C — Chat + sidebar (`chat-sidebar`)

### Chat Cline giữ nguyên

- [x] Mọi tool, approval, history Cline còn
- [x] Đổi tab A/B/D về C: input còn, ask-promise còn
- [x] Không có công ty: full width, không sidebar
- [x] Banner lập công ty, dismiss 7 ngày, không chặn chat

### Teams flag

- [x] Company valid → `enableAgentTeams: true`, `teamName` đúng, teamDir `.orvanta/`
- [x] Không company → teams flag giữ false
- [x] `/team` dùng `company.teamName`, không tạo team rời

### Sidebar

- [x] Width kéo 140–280, nhớ state
- [x] Hàng: name, status, task, lock-dot, ★ lead
- [x] Sort như spec
- [x] Guest nhóm “Tạm thời”
- [x] Stopped collapsed mặc định
- [x] Footer: War room, Hire (deep-link)
- [x] Click set focus + ring
- [x] nav + aria

### Nhắm agent

- [x] Default focus coordinator
- [x] Chip “Nói với {name}” + X
- [x] Gửi lead = chat Cline
- [x] Gửi teammate = mailbox/run, bubble “→ agent”
- [x] Stopped / pending_hire disable composer
- [x] Đổi focus khi buffer > 0: confirm
- [x] Không đổi lead runtime thành user

### Deep-link & cards

- [x] `?task=` chip task
- [x] `?decision=` chip decision
- [x] `?agent=` focus
- [x] Card `team_run_task` → War room filter
- [x] Card `orvanta_request_decision` → Inbox
- [x] Card purpose-lock deny hiện trên transcript lead

---

## D — War room (`war-room`)

### D-min

- [x] Card cho mọi roster + guest
- [x] Status ≤ 1s khớp run
- [x] Task title đúng
- [x] Buffer 20: progress, tool, deny, error
- [x] Không render secrets
- [x] Expand: transcript persist ≤ 3 run
- [x] Nói → Chat focus
- [x] Đóng tab không cancel run
- [x] Pause dừng append, runtime sống
- [x] Ẩn tab: không vẽ; buffer còn khi quay
- [x] Filter All / Running / Idle / Failed
- [x] Filter theo task
- [x] Empty no-company / idle / filter trống
- [x] Không nút approve/hire/fire trên card
- [x] Header purpose one-liner
- [x] aria-live chỉ khi running + tab visible; pause tắt live

### D-full

- [x] Token stream live trên card
- [x] Virtualize > 12
- [x] Search tên agent
- [x] Layout 1/2/3 cột theo width
- [x] Cost/token trên expand nếu có
- [ ] (Optional) pop-out editor group

---

## Purpose-lock (`purpose-lock`)

### Lớp 1

- [x] Prompt order: orvanta khối → purpose → constraints → role → task → Cline
- [x] Mọi agent kể cả lead nhận purpose đầy đủ

### Lớp 2

- [x] Deny thắng allow
- [x] Default policy theo template role (implementer/reviewer/researcher/skeptic/coordinator)
- [x] `write`/`apply_diff` tôn trọng denyWrite
- [x] Cấm agent ghi purpose.md, company.json, roster.json
- [x] Reviewer không write/apply/execute (default)
- [x] Structured error `purpose_lock_denied`, không throw
- [x] Mission log kind blocked/decision khi deny

### Lớp 3

- [x] `team_spawn_teammate` bền + policy ceo_approve → hire decision, không spawn
- [x] Shutdown → fire decision
- [x] Task ngoài purpose → blocked + change_scope
- [x] Merge/finalize + ceo_approve → merge decision
- [x] Ephemeral: lead_only, max 3, vượt → over_ephemeral
- [x] Guest không vào roster Home
- [x] Approve purpose → steer agent đang chạy
- [x] firstHireFast: auto-approve hire đầu, vẫn có history

---

## Journeys (E2E tay hoặc test)

- [x] J1 Lập công ty
- [x] J2 Hire implementer + reviewer (approve)
- [x] J2b Reject hire
- [x] J3 Giao mục tiêu, đội chia việc trong purpose
- [x] J3b Task ngoài purpose → inbox scope
- [x] J4 Tắt giữa run → interrupted → Tiếp tục
- [x] J5 Merge approve / reject + note
- [x] J6 Fire teammate, task unassign
- [x] J7 Chat 1 agent rồi về coordinator

- [x] J8 War room nhìn + nói
- [x] J9 Broken purpose → khôi phục
- [x] J10 Ngày thường: inbox 0, home đúng, không babysit

---

## Chất lượng cắt ngang

- [x] Không orchestrator thứ hai
- [x] Không commit `.orvanta/` (CI hoặc test gitcheck nếu cần)
- [x] Contrast 4.5:1 trên Navy
- [x] Status luôn có text
- [x] Một workspace một công ty
- [x] Docs cập nhật nếu đổi schema/type
- [x] Unit: validate schema, policy deny, dedup decision
- [x] Integration: create company, approve hire, teams dir
- [x] Webview: home empty → create → reload (khi có browser/test host)

---

## Cố ý chưa tick (Not Doing)

- [ ] Marketplace agent
- [ ] Multi-user / roster chia sẻ git
- [ ] Desktop app Orvanta
- [ ] AI CEO tự trị
- [ ] Sync cloud `.orvanta`
- [ ] Approve all
- [ ] Voice / Slack
- [ ] Team-of-teams
- [ ] Session chat đầy đủ per teammate (mở lại khi CEO đòi)
- [ ] LLM classifier scope hoàn hảo (pha sau lớp luật cứng)
