import type { TeamEvent } from "@cline/core"
import { acknowledgeCeoSessionPause, type CeoParticipantPauseState, getCeoSessionPause, updateSession } from "@cline/shared"
import { Logger } from "@/shared/services/Logger"
import { globalWarRoomTracker } from "./war-room-tracker"

const TERMINAL_RUN_TYPES = new Set(["run_completed", "run_failed", "run_cancelled", "run_interrupted"])

/**
 * After pause_requested: mark idle agents safe, active agents draining.
 * Updates CEO session manifest status to pause_requested.
 */
export async function beginCeoSessionPauseDrain(
	workspaceRoot: string,
	sessionId: string,
	participantIds: string[],
): Promise<void> {
	const active = new Set(globalWarRoomTracker.listActiveAgentIds())
	const participants: Record<string, CeoParticipantPauseState> = {}
	for (const id of participantIds) {
		participants[id] = active.has(id) ? "draining" : "safe"
	}
	// Include any active agent not already listed (ephemeral).
	for (const id of active) {
		if (!(id in participants)) participants[id] = "draining"
	}
	try {
		await acknowledgeCeoSessionPause(workspaceRoot, sessionId, participants)
	} catch (error) {
		Logger.warn("[Orvanta] pause drain seed failed:", error)
	}
	try {
		await updateSession(workspaceRoot, sessionId, { status: "pause_requested" })
	} catch (error) {
		Logger.warn("[Orvanta] pause manifest status update failed:", error)
	}
}

/**
 * While pause_requested/partial: when a run reaches a safe boundary, mark that
 * agent safe and recompute aggregate pause status. On full pause, set manifest paused.
 */
export async function handlePauseDrainOnTeamEvent(
	workspaceRoot: string | undefined,
	orvantaSessionId: string | undefined,
	event: TeamEvent,
): Promise<void> {
	const root = workspaceRoot?.trim()
	const sessionId = orvantaSessionId?.trim()
	if (!root || !sessionId) return
	if (!TERMINAL_RUN_TYPES.has(event.type)) return
	const run = "run" in event ? event.run : undefined
	const agentId = run?.agentId?.trim()
	if (!agentId) return

	try {
		const current = await getCeoSessionPause(root, sessionId)
		if (!current || (current.status !== "pause_requested" && current.status !== "partial")) {
			return
		}
		const participants = { ...current.participants, [agentId]: "safe" as const }
		// Any other still-active agents stay draining.
		for (const id of globalWarRoomTracker.listActiveAgentIds()) {
			if (id !== agentId && participants[id] !== "failed") {
				participants[id] = "draining"
			}
		}
		const next = await acknowledgeCeoSessionPause(root, sessionId, participants)
		if (next.status === "paused") {
			await updateSession(root, sessionId, { status: "paused" }).catch((error) => {
				Logger.warn("[Orvanta] paused manifest status update failed:", error)
			})
		}
	} catch (error) {
		Logger.warn("[Orvanta] pause drain on team event failed:", error)
	}
}
