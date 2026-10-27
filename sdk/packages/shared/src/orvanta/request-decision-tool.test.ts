import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { loadPendingInbox } from "./inbox-store";
import { createOrvantaRequestDecisionTool } from "./request-decision-tool";

async function tempWorkspace(): Promise<string> {
	return mkdtemp(join(tmpdir(), "orvanta-tool-test-"));
}

describe("orvanta_request_decision tool", () => {
	it("executes hire_agent and returns pending decisionId", async () => {
		const ws = await tempWorkspace();
		try {
			const tool = createOrvantaRequestDecisionTool({ workspaceRoot: ws });
			const result = await tool.execute(
				{
					type: "hire_agent",
					title: "Hire implementer for auth",
					summary: "Need coder",
					payload: { agentId: "implementer" },
				},
				{} as any,
			);

			expect(result.decisionId).toBeDefined();
			expect(result.status).toBe("pending");
			expect(result.isDuplicate).toBe(false);

			const pending = await loadPendingInbox(ws);
			expect(pending.items).toHaveLength(1);
			expect(pending.items[0].id).toBe(result.decisionId!);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("returns duplicate when requesting same agentId", async () => {
		const ws = await tempWorkspace();
		try {
			const tool = createOrvantaRequestDecisionTool({ workspaceRoot: ws });
			const first = await tool.execute(
				{
					type: "hire_agent",
					title: "Hire dev",
					summary: "Dev",
					payload: { agentId: "developer" },
				},
				{} as any,
			);

			const second = await tool.execute(
				{
					type: "hire_agent",
					title: "Hire dev second try",
					summary: "Dev second",
					payload: { agentId: "developer" },
				},
				{} as any,
			);

			expect(second.decisionId).toBe(first.decisionId);
			expect(second.isDuplicate).toBe(true);

			const pending = await loadPendingInbox(ws);
			expect(pending.items).toHaveLength(1);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("returns structured error if trying to fire coordinator", async () => {
		const ws = await tempWorkspace();
		try {
			const tool = createOrvantaRequestDecisionTool({ workspaceRoot: ws });
			const result = await tool.execute(
				{
					type: "fire_agent",
					title: "Fire coordinator",
					summary: "Remove lead",
					payload: { agentId: "coordinator" },
				},
				{} as any,
			);

			expect(result.error).toContain("Không thể sa thải coordinator");
			expect(result.decisionId).toBeUndefined();

			const pending = await loadPendingInbox(ws);
			expect(pending.items).toHaveLength(0);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});
});
