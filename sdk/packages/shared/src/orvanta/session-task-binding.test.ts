import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type RosterJson,
	WORKSPACE_DIRNAME,
	assertNotLegacyTask,
	bindTaskToSession,
	clearActiveTaskBindings,
	getActiveTaskBinding,
	getParticipantDisplayIdentity,
	getSession,
	isLegacyPreCutoverTask,
	markTaskUnavailable,
	reconcileSpawnedTask,
	recordTaskTurnEvent,
} from "./index";

async function createTempWorkspace(): Promise<string> {
	return mkdtemp(join(tmpdir(), "orvanta-binding-test-"));
}

describe("Task ↔ Session ↔ Agent Binding", () => {
	it("binds task to a session and records only the participating agent without roster fallback", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			clearActiveTaskBindings();
			const result = await bindTaskToSession({
				workspaceRoot,
				companyId: "comp-bind",
				sessionId: "sess-bind-1",
				taskId: "task-001",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
				prompt: "First request",
				usage: { tokensIn: 50, tokensOut: 25, totalCost: 0.002 },
			});

			expect(result.isNewSession).toBe(true);
			expect(result.session.sessionId).toBe("sess-bind-1");
			expect(result.session.companyId).toBe("comp-bind");
			expect(result.session.title).toBe("First request");

			// ONLY the participating agent is in participants list (no roster dump!)
			expect(result.session.participants).toHaveLength(1);
			expect(result.session.participants[0].agentNumericId).toBe(1);
			expect(result.session.participants[0].agentSlugAtJoin).toBe("coordinator");
			expect(result.session.participants[0].displayNameAtJoin).toBe("Coordinator");
			expect(result.session.participants[0].roleAtJoin).toBe("lead");
			expect(result.session.participants[0].taskId).toBe("task-001");
			expect(result.session.participants[0].joinedAt).toBeDefined();

			// Active memory binding is registered
			const active = getActiveTaskBinding("task-001");
			expect(active).toBeDefined();
			expect(active?.sessionId).toBe("sess-bind-1");
			expect(active?.agentNumericId).toBe(1);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("prevents binding and resuming legacy pre-v0.1.1 tasks", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			// Seed a legacy sessions.json file containing a legacy task
			const legacyHistoryDir = join(workspaceRoot, WORKSPACE_DIRNAME, "history");
			await mkdir(legacyHistoryDir, { recursive: true });
			await writeFile(
				join(legacyHistoryDir, "sessions.json"),
				JSON.stringify([{ id: "legacy-task-999", task: "Old Legacy Task" }]),
				"utf8",
			);

			expect(await isLegacyPreCutoverTask(workspaceRoot, "legacy-task-999")).toBe(true);
			expect(await isLegacyPreCutoverTask(workspaceRoot, "new-task-111")).toBe(false);

			// Must throw when attempting to bind a legacy task to a v0.1.1 session
			await expect(assertNotLegacyTask(workspaceRoot, "legacy-task-999")).rejects.toThrow(
				"Cannot bind or resume legacy task",
			);

			await expect(
				bindTaskToSession({
					workspaceRoot,
					companyId: "comp-bind",
					sessionId: "sess-legacy-test",
					taskId: "legacy-task-999",
					agentNumericId: 1,
					agentSlug: "coordinator",
					displayName: "Coordinator",
					role: "lead",
				}),
			).rejects.toThrow("Cannot bind or resume legacy task");
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});
});


describe("Concurrency, Message Race, and Reconnection", () => {
	it("handles rapid consecutive messages from user without creating duplicate participants", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			clearActiveTaskBindings();
			// User sends 2 messages in rapid succession for the same task & agent
			const p1 = bindTaskToSession({
				workspaceRoot,
				companyId: "comp-race",
				sessionId: "sess-race",
				taskId: "task-race-1",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
				prompt: "First quick message",
				usage: { tokensIn: 10, tokensOut: 5, totalCost: 0.0005 },
			});

			const p2 = bindTaskToSession({
				workspaceRoot,
				companyId: "comp-race",
				sessionId: "sess-race",
				taskId: "task-race-1",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
				prompt: "Second quick message",
				usage: { tokensIn: 25, tokensOut: 15, totalCost: 0.001 },
			});

			const [r1, r2] = await Promise.all([p1, p2]);

			const session = await getSession(workspaceRoot, "sess-race");
			// Must have exactly 1 participant (no duplicate participant!)
			expect(session.participants).toHaveLength(1);
			expect(session.participants[0].agentNumericId).toBe(1);
			expect(session.participants[0].taskId).toBe("task-race-1");
			// Usage updated to one of the concurrent inputs
			expect([10, 25]).toContain(session.participants[0].usage?.tokensIn!);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("rejects assigning an existing taskId to a different agent", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await bindTaskToSession({
				workspaceRoot,
				companyId: "comp-one-task",
				sessionId: "sess-onetask",
				taskId: "task-exclusive",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
			});

			// Attempting to assign same taskId to agent 2 must be rejected
			await expect(
				bindTaskToSession({
					workspaceRoot,
					companyId: "comp-one-task",
					sessionId: "sess-onetask",
					taskId: "task-exclusive",
					agentNumericId: 2,
					agentSlug: "developer",
					displayName: "Developer",
					role: "teammate",
				}),
			).rejects.toThrow("already assigned to participant");
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("preserves session across webview reload and task switches without creating new session", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			clearActiveTaskBindings();
			// First start
			const initial = await bindTaskToSession({
				workspaceRoot,
				companyId: "comp-reconnect",
				sessionId: "sess-stable",
				taskId: "task-stable",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
			});
			expect(initial.isNewSession).toBe(true);

			// Reconnect (simulate webview reload using known sessionId)
			const reconnected = await bindTaskToSession({
				workspaceRoot,
				companyId: "comp-reconnect",
				sessionId: "sess-stable",
				taskId: "task-stable",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
			});
			expect(reconnected.isNewSession).toBe(false);
			expect(reconnected.session.sessionId).toBe("sess-stable");

			// Task switch in same session (coordinator switches to developer in same session)
			const devTurn = await bindTaskToSession({
				workspaceRoot,
				companyId: "comp-reconnect",
				sessionId: "sess-stable",
				taskId: "task-dev-01",
				agentNumericId: 2,
				agentSlug: "developer",
				displayName: "Developer",
				role: "teammate",
			});
			expect(devTurn.isNewSession).toBe(false);
			expect(devTurn.session.participants).toHaveLength(2);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});
});

describe("Turn Events, Child Tasks, Renames & Missing Tasks", () => {
	it("records turn events idempotently using cumulative SDK usage snapshot", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			clearActiveTaskBindings();
			await bindTaskToSession({
				workspaceRoot,
				companyId: "comp-turn",
				sessionId: "sess-turn",
				taskId: "task-turn-1",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
			});

			// Turn 1 complete
			const afterTurn1 = await recordTaskTurnEvent({
				workspaceRoot,
				taskId: "task-turn-1",
				status: "active",
				usage: { tokensIn: 100, tokensOut: 50, totalCost: 0.005 },
				lastMessagePreview: "Turn 1 answer",
			});
			expect(afterTurn1.participants[0].usage?.tokensIn).toBe(100);
			expect(afterTurn1.aggregateUsage?.tokensIn).toBe(100);

			// Turn 2 complete (SDK reports cumulative usage: 250 in, 120 out)
			const afterTurn2 = await recordTaskTurnEvent({
				workspaceRoot,
				taskId: "task-turn-1",
				status: "completed",
				usage: { tokensIn: 250, tokensOut: 120, totalCost: 0.012 },
				lastMessagePreview: "Turn 2 final answer",
			});
			expect(afterTurn2.participants[0].status).toBe("completed");
			expect(afterTurn2.participants[0].usage?.tokensIn).toBe(250);
			expect(afterTurn2.aggregateUsage?.tokensIn).toBe(250);
			expect(afterTurn2.participants[0].lastMessagePreview).toBe("Turn 2 final answer");
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("reconciles child/spawned tasks under the parent session", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await bindTaskToSession({
				workspaceRoot,
				companyId: "comp-spawn",
				sessionId: "sess-spawn",
				taskId: "task-parent",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
			});

			const updated = await reconcileSpawnedTask({
				workspaceRoot,
				companyId: "comp-spawn",
				sessionId: "sess-spawn",
				parentTaskId: "task-parent",
				childTaskId: "task-child-1",
				targetAgentNumericId: 2,
				targetAgentSlug: "researcher",
				targetDisplayName: "Researcher",
				lastMessagePreview: "Researching topic...",
			});

			expect(updated.participants).toHaveLength(2);
			const childParticipant = updated.participants.find((p) => p.taskId === "task-child-1");
			expect(childParticipant).toBeDefined();
			expect(childParticipant?.agentNumericId).toBe(2);
			expect(childParticipant?.roleAtJoin).toBe("teammate");

			// Active binding for child task is registered
			expect(getActiveTaskBinding("task-child-1")?.sessionId).toBe("sess-spawn");
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("marks task unavailable without crashing or destroying session when task is missing", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await bindTaskToSession({
				workspaceRoot,
				companyId: "comp-missing",
				sessionId: "sess-missing",
				taskId: "task-lost",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "Coordinator",
				role: "lead",
			});

			const updated = await markTaskUnavailable(workspaceRoot, "sess-missing", "task-lost");
			expect(updated.participants[0].status).toBe("unknown");
			expect(updated.sessionId).toBe("sess-missing");
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("preserves historical snapshot and detects current identity when agent is renamed or retired", () => {
		const participant = {
			agentNumericId: 41,
			agentSlugAtJoin: "synthetic-old",
			displayNameAtJoin: "Old Name",
			roleAtJoin: "teammate" as const,
			taskId: "task-41",
			joinedAt: new Date().toISOString(),
			lastActiveAt: new Date().toISOString(),
			status: "completed" as const,
		};

		// 1. Without current roster (standalone): historical snapshot holds
		const standalone = getParticipantDisplayIdentity(participant);
		expect(standalone.currentSlug).toBe("synthetic-old");
		expect(standalone.isRenamed).toBe(false);

		// 2. Active roster with renamed agent holding same numeric ID 41
		const activeRenamedRoster: RosterJson = {
			schemaVersion: 2,
			nextAgentNumericId: 42,
			agents: [
				{
					agentNumericId: 41,
					id: "synthetic-new",
					displayName: "New Renamed Agent",
					role: "teammate",
					legacySlugs: ["synthetic-old"],
				},
			],
			retiredAgents: [],
		};

		const renamedInfo = getParticipantDisplayIdentity(participant, activeRenamedRoster);
		expect(renamedInfo.isRenamed).toBe(true);
		expect(renamedInfo.isRetired).toBe(false);
		expect(renamedInfo.currentSlug).toBe("synthetic-new");
		expect(renamedInfo.currentDisplayName).toBe("New Renamed Agent");
		expect(renamedInfo.snapshotSlug).toBe("synthetic-old");
		expect(renamedInfo.snapshotDisplayName).toBe("Old Name");

		// 3. Retired roster where agent 41 was retired
		const retiredRoster: RosterJson = {
			schemaVersion: 2,
			nextAgentNumericId: 42,
			agents: [],
			retiredAgents: [
				{
					agentNumericId: 41,
					id: "synthetic-old",
					displayName: "Old Name",
					retiredAt: new Date().toISOString(),
				},
			],
		};

		const retiredInfo = getParticipantDisplayIdentity(participant, retiredRoster);
		expect(retiredInfo.isRetired).toBe(true);
		expect(retiredInfo.isRenamed).toBe(false);
		expect(retiredInfo.snapshotSlug).toBe("synthetic-old");
	});
});


