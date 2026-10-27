# P5 — Spawn từ roster + lock tối thiểu

**Demo:** Đội 1 coordinator + 1 implementer đã cấu hình → mở Chat, coordinator chạy → implementer được spawn theo file agent → implementer `write_to_file` `.orvanta/purpose.md` **bị từ chối** structured.

**Đọc:** [06-purpose-lock.md](../06-purpose-lock.md) lớp 1 + cấm ghi 3 file; [SPEC-A](../SPEC-A-company-home.md) roster status running.

**Cấm P5:** Inbox đủ type, war room, ephemeral quota, classifier scope LLM.

## Việc

1. Khi session start + company ready: `bootstrapAgentTeams` với `restoredTeammates` từ mọi roster agent `role=teammate` + status không `pending_*` / `stopped`.
   - `rolePrompt` = `profile.instructions`
   - `modelId` / `maxIterations` từ profile
2. Lead tools: **không** để `team_spawn_teammate` tạo agent bền ngoài roster. P5: `includeLeadSpawnTool: false` hoặc chặn execute nếu `agentId` không có trên roster.
3. Lock lớp 1: prepend purpose + constraints vào systemPrompt session (factory đã có `systemPrompt` — nối khối Orvanta).
4. Lock lớp 2 tối thiểu: wrapper tool write/apply — nếu path là 3 file cấm, `profile.md`, space người khác, hoặc `shared/handoffs/**` qua `write_to_file` → `{ ok: false, code: "purpose_lock_denied" }`. Nộp bài: `orvanta_submit_handoff` (có thể P7 nếu P5 chưa cần review).
   - Gắn theo `requesterId` teammate, không theo lead.
5. Home roster: status `running` khi có run (subscribe team events nếu có; không có thì poll `team_status` 1s — ghi rõ cách đã chọn).

## Tests

- buildTeammateSpecs từ roster bỏ pending_hire
- deny write purpose.md (unit, fake path)
- spawn tool disabled hoặc reject id lạ

## Tasks

- [ ] Task: map profile → TeamTeammateSpec + test  
- [ ] Task: inject purpose vào systemPrompt + test snapshot khối  
- [ ] Task: deny write hook + test  
- [ ] Task: bootstrap teammates on session start  
- [ ] Task: Home status running (tối thiểu)  
  - Verify tay: 1 task nhỏ, thấy implementer running, sửa purpose bằng agent thất bại

## Done P5

- [ ] Demo lock
- [ ] Tắt VS Code giữa run: P6 chưa cần resume UI; runtime interrupted được thì Home có thể chưa banner (P6)
