# Agent spaces — lưu trữ, khóa, giao tiếp

Ý tưởng của bạn: mỗi agent tự sửa **vùng của nó**, không sửa vùng agent khác. Đúng hướng. Dưới đây là cách làm **hợp lý nhất** — không để agent tự phong chức, không chat bằng cách ghi đè folder hàng xóm.

## Lời khuyên ngắn

1. **Tách 3 lớp**, đừng gộp một folder “của agent”:
   - **Identity** — role, model, tool, prompt: chỉ CEO sửa.
   - **Space** — memory, journal, scratch: agent đó được ghi.
   - **Repo scope** — `src/...` của task: ghi theo task, không phải “nhà” của agent.
2. **Cấm agent sửa `profile.md` của chính mình.** Nếu chúng đổi `tools.deny` hoặc biến mình thành lead, purpose-lock chết.
3. **Không giao tiếp bằng cách ghi vào folder người khác.** Một người ghi `reviewer/workspace` là reviewer mất chủ quyền. Dùng **thư + khay giao nộp**.
4. **Ba kênh là đủ:** mailbox (nói), `shared/handoffs` (nộp bài), task board / mission log (trạng thái). Không cần mạng xã hội thứ tư.

## How Might We

> How might we để mỗi agent có nhà riêng, tự ghi nhớ và nộp việc, mà không sửa được luật chơi hay nhà người khác?

## Cây đĩa (thay `org/agents/<id>.md`)

```
<workspace>/.orvanta/
  company.json                         # CEO
  purpose.md                           # CEO
  constraints.md                       # CEO
  org/
    roster.json                        # CEO
    agents/
      <agentId>/
        profile.md                     # IDENTITY — chỉ CEO (và editor P2)
        workspace/                     # SPACE — chỉ agent này được ghi
          memory.md                    # họ tự cập nhật
          journal/                     # ghi chú theo ngày
          scratch/                     # nháp, không phải bàn giao
  shared/                              # đội — ai cũng đọc; ghi theo luật dưới
    handoffs/
      <taskId>/
        <fromAgentId>.md               # người giao nộp được tạo/ghi file của mình
    board.md                           # chiếu task, host ghi, agent không ghi
  inbox/                               # CEO decisions — agent không ghi
  state/                               # runtime — host ghi
```

Snapshot P3 copy: `company.json`, `purpose.md`, `constraints.md`, `org/roster.json`, `org/agents/<id>/profile.md`. **Không** copy `workspace/`, `shared/handoffs`, inbox, state (việc cũ). Có thể copy `workspace/memory.md` nếu sau này muốn — **mặc định không**.

## Ai được đọc / ghi

| Path | Agent X | Coordinator | CEO (UI) | Agent Y ≠ X |
|---|---|---|---|---|
| `purpose.md`, `constraints.md`, `company.json` | đọc | đọc | đọc+ghi | đọc |
| `org/roster.json` | đọc | đọc | đọc+ghi | đọc |
| `org/agents/X/profile.md` | **đọc** | đọc | đọc+ghi | đọc |
| `org/agents/X/workspace/**` | **đọc+ghi** | **chỉ đọc** | đọc+ghi (hiếm) | **không** |
| `org/agents/Y/workspace/**` | không | chỉ đọc | đọc | — |
| `shared/handoffs/<task>/<X>.md` | đọc+ghi file **đúng tên X** | đọc; không ghi đè file người khác | đọc | đọc |
| `shared/handoffs/<task>/<Y>.md` | đọc | đọc | đọc | ghi (của Y) |
| `shared/board.md` | đọc | đọc | đọc | đọc |
| `inbox/`, `state/` | không | không | đọc | không |
| Repo path trong `task.scopePaths` | theo role + task | thường không write code | — | theo task của họ |

Coordinator **không viết** vào space teammate. Cần chỉ đạo → mailbox. Cần đọc tiến độ → đọc space (read) + mission log.

Reviewer **không viết** repo (như cũ) và không viết space implementer. Review ghi vào `shared/handoffs/<task>/reviewer.md` hoặc mailbox.

## Xử lý (lock) — lớp 2 mở rộng

Khi tool `write_to_file` / `apply_diff` / `delete`:

```
nếu path trong .orvanta/:
  nếu path ∈ org/agents/<me>/workspace/**        → cho
  nếu path bắt đầu shared/handoffs/              → cấm write_to_file; phải dùng orvanta_submit_handoff
  còn lại trong .orvanta/                        → purpose_lock_denied
nếu path ngoài .orvanta/:
  áp tools.deny + task.scopePaths như cũ
```

Đọc (`read_files`):

- Cho: purpose, constraints, roster, mọi `profile.md`, `shared/**`, space **của mình**
- Coordinator: thêm mọi `org/agents/*/workspace/**` (read)
- Teammate đọc space người khác: **cấm** (họ xin qua mailbox / đọc handoff)

`execute_command` không được `rm` / redirect vào `.orvanta/org/agents/<khác>`. P5+ nên cấm command chạm `.orvanta/**` trừ khi allowlist (implementer không cần shell trong `.orvanta`).

Lỗi: `{ ok: false, code: "space_denied", path, owner }`.

## Agent tự cập nhật vùng của nó — được cái gì

Được:

- Viết `workspace/memory.md`: “lần trước auth dùng JWT, test ở …”
- Journal theo task
- Scratch: draft plan, không tính bàn giao
- Nộp bài: tool `orvanta_submit_handoff` → `shared/handoffs/<taskId>/<id>.md` (không dùng `write_to_file`)

Không được:

- Sửa `profile.md` (tools, role, prompt gốc)
- Sửa purpose, hire, fire
- Xóa / sửa handoff của người khác
- “Cập nhật” reviewer bằng cách ghi vào folder họ

Nếu agent muốn đổi cách làm việc của chính mình: ghi đề xuất vào `workspace/memory.md` hoặc mailbox cho CEO. CEO mới sửa profile. **Tự evolve identity = lỗ bảo mật.**

## Giao tiếp — ba kênh

```
                    ┌─────────────┐
                    │  CEO Inbox  │  (người ↔ công ty)
                    └─────────────┘
                           ▲
┌──────────┐  mailbox  ┌───┴────┐  mailbox  ┌──────────┐
│implementer│ ───────► │coord.  │ ◄─────── │ reviewer │
└─────┬────┘           └───┬────┘           └─────┬────┘
      │                    │                      │
      │     shared/handoffs/<taskId>/             │
      └──────────► implementer.md  reviewer.md ◄──┘
                   (nộp bài, không phải chat)
```

### 1. Mailbox — nói chuyện

Đúng chỗ dùng `team_send_message` / `team_broadcast` (runtime đã có). Không invent bus mới.

Luật:

- `to` một agent hoặc `broadcast`
- Body ngắn; **artifact để ở handoff**, mailbox chỉ gắn path
- Không ghi file vào space người nhận thay cho thư

Loại thư (field `subject` hoặc `kind`):

| kind | Khi nào |
|---|---|
| `assign` | Coordinator giao task (kèm `taskId`) |
| `question` | Hỏi, chờ reply |
| `nudge` | Nhắc đang blocked |
| `done` | Đã nộp, path handoff |
| `review` | Mời review path đó |
| `block` | Kẹt, cần CEO/coord |

### 2. Handoff — nộp bài

Tool `orvanta_submit_handoff({ taskId, content })`: host ghi đúng `shared/handoffs/<taskId>/<requesterId>.md`. Reviewer/researcher **không** cần `write_to_file`.

Một task một thư mục. Mỗi agent **một file đúng id**.

```
shared/handoffs/task-auth/
  implementer.md     # diff tóm tắt, file đụng, cách test
  reviewer.md        # findings
```

Overwrite file **của mình** được (nộp lại). Không tạo `implementer-v2.md` trong folder người khác.

Host có thể chiếu mailbox `done` khi file handoff đổi — không bắt buộc P2.

### 3. Board / mission log — trạng thái

`TeamTask` + `missionLog` như Cline teams. Agent không tự bịa task ngoài purpose (P6+). `shared/board.md` nếu có thì **host ghi**, tránh hai nguồn.

## Vòng đời một việc (chuẩn)

1. CEO nói purpose trên Chat (coordinator).
2. Coordinator tạo task, mailbox `assign` → implementer.
3. Implementer làm trong **repo scope** của task; ghi nhớ trong **space của mình**.
4. Implementer viết `shared/handoffs/<id>/implementer.md`, mailbox `done` → coordinator (+ reviewer).
5. Reviewer đọc handoff + repo (read), viết `reviewer.md`, mailbox `review`.
6. Coordinator tổng hợp; merge → Inbox CEO nếu policy.

Không bước nào cần implementer `write` vào `org/agents/reviewer/`.

## Mapping runtime (đừng viết bus mới)

| Orvanta | Đã có |
|---|---|
| Mailbox | `TeamMailboxMessage`, `team_send_message`, `team_broadcast`, `team_read_mailbox` |
| Board | `TeamTask`, `team_task` |
| Nhật ký | `missionLog` |
| Nộp bài | folder `shared/handoffs` + lock path (mới, mỏng) |
| Space | folder + lock path (mới, mỏng) |

Không: MCP nội bộ, không queue Redis, không “shared memory.md” mọi người cùng ghi.

## Việc hay làm sai

| Sai | Vì sao | Thay bằng |
|---|---|---|
| Agent sửa được prompt/tools của mình | Tự gỡ deny | CEO + profile |
| Folder phẳng `agents/a.md` + agent ghi đè file đó | Identity lẫn scratch | Thư mục + tách profile/workspace |
| Giao tiếp = ghi `other/workspace` | Mất chủ quyền, conflict | Mailbox + handoff |
| Một `shared/memory.md` chung | Last-write-wins | Space riêng + handoff |
| Coordinator viết giúp implementer trong space họ | Hai chủ | Mailbox |

## Ảnh hưởng pha

- P1: tạo `org/agents/coordinator/profile.md` + `workspace/memory.md` rỗng (không còn file phẳng `.md`).
- P2: editor chỉ sửa `profile.md`; có thể xem memory read-only.
- P3: snapshot chỉ `profile.md`, không workspace.
- P5: lock path theo bảng trên.
- Giao tiếp mailbox: P4–P5 (runtime đã có tool). Handoff folder: P5 cùng lock.

## Acceptance (khi implement)

- [ ] Implementer ghi được `workspace/memory.md`, không ghi `reviewer/workspace/**`
- [ ] Không agent nào ghi `profile.md` (kể cả của mình)
- [ ] Handoff: implementer ghi được file đúng id, không ghi `reviewer.md`
- [ ] Coordinator đọc được space implementer, không ghi được
- [ ] Mailbox `done` không tự viết vào space người nhận
