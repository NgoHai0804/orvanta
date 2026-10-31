import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveProjectStorageRoots } from "@cline/shared/orvanta";
import { loadSqliteDb } from "@cline/shared/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SqliteTeamStore } from "./sqlite-team-store";
import {
	batch,
	emptyDelta,
	fullAgentResult,
	run,
	TEAM,
	task,
} from "./sqlite-team-store.fixtures";
import { createLocalTeamStore } from "./team-store";

describe("SqliteTeamStore v2", () => {
	let dir: string;
	let store: SqliteTeamStore;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "cline-team-store-"));
		store = new SqliteTeamStore({ teamDir: dir, eventRetentionPerTeam: 5 });
		store.init();
	});

	afterEach(() => {
		store.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("applies incremental deltas and rebuilds state from rows", () => {
		const teammates = [{ agentId: "worker", rolePrompt: "p" }];
		store.persistBatch(
			TEAM,
			batch(
				emptyDelta({
					tasks: [task("task_0001")],
					runs: [run("run_1", { lastProgressAt: new Date() })],
				}),
				[{ type: "team_task_updated", payload: { a: 1 } }],
				teammates,
			),
		);
		store.persistBatch(
			TEAM,
			batch(emptyDelta({ tasks: [task("task_0002")] }), [], teammates),
		);

		const loaded = store.loadRuntime(TEAM);
		expect(loaded.state?.tasks.map((t) => t.id)).toEqual([
			"task_0001",
			"task_0002",
		]);
		expect(loaded.state?.tasks[0]?.createdAt).toBeInstanceOf(Date);
		expect(loaded.state?.runs.map((r) => r.id)).toEqual(["run_1"]);
		expect(loaded.state?.runs[0]?.lastProgressAt).toBeInstanceOf(Date);
		expect(loaded.teammates).toEqual(teammates);
		expect(store.listTeamNames()).toEqual([TEAM]);
	});

	it("never writes a state_json blob", () => {
		store.persistBatch(TEAM, batch(emptyDelta({ tasks: [task("task_0001")] })));
		const db = loadSqliteDb(join(dir, "teams.db"));
		const row = db
			.prepare(
				"SELECT state_json FROM team_runtime_snapshot WHERE team_name = ?",
			)
			.get(TEAM);
		db.close?.();
		expect(row?.state_json).toBe("");
	});

	it("does not bump untouched rows", () => {
		store.persistBatch(TEAM, batch(emptyDelta({ runs: [run("run_1")] })));
		for (let i = 0; i < 20; i++) {
			store.persistBatch(TEAM, batch(emptyDelta({ tasks: [task("task_x")] })));
		}
		const db = loadSqliteDb(join(dir, "teams.db"));
		const row = db
			.prepare("SELECT version FROM team_runs WHERE run_id = 'run_1'")
			.get();
		db.close?.();
		expect(row?.version).toBe(1);
	});

	it("compacts full run results defensively", () => {
		store.persistBatch(
			TEAM,
			batch(
				emptyDelta({
					runs: [
						run("run_1", { status: "completed", result: fullAgentResult }),
					],
				}),
			),
		);
		const state = store.readState(TEAM);
		expect(JSON.stringify(state?.runs)).not.toContain("TRANSCRIPT");
		expect((state?.runs[0]?.result as { text: string }).text).toBe("done");
	});

	it("reset deltas drop removed entities", () => {
		store.persistBatch(TEAM, batch(emptyDelta({ tasks: [task("task_0001")] })));
		store.persistBatch(TEAM, batch(emptyDelta({ reset: true })));
		expect(store.readState(TEAM)?.tasks).toEqual([]);
	});

	it("caps the event log per team", () => {
		for (let i = 0; i < 12; i++) {
			store.persistBatch(
				TEAM,
				batch(emptyDelta(), [{ type: "team_message", payload: { i } }]),
			);
		}
		const history = store.readHistory(TEAM, 100) as Array<{
			payload: { i: number };
		}>;
		expect(history).toHaveLength(5);
		expect(history[0]?.payload.i).toBe(11);
	});

	it("drops telemetry on the legacy handleTeamEvent path", () => {
		store.handleTeamEvent(TEAM, {
			type: "run_progress",
			run: run("run_1"),
			message: "heartbeat",
		} as never);
		expect(store.readHistory(TEAM)).toEqual([]);
	});

	it("caps the event log on the legacy handleTeamEvent path", () => {
		for (let i = 0; i < 12; i++) {
			store.handleTeamEvent(TEAM, {
				type: "run_completed",
				run: run(`run_${i}`),
			} as never);
		}
		expect(store.readHistory(TEAM, 100)).toHaveLength(5);
	});

	it("marks in-progress runs interrupted in rows", () => {
		store.persistBatch(TEAM, batch(emptyDelta({ runs: [run("run_1")] })));
		expect(store.markInProgressRunsInterrupted(TEAM, "crash")).toEqual([
			"run_1",
		]);
		const [r] = store.readState(TEAM)?.runs ?? [];
		expect(r?.status).toBe("interrupted");
		expect(r?.error).toBe("crash");
	});

	it("deletes all state and events for a team", () => {
		store.persistBatch(
			TEAM,
			batch(
				emptyDelta({ tasks: [task("delete-task")], runs: [run("delete-run")] }),
				[{ type: "team_message", payload: { deleted: true } }],
			),
		);

		expect(store.deleteTeam(TEAM)).toBe(true);
		expect(store.deleteTeam(TEAM)).toBe(false);
		expect(store.listTeamNames()).toEqual([]);
		expect(store.readHistory(TEAM)).toEqual([]);
		expect(store.readState(TEAM)).toBeUndefined();
	});

	it("reopens independent project stores with colliding team, Agent, and run ids", () => {
		const workspaceA = mkdtempSync(join(tmpdir(), "team-workspace-a-"));
		const workspaceB = mkdtempSync(join(tmpdir(), "team-workspace-b-"));
		const projectA = resolveProjectStorageRoots(workspaceA).teamStoreDir;
		const projectB = resolveProjectStorageRoots(workspaceB).teamStoreDir;
		expect(projectA).toContain(join(".orvanta", "local", "db"));
		expect(projectB).toContain(join(".orvanta", "local", "db"));
		expect(projectA).not.toBe(projectB);
		mkdirSync(projectA, { recursive: true });
		mkdirSync(projectB, { recursive: true });
		const teamA = new SqliteTeamStore({ teamDir: projectA });
		const teamB = new SqliteTeamStore({ teamDir: projectB });
		const deltaA = emptyDelta({
			tasks: [task("shared-task")],
			runs: [run("shared-run", { message: "from-a" })],
		});
		const deltaB = emptyDelta({
			tasks: [task("shared-task")],
			runs: [run("shared-run", { message: "from-b" })],
		});
		try {
			teamA.init();
			teamB.init();
			teamA.persistBatch(
				TEAM,
				batch(
					deltaA,
					[{ type: "team_message", payload: { owner: "A" } }],
					[{ agentId: "worker", rolePrompt: "A prompt" }],
				),
			);
			teamB.persistBatch(
				TEAM,
				batch(
					deltaB,
					[{ type: "team_message", payload: { owner: "B" } }],
					[{ agentId: "worker", rolePrompt: "B prompt" }],
				),
			);
			teamA.close();
			teamB.close();

			const reopenedA = new SqliteTeamStore({ teamDir: projectA });
			const reopenedB = new SqliteTeamStore({ teamDir: projectB });
			try {
				expect(reopenedA.loadRuntime(TEAM).state?.runs[0]?.message).toBe(
					"from-a",
				);
				expect(reopenedB.loadRuntime(TEAM).state?.runs[0]?.message).toBe(
					"from-b",
				);
				expect(reopenedA.loadRuntime(TEAM).teammates[0]?.rolePrompt).toBe(
					"A prompt",
				);
				expect(reopenedB.loadRuntime(TEAM).teammates[0]?.rolePrompt).toBe(
					"B prompt",
				);
				expect(
					(reopenedA.readHistory(TEAM)[0] as { payload: { owner: string } })
						.payload.owner,
				).toBe("A");
				expect(
					(reopenedB.readHistory(TEAM)[0] as { payload: { owner: string } })
						.payload.owner,
				).toBe("B");
			} finally {
				reopenedA.close();
				reopenedB.close();
			}
		} finally {
			teamA.close();
			teamB.close();
			rmSync(projectA, { recursive: true, force: true });
			rmSync(projectB, { recursive: true, force: true });
		}
	});

	it("creates a WAL-safe standalone backup and reopens the source store after backup", () => {
		const backupPath = join(dir, "backup", "teams.db");
		store.persistBatch(
			TEAM,
			batch(
				emptyDelta({ tasks: [task("backup-task")], runs: [run("backup-run")] }),
			),
		);

		store.backupTo(backupPath);
		const backupDb = loadSqliteDb(backupPath);
		try {
			expect(
				backupDb
					.prepare("SELECT task_id FROM team_tasks WHERE team_name = ?")
					.all(TEAM),
			).toEqual([{ task_id: "backup-task" }]);
			expect(
				backupDb
					.prepare("SELECT run_id FROM team_runs WHERE team_name = ?")
					.all(TEAM),
			).toEqual([{ run_id: "backup-run" }]);
		} finally {
			backupDb.close?.();
		}
		expect(store.readState(TEAM)?.runs[0]?.id).toBe("backup-run");
	});

	it("does not fall back to shared or file storage when an explicit project store is read-only or corrupt", () => {
		const corrupt = mkdtempSync(join(tmpdir(), "team-corrupt-"));
		try {
			const sqliteInit = vi
				.spyOn(SqliteTeamStore.prototype, "init")
				.mockImplementation(() => {
					throw new Error("project store is read-only");
				});
			const corruptPath = join(corrupt, "teams.db");
			writeFileSync(corruptPath, "not sqlite");
			try {
				expect(() =>
					createLocalTeamStore({ teamDir: corrupt, failClosed: true }),
				).toThrow("project store is read-only");
			} finally {
				sqliteInit.mockRestore();
			}
			expect(() =>
				createLocalTeamStore({ teamDir: corrupt, failClosed: true }),
			).toThrow();
			expect(existsSync(join(corrupt, "team-a", "state.json"))).toBe(false);
		} finally {
			rmSync(corrupt, { recursive: true, force: true });
		}
	});
});

describe("createLocalTeamStore persistence selection", () => {
	it("fails closed instead of switching project-owned SQLite storage to files", () => {
		const dir = mkdtempSync(join(tmpdir(), "cline-team-store-fail-closed-"));
		const init = vi
			.spyOn(SqliteTeamStore.prototype, "init")
			.mockImplementation(() => {
				throw new Error("sqlite initialization failed");
			});
		try {
			expect(() =>
				createLocalTeamStore({ teamDir: dir, failClosed: true }),
			).toThrow("sqlite initialization failed");
			expect(() => createLocalTeamStore()).not.toThrow();
		} finally {
			init.mockRestore();
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
