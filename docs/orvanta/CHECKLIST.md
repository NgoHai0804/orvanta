# Checklist chức năng Orvanta

Nguồn sự thật khi implement và khi review “đã đủ chưa”. Tick khi có bằng chứng (test hoặc verify tay theo spec). Không tick vì “code đã đẩy”.

Cách dùng: làm theo [ROADMAP.md](./ROADMAP.md). Vision đủ A–D nằm hết ở đây.

---

## Agent profile (P2)

- [ ] Mỗi agent một `org/agents/<id>/profile.md` đúng Zod
- [ ] `workspace/` tách khỏi profile; agent không ghi profile
- [ ] Nộp bài bằng `orvanta_submit_handoff`, reviewer không `write_to_file`
- [ ] Editor Lưu ghi workspace, không ghi user library
- [ ] Template implementer/reviewer/researcher/skeptic
- [ ] Một lead; không xóa coordinator
- [ ] denyWrite bắt buộc 3 path
- [ ] Reload còn config

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

- [ ] `.orvanta/` có trong `.gitignore` gốc
- [ ] Tạo công ty atomic (tmp + rename), không nửa cây khi fail giữa chừng
- [ ] `company.json` validate: schemaVersion, id, name, teamName, policies, coordinatorAgentId
- [ ] `purpose.md` bắt buộc sau create
- [ ] `VERSION` = 1
- [ ] `org/roster.json` đúng một lead
- [ ] `org/agents/<id>/profile.md` frontmatter + body + `workspace/`
- [ ] `inbox/pending.json` + `inbox/history.jsonl`
- [ ] `state/snapshot.json` + `last-sync.json` là chiếu, không phải nguồn ghi purpose/roster
- [ ] `memory/` chặn `..` và non-`.md`
- [ ] Loader: không folder → empty; thiếu file → broken; schema lạ → refuse
- [ ] Hai lead → broken
- [ ] Thiếu coordinator → broken
- [ ] `teamName` qua `sanitizeTeamName`
- [ ] Không ghi API key vào `.orvanta/`
- [ ] Không đưa `.orvanta/` vào telemetry

### Persistence

- [ ] Khi company valid: TeamStore `teamDir` dưới `.orvanta/`, không `~/.cline/data/teams`
- [ ] `teamName` session = `company.teamName`
- [ ] Restore teammates từ roster (idle/stopped không spawn nhầm pending_hire)
- [ ] Run `interrupted` sau khi host chết, còn đó lúc mở lại
- [ ] Sync Home ghi snapshot từ TeamStore, không đè purpose
- [ ] Import một chiều `.cline/agents/` → pending_hire (nếu policy)

### Brand shell

- [ ] Icon Activity Bar Orvanta (Indigo)
- [ ] Top bar 4 tab: Home, Inbox, Chat, War room
- [ ] Tab active Indigo; nền Navy; accent Violet
- [ ] Shortcut Alt+1..4 (hoặc tương đương đã ghi keymap)
- [ ] Deep-link `orvanta://view/{home|inbox|chat|war-room}`
- [ ] ChatView không unmount khi đổi tab
- [ ] Overlay Settings/History/MCP/Account/Worktrees Cline vẫn hoạt động
- [ ] Onboarding Cline không bị thay bằng Orvanta

---

## A — Company home (`company-home`)

### First-run

- [ ] No folder: không form, bảo Open Folder
- [ ] Empty: form name + purpose template + model coordinator
- [ ] Submit tạo đủ file tối thiểu
- [ ] Không tự hire teammate thứ hai
- [ ] Secondary: nhập preset `.cline/agents/` nếu có
- [ ] Fail ghi đĩa: banner, không folder vỡ

### Header & purpose

- [ ] Tên công ty + one-liner purpose
- [ ] Purpose markdown render, clamp 8 dòng, expand/collapse
- [ ] Sửa purpose = draft UI, Save → decision `change_purpose`
- [ ] Chưa approve: `purpose.md` trên đĩa không đổi
- [ ] Menu: mở explorer `.orvanta/`, copy purpose, xóa công ty (gõ tên), xem company.json
- [ ] Sync: spinner, toast, error banner stale

### Roster

- [ ] Card: name, id, role, status, model, task hiện tại
- [ ] Sort: lead → running → idle → pending → stopped
- [ ] Hire form: id regex, template role, tools preview, maxIterations
- [ ] Hire → file + pending_hire + decision, **không** spawn
- [ ] Fire → decision, pending_fire, không shutdown trước approve
- [ ] Không fire coordinator (ẩn/disable)
- [ ] Sửa role → decision `change_role`
- [ ] Menu card: Chat / War room / Sửa role / Fire
- [ ] Status có chữ, không chỉ màu

### Work now

- [ ] Nhóm in_progress, blocked, queue
- [ ] Hàng: title, assignee, time, depends/chờ
- [ ] Action: Chat context task, War room filter, Escalate nếu blocked
- [ ] Empty copy đúng
- [ ] Trần 20 + xem tất cả
- [ ] `isReady` / blockedBy hiện đúng

### Inbox teaser & health

- [ ] Số pending + 3 item, click focus Inbox
- [ ] 0 pending vẫn hiện vùng
- [ ] Banner interrupted + CTA Tiếp tục (steer coordinator)
- [ ] Broken list lỗi + khôi phục / xóa lập lại
- [ ] last-sync lệch (dot) khi > 10 phút
- [ ] (Optional) số purpose-lock deny hôm nay

### Home chất lượng

- [ ] Reload window giữ purpose + roster
- [ ] 320px không overflow ngang
- [ ] Skeleton loading, không flash empty
- [ ] Running pill cập nhật ≤ 1s khi session live
- [ ] Multi-root: chọn folder chứa `.orvanta/` hoặc folder đầu — hành vi đã ghi và test

---

## B — Inbox CEO (`ceo-inbox`)

### Hàng đợi

- [ ] Tab Pending / Deferred / History
- [ ] Filter type + urgency
- [ ] Sort high → normal → low → mới trước
- [ ] List + detail (narrow: push detail + back)
- [ ] Deep-link `?focus=` mở đúng item

### Types — tạo đúng payload

- [ ] `hire_agent`
- [ ] `fire_agent`
- [ ] `change_role`
- [ ] `change_purpose`
- [ ] `change_scope`
- [ ] `merge`
- [ ] `over_budget`
- [ ] `over_ephemeral`
- [ ] `escalate_blocked`
- [ ] `change_policy`
- [ ] Type lạ / payload thiếu → reject, không ghi pending
- [ ] Không có type FYI/info

### Actors & tool

- [ ] Tool `orvanta_request_decision` (coordinator: hire/fire/scope/merge/escalate)
- [ ] Teammate chỉ escalate_blocked
- [ ] Host tạo over_budget, over_ephemeral, change_scope từ lock
- [ ] Tool không approve được
- [ ] Dedup cùng type + khóa nghiệp vụ

### Hành động

- [ ] Approve thực thi đúng bảng SPEC-B
- [ ] Reject thực thi đúng bảng SPEC-B
- [ ] Reject merge: note ≥ 8 ký tự → mailbox
- [ ] Defer: ra khỏi badge, nhóm Deferred
- [ ] Re-open deferred → pending
- [ ] Không Approve all
- [ ] Confirm 2 bước: change_purpose, nới policy `allow`, fire (không phải lead)
- [ ] Không fire coordinator
- [ ] Approve hire → A/C/D hiện agent
- [ ] Reject hire → không member runtime
- [ ] Approve purpose → đĩa đổi; reject → không
- [ ] Reject change_scope → task canceled
- [ ] Reject over_budget → không run mới

### Badge & history

- [ ] Badge tab + Activity Bar = pending only
- [ ] `99+`
- [ ] aria-label có số
- [ ] history.jsonl append-only, reload còn
- [ ] History filter type/status/ngày
- [ ] Deferred không trộn history

### Empty

- [ ] Chưa công ty: tab disabled + tooltip
- [ ] 0 pending: copy “đội không cần bạn”

---

## C — Chat + sidebar (`chat-sidebar`)

### Chat Cline giữ nguyên

- [ ] Mọi tool, approval, history Cline còn
- [ ] Đổi tab A/B/D về C: input còn, ask-promise còn
- [ ] Không có công ty: full width, không sidebar
- [ ] Banner lập công ty, dismiss 7 ngày, không chặn chat

### Teams flag

- [ ] Company valid → `enableAgentTeams: true`, `teamName` đúng, teamDir `.orvanta/`
- [ ] Không company → teams flag giữ false
- [ ] `/team` dùng `company.teamName`, không tạo team rời

### Sidebar

- [ ] Width kéo 140–280, nhớ state
- [ ] Hàng: name, status, task, lock-dot, ★ lead
- [ ] Sort như spec
- [ ] Guest nhóm “Tạm thời”
- [ ] Stopped collapsed mặc định
- [ ] Footer: War room, Hire (deep-link)
- [ ] Click set focus + ring
- [ ] nav + aria

### Nhắm agent

- [ ] Default focus coordinator
- [ ] Chip “Nói với {name}” + X
- [ ] Gửi lead = chat Cline
- [ ] Gửi teammate = mailbox/run, bubble “→ agent”
- [ ] Stopped / pending_hire disable composer
- [ ] Đổi focus khi buffer > 0: confirm
- [ ] Không đổi lead runtime thành user

### Deep-link & cards

- [ ] `?task=` chip task
- [ ] `?decision=` chip decision
- [ ] `?agent=` focus
- [ ] Card `team_run_task` → War room filter
- [ ] Card `orvanta_request_decision` → Inbox
- [ ] Card purpose-lock deny hiện trên transcript lead

---

## D — War room (`war-room`)

### D-min

- [ ] Card cho mọi roster + guest
- [ ] Status ≤ 1s khớp run
- [ ] Task title đúng
- [ ] Buffer 20: progress, tool, deny, error
- [ ] Không render secrets
- [ ] Expand: transcript persist ≤ 3 run
- [ ] Nói → Chat focus
- [ ] Đóng tab không cancel run
- [ ] Pause dừng append, runtime sống
- [ ] Ẩn tab: không vẽ; buffer còn khi quay
- [ ] Filter All / Running / Idle / Failed
- [ ] Filter theo task
- [ ] Empty no-company / idle / filter trống
- [ ] Không nút approve/hire/fire trên card
- [ ] Header purpose one-liner
- [ ] aria-live chỉ khi running + tab visible; pause tắt live

### D-full

- [ ] Token stream live trên card
- [ ] Virtualize > 12
- [ ] Search tên agent
- [ ] Layout 1/2/3 cột theo width
- [ ] Cost/token trên expand nếu có
- [ ] (Optional) pop-out editor group

---

## Purpose-lock (`purpose-lock`)

### Lớp 1

- [ ] Prompt order: orvanta khối → purpose → constraints → role → task → Cline
- [ ] Mọi agent kể cả lead nhận purpose đầy đủ

### Lớp 2

- [ ] Deny thắng allow
- [ ] Default policy theo template role (implementer/reviewer/researcher/skeptic/coordinator)
- [ ] `write`/`apply_diff` tôn trọng denyWrite
- [ ] Cấm agent ghi purpose.md, company.json, roster.json
- [ ] Reviewer không write/apply/execute (default)
- [ ] Structured error `purpose_lock_denied`, không throw
- [ ] Mission log kind blocked/decision khi deny

### Lớp 3

- [ ] `team_spawn_teammate` bền + policy ceo_approve → hire decision, không spawn
- [ ] Shutdown → fire decision
- [ ] Task ngoài purpose → blocked + change_scope
- [ ] Merge/finalize + ceo_approve → merge decision
- [ ] Ephemeral: lead_only, max 3, vượt → over_ephemeral
- [ ] Guest không vào roster Home
- [ ] Approve purpose → steer agent đang chạy
- [ ] firstHireFast: auto-approve hire đầu, vẫn có history

---

## Journeys (E2E tay hoặc test)

- [ ] J1 Lập công ty
- [ ] J2 Hire implementer + reviewer (approve)
- [ ] J2b Reject hire
- [ ] J3 Giao mục tiêu, đội chia việc trong purpose
- [ ] J3b Task ngoài purpose → inbox scope
- [ ] J4 Tắt giữa run → interrupted → Tiếp tục
- [ ] J5 Merge approve / reject + note
- [ ] J6 Fire teammate, task unassign
- [ ] J7 Chat 1 agent rồi về coordinator
- [ ] J8 War room nhìn + nói
- [ ] J9 Broken purpose → khôi phục
- [ ] J10 Ngày thường: inbox 0, home đúng, không babysit

---

## Chất lượng cắt ngang

- [ ] Không orchestrator thứ hai
- [ ] Không commit `.orvanta/` (CI hoặc test gitcheck nếu cần)
- [ ] Contrast 4.5:1 trên Navy
- [ ] Status luôn có text
- [ ] Một workspace một công ty
- [ ] Docs cập nhật nếu đổi schema/type
- [ ] Unit: validate schema, policy deny, dedup decision
- [ ] Integration: create company, approve hire, teams dir
- [ ] Webview: home empty → create → reload (khi có browser/test host)

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
