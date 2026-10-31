import type { CeoNeedsAttentionItem, CeoSessionPauseRecord } from "./ceo-session-pause";
import { isCeoSessionDispatchBlocked } from "./ceo-session-pause";

/**
 * Hint describing a team run considered during host restart / CEO resume.
 * `hasDurableCheckpoint` means the run was only queued (not mid-tool) or
 * otherwise safe to continue without replaying an ambiguous side effect.
 */
export interface CeoResumeRunHint {
	runId: string;
	agentId: string;
	/** Last known status before recovery classification. */
	status: "queued" | "running" | "interrupted" | "completed" | "failed" | "cancelled";
	hasDurableCheckpoint: boolean;
}

export interface CeoSessionResumePlan {
	/** Do not call recoverActiveRuns / start new team work. */
	skipAutoRecover: boolean;
	/** Run ids safe to re-queue after a dead runtime (queued + durable). */
	autoResumeRunIds: string[];
	/** Agents/runs that must not be blindly replayed. */
	needsAttention: Array<{ agentId: string; reason: string }>;
	/** Live runtime still attached — caller should reconnect, not start duplicate. */
	reconnectOnly: boolean;
}

const UNCLEAR_RUNNING_REASON =
	"Run was in progress when the host stopped — verify side effects before resume; do not blind-replay.";

const INTERRUPTED_REASON =
	"Interrupted run — durable outcome unclear; do not blind-replay.";

/**
 * Classify which team runs may auto-resume vs need CEO attention.
 *
 * Contract (Phase 6.3 / 0.6):
 * - Pause active → no auto-recover
 * - Live runtime → reconnectOnly (caller supplies); no duplicate start
 * - Queued + durable checkpoint → auto-resume
 * - Running / interrupted / no durable checkpoint → needs-attention
 */
export function planCeoSessionRuntimeRecovery(input: {
	pause?: CeoSessionPauseRecord | undefined;
	runs?: CeoResumeRunHint[];
	/** True when an in-process team runtime is already attached for this CEO session. */
	runtimeAlive?: boolean;
}): CeoSessionResumePlan {
	const pause = input.pause;
	const runs = input.runs ?? [];
	const runtimeAlive = Boolean(input.runtimeAlive);

	if (runtimeAlive) {
		return {
			skipAutoRecover: true,
			autoResumeRunIds: [],
			needsAttention: mergeExistingAttention(pause?.needsAttention),
			reconnectOnly: true,
		};
	}

	if (isCeoSessionDispatchBlocked(pause)) {
		return {
			skipAutoRecover: true,
			autoResumeRunIds: [],
			needsAttention: [
				...mergeExistingAttention(pause?.needsAttention),
				...classifyNeedsAttention(runs),
			],
			reconnectOnly: false,
		};
	}

	const autoResumeRunIds: string[] = [];
	const needsAttention: Array<{ agentId: string; reason: string }> = [
		...mergeExistingAttention(pause?.needsAttention),
	];

	for (const run of runs) {
		const agentId = run.agentId.trim();
		const runId = run.runId.trim();
		if (!agentId || !runId) continue;

		if (run.status === "queued" && run.hasDurableCheckpoint) {
			autoResumeRunIds.push(runId);
			continue;
		}

		if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
			continue;
		}

		const reason =
			run.status === "running" || !run.hasDurableCheckpoint
				? UNCLEAR_RUNNING_REASON
				: INTERRUPTED_REASON;
		if (!needsAttention.some((item) => item.agentId === agentId && item.reason === reason)) {
			needsAttention.push({ agentId, reason });
		}
	}

	return {
		skipAutoRecover: false,
		autoResumeRunIds,
		needsAttention,
		reconnectOnly: false,
	};
}

/**
 * True when CEO resume must not trigger blind team-run recovery
 * (unresolved needs-attention items remain).
 */
export function isCeoSessionBlindRecoverBlocked(
	pause: CeoSessionPauseRecord | undefined,
): boolean {
	if (isCeoSessionDispatchBlocked(pause)) return true;
	return (pause?.needsAttention?.length ?? 0) > 0;
}

function mergeExistingAttention(
	items: CeoNeedsAttentionItem[] | undefined,
): Array<{ agentId: string; reason: string }> {
	if (!items?.length) return [];
	return items.map((item) => ({
		agentId: item.agentId,
		reason: item.reason,
	}));
}

function classifyNeedsAttention(
	runs: CeoResumeRunHint[],
): Array<{ agentId: string; reason: string }> {
	const out: Array<{ agentId: string; reason: string }> = [];
	for (const run of runs) {
		if (run.status === "queued" && run.hasDurableCheckpoint) continue;
		if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
			continue;
		}
		const reason =
			run.status === "running" || !run.hasDurableCheckpoint
				? UNCLEAR_RUNNING_REASON
				: INTERRUPTED_REASON;
		const agentId = run.agentId.trim();
		if (!agentId) continue;
		if (!out.some((item) => item.agentId === agentId && item.reason === reason)) {
			out.push({ agentId, reason });
		}
	}
	return out;
}
