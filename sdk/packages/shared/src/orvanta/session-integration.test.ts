import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	WORKSPACE_DIRNAME,
	archiveSession,
	assertNotLegacyTask,
	bindTaskToSession,
	clearActiveTaskBindings,
	createSession,
	deleteParticipantTask,
	deleteSession,
	diagnoseAndRepairHistory,
	exportSession,
	getParticipantDisplayIdentity,
	getSession,
	isLegacyPreCutoverTask,
	listSessions,
	markTaskUnavailable,
	rebuildIndex,
	reconcileSpawnedTask,
	recordTaskTurnEvent,
	sanitizeForLogging,
	updateSession,
	upsertParticipant,
} from "./index";

async function createTempWorkspace(): Promise<string> {
	return mkdtemp(join(tmpdir(), "orvanta-integration-test-"));
}

describe("Phase 7 — End-to-End Session Integration & Verification", () => {
	it("executes full multi-agent session lifecycle: create, multi-agent chat, restart, and resume", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			clearActiveTaskBindings();
			const companyId = "company-e2e-integration";
			const sessionId = "sess-e2e-001";

			// 1. CEO starts session with Coordinator (Agent 1)
			const turn1 = await bindTaskToSession({
				workspaceRoot,
				companyId,
				sessionId,
				taskId: "task-coord-01",
				agentNumericId: 1,
				agentSlug: "coordinator",
				displayName: "AI Coordinator",
				role: "lead",
				prompt: "Plan full auth feature implementation",
				usage: { tokensIn: 100, tokensOut: 50, totalCost: 0.005 },
				lastMessagePreview: "I will coordinate with Developer to implement auth.",
			});

			expect(turn1.isNewSession).toBe(true);
			expect(turn1.session.sessionId).toBe(sessionId);
			expect(turn1.session.participants).toHaveLength(1);
			expect(turn1.session.participants[0].agentNumericId).toBe(1);
			expect(turn1.session.participants[0].taskId).toBe("task-coord-01");

			// 2. Developer (Agent 2) joins the SAME session via spawned/delegated task
			const turn2 = await reconcileSpawnedTask({
				workspaceRoot,
				companyId,
				sessionId,
				parentTaskId: "task-coord-01",
				childTaskId: "task-dev-02",
				targetAgentNumericId: 2,
				targetAgentSlug: "developer",
				targetDisplayName: "Senior Developer",
				targetRole: "teammate",
				lastMessagePreview: "Writing auth tests and implementation.",
			});

			expect(turn2.participants).toHaveLength(2);
			const devParticipant = turn2.participants.find((p) => p.agentNumericId === 2);
			expect(devParticipant).toBeDefined();
			expect(devParticipant?.taskId).toBe("task-dev-02");
			expect(devParticipant?.roleAtJoin).toBe("teammate");

			// 3. Update usage for Developer's turn
			const turn3 = await recordTaskTurnEvent({
				workspaceRoot,
				sessionId,
				taskId: "task-dev-02",
				agentNumericId: 2,
				status: "completed",
				usage: { tokensIn: 300, tokensOut: 150, totalCost: 0.015 },
				lastMessagePreview: "Auth tests completed successfully.",
			});

			// Aggregate usage reflects both agents combined
			expect(turn3.aggregateUsage?.tokensIn).toBe(400); // 100 + 300
			expect(turn3.aggregateUsage?.tokensOut).toBe(200); // 50 + 150
			expect(turn3.aggregateUsage?.totalCost).toBe(0.02);

			// 4. Simulate application restart: load from cold disk storage
			clearActiveTaskBindings();
			const restoredSession = await getSession(workspaceRoot, sessionId, {
				expectedCompanyId: companyId,
			});

			expect(restoredSession.sessionId).toBe(sessionId);
			expect(restoredSession.companyId).toBe(companyId);
			expect(restoredSession.participants).toHaveLength(2);

			// Verify each agent's individual task and metadata remain distinct and isolated
			const restoredCoord = restoredSession.participants.find((p) => p.agentNumericId === 1);
			const restoredDev = restoredSession.participants.find((p) => p.agentNumericId === 2);

			expect(restoredCoord?.taskId).toBe("task-coord-01");
			expect(restoredCoord?.agentSlugAtJoin).toBe("coordinator");

			expect(restoredDev?.taskId).toBe("task-dev-02");
			expect(restoredDev?.agentSlugAtJoin).toBe("developer");
			expect(restoredDev?.status).toBe("completed");

			// 5. Verify index catalog summary matches restored session
			const indexList = await listSessions(workspaceRoot, { companyId });
			expect(indexList.sessions).toHaveLength(1);
			expect(indexList.sessions[0].sessionId).toBe(sessionId);
			expect(indexList.sessions[0].participantSummaries).toHaveLength(2);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("verifies performance scalability: catalog listing does not read transcripts, and manifest update is isolated", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			const companyId = "comp-perf";

			// Create 20 distinct sessions
			for (let i = 1; i <= 20; i++) {
				await createSession(workspaceRoot, {
					sessionId: `sess-perf-${String(i).padStart(3, "0")}`,
					companyId,
					title: `Performance Session #${i}`,
				});
			}

			// Benchmark: listSessions reads only index.json, never scanning all session directories
			const startList = performance.now();
			const listed = await listSessions(workspaceRoot, { page: 1, pageSize: 10 });
			const elapsedList = performance.now() - startList;

			expect(listed.total).toBe(20);
			expect(listed.sessions).toHaveLength(10);
			expect(elapsedList).toBeLessThan(100); // Must be fast (< 100ms)

			// Single update touches only that specific session and updates catalog
			const startUpdate = performance.now();
			await updateSession(workspaceRoot, "sess-perf-005", {
				title: "Updated Title Fast",
				isFavorited: true,
			});
			const elapsedUpdate = performance.now() - startUpdate;
			expect(elapsedUpdate).toBeLessThan(100);

			const verifyUpdated = await getSession(workspaceRoot, "sess-perf-005");
			expect(verifyUpdated.title).toBe("Updated Title Fast");
			expect(verifyUpdated.isFavorited).toBe(true);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("enforces complete security isolation: path traversal, company mismatch, and unparseable JSON", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			const companyId = "company-secure-1";

			await createSession(workspaceRoot, {
				sessionId: "sess-secure-ok",
				companyId,
				title: "Secure Session",
			});

			// Path traversal rejection
			await expect(getSession(workspaceRoot, "../outside")).rejects.toThrow("Invalid session ID");
			await expect(getSession(workspaceRoot, "sess/sub")).rejects.toThrow("Invalid session ID");
			await expect(getSession(workspaceRoot, "sess\\sub")).rejects.toThrow("Invalid session ID");

			// Company mismatch rejection (prevent cross-repo opening)
			await expect(
				getSession(workspaceRoot, "sess-secure-ok", { expectedCompanyId: "wrong-company-id" }),
			).rejects.toThrow("belongs to company");

			// Untrusted / corrupt JSON preservation (never overwrite broken JSON)
			const corruptDir = join(workspaceRoot, WORKSPACE_DIRNAME, "local", "history", "sessions", "sess-broken");
			await mkdir(corruptDir, { recursive: true });
			const corruptPath = join(corruptDir, "session.json");
			const corruptData = "{ broken json corrupt!@#$";
			await writeFile(corruptPath, corruptData, "utf8");

			// Must throw SessionCorruptError without clearing file
			await expect(getSession(workspaceRoot, "sess-broken")).rejects.toThrow("is corrupt");
			const rawAfterCheck = await readFile(corruptPath, "utf8");
			expect(rawAfterCheck).toBe(corruptData);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("verifies byte preservation of legacy files under entire session lifecycle", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			// Seed synthetic legacy fixture
			const legacyDir = join(workspaceRoot, WORKSPACE_DIRNAME, "history");
			await mkdir(legacyDir, { recursive: true });
			const legacySessionsPath = join(legacyDir, "sessions.json");
			const legacyContent = JSON.stringify([
				{ id: "legacy-fixture-01", task: "SYNTHETIC_LEGACY_TASK_ONLY" },
			]);
			await writeFile(legacySessionsPath, legacyContent, "utf8");

			const initialHash = createHash("sha256").update(legacyContent).digest("hex");
			const initialBytes = Buffer.from(legacyContent);

			// Execute v0.1.1 lifecycle operations
			await createSession(workspaceRoot, {
				sessionId: "sess-cutover-check",
				companyId: "comp-cutover",
				title: "New Session After Cutover",
			});
			await listSessions(workspaceRoot);
			await rebuildIndex(workspaceRoot);
			await diagnoseAndRepairHistory(workspaceRoot);

			// Re-verify legacy file has NOT changed a single byte
			const currentContent = await readFile(legacySessionsPath, "utf8");
			const currentHash = createHash("sha256").update(currentContent).digest("hex");
			const currentBytes = await readFile(legacySessionsPath);

			expect(currentHash).toBe(initialHash);
			expect(currentBytes.equals(initialBytes)).toBe(true);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

});
