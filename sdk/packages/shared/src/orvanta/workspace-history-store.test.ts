import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	deleteWorkspaceSession,
	loadWorkspaceSessions,
	loadWorkspaceTaskMessages,
	loadWorkspaceTaskMetadata,
	saveWorkspaceSession,
	saveWorkspaceTaskMessages,
	saveWorkspaceTaskMetadata,
} from "./workspace-history-store";

describe("workspace-history-store", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "orvanta-history-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	it("returns empty array when sessions.json does not exist", async () => {
		const sessions = await loadWorkspaceSessions(tempDir);
		expect(sessions).toEqual([]);
	});

	it("saves and loads sessions in .orvanta/history/sessions.json", async () => {
		const session1 = {
			id: "task-1",
			title: "First Task",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			tokensIn: 100,
			tokensOut: 50,
			agentIds: ["coordinator", "implementer"],
			status: "completed" as const,
		};

		await saveWorkspaceSession(tempDir, session1);
		const loaded = await loadWorkspaceSessions(tempDir);
		expect(loaded).toHaveLength(1);
		expect(loaded[0].id).toBe("task-1");
		expect(loaded[0].title).toBe("First Task");

		// Update existing session
		await saveWorkspaceSession(tempDir, {
			...session1,
			title: "Updated First Task",
		});
		const reloaded = await loadWorkspaceSessions(tempDir);
		expect(reloaded).toHaveLength(1);
		expect(reloaded[0].title).toBe("Updated First Task");
	});

	it("saves and loads task ui_messages", async () => {
		const messages = [
			{ type: "say", say: "text", text: "Hello" },
			{ type: "say", say: "user_feedback", text: "Proceed" },
		];

		await saveWorkspaceTaskMessages(tempDir, "task-1", messages);
		const loaded = await loadWorkspaceTaskMessages(tempDir, "task-1");
		expect(loaded).toEqual(messages);

		const missing = await loadWorkspaceTaskMessages(tempDir, "missing-task");
		expect(missing).toBeUndefined();
	});

	it("deletes a session and removes its task directory", async () => {
		await saveWorkspaceSession(tempDir, {
			id: "task-1",
			title: "Task 1",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
		await saveWorkspaceSession(tempDir, {
			id: "task-2",
			title: "Task 2",
			createdAt: Date.now(),
			updatedAt: Date.now(),
		});
		await saveWorkspaceTaskMessages(tempDir, "task-1", [{ type: "test" }]);

		await deleteWorkspaceSession(tempDir, "task-1");

		const remaining = await loadWorkspaceSessions(tempDir);
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).toBe("task-2");

		const messages = await loadWorkspaceTaskMessages(tempDir, "task-1");
		expect(messages).toBeUndefined();
	});

	it("saves and loads sessions with full agent metadata", async () => {
		const session = {
			id: "task-agents",
			title: "Task with agents",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			agents: [
				{
					id: "coordinator",
					displayName: "Coordinator (Lead)",
					role: "lead" as const,
				},
				{
					id: "implementer",
					displayName: "Frontend Developer",
					role: "teammate" as const,
				},
			],
			activeAgentId: "implementer",
		};

		await saveWorkspaceSession(tempDir, session);
		const loaded = await loadWorkspaceSessions(tempDir);
		expect(loaded).toHaveLength(1);
		expect(loaded[0].agents).toHaveLength(2);
		expect(loaded[0].agents?.[0].displayName).toBe("Coordinator (Lead)");
		expect(loaded[0].agents?.[1].role).toBe("teammate");
	});

	it("saves and loads sessions with multi-agent tasks and conversations", async () => {
		const session = {
			id: "session-multi-agent",
			title: "Build Authentication System",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			agentTasks: {
				coordinator: "task-coord-123",
				implementer: "task-impl-456",
			},
			agentConversations: [
				{
					agentId: "coordinator",
					displayName: "Coordinator",
					role: "lead" as const,
					taskId: "task-coord-123",
					lastMessage: "Planning auth flow",
					updatedAt: Date.now(),
				},
				{
					agentId: "implementer",
					displayName: "Implementer",
					role: "teammate" as const,
					taskId: "task-impl-456",
					lastMessage: "Implemented JWT handlers",
					updatedAt: Date.now(),
				},
			],
		};

		await saveWorkspaceSession(tempDir, session);
		const loaded = await loadWorkspaceSessions(tempDir);
		expect(loaded).toHaveLength(1);
		expect(loaded[0].agentTasks).toEqual({
			coordinator: "task-coord-123",
			implementer: "task-impl-456",
		});
		expect(loaded[0].agentConversations).toHaveLength(2);
		expect(loaded[0].agentConversations?.[1].lastMessage).toBe("Implemented JWT handlers");
	});

	it("saves and loads task metadata snapshot", async () => {
		const meta = {
			taskId: "task-meta-1",
			agents: [
				{ id: "coordinator", displayName: "Coordinator" },
				{ id: "reviewer", displayName: "Code Reviewer" },
			],
			savedAt: Date.now(),
		};

		await saveWorkspaceTaskMetadata(tempDir, "task-meta-1", meta);
		const loaded = await loadWorkspaceTaskMetadata<typeof meta>(tempDir, "task-meta-1");
		expect(loaded).toEqual(meta);
	});
});
