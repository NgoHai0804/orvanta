import { describe, expect, it } from "bun:test";
import type { AgentBeforeToolContext, AgentTool, AgentToolContext } from "../agent";
import { parseAgentProfile } from "./agent-profile";
import {
	checkPurposeLockPath,
	createPurposeLockHook,
	normalizeTargetPath,
	wrapToolWithPurposeLock,
	checkToolPolicy,
	EphemeralTracker,
	classifyTaskScope,
} from "./purpose-lock";
import {
	COORDINATOR_PROFILE_TEMPLATE,
	IMPLEMENTER_PROFILE_TEMPLATE,
	REVIEWER_PROFILE_TEMPLATE,
	RESEARCHER_PROFILE_TEMPLATE,
	SKEPTIC_PROFILE_TEMPLATE,
} from "./templates";

describe("normalizeTargetPath", () => {
	it("normalizes Windows backslashes and strips leading ./", () => {
		expect(normalizeTargetPath(".orvanta\\purpose.md")).toBe(".orvanta/purpose.md");
		expect(normalizeTargetPath("./.orvanta/purpose.md")).toBe(".orvanta/purpose.md");
	});

	it("resolves relative path given workspaceRoot", () => {
		const ws = "D:/workspace/my-company";
		expect(normalizeTargetPath("D:/workspace/my-company/.orvanta/purpose.md", ws)).toBe(
			".orvanta/purpose.md",
		);
		expect(normalizeTargetPath("D:\\workspace\\my-company\\.orvanta\\purpose.md", ws)).toBe(
			".orvanta/purpose.md",
		);
	});
});

describe("checkPurposeLockPath", () => {
	it("denies write to .orvanta/purpose.md (relative, absolute, Windows slashes)", () => {
		expect(checkPurposeLockPath({ targetPath: ".orvanta/purpose.md" })).toMatchObject({
			allowed: false,
			code: "purpose_lock_denied",
		});
		expect(checkPurposeLockPath({ targetPath: ".orvanta\\purpose.md" })).toMatchObject({
			allowed: false,
			code: "purpose_lock_denied",
		});
		expect(
			checkPurposeLockPath({
				targetPath: "C:\\projects\\app\\.orvanta\\purpose.md",
				workspaceRoot: "C:\\projects\\app",
			}),
		).toMatchObject({ allowed: false, code: "purpose_lock_denied" });
	});

	it("denies write to company.json and roster.json", () => {
		expect(checkPurposeLockPath({ targetPath: ".orvanta/company.json" })).toMatchObject({
			allowed: false,
			code: "purpose_lock_denied",
		});
		expect(checkPurposeLockPath({ targetPath: ".orvanta/org/roster.json" })).toMatchObject({
			allowed: false,
			code: "purpose_lock_denied",
		});
	});

	it("denies write to any profile.md (own and others)", () => {
		expect(
			checkPurposeLockPath({
				targetPath: ".orvanta/org/agents/implementer/profile.md",
				requesterId: "implementer",
			}),
		).toMatchObject({ allowed: false, code: "purpose_lock_denied" });
		expect(
			checkPurposeLockPath({
				targetPath: ".orvanta/org/agents/reviewer/profile.md",
				requesterId: "implementer",
			}),
		).toMatchObject({ allowed: false, code: "purpose_lock_denied" });
	});

	it("denies write to shared/handoffs (requires orvanta_submit_handoff)", () => {
		const res = checkPurposeLockPath({
			targetPath: ".orvanta/shared/handoffs/task-1/implementer.md",
			requesterId: "implementer",
		});
		expect(res.allowed).toBe(false);
		expect(res.code).toBe("purpose_lock_denied");
		expect(res.reason).toContain("orvanta_submit_handoff");
	});

	it("allows write to agent's own workspace folder", () => {
		expect(
			checkPurposeLockPath({
				targetPath: ".orvanta/org/agents/implementer/workspace/memory.md",
				requesterId: "implementer",
			}).allowed,
		).toBe(true);
	});

	it("denies write to another agent's workspace folder", () => {
		expect(
			checkPurposeLockPath({
				targetPath: ".orvanta/org/agents/reviewer/workspace/memory.md",
				requesterId: "implementer",
			}),
		).toMatchObject({ allowed: false, code: "purpose_lock_denied" });
	});

	it("allows write to normal files outside .orvanta", () => {
		expect(checkPurposeLockPath({ targetPath: "src/index.ts" }).allowed).toBe(true);
		expect(checkPurposeLockPath({ targetPath: "package.json" }).allowed).toBe(true);
	});
});

describe("createPurposeLockHook & wrapToolWithPurposeLock", () => {
	it("blocks write_to_file when path is purpose.md via hook", async () => {
		const hook = createPurposeLockHook();
		const ctx = {
			tool: { name: "write_to_file" },
			input: { path: ".orvanta/purpose.md" },
			snapshot: { agentId: "implementer" },
		} as unknown as AgentBeforeToolContext;

		const result = await hook.beforeTool?.(ctx);
		expect(result?.skip).toBe(true);
		expect(result?.reason).toContain("purpose_lock_denied");
	});

	it("returns structured error without executing original tool when write is denied", async () => {
		let executed = false;
		const fakeTool: AgentTool = {
			name: "write_to_file",
			description: "write a file",
			inputSchema: {},
			execute: async () => {
				executed = true;
				return { ok: true };
			},
		};

		const wrapped = wrapToolWithPurposeLock(fakeTool, { requesterId: "implementer" });
		const context = { agentId: "implementer", iteration: 1 } as AgentToolContext;

		const res = (await wrapped.execute(
			{ path: ".orvanta/purpose.md" },
			context,
		)) as { ok: boolean; code: string };

		expect(executed).toBe(false);
		expect(res.ok).toBe(false);
		expect(res.code).toBe("purpose_lock_denied");
	});

	it("executes tool when write is to agent's own workspace", async () => {
		let executed = false;
		const fakeTool: AgentTool = {
			name: "write_to_file",
			description: "write a file",
			inputSchema: {},
			execute: async () => {
				executed = true;
				return { ok: true };
			},
		};

		const wrapped = wrapToolWithPurposeLock(fakeTool, { requesterId: "implementer" });
		const context = { agentId: "implementer", iteration: 1 } as AgentToolContext;

		const res = (await wrapped.execute(
			{ path: ".orvanta/org/agents/implementer/workspace/memory.md" },
			context,
		)) as { ok: boolean };

		expect(executed).toBe(true);
		expect(res.ok).toBe(true);
	});
});
describe("checkToolPolicy across all role templates", () => {
	it("reviewer template: denies write_to_file, apply_diff, execute_command, allows read_files", () => {
		const reviewer = parseAgentProfile(REVIEWER_PROFILE_TEMPLATE);
		const policy = reviewer.tools;

		const writeCheck = checkToolPolicy({ toolName: "write_to_file", agentId: "reviewer", policy });
		expect(writeCheck.allowed).toBe(false);
		expect(writeCheck.code).toBe("purpose_lock_denied");

		const diffCheck = checkToolPolicy({ toolName: "apply_diff", agentId: "reviewer", policy });
		expect(diffCheck.allowed).toBe(false);

		const cmdCheck = checkToolPolicy({ toolName: "execute_command", agentId: "reviewer", policy });
		expect(cmdCheck.allowed).toBe(false);

		const readCheck = checkToolPolicy({ toolName: "read_files", agentId: "reviewer", policy });
		expect(readCheck.allowed).toBe(true);

		const handoffCheck = checkToolPolicy({ toolName: "orvanta_submit_handoff", agentId: "reviewer", policy });
		expect(handoffCheck.allowed).toBe(true);
	});

	it("researcher template: denies write_to_file and execute_command, allows browser_action and web_fetch", () => {
		const researcher = parseAgentProfile(RESEARCHER_PROFILE_TEMPLATE);
		const policy = researcher.tools;

		expect(checkToolPolicy({ toolName: "write_to_file", agentId: "researcher", policy }).allowed).toBe(false);
		expect(checkToolPolicy({ toolName: "execute_command", agentId: "researcher", policy }).allowed).toBe(false);
		expect(checkToolPolicy({ toolName: "browser_action", agentId: "researcher", policy }).allowed).toBe(true);
		expect(checkToolPolicy({ toolName: "web_fetch", agentId: "researcher", policy }).allowed).toBe(true);
	});

	it("skeptic template: denies write_to_file, allows read_files and grep", () => {
		const skeptic = parseAgentProfile(SKEPTIC_PROFILE_TEMPLATE);
		const policy = skeptic.tools;

		expect(checkToolPolicy({ toolName: "write_to_file", agentId: "skeptic", policy }).allowed).toBe(false);
		expect(checkToolPolicy({ toolName: "read_files", agentId: "skeptic", policy }).allowed).toBe(true);
		expect(checkToolPolicy({ toolName: "grep", agentId: "skeptic", policy }).allowed).toBe(true);
	});

	it("implementer template: allows write_to_file and execute_command, denies team_spawn_teammate", () => {
		const implementer = parseAgentProfile(IMPLEMENTER_PROFILE_TEMPLATE);
		const policy = implementer.tools;

		expect(checkToolPolicy({ toolName: "write_to_file", agentId: "implementer", policy }).allowed).toBe(true);
		expect(checkToolPolicy({ toolName: "execute_command", agentId: "implementer", policy }).allowed).toBe(true);
		expect(checkToolPolicy({ toolName: "team_spawn_teammate", agentId: "implementer", policy }).allowed).toBe(false);
	});

	it("coordinator template: denies write_to_file, allows read_files and list_files", () => {
		const coordinator = parseAgentProfile(COORDINATOR_PROFILE_TEMPLATE);
		const policy = coordinator.tools;

		expect(checkToolPolicy({ toolName: "write_to_file", agentId: "coordinator", policy }).allowed).toBe(false);
		expect(checkToolPolicy({ toolName: "read_files", agentId: "coordinator", policy }).allowed).toBe(true);
		expect(checkToolPolicy({ toolName: "list_files", agentId: "coordinator", policy }).allowed).toBe(true);
	});
});

describe("EphemeralTracker", () => {
	it("allows up to 3 guest ephemeral agents then rejects with over_ephemeral", () => {
		const tracker = new EphemeralTracker(3);
		expect(tracker.canSpawn().allowed).toBe(true);

		expect(tracker.recordSpawn()).toBe(true);
		expect(tracker.getCount()).toBe(1);

		expect(tracker.recordSpawn()).toBe(true);
		expect(tracker.getCount()).toBe(2);

		expect(tracker.recordSpawn()).toBe(true);
		expect(tracker.getCount()).toBe(3);

		const over = tracker.canSpawn();
		expect(over.allowed).toBe(false);
		expect(over.code).toBe("over_ephemeral");
		expect(tracker.recordSpawn()).toBe(false);
	});
});

describe("classifyTaskScope", () => {
	const samplePurpose = `# Purpose
## Chúng ta đang làm gì
Xây dựng nền tảng Orvanta

## Thành công trông như thế nào
- Hoàn thành đầy đủ tính năng

## Không làm
- Không viết lại backend bằng Rust
- Không hỗ trợ database MySQL cũ

## Ràng buộc
- Không đổi scope
`;

	it("detects task explicitly marked requiresScopeApproval", () => {
		const res = classifyTaskScope(
			{ title: "Task 1", requiresScopeApproval: true },
			{ purpose: samplePurpose },
		);
		expect(res.outsidePurpose).toBe(true);
	});

	it("detects task matching negative markers in purpose 'Không làm'", () => {
		const res = classifyTaskScope(
			{ title: "Viết lại backend bằng Rust", description: "Rewrite core to rust" },
			{ purpose: samplePurpose },
		);
		expect(res.outsidePurpose).toBe(true);
		expect(res.matchedMarker).toBe("viết lại backend bằng rust");
	});

	it("allows normal task aligned with purpose", () => {
		const res = classifyTaskScope(
			{ title: "Tạo component Inbox detail", description: "Implement UI for decisions" },
			{ purpose: samplePurpose },
		);
		expect(res.outsidePurpose).toBe(false);
	});
});

describe("wrapToolWithPurposeLock with toolPolicy", () => {
	it("blocks reviewer from write_to_file via tool policy", async () => {
		let executed = false;
		const fakeTool: AgentTool = {
			name: "write_to_file",
			description: "write a file",
			inputSchema: {},
			execute: async () => {
				executed = true;
				return { ok: true };
			},
		};

		const reviewer = parseAgentProfile(REVIEWER_PROFILE_TEMPLATE);
		const wrapped = wrapToolWithPurposeLock(fakeTool, {
			requesterId: "reviewer",
			toolPolicy: reviewer.tools,
		});

		const context = { agentId: "reviewer", iteration: 1 } as AgentToolContext;
		const res = (await wrapped.execute({ path: "src/review.md" }, context)) as {
			ok: boolean;
			code: string;
			reason: string;
		};

		expect(executed).toBe(false);
		expect(res.ok).toBe(false);
		expect(res.code).toBe("purpose_lock_denied");
		expect(res.reason).toContain("reviewer");
	});
});

