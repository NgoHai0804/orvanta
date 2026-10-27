# Pha implement — luật cho agent viết code

Đọc file này **trước** khi đụng `apps/vscode` hay `sdk/`.

## Cách chạy một pha

1. Mở đúng `P<n>-*.md`. Không đọc P sau để “làm luôn cho tiện”.
2. Làm hết task theo thứ tự. Mỗi task ≤ ~5 file (trừ proto generate).
3. Verify bằng lệnh ghi trong pha, không bằng “trông ổn”.
4. Dừng. Founder xem demo sentence. Không sang P+1 trong cùng PR nếu không được bảo.

## Luật cứng

- Bun 1.4.2, không npm/yarn/pnpm.
- Đổi SDK (`sdk/packages/shared` …): `bun run build:sdk` trước khi test CLI/extension.
- Đổi proto: `cd apps/vscode && bun run protos` (sinh `src/generated` + webview client).
- Không commit `.orvanta/` workspace. User library `~/.orvanta` cũng không commit.
- Không viết orchestrator / agent loop mới.
- ChatView không unmount.
- `enableAgentTeams` chỉ bật từ P4 khi company valid — P1–P3 không đụng session factory.

## Cây code mới (tạo dần theo pha)

```
sdk/packages/shared/src/orvanta/
  paths.ts                 # P1
  company-schema.ts        # P1
  agent-profile.ts         # P2
  templates/               # P1–P2
  library.ts               # P3
  index.ts

apps/vscode/proto/cline/orvanta.proto    # P1, thêm RPC mỗi pha

apps/vscode/src/orvanta/
  workspace-store.ts       # P1 IO workspace
  user-library-store.ts    # P3 IO homedir
  validate.ts

apps/vscode/src/core/controller/orvanta/  # 1 file / RPC, giống file/*.ts

apps/vscode/webview-ui/src/orvanta/
  OrvantaShell.tsx         # P1 tabs
  HomeView.tsx
  AgentEditor.tsx          # P2
  LibraryDialog.tsx        # P3
  ...
```

## Thứ tự pha

| Pha | File | Demo khi xong |
|---|---|---|
| P1 | [P1-workspace-home.md](./P1-workspace-home.md) | Mở folder → lập công ty → reload còn purpose + coordinator |
| P2 | [P2-agent-editor.md](./P2-agent-editor.md) | Sửa/thêm agent, ghi `.orvanta/org/agents`, reload còn |
| P3 | [P3-company-library.md](./P3-company-library.md) | Lưu lên `%USERPROFILE%\.orvanta\companies\<slug>`, folder khác Tải lại đội |
| P4 | [P4-chat-sidebar.md](./P4-chat-sidebar.md) | Chat + sidebar đội, `enableAgentTeams` + teamDir workspace |
| P5 | [P5-spawn-and-lock-min.md](./P5-spawn-and-lock-min.md) | Spawn từ roster; agent không ghi được purpose.md |
| P6 | [P6-inbox-min.md](./P6-inbox-min.md) | Runtime xin hire/scope/purpose → Inbox |
| P7 | [P7-inbox-and-lock-full.md](./P7-inbox-and-lock-full.md) | Đủ 10 type + tool policy theo role |
| P8 | [P8-war-room-min.md](./P8-war-room-min.md) | Lưới status + activity |
| P9 | [P9-war-room-full.md](./P9-war-room-full.md) | Stream token live (nếu host cho phép) |

P1–P3 **không cần** LLM chạy. Test bằng unit + mở extension.

## Pattern proto (copy)

Xem `apps/vscode/proto/cline/file.proto` + `apps/vscode/src/core/controller/file/*.ts`. Mỗi RPC một file handler. Webview gọi client sinh từ proto — không tự `postMessage` payload mới.

## Lệnh verify chung

```bash
# từ repo root
bun -F @cline/shared test
bun run build:sdk

cd apps/vscode
bun run protos
bun run test:unit
```

Webview typecheck: `cd apps/vscode && bun run check-types` (nặng; dùng khi đụng proto/UI).
