import { resumeCeoSessionPause, updateSession } from "@cline/shared"
import { OrvantaCeoSessionPauseRequest, OrvantaCeoSessionPauseResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import type { Controller } from ".."

/**
 * Clears durable CEO pause so dispatch can continue. Does not blind-replay
 * interrupted/running tool work: unresolved `needsAttention` stays until the
 * CEO clears it (Phase 6.3 — resume only from durable checkpoints).
 */
export async function resumeCeoSession(
	_controller: Controller,
	request: OrvantaCeoSessionPauseRequest,
): Promise<OrvantaCeoSessionPauseResponse> {
	const sessionId = request.sessionId?.trim()
	if (!sessionId) {
		return OrvantaCeoSessionPauseResponse.create({
			success: false,
			error: "sessionId is required",
			sessionId: "",
			status: "none",
			participantsJson: "{}",
		})
	}
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return OrvantaCeoSessionPauseResponse.create({
			success: false,
			error: "No workspace folder open",
			sessionId,
			status: "none",
			participantsJson: "{}",
		})
	}
	try {
		const record = await resumeCeoSessionPause(root, sessionId)
		await updateSession(root, sessionId, { status: "active" }).catch(() => undefined)
		return OrvantaCeoSessionPauseResponse.create({
			success: true,
			sessionId: record.sessionId,
			status: record.status,
			participantsJson: JSON.stringify(record.participants ?? {}),
			needsAttentionJson: JSON.stringify(record.needsAttention ?? []),
		})
	} catch (error) {
		return OrvantaCeoSessionPauseResponse.create({
			success: false,
			error: error instanceof Error ? error.message : String(error),
			sessionId,
			status: "none",
			participantsJson: "{}",
			needsAttentionJson: "[]",
		})
	}
}
