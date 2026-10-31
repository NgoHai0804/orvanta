import { describe, expect, it } from "vitest";
import type { CeoSessionPauseRecord } from "./ceo-session-pause";
import {
	isCeoSessionBlindRecoverBlocked,
	planCeoSessionRuntimeRecovery,
} from "./ceo-session-resume-plan";

describe("planCeoSessionRuntimeRecovery", () => {
	it("reconnects only when a live runtime is already attached", () => {
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

	it("skips auto-recover while CEO pause blocks dispatch", () => {
		const pause: CeoSessionPauseRecord = {
			sessionId: "ceo_1",
			status: "paused",
			participants: { reviewer: "safe" },
		};
		const plan = planCeoSessionRuntimeRecovery({
			pause,
			runs: [
				{
					runId: "run_q",
					agentId: "reviewer",
					status: "queued",
					hasDurableCheckpoint: true,
				},
			],
		});
		expect(plan.skipAutoRecover).toBe(true);
		expect(plan.autoResumeRunIds).toEqual([]);
	});

	it("auto-resumes only queued durable runs; running/interrupted need attention", () => {
		const plan = planCeoSessionRuntimeRecovery({
			runs: [
				{
					runId: "run_q",
					agentId: "writer",
					status: "queued",
					hasDurableCheckpoint: true,
				},
				{
					runId: "run_r",
					agentId: "reviewer",
					status: "running",
					hasDurableCheckpoint: false,
				},
				{
					runId: "run_i",
					agentId: "researcher",
					status: "interrupted",
					hasDurableCheckpoint: true,
				},
			],
		});
		expect(plan.skipAutoRecover).toBe(false);
		expect(plan.autoResumeRunIds).toEqual(["run_q"]);
		expect(plan.needsAttention.map((item) => item.agentId).sort()).toEqual([
			"researcher",
			"reviewer",
		]);
	});

	it("treats ambiguous side-effect harness case as needs-attention, not complete", () => {
		const plan = planCeoSessionRuntimeRecovery({
			runs: [
				{
					runId: "run_shell",
					agentId: "builder",
					status: "running",
					hasDurableCheckpoint: false,
				},
			],
		});
		expect(plan.autoResumeRunIds).toEqual([]);
		expect(plan.needsAttention).toHaveLength(1);
		expect(plan.needsAttention[0]?.reason).toMatch(/side effects|blind-replay/i);
	});
});

describe("isCeoSessionBlindRecoverBlocked", () => {
	it("blocks when unresolved needs-attention items remain after resume", () => {
		expect(
			isCeoSessionBlindRecoverBlocked({
				sessionId: "ceo_1",
				status: "none",
				participants: {},
				needsAttention: [
					{
						agentId: "reviewer",
						reason: "verify git",
						at: new Date().toISOString(),
					},
				],
			}),
		).toBe(true);
		expect(
			isCeoSessionBlindRecoverBlocked({
				sessionId: "ceo_1",
				status: "none",
				participants: {},
			}),
		).toBe(false);
	});
});
