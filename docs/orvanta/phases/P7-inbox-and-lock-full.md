# P7 — Inbox đủ + lock lớp 2–3

**Demo:** Task ngoài purpose → Inbox `change_scope` → Reject → task canceled. Reviewer không `write_to_file`. Merge chờ Approve.

**Đọc:** SPEC-B còn lại, purpose-lock đủ, SPEC-C nhắm teammate (mailbox).

## Việc

- Đủ 10 type; `over_budget` chỉ khi đọc được cost (không có thì type vẫn có, host chưa emit)
- Tool policy theo `tools.allow/deny` của **từng** profile
- `team_spawn_teammate` bền → luôn `hire_agent` khi policy `ceo_approve`
- Ephemeral max 3
- Chat: chip nói teammate → mailbox; cards decision / lock deny
- Deep-link `orvanta://` hoặc query nội bộ tab

## Tasks

- [ ] Task: policy engine + test từng role template  
- [ ] Task: 7 type còn + resolve side effects + test  
- [ ] Task: mailbox focus agent  
- [ ] Task: Chat cards  
- [ ] Verify: J3b, J5, J7 trong [07-user-journeys.md](../07-user-journeys.md)

## Done P7

- [ ] Checklist B + purpose-lock + C nhắm agent (trừ session riêng)
