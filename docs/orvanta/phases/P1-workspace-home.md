# P1 — Công ty trên đĩa + Home

**Demo:** Mở một folder → Orvanta Home → Lập công ty → đóng/mở lại window → vẫn thấy purpose và coordinator.

**Đọc trước:** [05-schema-orvanta.md](../05-schema-orvanta.md), [SPEC-A-company-home.md](../SPEC-A-company-home.md) (empty + header + purpose đọc; **bỏ** hire runtime, inbox, sync team), [09-two-stores.md](../09-two-stores.md) (chỉ nửa workspace).

**Cấm P1:** `enableAgentTeams`, Inbox, War room, Agent editor, `~/.orvanta`, spawn, proto RPC Lưu/Tải.

## Giả định

1. Multi-root: lấy folder **đầu tiên có `.orvanta/`**, không thì `workspaceFolders[0]`.
2. Chưa có folder mở → Home: “Mở một folder”.
3. Brand: đổi title Activity Bar thành Orvanta được; icon có thể giữ Cline tạm nếu chưa có SVG — ghi TODO, không block.

## Types — viết ở `sdk/packages/shared/src/orvanta/`

```ts
// paths.ts
export const WORKSPACE_DIRNAME = ".orvanta"
export const COMPANY_FILE = "company.json"
export const PURPOSE_FILE = "purpose.md"
export const VERSION_FILE = "VERSION"
export const ROSTER_FILE = "org/roster.json"

// company-schema.ts — Zod
export interface CompanyPolicies {
  hire: "ceo_approve" | "lead_only" | "allow"
  fire: "ceo_approve" | "lead_only" | "allow"
  changePurpose: "ceo_approve" | "lead_only" | "allow"
  changeScope: "ceo_approve" | "lead_only" | "allow"
  merge: "ceo_approve" | "lead_only" | "allow"
  spawnEphemeral: "ceo_approve" | "lead_only" | "allow"
  firstHireFast: boolean
  budgetUsdPerDay: number | null
}

export interface CompanyJson {
  schemaVersion: 1
  id: string
  name: string
  createdAt: string // ISO
  updatedAt: string
  workspaceRoot: string
  teamName: string
  policies: CompanyPolicies
  coordinatorAgentId: string
}

export type CompanyLoad =
  | { status: "missing" }
  | { status: "broken"; errors: string[] }
  | { status: "ready"; company: CompanyJson; purpose: string; roster: RosterJson }

export interface RosterAgent {
  id: string
  displayName: string
  role: "lead" | "teammate"
  status: "idle" | "running" | "stopped" | "pending_hire" | "pending_fire"
  agentFile: string
  hiredAt: string
  hiredBy: "ceo" | "policy"
  modelId: string | null
  maxIterations: number
}

export interface RosterJson {
  schemaVersion: 1
  agents: RosterAgent[]
}
```

`createCompanyInput`: `{ name: string; purpose: string }` — name 1–64, purpose trim ≥ 20 ký tự.

`teamName`: slug từ name, qua cùng rule Cline `sanitizeTeamName` nếu import được; không thì lowercase + thay non-alnum bằng `-`.

Tạo atomic:

```
<workspace>/.orvanta.tmp/{company.json,purpose.md,VERSION,org/roster.json,org/agents/coordinator/profile.md,org/agents/coordinator/workspace/memory.md}
rồi rename .orvanta.tmp → .orvanta
```

Nếu `.orvanta` đã tồn tại → `create` fail (P3 mới có replace).

Coordinator template P1 (đủ spawn sau này, P1 không spawn):

```markdown
---
id: coordinator
displayName: Coordinator
description: Lead — chia việc, không phá purpose
role: lead
providerId: null
modelId: null
maxIterations: 40
temperature: null
tools:
  allow: [read_files, list_files, grep]
  deny: [write_to_file, apply_diff]
scopePaths:
  allow: ["**/*"]
  denyWrite:
    - ".orvanta/purpose.md"
    - ".orvanta/company.json"
    - ".orvanta/org/roster.json"
---

Bạn là coordinator. Chia việc theo purpose. Không sửa purpose. Không tự hire (P5+).
```

P1 có thể chưa parse đủ frontmatter (P2 mới Zod agent). Vẫn **ghi** đúng format trên.

## Proto P1

File: `apps/vscode/proto/cline/orvanta.proto`

```proto
syntax = "proto3";
package cline;
import "cline/common.proto";

service OrvantaService {
  rpc getCompany(EmptyRequest) returns (OrvantaCompanyResponse);
  rpc createCompany(OrvantaCreateCompanyRequest) returns (OrvantaCompanyResponse);
  rpc subscribeCompany(EmptyRequest) returns (stream OrvantaCompanyResponse);
}

message OrvantaCreateCompanyRequest {
  string name = 1;
  string purpose = 2;
}

message OrvantaRosterAgent {
  string id = 1;
  string display_name = 2;
  string role = 3;
  string status = 4;
}

message OrvantaCompanyResponse {
  string status = 1; // missing | broken | ready
  repeated string errors = 2;
  string id = 3;
  string name = 4;
  string purpose = 5;
  string team_name = 6;
  repeated OrvantaRosterAgent agents = 7;
}
```

`subscribeCompany`: watch `.orvanta/company.json` + `purpose.md` + `roster.json` (fs watch), emit lại `getCompany`. Hủy watch khi stream hủy.

Handler: `apps/vscode/src/core/controller/orvanta/getCompany.ts` (và create/subscribe). IO: `apps/vscode/src/orvanta/workspace-store.ts` dùng `fs/promises` + workspace folder.

Đăng ký service giống các service `cline.*` hiện có (tìm chỗ register FileService, thêm OrvantaService).

Sau proto: `cd apps/vscode && bun run protos`.

## UI P1

- `webview-ui/src/orvanta/OrvantaShell.tsx`: top bar 4 tab; **chỉ Home active**. Inbox/War room disabled + tooltip “Pha sau”. Chat tab = ẩn shell, hiện ChatView như cũ (`isHidden` đảo).
- `HomeView.tsx`:
  - `missing` + có folder: form name, purpose (template 3 heading), nút Lập công ty
  - `missing` + không folder: copy Open Folder (gọi command VS Code `vscode.openFolder` qua host nếu đã có; không thì string bảo user)
  - `broken`: list `errors`
  - `ready`: header name, purpose markdown clamp, roster 1 card coordinator (read-only)
- Nhúng shell vào `App.tsx`: khi `!showSettings && !showHistory && ...` hiện shell **trên** ChatView; tab Chat → `isHidden=false` cho ChatView, shell tab bar vẫn hiện.

Đừng đổi `package.json` publisher/id trừ khi founder bảo rebrand hết. Title view container: `"Orvanta"` được.

## Tests P1 (bắt buộc)

`sdk/packages/shared/src/orvanta/company-schema.test.ts`:

- parse company hợp lệ
- reject thiếu purpose khi assemble create
- teamName slug

`apps/vscode/src/orvanta/workspace-store.test.ts` (temp dir):

- create rồi load = ready
- load folder trống = missing
- xóa purpose.md = broken
- create khi đã có = error
- không để lại `.orvanta.tmp` nếu fail giữa chừng (mock rename fail nếu viết được; không thì assert atomic bằng “sau create chỉ có `.orvanta`”)

## Tasks

- [ ] Task: schema + test shared  
  - Acceptance: `bun -F @cline/shared test` xanh, export từ `@cline/shared` (thêm export path nếu package.json `exports` chặn)  
  - Files: `sdk/packages/shared/src/orvanta/*`, `sdk/packages/shared/package.json` nếu cần  
  - Verify: `bun -F @cline/shared test` rồi `bun run build:sdk`

- [ ] Task: workspace-store + test  
  - Acceptance: 5 case trên  
  - Files: `apps/vscode/src/orvanta/workspace-store.ts`, `*.test.ts`  
  - Verify: `cd apps/vscode && bun run test:unit` (filter orvanta nếu script cho phép)

- [ ] Task: proto + handlers + register  
  - Acceptance: `bun run protos` xong; get/create/subscribe compile  
  - Files: `proto/cline/orvanta.proto`, controller/orvanta/*, chỗ register  
  - Verify: `cd apps/vscode && bun run protos` không lỗi

- [ ] Task: Home UI empty/ready/broken  
  - Acceptance: lập công ty từ UI ghi đúng cây file; reload extension host vẫn ready  
  - Files: webview `orvanta/*`, `App.tsx`  
  - Verify: tay — F5 extension, mở folder temp, lập công ty, Reload Window

## Done P1

- [ ] Demo sentence làm được trên máy founder
- [ ] Không có file dưới `~/.orvanta`
- [ ] `.gitignore` vẫn có `.orvanta/`
- [ ] Chat Cline chưa vỡ (gửi 1 tin nếu có key; không có key thì mở được Chat tab)
