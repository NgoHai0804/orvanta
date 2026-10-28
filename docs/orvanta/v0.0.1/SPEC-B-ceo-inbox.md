# Spec B — Inbox CEO

Module id: `ceo-inbox`. Răng của CEO nhẹ. Không phải notification dump.

## Objective

CEO chỉ thấy việc **không đảo ngược được** hoặc **đổi mục tiêu**. Mỗi item: đủ context để Approve / Reject / Defer trong < 1 phút, có audit, có hậu quả rõ trên A/C/D.

## User stories

1. Tôi muốn một hàng đợi, không phải săn trong transcript.
2. Tôi muốn biết ai xin gì, vì sao, rủi ro tool/path.
3. Tôi muốn approve hire rồi thấy agent trên roster ngay.
4. Tôi muốn reject merge và buộc ghi lý do, để implementer biết sửa gì.
5. Tôi muốn defer khi chưa quyết, không để item biến mất.
6. Tôi muốn lịch sử — không cãi “hôm qua đã bảo được hire”.
7. Tôi muốn badge trên tab và Activity Bar = đúng số pending.
8. Tôi muốn filter theo type và urgency.
9. Tôi không muốn inbox chứa “đã đọc file”.
10. Tôi muốn mở Chat/War room từ một decision.

## Loại quyết định (đủ)

| `type` | Ai tạo | Payload bắt buộc | Approve làm gì | Reject làm gì |
|---|---|---|---|---|
| `hire_agent` | CEO (form) hoặc coordinator | `agentId`, `displayName`, `agentFile`, `rolePromptPreview`, `tools`, `modelId` | roster → idle, spawn teammate | xóa/archive file, không spawn |
| `fire_agent` | CEO hoặc coordinator | `agentId`, `reason`, `reassignTasks` | shutdown, archive file, unassign task | status về idle |
| `change_role` | CEO | `agentId`, `fromFrontmatter`, `toFrontmatter` | ghi file agent, respawn policy tools | bỏ draft |
| `change_purpose` | CEO | `from`, `to` (full markdown) | ghi purpose.md, steer agents | không ghi đĩa |
| `change_scope` | coordinator / lock | `taskId`, `title`, `whyOutsidePurpose`, `proposedScope` | task unblocked, cho chạy | task canceled |
| `merge` | coordinator / implementer | `outcomeId` hoặc `diffSummary`, `files[]`, `risk` | finalize/apply | mailbox lý do CEO |
| `over_budget` | host | `spentUsd`, `limitUsd`, `window` | cho phép tiếp + optional raise limit | pause mọi run |
| `over_ephemeral` | host | `count`, `limit` | raise limit session | hủy guest queued |
| `escalate_blocked` | CEO hoặc agent | `taskId`, `blocker`, `askedAt` | note + optional unblock instruction | giữ blocked |
| `change_policy` | CEO | `key`, `from`, `to` | ghi `company.policies` | không đổi |

Không thêm type “info”, “fyi”, “agent_thought”. Đó không phải inbox.

## Urgency

| Value | Khi nào | UI |
|---|---|---|
| `low` | change_role nhỏ, escalate không chặn cả đội | xám |
| `normal` | hire, scope, fire | Indigo |
| `high` | merge đang chờ, purpose, over_budget | Violet / nhấn |

Sort mặc định: high → normal → low, rồi `createdAt` mới trước.

## Status

```
pending → approved
        → rejected
        → deferred     (vẫn hiện, nhóm “Để sau”, không tính badge)
        → expired      (optional: hire pending > 7 ngày; không tự approve)
```

Badge = chỉ `pending`. Deferred không đếm.

## Bố cục

```
┌─ Inbox ──────────────────────────────────────────────┐
│ Pending (n)   Deferred (n)   History                 │
│ Filter: [all types ▾]  [all urgency ▾]               │
├─ List (~40%) ─┬─ Detail (~60%) ──────────────────────┤
│ ● hire …      │ Title                                │
│   merge …     │ Type · urgency · createdBy · time    │
│   scope …     │                                      │
│               │ Summary                              │
│               │ Payload (structured)                 │
│               │ Risk / tools / files                 │
│               │                                      │
│               │ [Approve] [Reject] [Defer]           │
│               │ [Chat] [War room]                    │
└───────────────┴──────────────────────────────────────┘
```

Sidebar hẹp: list full-width, click → push detail (back button).

## Detail theo type

### hire_agent

- Preview role markdown (clamp + expand)
- Bảng tools allow/deny
- Model, maxIterations
- Cảnh báo nếu `id` trùng agent stopped (re-hire)

### fire_agent

- Task sẽ unassign
- Checkbox `reassignToCoordinator` (default on)
- Lý do (đã có từ người xin)

### change_purpose

- Diff markdown (from/to), highlight đoạn thêm/xóa
- Cảnh báo: agent đang chạy sẽ được steer

### change_scope

- Purpose quote (đoạn “Không làm” liên quan nếu match)
- Task description
- Why-outside (bắt buộc từ coordinator)

### merge

- File list + insertions/deletions nếu có
- Outcome sections + fragment status
- Reject: textarea lý do **bắt buộc** (min 8 ký tự)

### over_budget

- Spent vs limit, danh sách run tốn nhất (nếu telemetry có; không thì tổng)

## Hành động

| Action | Side effect chung |
|---|---|
| Approve | `pending.json` bỏ item → `history.jsonl` status approved; thực thi bảng type; toast; badge −1; A/C/D cập nhật |
| Reject | như trên, status rejected; merge bắt buộc note; thực thi cột reject |
| Defer | status deferred, `deferredUntil` optional (default không hạn); ra khỏi badge |
| Re-open deferred | về pending |

Không có “Approve all”. Hire/merge/purpose từng cái một. `escalate_blocked` có thể batch sau — không trong scope đầu của B.

Confirm thứ hai khi:

- `fire_agent` lead (cấm fire coordinator? **Có: không cho fire lead.** Đổi lead = `change_role` + hire lead mới, pha sau. Inbox từ chối `fire_agent` với id = coordinator.)
- `change_purpose`
- `change_policy` sang `allow` (nới lock)

## Ai được tạo decision

| Actor | Được tạo |
|---|---|
| CEO (UI) | tất cả type |
| Coordinator (tool `orvanta_request_decision` — tool mới, mỏng) | hire, fire, change_scope, merge, escalate_blocked |
| Host / purpose-lock | change_scope, over_budget, over_ephemeral |
| Teammate | chỉ `escalate_blocked` |

Tool mới `orvanta_request_decision`:

- Input: `type`, `title`, `summary`, `payload` (json theo type)
- Không approve được từ tool
- Trả `{ decisionId, status: "pending" }`
- Dedup: cùng type + cùng `agentId`/`taskId`/`outcomeId` đang pending → trả id cũ, không nhân bản

## Empty / disabled

- Chưa có công ty: tab Inbox disabled, tooltip “Lập công ty trên Home”.
- Có công ty, 0 pending: illustration ngắn + “Đội không cần bạn lúc này.”
- History trống: “Chưa có quyết định nào.”

## History

- Filter type, status, khoảng ngày (7 / 30 / all)
- Click = detail read-only (không đổi status trừ Re-open nếu deferred còn hạn — deferred không nằm history cho đến khi resolve)
- Deferred ở tab riêng, không trộn history

## Badge & Activity Bar

- Nguồn: `pending.json` length
- Cập nhật ngay khi thêm/bớt, kể cả khi đang ở tab Chat
- `n > 99` hiện `99+`
- Accessibility: `aria-label="Inbox, {n} pending"`

## Mapping

| Inbox | Đĩa / runtime |
|---|---|
| pending | `.orvanta/inbox/pending.json` |
| history | `.orvanta/inbox/history.jsonl` |
| approve hire | roster + `team_spawn_teammate` |
| approve fire | `team_shutdown_teammate` |
| approve merge | `team_finalize_outcome` và/hoặc Cline apply |

## Không thuộc B

- Stream token
- Sửa purpose trực tiếp không qua decision (trừ create company)
- Chat composer
- Notification OS (optional sau; không bắt buộc)

## Acceptance

- [ ] Chỉ các type trong bảng được tạo; payload sai → tool/UI reject
- [ ] Dedup pending cùng khóa nghiệp vụ
- [ ] Approve hire → agent trên A, C, D; file không `pending_hire`
- [ ] Reject hire → không member runtime
- [ ] Approve purpose → đĩa đổi; reject → đĩa cũ
- [ ] Reject merge bắt buộc note; note vào mailbox implementer
- [ ] Không fire được coordinator
- [ ] Badge = pending, không đếm deferred
- [ ] History append-only, reload không mất
- [ ] `orvanta_request_decision` không spawn / không ghi purpose
- [ ] Change_scope reject → task canceled không chạy
- [ ] Over_budget reject → không run mới đến khi có decision khác
- [ ] Không có Approve all
- [ ] Confirm 2 bước cho purpose / nới policy / fire
- [ ] Deep-link `?focus=` mở đúng detail

## Open questions (B)

- Auto-expire hire 7 ngày: làm ngay hay để sau? **Đề xuất:** status `expired` trong spec, implement sau A+B tối thiểu (expire = job khi mở Inbox).
- Có cần chữ ký “tôi đã đọc diff”? **Không** — Approve là đủ.
