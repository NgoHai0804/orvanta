# Purpose-lock

Đây là răng của sản phẩm. Prompt hay mà không có lock thì Orvanta = Cline đổi tên.

## Mục tiêu

Một agent **không thể** (không chỉ “không nên”):

1. Sửa purpose / constraints
2. Tự nới scope task ra ngoài purpose
3. Dùng tool ngoài role
4. Hire / fire teammate bền khi policy = `ceo_approve`
5. Apply / merge thay đổi lớn khi policy = `ceo_approve`

Khi cố: tool trả lỗi có cấu trúc, mission log `kind: blocked` hoặc `decision`, và nếu cần thì một item Inbox.

## Ba lớp khóa

```
Lớp 1 — Prompt     purpose.md + constraints.md + role body
Lớp 2 — Tool policy  allow/deny + path denyWrite
Lớp 3 — Decision gate  hire / fire / purpose / scope / merge → Inbox
```

Lớp 1 không đủ. Lớp 2 và 3 là bắt buộc cho “làm đúng mục đích”.

## Lớp 1 — Prompt assembly

Mỗi agent nhận system prompt theo thứ tự cố định:

1. Khối Orvanta (bạn là thành viên công ty X, CEO là người dùng, không sửa purpose)
2. Toàn bộ `purpose.md`
3. `constraints.md` (hoặc default)
4. Role body của `org/agents/<id>/profile.md`
5. Khối task hiện tại (nếu đang chạy một task): title, description, scopePaths của task
6. Cline default tools instructions (như hiện tại)

Cấm: agent tự ý “cải thiện” purpose trong reasoning rồi hành động theo bản cải thiện.

## Lớp 2 — Tool policy

Nguồn: frontmatter `tools.allow` / `tools.deny` + default theo role.

### Default theo role

| Role id điển hình | Allow gợi ý | Deny gợi ý |
|---|---|---|
| `coordinator` / lead | team_*, read, grep, list | `write_to_file` vào `.orvanta/purpose.md`; spawn nếu policy ceo_approve |
| `implementer` | read, write, apply_diff, execute_command, grep | `team_spawn_teammate`, sửa purpose |
| `reviewer` | read, grep, list, web_fetch, orvanta_submit_handoff | write, apply_diff, execute_command, spawn |
| `researcher` | read, grep, web_fetch, browser | write, apply_diff, spawn |
| `skeptic` | read, grep | write, apply_diff, spawn |

CEO có thể sửa frontmatter (đó là đổi role → decision `change_role` nếu agent đã hire).

### Enforcement

- Trước `execute` tool: host kiểm tra deny list. Deny → không gọi tool, trả `{ ok: false, code: "purpose_lock_denied", tool, reason }`.
- `write_to_file` / `apply_diff`: kiểm `scopePaths.denyWrite` + luật space ([10-agent-spaces.md](./10-agent-spaces.md)). Cấm purpose/company/roster/`profile.md` (kể cả của mình) và `shared/handoffs/**`. Space `workspace/` của mình: implementer được ghi. Nộp bài: `orvanta_submit_handoff`.
- `execute_command`: reviewer/researcher default deny. Implementer allow; vẫn qua approval Cline nếu user bật auto-approve off.
- `team_spawn_teammate`: xem lớp 3.

Throw không dùng (Cline tính throw là mistake). Trả structured error.

## Lớp 3 — Decision gate

| Hành động | Policy default | Nếu bị chặn |
|---|---|---|
| Spawn teammate bền (có file trong org/) | `ceo_approve` | Tạo `hire_agent`, không spawn |
| Shutdown teammate | `ceo_approve` | Tạo `fire_agent` |
| Sửa purpose.md | `ceo_approve` | Chỉ qua UI CEO + decision (lần đầu tạo công ty được ghi trực tiếp) |
| Task mới mà classifier “ngoài purpose” | `ceo_approve` | Tạo `change_scope`, task ở `blocked` |
| Finalize outcome / apply bộ diff lớn | `ceo_approve` | Tạo `merge` |
| Spawn ephemeral (không vào roster, TTL 1 session, không persist) | `lead_only` | Lead được làm; hiện trên War room như “guest”, biến mất khi session hết |

### Classifier “ngoài purpose” (tối thiểu)

Không cần LLM hoàn hảo ở pha đầu. Luật cứng trước:

- Task `scopePaths` nằm ngoài mọi `scopePaths.allow` của company (nếu company có allowlist)
- Task title/description chứa marker CEO đã ghi trong purpose mục “Không làm” (match literal / keyword list do CEO edit)
- Agent gọi `team_task` với `status` tạo mới + field `requiresScopeApproval: true` (coordinator tự khai)

Pha sau: LLM-side check “does this task serve purpose.md?” — optional, không chặn spec tối thiểu.

## Spawn bền vs ephemeral

| | Bền (roster) | Ephemeral |
|---|---|---|
| Có `org/agents/<id>/profile.md` | Có | Không |
| Sống sau restart | Có | Không |
| Hiện Home roster | Có | Không (chỉ War room “guest”) |
| Hire decision | Có | Không |
| Dùng khi | Role cố định | Nghiên cứu song song một lần |

Lead lạm dụng ephemeral để tránh inbox: giới hạn `maxEphemeralPerSession` (default 3). Vượt → decision `over_ephemeral`.

## Sửa purpose

1. CEO bấm Edit trên Home.
2. Draft trong UI, chưa ghi đĩa.
3. Save → `change_purpose` với `payload.from` / `payload.to`.
4. Approve → ghi `purpose.md`, `company.updatedAt`, inject prompt phiên mới.
5. Agent đang chạy: nhận steer “purpose đã đổi, dừng nếu task cũ lệch; escalate nếu cần”.
6. Reject → không ghi đĩa.

## Audit

Mọi deny lớp 2 và mọi decision lớp 3 ghi:

- `inbox/history.jsonl` nếu là decision
- `missionLog` kind `blocked` hoặc `decision`
- Home có thể hiện “N lần bị khóa hôm nay” (optional, checklist A)

## Việc purpose-lock **không** làm

- Không đảm bảo chất lượng code. Reviewer + merge gate làm việc đó.
- Không thay human approval từng lệnh terminal (vẫn là setting Cline).
- Không khóa agent khỏi *suy nghĩ* lệch — chỉ khóa *hành động* lệch.
