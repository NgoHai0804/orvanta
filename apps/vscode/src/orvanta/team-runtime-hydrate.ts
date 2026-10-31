import { join } from "node:path"
import { SqliteTeamStore } from "@cline/core"
import {
	type CeoResumeRunHint,
	getCeoSessionPause,
	planCeoSessionRuntimeRecovery,
	reportCeoSessionNeedsAttention,
} from "@cline/shared"
import { Logger } from "@/shared/services/Logger"
import { getLiveCeoSessionRuntime } from "./ceo-session-runtime-reconnect"
import { globalWarRoomTracker } from "./war-room-tracker"

/**
 * Load durable TeamStore runtime for the company team and overlay onto the
 * in-memory War Room projection. Failures are non-fatal (live stream still works).
 *
 * Does not mutate run status (subscribe/remount must not interrupt live work).
 * Mid-flight → interrupted happens in runtime-builder on session rebuild.
 */
export async function hydrateWarRoomFromTeamStore(
	workspaceRoot: string,
	teamName: string | undefined,
	options?: { orvantaSessionId?: string },
): Promise<{
	hydrated: boolean
	interruptedRunIds: string[]
	autoResumeRunIds: string[]
	skipAutoRecover: boolean
	reconnectOnly: boolean
}> {
	const empty = {
		hydrated: false,
		interruptedRunIds: [] as string[],
		autoResumeRunIds: [] as string[],
		skipAutoRecover: false,
		reconnectOnly: false,
	}
	const name = teamName?.trim()
	if (!workspaceRoot.trim() || !name) {
		return empty
	}
	const teamDir = join(workspaceRoot, ".orvanta", "local", "db")
	let store: SqliteTeamStore | undefined
	try {
		store = new SqliteTeamStore({ teamDir })
		store.init()
		const loaded = store.loadRuntime(name)
		if (loaded.state) {
			globalWarRoomTracker.hydrateFromTeamRuntime(loaded.state)
		}
		const sessionId = options?.orvantaSessionId?.trim()
		const interrupted = (loaded.state?.runs ?? []).filter((r) => r.status === "interrupted")
		// Only classify interrupted / queued for recovery planning. Live `running`
		// rows during an open War Room must not be treated as crash side-effects.
		const runs: CeoResumeRunHint[] = (loaded.state?.runs ?? [])
			.filter((r) => r.status === "queued" || r.status === "interrupted")
			.map((r) => ({
				runId: r.id,
				agentId: r.agentId,
				status: r.status as CeoResumeRunHint["status"],
				hasDurableCheckpoint: r.status === "queued",
			}))
		const pause = sessionId ? await getCeoSessionPause(workspaceRoot, sessionId).catch(() => undefined) : undefined
		const runtimeAlive =
			(sessionId ? Boolean(getLiveCeoSessionRuntime(sessionId)) : false) ||
			globalWarRoomTracker.listActiveAgentIds().length > 0
		const plan = planCeoSessionRuntimeRecovery({
			pause,
			runs,
			runtimeAlive,
		})
		if (sessionId && plan.needsAttention.length > 0) {
			await reportCeoSessionNeedsAttention(workspaceRoot, sessionId, plan.needsAttention).catch((error) => {
				Logger.warn("[Orvanta] needs-attention report failed:", error)
			})
		}
		return {
			hydrated: Boolean(loaded.state),
			interruptedRunIds: loaded.interruptedRunIds?.length > 0 ? loaded.interruptedRunIds : interrupted.map((r) => r.id),
			autoResumeRunIds: plan.autoResumeRunIds,
			skipAutoRecover: plan.skipAutoRecover,
			reconnectOnly: plan.reconnectOnly,
		}
	} catch (error) {
		Logger.warn("[Orvanta] TeamStore hydrate failed:", error)
		return empty
	} finally {
		try {
			store?.close()
		} catch {
			// ignore
		}
	}
}
