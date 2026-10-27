# P4 — Chat + sidebar đội

**Demo:** Có công ty 3 agent → tab Chat thấy sidebar 3 tên → gõ tin cho coordinator như Cline; sang Home rồi về Chat, ô nhập còn chữ.

**Đọc:** [SPEC-C-chat-sidebar.md](../SPEC-C-chat-sidebar.md) (bỏ nhắm teammate mailbox — P5+).

**Cấm P4:** war room, inbox, spawn teammate, session riêng per agent.

## Việc phải làm

1. `apps/vscode/src/sdk/cline-session-factory.ts`: khi `workspace-store` load `ready`:

```ts
enableAgentTeams: true,
teamName: company.teamName,
// teamDir: path.join(workspaceRoot, ".orvanta", "state", "team")
```

**Bắt buộc sửa core (không TODO):** `CoreSessionConfig` hiện **không** có `teamDir`. `runtime-builder.ts` gọi `createLocalTeamStore()` không đối số → team nằm `resolveTeamDataDir()` (`~/.cline/.../teams`). Phải:

1. Thêm `teamDir?: string` vào `CoreSessionConfig` (`sdk/packages/core/src/types/config.ts`)
2. `createLocalTeamStore({ teamDir: config.teamDir })` trong `runtime-builder.ts`
3. Session factory VS Code truyền `path.join(workspaceRoot, ".orvanta", "state", "team")`

Không ship P4 nếu team vẫn ghi global Cline.

2. Sidebar: list từ `getCompany` / subscribe. Click agent P4 chỉ highlight, composer vẫn gửi lead. Chip “Nói với coordinator”.
3. Không công ty: sidebar ẩn, teams flag **false**.
4. ChatView `isHidden` khi tab ≠ Chat; không unmount.
5. `/team` nếu có trong slash: gắn `company.teamName`.

## Tests

- Factory: mock company ready → `enableAgentTeams === true` và teamName
- Factory: missing → `false`
- (Unit UI nếu đã có pattern) sidebar renders N names

## Tasks

- [ ] Task: session factory + test `cline-session-factory.test.ts`  
  - Verify: `cd apps/vscode && bun run test:unit` (file factory)

- [ ] Task: teamDir dưới `.orvanta/state/team` (mkdir)  
  - Verify: sau 1 session có công ty, không tạo team mới trong `~/.cline/data/teams` cho teamName đó

- [ ] Task: sidebar UI + isHidden  
  - Verify tay: gõ dở, sang Home, về Chat còn; sidebar 3 agent

## Done P4

- [ ] Demo + Chat Cline tool/approval không regress
