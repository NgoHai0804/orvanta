import { describe, expect, it } from "bun:test";
import type { AgentBeforeToolContext, AgentTool, AgentToolContext } from "../agent";
import {
	checkPurposeLockPath,
	createPurposeLockHook,
	normalizeTargetPath,
	wrapToolWithPurposeLock,
} from "./purpose-lock";

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
