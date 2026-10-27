# P2 — Cấu hình từng agent (workspace)

**Demo:** Home → Thêm reviewer từ template → sửa prompt/model/deny tools → Lưu → Reload Window → card + file `org/agents/reviewer/profile.md` còn nguyên. `workspace/` không bị editor ghi đè.

**Đọc:** [SPEC-agent-config.md](../SPEC-agent-config.md)

**Cấm P2:** user library, spawn, Inbox, đổi `enableAgentTeams`, xóa purpose không qua editor company (chưa có).

## Phụ thuộc

P1 done. Company `ready`.

## Code

- Zod `AgentProfile` + parse/serialize markdown frontmatter: `sdk/packages/shared/src/orvanta/agent-profile.ts`
  - Dùng gray-matter nếu shared đã có; không thì tự parse `---` blocks, test kỹ.
- Templates: `templates/implementer.ts` … (string export)
- Store: `workspace-store.upsertAgent(profile)`, `removeAgent(id)`, `listProfiles()`
  - `upsertAgent` ghi `org/agents/<id>/profile.md` + tạo `workspace/` nếu thiếu + patch roster
  - Không đổi `role` thành lead nếu đã có lead khác
  - Id lead không đổi
  - Prepend 3 path denyWrite bắt buộc nếu user xóa
- Proto thêm:

```proto
rpc listAgentProfiles(EmptyRequest) returns (OrvantaAgentProfileList);
rpc upsertAgentProfile(OrvantaAgentProfile) returns (OrvantaAgentProfile);
rpc deleteAgentProfile(StringRequest) returns (OrvantaCompanyResponse);
```

`OrvantaAgentProfile` map 1-1 field SPEC (tools + scope = repeated string).

- UI: `AgentEditor.tsx` overlay. Home roster: click → editor; nút Thêm → chọn template → editor với id trống (user điền).
- Lưu dirty / confirm đóng như spec.

## Tests

- parse/serialize round-trip frontmatter
- reject id hoa, instructions rỗng, hai lead
- upsert rồi list = 1 profile mới
- delete coordinator bị reject
- denyWrite luôn chứa 3 path cấm sau upsert

## Tasks

- [ ] Task: agent-profile Zod + templates + test shared  
  - Verify: `bun -F @cline/shared test` + `bun run build:sdk`

- [ ] Task: workspace-store upsert/delete + test  
  - Verify: unit vscode

- [ ] Task: proto RPC + handlers  
  - Verify: `bun run protos`

- [ ] Task: AgentEditor + Home Thêm/Sửa  
  - Verify tay: thêm 2 agent khác template, sửa coordinator instructions, reload còn
  - Verify: không tạo folder `~/.orvanta`

## Done P2

- [ ] Mỗi agent một file markdown đúng hợp đồng
- [ ] Roster khớp file
- [ ] Demo sentence
