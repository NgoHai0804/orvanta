# Spec Hợp Đồng Dữ Liệu (Data Contracts) — Orvanta v0.0.2

Tài liệu đặc tả chi tiết các hợp đồng giao tiếp dữ liệu giữa Backend (VS Code Extension Host) và Frontend (Webview UI), bao gồm Protobuf, Zod Schemas, định dạng lưu trữ YAML Frontmatter và file cấu hình đĩa.

---

## 1. Protobuf Service & Message Definitions (`proto/cline/orvanta.proto`)

```protobuf
syntax = "proto3";

package cline;

import "cline/common.proto";

option go_package = "github.com/cline/grpc-go/cline";
option java_multiple_files = true;
option java_package = "bot.cline.proto";

service OrvantaService {
  rpc getCompany(EmptyRequest) returns (OrvantaCompanyResponse);
  rpc createCompany(OrvantaCreateCompanyRequest) returns (OrvantaCompanyResponse);
  rpc subscribeCompany(EmptyRequest) returns (stream OrvantaCompanyResponse);
  rpc listAgentProfiles(EmptyRequest) returns (OrvantaAgentProfileList);
  rpc upsertAgentProfile(OrvantaAgentProfile) returns (OrvantaAgentProfile);
  rpc deleteAgentProfile(StringRequest) returns (OrvantaCompanyResponse);
  rpc listLibrary(EmptyRequest) returns (OrvantaLibraryList);
  rpc saveCompanyToLibrary(OrvantaSaveLibraryRequest) returns (OrvantaLibraryList);
  rpc loadCompanyFromLibrary(OrvantaLoadLibraryRequest) returns (OrvantaCompanyResponse);
  rpc deleteLibraryCompany(StringRequest) returns (OrvantaLibraryList);
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
  optional string reports_to = 5; // [v0.0.2] ID của agent quản lý trực tiếp
}

message OrvantaCompanyResponse {
  string status = 1;
  repeated string errors = 2;
  string id = 3;
  string name = 4;
  string purpose = 5;
  string team_name = 6;
  repeated OrvantaRosterAgent agents = 7;
  string tasks_json = 8;
}

message OrvantaAgentTools {
  repeated string allow = 1;
  repeated string deny = 2;
}

message OrvantaAgentScopePaths {
  repeated string allow = 1;
  repeated string deny_write = 2;
}

message OrvantaAgentProfile {
  string id = 1;
  string display_name = 2;
  string role = 3;
  string description = 4;
  optional string model_id = 5;
  optional int32 max_iterations = 6;
  optional double temperature = 7;
  string instructions = 8;

---

## 2. Zod Schema Đầy Đủ (`sdk/packages/shared/src/orvanta/agent-profile.ts`)

```typescript
import { z } from "zod";

export const AGENT_ID_RE = /^[a-z][a-z0-9_-]{1,31}$/;

export const MANDATORY_DENY_WRITE_PATHS = [
  ".orvanta/purpose.md",
  ".orvanta/company.json",
  ".orvanta/org/roster.json",
] as const;

export const AgentRoleSchema = z.enum(["lead", "teammate"]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const ReasoningEffortSchema = z
  .enum(["none", "low", "medium", "high", "max"])
  .nullable()
  .default(null);
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

export const AgentProfileFrontmatterSchema = z.object({
  id: z.string().regex(AGENT_ID_RE, {
    message: "Id agent phải bắt đầu bằng chữ thường a-z, 2-32 ký tự, chỉ chứa a-z, 0-9, gạch dưới hoặc gạch nối",
  }),
  displayName: z.string().trim().min(1).max(48),
  description: z.string().max(200).default(""),
  role: AgentRoleSchema,
  reportsTo: z.string().nullable().default(null), // [v0.0.2] Cấp trên trực tiếp
  providerId: z.string().nullable().default(null),
  modelId: z.string().nullable().default(null),
  maxIterations: z.number().int().min(1).max(200).default(40),
  temperature: z.number().min(0).max(2).nullable().default(null),
  // [v0.0.2] Mở rộng thông số AI
  reasoningEffort: ReasoningEffortSchema,
  supportsImages: z.boolean().nullable().default(null),
  contextWindow: z.number().int().positive().nullable().default(null),
  maxOutputTokens: z.number().int().positive().nullable().default(null),
  // Tools & Scope paths
  tools: z
    .object({
      allow: z.array(z.string()).default([]),
      deny: z.array(z.string()).default([]),
    })
    .default({ allow: [], deny: [] }),
  scopePaths: z
    .object({
      allow: z.array(z.string()).default(["**/*"]),
      denyWrite: z.array(z.string()).default([...MANDATORY_DENY_WRITE_PATHS]),
    })
    .default({
      allow: ["**/*"],
      denyWrite: [...MANDATORY_DENY_WRITE_PATHS],
    }),
  // [v0.0.2] Rules & Skills
  rules: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
});

export type AgentProfileFrontmatter = z.infer<typeof AgentProfileFrontmatterSchema>;

export const AgentProfileSchema = AgentProfileFrontmatterSchema.extend({
  instructions: z.string().trim().min(1, { message: "Instructions không được rỗng" }),
  filePath: z.string().min(1),
});

export type AgentProfile = z.infer<typeof AgentProfileSchema>;
```

---

## 3. Cấu Trúc File Trên Đĩa

### 3.1. File `.orvanta/org/agents/<agentId>/profile.md`
```markdown
---
id: implementer
displayName: Lead Implementer
description: Viết code và thực thi các task kỹ thuật theo yêu cầu
role: teammate
reportsTo: coordinator
providerId: anthropic
modelId: claude-3-7-sonnet-20250219
maxIterations: 40
temperature: 0.2
reasoningEffort: medium
supportsImages: true
contextWindow: 200000
maxOutputTokens: 16384
tools:
  allow: [read_files, write_to_file, apply_diff, execute_command, grep, list_files]
  deny: [team_spawn_teammate]
scopePaths:
  allow: ["**/*"]
  denyWrite:
    - ".orvanta/purpose.md"
    - ".orvanta/company.json"
    - ".orvanta/org/roster.json"
rules:
  - code-simplification
  - test-driven-development
skills:
  - code-review-and-quality
---

Bạn là implementer của công ty này.
Chỉ làm đúng task được giao. Không sửa purpose. Không tự ý hire agent.
```

### 3.2. File `.orvanta/org/roster.json`
```json
{
  "version": 1,
  "agents": [
    {
      "id": "coordinator",
      "displayName": "Coordinator",
      "role": "lead",
      "status": "idle",
      "agentFile": "org/agents/coordinator/profile.md",
      "reportsTo": null,
      "hiredAt": "2026-10-28T04:23:19.838Z",
      "hiredBy": "ceo"
    },
    {
      "id": "implementer",
      "displayName": "Lead Implementer",
      "role": "teammate",
      "status": "running",
      "agentFile": "org/agents/implementer/profile.md",
      "reportsTo": "coordinator",
      "hiredAt": "2026-10-28T05:10:00.000Z",
      "hiredBy": "ceo"
    }
  ]
}
```

  string file_path = 9;
  OrvantaAgentTools tools = 10;
  OrvantaAgentScopePaths scope_paths = 11;
  // [v0.0.2] Mở rộng phân cấp & thông số AI
  optional string reports_to = 12;        // ID của agent cấp trên
  optional string reasoning_effort = 13;  // none | low | medium | high | max
  optional bool supports_images = 14;     // Bật/tắt xử lý hình ảnh
  optional int32 context_window = 15;     // Kích thước cửa sổ ngữ cảnh (tokens)
  optional int32 max_output_tokens = 16;  // Giới hạn tokens đầu ra
  repeated string rules = 17;             // Danh sách rules được gán
  repeated string skills = 18;            // Danh sách skills được cấp phép
  optional string provider_id = 19;       // ID nhà cung cấp AI (anthropic, openai...)
}

message OrvantaAgentProfileList {
  repeated OrvantaAgentProfile profiles = 1;
}
```
