import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	HISTORY_SCHEMA_VERSION,
	OrvantaSessionManifestSchema,
	OrvantaSessionParticipantSchema,
	SessionConflictError,
	SessionCorruptError,
	SessionNotFoundError,
	SessionUnsupportedVersionError,
	archiveSession,
	cleanStaleTempFiles,
	createSession,
	deleteParticipantTask,
	deleteSession,
	diagnoseAndRepairHistory,
	exportSession,
	getSession,
	getSessionManifestFilePath,
	listSessions,
	normalizeTimestampToIso,
	rebuildIndex,
	redactMessagePreview,
	sanitizeForLogging,

	renameSession,
	updateSession,
	upsertParticipant,
	validateSessionId,
	validateTaskId,
} from "./index";

async function createTempWorkspace(): Promise<string> {
	return mkdtemp(join(tmpdir(), "orvanta-history-test-"));
}

describe("Safe ID / Path Validation & Tamper Resistance", () => {
	it("validates and accepts safe session and task IDs", () => {
		expect(validateSessionId("session-123_abc")).toBe("session-123_abc");
		expect(validateTaskId("task-xyz-456")).toBe("task-xyz-456");
	});

	it("rejects path traversal attempts in session IDs", () => {
		expect(() => validateSessionId("../evil")).toThrow();
		expect(() => validateSessionId("../../etc/passwd")).toThrow();
		expect(() => validateSessionId("..\\evil")).toThrow();
		expect(() => validateSessionId("/root")).toThrow();
		expect(() => validateSessionId("session/nested")).toThrow();
		expect(() => validateSessionId("session\0null")).toThrow();
		expect(() => validateSessionId("")).toThrow();
		expect(() => validateSessionId("has space")).toThrow();
	});

	it("rejects path traversal attempts in task IDs", () => {
		expect(() => validateTaskId("../outside")).toThrow();
		expect(() => validateTaskId("..\\outside")).toThrow();
		expect(() => validateTaskId("task/nested")).toThrow();
		expect(() => validateTaskId("")).toThrow();
	});
});

describe("Redaction and Timestamp Normalization", () => {
	it("redacts API keys and bearer tokens from message preview", () => {
		const raw = "Here is my key: sk-abcdef1234567890abcdef123456 and token bearer eyJhbGciOiJIUzI1NiJ9";
		const redacted = redactMessagePreview(raw);
		expect(redacted).not.toContain("sk-abcdef");
		expect(redacted).not.toContain("eyJhbGci");
		expect(redacted).toContain("[REDACTED]");
	});

	it("caps preview length to max 280 characters", () => {
		const longText = "a".repeat(400);
		const capped = redactMessagePreview(longText, 280);
		expect(capped.length).toBeLessThanOrEqual(280);
		expect(capped.endsWith("...")).toBe(true);
	});

	it("normalizes milliseconds and dates to strict UTC ISO 8601 strings", () => {
		const ms = 1730000000000;
		const iso = normalizeTimestampToIso(ms);
		expect(iso).toBe(new Date(ms).toISOString());
		expect(new Date(iso).getTime()).toBe(ms);

		const legacyStr = "2026-10-30T10:00:00.000Z";
		expect(normalizeTimestampToIso(legacyStr)).toBe(legacyStr);
	});
});


describe("Session History Store CRUD Operations", () => {
	it("creates a session idempotently and binds companyId", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			const manifest = await createSession(workspaceRoot, {
				sessionId: "sess-1",
				companyId: "comp-1",
				title: "Sprint Planning",
				isFavorited: true,
				activeAgentNumericId: 1,
			});

			expect(manifest.historySchemaVersion).toBe(HISTORY_SCHEMA_VERSION);
			expect(manifest.sessionId).toBe("sess-1");
			expect(manifest.companyId).toBe("comp-1");
			expect(manifest.title).toBe("Sprint Planning");
			expect(manifest.isFavorited).toBe(true);
			expect(manifest.status).toBe("active");
			expect(manifest.participants).toEqual([]);

			// Idempotent call with same sessionId & companyId returns existing
			const same = await createSession(workspaceRoot, {
				sessionId: "sess-1",
				companyId: "comp-1",
				title: "Different title",
			});
			expect(same.title).toBe("Sprint Planning");

			// Conflicting companyId throws SessionConflictError
			expect(
				createSession(workspaceRoot, {
					sessionId: "sess-1",
					companyId: "comp-other",
					title: "Different company",
				}),
			).rejects.toThrow(SessionConflictError);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("retrieves session and enforces company binding", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-get",
				companyId: "comp-bind",
				title: "Binding Test",
			});

			const loaded = await getSession(workspaceRoot, "sess-get", {
				expectedCompanyId: "comp-bind",
			});
			expect(loaded.title).toBe("Binding Test");

			// Mismatched expectedCompanyId throws SessionConflictError
			expect(
				getSession(workspaceRoot, "sess-get", {
					expectedCompanyId: "wrong-company",
				}),
			).rejects.toThrow(SessionConflictError);

			// Missing session throws SessionNotFoundError
			expect(getSession(workspaceRoot, "sess-nonexistent")).rejects.toThrow(
				SessionNotFoundError,
			);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});
	it("upserts participants, calculates aggregate usage, and rejects duplicate task assignment", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-part",
				companyId: "comp-part",
				title: "Participant Session",
			});

			// Add first participant
			const updated1 = await upsertParticipant(workspaceRoot, "sess-part", {
				agentNumericId: 1,
				agentSlugAtJoin: "coordinator",
				displayNameAtJoin: "Coordinator",
				roleAtJoin: "lead",
				taskId: "task-001",
				lastMessagePreview: "sk-secret123456789012345 Hello world",
				usage: { tokensIn: 100, tokensOut: 50, totalCost: 0.005 },
			});

			expect(updated1.participants.length).toBe(1);
			expect(updated1.participants[0].agentNumericId).toBe(1);
			expect(updated1.participants[0].lastMessagePreview).toBe("[REDACTED] Hello world");
			expect(updated1.aggregateUsage?.tokensIn).toBe(100);
			expect(updated1.aggregateUsage?.tokensOut).toBe(50);
			expect(updated1.aggregateUsage?.totalCost).toBe(0.005);

			// Add second participant
			const updated2 = await upsertParticipant(workspaceRoot, "sess-part", {
				agentNumericId: 2,
				agentSlugAtJoin: "developer",
				displayNameAtJoin: "Developer",
				roleAtJoin: "teammate",
				taskId: "task-002",
				usage: { tokensIn: 200, tokensOut: 100, totalCost: 0.01 },
			});
			expect(updated2.participants.length).toBe(2);
			expect(updated2.aggregateUsage?.tokensIn).toBe(300);
			expect(updated2.aggregateUsage?.tokensOut).toBe(150);
			expect(updated2.aggregateUsage?.totalCost).toBe(0.015);

			// Conflict: assigning already assigned task-001 to participant 2 must throw SessionConflictError
			expect(
				upsertParticipant(workspaceRoot, "sess-part", {
					agentNumericId: 2,
					agentSlugAtJoin: "developer",
					displayNameAtJoin: "Developer",
					roleAtJoin: "teammate",
					taskId: "task-001",
				}),
			).rejects.toThrow(SessionConflictError);

			// Idempotent update of participant 1 preserves joinedAt and updates lastActiveAt and usage
			const initialJoinedAt = updated1.participants[0].joinedAt;
			const updatedAgain = await upsertParticipant(workspaceRoot, "sess-part", {
				agentNumericId: 1,
				agentSlugAtJoin: "coordinator-renamed",
				displayNameAtJoin: "Lead Coordinator",
				roleAtJoin: "lead",
				taskId: "task-001",
				usage: { tokensIn: 150, tokensOut: 75, totalCost: 0.0075 },
			});
			expect(updatedAgain.participants[0].joinedAt).toBe(initialJoinedAt);
			expect(updatedAgain.participants[0].displayNameAtJoin).toBe("Lead Coordinator");
			expect(updatedAgain.aggregateUsage?.tokensIn).toBe(350);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("keeps Agent, runtime, conversation, SDK session, task, and run IDs distinct across runs", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "orv-session-01",
				companyId: "comp-history",
				title: "Agent transcript identity",
			});

			const firstRun = await upsertParticipant(workspaceRoot, "orv-session-01", {
				agentNumericId: 7,
				agentSlugAtJoin: "reviewer",
				displayNameAtJoin: "Reviewer",
				roleAtJoin: "teammate",
				taskId: "orv-task-01",
				transcript: {
					runtimeAgentId: "agent_runtime_abc",
					conversationId: "conv_1700000000_xyz",
					sdkSessionId: "sdk-session-abc",
					runIds: ["run_00001"],
				},
			});

			expect(firstRun.participants[0]).toMatchObject({
				agentSlugAtJoin: "reviewer",
				taskId: "orv-task-01",
				transcript: {
					runtimeAgentId: "agent_runtime_abc",
					conversationId: "conv_1700000000_xyz",
					sdkSessionId: "sdk-session-abc",
					runIds: ["run_00001"],
				},
			});

			const secondRun = await upsertParticipant(workspaceRoot, "orv-session-01", {
				agentNumericId: 7,
				agentSlugAtJoin: "reviewer",
				displayNameAtJoin: "Reviewer",
				roleAtJoin: "teammate",
				taskId: "orv-task-01",
				transcript: { runIds: ["run_00002", "run_00001"] },
			});

			expect(secondRun.participants[0].transcript).toEqual({
				runtimeAgentId: "agent_runtime_abc",
				conversationId: "conv_1700000000_xyz",
				sdkSessionId: "sdk-session-abc",
				runIds: ["run_00001", "run_00002"],
			});

			const reloaded = await getSession(workspaceRoot, "orv-session-01");
			expect(reloaded.participants[0].transcript?.sdkSessionId).toBe("sdk-session-abc");
			expect(reloaded.participants[0].transcript?.runIds).toEqual(["run_00001", "run_00002"]);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("renames, updates, and deletes sessions", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-meta",
				companyId: "comp-meta",
				title: "Old Title",
			});

			const renamed = await renameSession(workspaceRoot, "sess-meta", "New Title");
			expect(renamed.title).toBe("New Title");

			const updated = await updateSession(workspaceRoot, "sess-meta", {
				status: "completed",
				isFavorited: true,
				activeAgentNumericId: 2,
			});
			expect(updated.status).toBe("completed");
			expect(updated.isFavorited).toBe(true);
			expect(updated.activeAgentNumericId).toBe(2);

			await deleteSession(workspaceRoot, "sess-meta");
			expect(getSession(workspaceRoot, "sess-meta")).rejects.toThrow(SessionNotFoundError);

			const list = await listSessions(workspaceRoot);
			expect(list.sessions.find((s) => s.sessionId === "sess-meta")).toBeUndefined();
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});
});
describe("Resilience: Corruption, Versioning, and Index Rebuild", () => {
	it("never overwrites malformed JSON and throws SessionCorruptError", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-corrupt",
				companyId: "comp-c",
				title: "Corrupt Test",
			});

			const manifestPath = getSessionManifestFilePath(workspaceRoot, "sess-corrupt");
			// Inject corrupted raw bytes into manifest file
			const corruptBytes = Buffer.from('{"historySchemaVersion": 1, "sessionId": "sess-corrupt", INVALID_JSON', "utf8");
			await writeFile(manifestPath, corruptBytes);

			// getSession must throw SessionCorruptError
			await expect(getSession(workspaceRoot, "sess-corrupt")).rejects.toThrow(SessionCorruptError);

			// Write path (upsertParticipant or updateSession) must NOT treat as empty or overwrite!
			await expect(
				upsertParticipant(workspaceRoot, "sess-corrupt", {
					agentNumericId: 1,
					agentSlugAtJoin: "coord",
					displayNameAtJoin: "Coord",
					roleAtJoin: "lead",
					taskId: "task-999",
				}),
			).rejects.toThrow(SessionCorruptError);

			// Verify corrupt file raw bytes are preserved completely untouched
			const preservedBytes = await readFile(manifestPath);
			expect(Buffer.compare(preservedBytes, corruptBytes)).toBe(0);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("throws SessionUnsupportedVersionError on unsupported schema version", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-v2",
				companyId: "comp-v2",
				title: "Version 2 Test",
			});

			const manifestPath = getSessionManifestFilePath(workspaceRoot, "sess-v2");
			const raw = await readFile(manifestPath, "utf8");
			const json = JSON.parse(raw);
			json.historySchemaVersion = 999;
			await writeFile(manifestPath, JSON.stringify(json, null, 2), "utf8");

			await expect(getSession(workspaceRoot, "sess-v2")).rejects.toThrow(
				SessionUnsupportedVersionError,
			);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("rebuilds index from manifests, ignores corrupt manifests without deleting them, and paginates", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			for (let i = 1; i <= 5; i++) {
				await createSession(workspaceRoot, {
					sessionId: `sess-${i}`,
					companyId: "comp-page",
					title: `Session ${i}`,
				});
			}

			// Corrupt session 3 intentionally
			const manifestPath3 = getSessionManifestFilePath(workspaceRoot, "sess-3");
			await writeFile(manifestPath3, "BROKEN_JSON", "utf8");

			const rebuilt = await rebuildIndex(workspaceRoot, { companyId: "comp-page" });
			// 4 valid sessions remain in index, sess-3 was skipped but its file is preserved
			expect(rebuilt.sessions.length).toBe(4);
			expect(rebuilt.sessions.some((s) => s.sessionId === "sess-3")).toBe(false);

			const brokenContent = await readFile(manifestPath3, "utf8");
			expect(brokenContent).toBe("BROKEN_JSON");

			// Test pagination
			const page1 = await listSessions(workspaceRoot, {
				companyId: "comp-page",
				page: 1,
				pageSize: 2,
			});
			expect(page1.sessions.length).toBe(2);
			expect(page1.total).toBe(4);
			expect(page1.totalPages).toBe(2);

			const page2 = await listSessions(workspaceRoot, {
				companyId: "comp-page",
				page: 2,
				pageSize: 2,
			});
			expect(page2.sessions.length).toBe(2);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("cleans up stale temp files without deleting actual data files", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			const dir = join(workspaceRoot, "temp-test");
			await mkdir(dir, { recursive: true });

			const regularFile = join(dir, "session.json");
			const staleTempFile = join(dir, "session.json.tmp-stale-1234");
			await writeFile(regularFile, "valid");
			await writeFile(staleTempFile, "temp");

			// Clean temp files with 0 maxAge to consider it immediately stale
			await cleanStaleTempFiles(dir, 0);

			const regContent = await readFile(regularFile, "utf8");
			expect(regContent).toBe("valid");

			await expect(readFile(staleTempFile, "utf8")).rejects.toThrow();
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});
});
describe("Write Concurrency & Multi-process Locking", () => {
	it("handles concurrent in-process participant upserts without race conditions", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-concurrent",
				companyId: "comp-c",
				title: "Concurrency Test",
			});

			// Perform 10 concurrent upserts for 10 distinct participants
			const promises = Array.from({ length: 10 }, (_, i) => {
				const id = i + 1;
				return upsertParticipant(workspaceRoot, "sess-concurrent", {
					agentNumericId: id,
					agentSlugAtJoin: `agent-${id}`,
					displayNameAtJoin: `Agent ${id}`,
					roleAtJoin: id === 1 ? "lead" : "teammate",
					taskId: `task-${id}`,
					usage: { tokensIn: 10 * id, tokensOut: 5 * id, totalCost: 0.001 * id },
				});
			});

			await Promise.all(promises);

			const session = await getSession(workspaceRoot, "sess-concurrent");
			expect(session.participants.length).toBe(10);
			const expectedTokensIn = Array.from({ length: 10 }, (_, i) => 10 * (i + 1)).reduce((a, b) => a + b, 0);
			expect(session.aggregateUsage?.tokensIn).toBe(expectedTokensIn);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("serializes concurrent session operations across independent Node processes", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-mp",
				companyId: "comp-mp",
				title: "Multi-Process Session",
			});

			const distEntry = join(__dirname, "../../dist/index.js");
			const scriptCode = `
const { upsertParticipant } = require(${JSON.stringify(distEntry)});
const [,, ws, sessionId, idStr] = process.argv;
const id = parseInt(idStr, 10);

upsertParticipant(ws, sessionId, {
  agentNumericId: id,
  agentSlugAtJoin: 'agent-' + id,
  displayNameAtJoin: 'Agent ' + id,
  roleAtJoin: id === 1 ? 'lead' : 'teammate',
  taskId: 'task-mp-' + id,
  usage: { tokensIn: 100, tokensOut: 50, totalCost: 0.005 }
}).then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
`;
			const scriptPath = join(workspaceRoot, "worker.cjs");
			await writeFile(scriptPath, scriptCode, "utf8");

			const { spawn } = await import("node:child_process");
			const runWorker = (id: number) =>
				new Promise<void>((resolve, reject) => {
					const child = spawn(
						process.execPath,
						[scriptPath, workspaceRoot, "sess-mp", String(id)],
						{ stdio: "inherit" },
					);
					child.on("exit", (code) => {
						if (code === 0) resolve();
						else reject(new Error(`Worker ${id} exited with code ${code}`));
					});
				});

			// Run 5 child processes concurrently
			await Promise.all([runWorker(1), runWorker(2), runWorker(3), runWorker(4), runWorker(5)]);

			const session = await getSession(workspaceRoot, "sess-mp");
			expect(session.participants.length).toBe(5);
			expect(session.aggregateUsage?.tokensIn).toBe(500);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});
});


describe("Phase 6 — Delete, Repair, Privacy, and Operational Stability", () => {
	it("archives a session and updates index catalog", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-archive",
				companyId: "comp-archive",
				title: "Session To Archive",
			});

			const archived = await archiveSession(workspaceRoot, "sess-archive");
			expect(archived.status).toBe("archived");

			const listed = await listSessions(workspaceRoot, { status: "archived" });
			expect(listed.sessions).toHaveLength(1);
			expect(listed.sessions[0].status).toBe("archived");
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("deletes a single participant/task, recalculating usage and preserving remaining participants", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-multi-p",
				companyId: "comp-mp",
				title: "Multi-participant session",
			});

			await upsertParticipant(workspaceRoot, "sess-multi-p", {
				agentNumericId: 1,
				agentSlugAtJoin: "lead",
				displayNameAtJoin: "Lead",
				roleAtJoin: "lead",
				taskId: "task-p1",
				usage: { tokensIn: 100, tokensOut: 50, totalCost: 0.005 },
			});

			await upsertParticipant(workspaceRoot, "sess-multi-p", {
				agentNumericId: 2,
				agentSlugAtJoin: "dev",
				displayNameAtJoin: "Developer",
				roleAtJoin: "teammate",
				taskId: "task-p2",
				usage: { tokensIn: 200, tokensOut: 80, totalCost: 0.01 },
			});

			// Delete participant 2 only
			const afterDelete = await deleteParticipantTask(workspaceRoot, "sess-multi-p", {
				agentNumericId: 2,
			});

			expect(afterDelete.participants).toHaveLength(1);
			expect(afterDelete.participants[0].agentNumericId).toBe(1);
			expect(afterDelete.aggregateUsage?.tokensIn).toBe(100);
			expect(afterDelete.aggregateUsage?.tokensOut).toBe(50);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("performs staged multi-task deletion with tombstone and rollback recovery if SDK fails", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-staged",
				companyId: "comp-staged",
				title: "Staged Deletion Session",
			});

			await upsertParticipant(workspaceRoot, "sess-staged", {
				agentNumericId: 1,
				agentSlugAtJoin: "lead",
				displayNameAtJoin: "Lead",
				roleAtJoin: "lead",
				taskId: "task-fail-sdk",
			});

			// Simulate SDK task deletion failure with abortOnError: true
			const failingSdkDeleter = async () => {
				throw new Error("SDK service unavailable");
			};

			await expect(
				deleteSession(workspaceRoot, "sess-staged", {
					sdkDeleteTask: failingSdkDeleter,
					abortOnError: true,
				}),
			).rejects.toThrow("Session restored to previous state");

			// Manifest should be restored and not deleted
			const sessionAfterRollback = await getSession(workspaceRoot, "sess-staged");
			expect(sessionAfterRollback.status).not.toBe("deleting");
			expect(sessionAfterRollback.participants).toHaveLength(1);

			// Successful staged delete
			const succeedingSdkDeleter = async () => {};
			await deleteSession(workspaceRoot, "sess-staged", {
				sdkDeleteTask: succeedingSdkDeleter,
				abortOnError: true,
			});

			await expect(getSession(workspaceRoot, "sess-staged")).rejects.toThrow(SessionNotFoundError);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});


	it("diagnoses and repairs corrupt manifests without touching legacy files", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			// Seed a valid session
			await createSession(workspaceRoot, {
				sessionId: "sess-valid",
				companyId: "comp-repair",
				title: "Valid Session",
			});

			// Seed a corrupt session manifest
			const corruptDir = join(workspaceRoot, ".orvanta", "history", "sessions", "sess-corrupt");
			await mkdir(corruptDir, { recursive: true });
			await writeFile(join(corruptDir, "session.json"), "{ invalid json broken", "utf8");

			// Seed a legacy file (which must remain 100% untouched)
			const legacyDir = join(workspaceRoot, ".orvanta", "history");
			const legacyPath = join(legacyDir, "sessions.json");
			const legacyContent = JSON.stringify([{ id: "legacy-untouched", task: "Legacy Task" }]);
			await writeFile(legacyPath, legacyContent, "utf8");

			// Seed a stale temp file
			await writeFile(join(legacyDir, "index.json.tmp-stale"), "temp", "utf8");

			// Run diagnosis and repair
			const report = await diagnoseAndRepairHistory(workspaceRoot);
			expect(report.scannedSessions).toBe(2);
			expect(report.corruptedSessions).toContain("sess-corrupt");
			expect(report.quarantinedFiles).toHaveLength(1);
			expect(report.rebuiltIndex).toBe(true);

			// Legacy file must be completely untouched
			const readLegacy = await readFile(legacyPath, "utf8");
			expect(readLegacy).toBe(legacyContent);

			// Corrupt manifest should have been quarantined
			const corruptManifestExists = await readFile(join(corruptDir, "session.json"), "utf8").catch(() => null);
			expect(corruptManifestExists).toBeNull();

			// Valid session is preserved in index
			const listed = await listSessions(workspaceRoot);
			expect(listed.sessions).toHaveLength(1);
			expect(listed.sessions[0].sessionId).toBe("sess-valid");
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("exports a session bundle with sanitized paths and verified metadata", async () => {
		const workspaceRoot = await createTempWorkspace();
		try {
			await createSession(workspaceRoot, {
				sessionId: "sess-export",
				companyId: "comp-export",
				title: "Session To Export",
			});

			await upsertParticipant(workspaceRoot, "sess-export", {
				agentNumericId: 1,
				agentSlugAtJoin: "coordinator",
				displayNameAtJoin: "Coordinator",
				roleAtJoin: "lead",
				taskId: "task-exp-1",
				lastMessagePreview: "Export preview message with sk-secretkey123456789012345",
			});

			const exported = await exportSession(workspaceRoot, "sess-export");
			expect(exported.manifest.sessionId).toBe("sess-export");
			expect(exported.exportTimestamp).toBeDefined();
			// Preview is redacted
			expect(exported.manifest.participants[0].lastMessagePreview).toContain("[REDACTED]");
			expect(exported.manifest.participants[0].lastMessagePreview).not.toContain("sk-secretkey");
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("sanitizes telemetry and logs to remove sensitive keys, prompts, and raw paths", () => {
		const workspaceRoot = "C:\\projects\\my-secret-repo";
		const sensitiveData = {
			sessionId: "sess-safe-123",
			taskId: "task-safe-456",
			prompt: "Super secret prompt about confidential company plans",
			apiKey: "sk-ant-api03-verylongsecretkey1234567890",
			bearerToken: "bearer secrettokenvalue12345",
			path: "C:\\projects\\my-secret-repo\\.orvanta\\history\\sessions\\sess-safe-123\\session.json",
			other: "normal-data",
		};

		const sanitized = sanitizeForLogging(sensitiveData, workspaceRoot);
		expect(sanitized.sessionId).toBe("sess-safe-123");
		expect(sanitized.taskId).toBe("task-safe-456");
		expect(sanitized.other).toBe("normal-data");
		// Sensitive fields stripped or redacted
		expect(sanitized.prompt).toBe("[REDACTED_PROMPT]");
		expect(sanitized.apiKey).toBe("[REDACTED_SECRET]");
		expect(sanitized.bearerToken).toBe("[REDACTED_SECRET]");
		expect(sanitized.path).toBe("[WORKSPACE]\\.orvanta\\history\\sessions\\sess-safe-123\\session.json");
	});
});





