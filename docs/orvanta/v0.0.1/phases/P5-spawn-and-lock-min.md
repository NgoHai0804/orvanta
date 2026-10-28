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
   - **Cách đã chọn:** Kết hợp event-driven qua `onTeamEvent` (`RunStarted` / `RunCompleted` / `RunFailed` / `RunCancelled` / `RunInterrupted`) đẩy vào `TeamStatusTracker` kích hoạt gRPC streaming emit tức thì trong `subscribeCompany` + fallback poll 1s trong `useOrvantaCompany` khi có agent ở trạng thái `running` để đảm bảo UI luôn đồng bộ mà không tốn tài nguyên lúc idle.

## Tests

- [x] buildTeammateSpecs từ roster bỏ pending_hire (passed trong `teammate-specs.test.ts`)
- [x] deny write purpose.md (unit, fake path, absolute/relative/Windows backslash, hook và tool wrapper trong `purpose-lock.test.ts`)
- [x] spawn tool disabled hoặc reject id lạ (passed trong `team-tools.test.ts` và `cline-session-factory.test.ts`)

## Tasks

- [x] Task: map profile → TeamTeammateSpec + test  
- [x] Task: inject purpose vào systemPrompt + test snapshot khối  
- [x] Task: deny write hook + test  
- [x] Task: bootstrap teammates on session start  
- [x] Task: Home status running (tối thiểu)  
  - Verify tay: 1 task nhỏ, thấy implementer running, sửa purpose bằng agent thất bại

## Done P5

- [x] Demo lock (Purpose-Lock Layer 1 injects into system prompt, Layer 2 wrapper blocks 3 forbidden files, profile.md, other spaces, shared/handoffs)
- [x] Tắt VS Code giữa run: P6 chưa cần resume UI; runtime interrupted được thì Home có thể chưa banner (P6)

