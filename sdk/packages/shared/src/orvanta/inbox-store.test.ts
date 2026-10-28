import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	CannotFireCoordinatorError,
	DecisionNotFoundError,
	MergeRejectNoteRequiredError,
} from "./inbox-schema";
import {
	loadHistoryInbox,
	loadPendingInbox,
	requestDecision,
	resolveDecision,
	savePendingInbox,
} from "./inbox-store";

async function tempWorkspace(): Promise<string> {
	return mkdtemp(join(tmpdir(), "orvanta-inbox-test-"));
}

describe("inbox-store", () => {
	it("loadPendingInbox returns empty structure when file does not exist", async () => {
		const ws = await tempWorkspace();
		try {
			const inbox = await loadPendingInbox(ws);
			expect(inbox.schemaVersion).toBe(1);
			expect(inbox.items).toEqual([]);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("savePendingInbox and loadPendingInbox roundtrips", async () => {
		const ws = await tempWorkspace();
		try {
			const testInbox = {
				schemaVersion: 1 as const,
				items: [
					{
						id: "dec_1",
						type: "hire_agent" as const,
						status: "pending" as const,
						createdAt: new Date().toISOString(),
						createdBy: "coordinator",
						title: "Hire Developer",
						summary: "Need dev",
						payload: { agentId: "dev" },
						urgency: "normal" as const,
					},
				],
			};
			await savePendingInbox(ws, testInbox);
			const loaded = await loadPendingInbox(ws);
			expect(loaded.schemaVersion).toBe(1);
			expect(loaded.items).toHaveLength(1);
			expect(loaded.items[0].id).toBe("dec_1");
			expect(loaded.items[0].title).toBe("Hire Developer");
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("requestDecision creates new item and assigns defaults", async () => {
		const ws = await tempWorkspace();
		try {
			const result = await requestDecision(ws, {
				type: "hire_agent",
				title: "Hire tester",
				summary: "Tester agent",
				payload: { agentId: "qa-tester" },
			});
			expect(result.isDuplicate).toBe(false);
			expect(result.item.id).toMatch(/^dec_/);
			expect(result.item.status).toBe("pending");
			expect(result.item.urgency).toBe("normal");
			expect(result.item.createdBy).toBe("coordinator");

			const pending = await loadPendingInbox(ws);
			expect(pending.items).toHaveLength(1);
			expect(pending.items[0].id).toBe(result.item.id);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("requestDecision sets urgency high for change_purpose by default", async () => {
		const ws = await tempWorkspace();
		try {
			const result = await requestDecision(ws, {
				type: "change_purpose",
				title: "Update mission",
				summary: "New purpose",
				payload: { from: "Old", to: "New purpose text here" },
			});
			expect(result.item.urgency).toBe("high");
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("disallows fire_agent on coordinator", async () => {
		const ws = await tempWorkspace();
		try {
			await expect(
				requestDecision(ws, {
					type: "fire_agent",
					title: "Fire coordinator",
					summary: "Reason",
					payload: { agentId: "coordinator" },
				}),
			).rejects.toThrow(CannotFireCoordinatorError);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("deduplicates hire_agent with matching agentId", async () => {
		const ws = await tempWorkspace();
		try {
			const first = await requestDecision(ws, {
				type: "hire_agent",
				title: "Hire dev",
				summary: "First request",
				payload: { agentId: "developer" },
			});
			expect(first.isDuplicate).toBe(false);

			const second = await requestDecision(ws, {
				type: "hire_agent",
				title: "Hire dev again",
				summary: "Duplicate request",
				payload: { agentId: "developer" },
			});
			expect(second.isDuplicate).toBe(true);
			expect(second.item.id).toBe(first.item.id);

			const pending = await loadPendingInbox(ws);
			expect(pending.items).toHaveLength(1);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("deduplicates change_purpose when another is already pending", async () => {
		const ws = await tempWorkspace();
		try {
			const first = await requestDecision(ws, {
				type: "change_purpose",
				title: "Edit 1",
				summary: "First",
				payload: { from: "A", to: "B" },
			});
			expect(first.isDuplicate).toBe(false);

			const second = await requestDecision(ws, {
				type: "change_purpose",
				title: "Edit 2",
				summary: "Second",
				payload: { from: "A", to: "C" },
			});
			expect(second.isDuplicate).toBe(true);
			expect(second.item.id).toBe(first.item.id);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("resolveDecision handles defer and reopen without writing to history.jsonl", async () => {
		const ws = await tempWorkspace();
		try {
			const { item } = await requestDecision(ws, {
				type: "hire_agent",
				title: "Hire researcher",
				summary: "Need researcher",
				payload: { agentId: "researcher-1" },
			});

			const deferred = await resolveDecision(ws, {
				id: item.id,
				action: "defer",
			});
			expect(deferred.item.status).toBe("deferred");

			const pendingAfterDefer = await loadPendingInbox(ws);
			expect(pendingAfterDefer.items).toHaveLength(1);
			expect(pendingAfterDefer.items[0].status).toBe("deferred");

			const historyAfterDefer = await loadHistoryInbox(ws);
			expect(historyAfterDefer).toHaveLength(0);

			const reopened = await resolveDecision(ws, {
				id: item.id,
				action: "reopen",
			});
			expect(reopened.item.status).toBe("pending");
			const pendingAfterReopen = await loadPendingInbox(ws);
			expect(pendingAfterReopen.items[0].status).toBe("pending");
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("resolveDecision approve removes from pending and appends to history", async () => {
		const ws = await tempWorkspace();
		try {
			const { item } = await requestDecision(ws, {
				type: "hire_agent",
				title: "Hire skeptic",
				summary: "Need skeptic",
				payload: { agentId: "skeptic" },
			});

			const result = await resolveDecision(ws, {
				id: item.id,
				action: "approve",
				note: "Approved by CEO",
				resolvedBy: "ceo",
			});

			expect(result.resolved?.status).toBe("approved");
			expect(result.resolved?.note).toBe("Approved by CEO");

			const pending = await loadPendingInbox(ws);
			expect(pending.items).toHaveLength(0);

			const history = await loadHistoryInbox(ws);
			expect(history).toHaveLength(1);
			expect(history[0].id).toBe(item.id);
			expect(history[0].status).toBe("approved");
			expect(history[0].resolvedBy).toBe("ceo");
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("resolveDecision reject removes from pending and appends to history", async () => {
		const ws = await tempWorkspace();
		try {
			const { item } = await requestDecision(ws, {
				type: "fire_agent",
				title: "Fire dev",
				summary: "Underperforming",
				payload: { agentId: "dev" },
			});

			const result = await resolveDecision(ws, {
				id: item.id,
				action: "reject",
				note: "Keep for now",
			});

			expect(result.resolved?.status).toBe("rejected");

			const pending = await loadPendingInbox(ws);
			expect(pending.items).toHaveLength(0);

			const history = await loadHistoryInbox(ws);
			expect(history).toHaveLength(1);
			expect(history[0].status).toBe("rejected");
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("history survives reload and multiple resolutions accumulate", async () => {
		const ws = await tempWorkspace();
		try {
			const d1 = await requestDecision(ws, {
				type: "hire_agent",
				title: "Hire A",
				summary: "A",
				payload: { agentId: "agent-a" },
			});
			const d2 = await requestDecision(ws, {
				type: "hire_agent",
				title: "Hire B",
				summary: "B",
				payload: { agentId: "agent-b" },
			});

			await resolveDecision(ws, { id: d1.item.id, action: "approve" });
			await resolveDecision(ws, { id: d2.item.id, action: "reject" });

			const history = await loadHistoryInbox(ws);
			expect(history).toHaveLength(2);
			expect(history[0].id).toBe(d1.item.id);
			expect(history[0].status).toBe("approved");
			expect(history[1].id).toBe(d2.item.id);
			expect(history[1].status).toBe("rejected");
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("deduplicates change_scope by taskId", async () => {
		const ws = await tempWorkspace();
		try {
			const first = await requestDecision(ws, {
				type: "change_scope",
				title: "Expand database scope",
				summary: "Need migration",
				payload: { taskId: "task-101", title: "DB", whyOutsidePurpose: "Need DB" },
			});
			expect(first.isDuplicate).toBe(false);

			const second = await requestDecision(ws, {
				type: "change_scope",
				title: "Expand database scope duplicate",
				summary: "Duplicate",
				payload: { taskId: "task-101", title: "DB", whyOutsidePurpose: "Need DB again" },
			});
			expect(second.isDuplicate).toBe(true);
			expect(second.item.id).toBe(first.item.id);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("deduplicates merge by outcomeId", async () => {
		const ws = await tempWorkspace();
		try {
			const first = await requestDecision(ws, {
				type: "merge",
				title: "Merge PR #1",
				summary: "Feature auth",
				payload: { outcomeId: "outcome-auth-1", files: ["src/auth.ts"] },
			});
			expect(first.isDuplicate).toBe(false);

			const second = await requestDecision(ws, {
				type: "merge",
				title: "Merge PR #1 again",
				summary: "Duplicate merge",
				payload: { outcomeId: "outcome-auth-1", files: ["src/auth.ts"] },
			});
			expect(second.isDuplicate).toBe(true);
			expect(second.item.id).toBe(first.item.id);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("deduplicates change_policy by key and sets urgency normal", async () => {
		const ws = await tempWorkspace();
		try {
			const first = await requestDecision(ws, {
				type: "change_policy",
				title: "Allow spawn",
				summary: "Relax policy",
				payload: { key: "spawn_teammate", from: "ceo_approve", to: "allow" },
			});
			expect(first.isDuplicate).toBe(false);
			expect(first.item.urgency).toBe("normal");

			const second = await requestDecision(ws, {
				type: "change_policy",
				title: "Allow spawn dup",
				summary: "Relax policy dup",
				payload: { key: "spawn_teammate", from: "ceo_approve", to: "allow" },
			});
			expect(second.isDuplicate).toBe(true);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});

	it("requires at least 8 characters in note when rejecting merge", async () => {
		const ws = await tempWorkspace();
		try {
			const { item } = await requestDecision(ws, {
				type: "merge",
				title: "Merge code",
				summary: "Feature X",
				payload: { outcomeId: "out-1", files: ["index.ts"] },
			});

			await expect(
				resolveDecision(ws, {
					id: item.id,
					action: "reject",
					note: "Too short", // 9 chars, let's test < 8 chars
				}),
			).resolves.toBeDefined();

			// Test another item with short note < 8 chars
			const { item: item2 } = await requestDecision(ws, {
				type: "merge",
				title: "Merge code 2",
				summary: "Feature Y",
				payload: { outcomeId: "out-2", files: ["y.ts"] },
			});

			await expect(
				resolveDecision(ws, {
					id: item2.id,
					action: "reject",
					note: "No", // < 8 chars
				}),
			).rejects.toThrow(MergeRejectNoteRequiredError);

			await expect(
				resolveDecision(ws, {
					id: item2.id,
					action: "reject",
					note: "", // empty
				}),
			).rejects.toThrow(MergeRejectNoteRequiredError);
		} finally {
			await rm(ws, { recursive: true, force: true });
		}
	});
});

