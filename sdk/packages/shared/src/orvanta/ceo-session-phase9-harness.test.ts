/**
 * Focused Phase 9 harness: durable pause + ambiguous side-effect + resume plan
 * without a full VS Code host. Complements local-runtime-host.e2e cross-project
 * isolation; does not replace the representative E2E checklist in `02`.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	getCeoSessionPause,
	isCeoSessionDispatchBlocked,
	requestCeoSessionPause,
	acknowledgeCeoSessionPause,
	resumeCeoSessionPause,
	reportCeoSessionNeedsAttention,
} from "./ceo-session-pause";
import {
	isCeoSessionBlindRecoverBlocked,
	planCeoSessionRuntimeRecovery,
} from "./ceo-session-resume-plan";
import { getAgentMemory, saveAgentMemory } from "./agent-memory-store";
import {
	createSession,
	getSession,
	listSessions,
} from "./session-history-store";
import { createCompany } from "./workspace-store";

const PURPOSE = "Xây công ty AI theo từng repo, giữ agent đúng mục tiêu.";

describe("phase 9 harness — pause / needs-attention / resume plan", () => {
	it("blocks new work while paused, flags ambiguous side effects, resume keeps attention", async () => {
		const root = await mkdtemp(join(tmpdir(), "orvanta-p9-"));
		await createCompany(root, { name: "FixtureCo", purpose: PURPOSE });
		const sessionId = "ceo_fixture_p9";

		await requestCeoSessionPause(root, sessionId);
		await acknowledgeCeoSessionPause(root, sessionId, {
			coordinator: "safe",
			builder: "safe",
		});
		const paused = await getCeoSessionPause(root, sessionId);
		expect(paused?.status).toBe("paused");
		expect(isCeoSessionDispatchBlocked(paused)).toBe(true);

		const planWhilePaused = planCeoSessionRuntimeRecovery({
			pause: paused,
			runs: [
				{
					runId: "run_q",
					agentId: "builder",
					status: "queued",
					hasDurableCheckpoint: true,
				},
			],
		});
		expect(planWhilePaused.skipAutoRecover).toBe(true);

		await reportCeoSessionNeedsAttention(root, sessionId, [
			{
				agentId: "builder",
				reason: "Shell exit unknown — do not blind-replay",
			},
		]);
		const afterAttention = await getCeoSessionPause(root, sessionId);
		expect(afterAttention?.needsAttention).toHaveLength(1);

		const resumed = await resumeCeoSessionPause(root, sessionId);
		expect(resumed.status).toBe("none");
		expect(isCeoSessionDispatchBlocked(resumed)).toBe(false);
		expect(resumed.needsAttention).toHaveLength(1);
		expect(isCeoSessionBlindRecoverBlocked(resumed)).toBe(true);

		const ambiguous = planCeoSessionRuntimeRecovery({
			pause: resumed,
			runs: [
				{
					runId: "run_shell",
					agentId: "builder",
					status: "running",
					hasDurableCheckpoint: false,
				},
			],
		});
		expect(ambiguous.autoResumeRunIds).toEqual([]);
		expect(ambiguous.needsAttention.length).toBeGreaterThan(0);
	});

	it("reconnect-only when runtime is still alive (no duplicate recover)", () => {
		const plan = planCeoSessionRuntimeRecovery({
			runtimeAlive: true,
			runs: [
				{
					runId: "run_1",
					agentId: "reviewer",
					status: "queued",
					hasDurableCheckpoint: true,
				},
			],
		});
		expect(plan.reconnectOnly).toBe(true);
		expect(plan.skipAutoRecover).toBe(true);
		expect(plan.autoResumeRunIds).toEqual([]);
	});

	it("project B does not see project A memory or CEO session", async () => {
		const rootA = await mkdtemp(join(tmpdir(), "orvanta-p9a-"));
		const rootB = await mkdtemp(join(tmpdir(), "orvanta-p9b-"));
		const companyA = await createCompany(rootA, { name: "Alpha", purpose: PURPOSE });
		await createCompany(rootB, { name: "Beta", purpose: PURPOSE });
		expect(companyA.status).toBe("ready");
		if (companyA.status !== "ready") throw new Error("expected ready company A");
		await saveAgentMemory(rootA, "coordinator", "alpha-only-memory");
		await createSession(rootA, {
			sessionId: "ceo_alpha_1",
			companyId: companyA.company.id,
			title: "Alpha session",
		});
		expect(await getAgentMemory(rootA, "coordinator")).toBe("alpha-only-memory");
		expect(await getAgentMemory(rootB, "coordinator")).toBe("");
		await expect(getSession(rootB, "ceo_alpha_1")).rejects.toThrow();
		expect((await listSessions(rootB)).sessions.map((s) => s.sessionId)).not.toContain(
			"ceo_alpha_1",
		);
	});
});
