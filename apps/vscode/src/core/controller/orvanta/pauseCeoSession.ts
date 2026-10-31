import { getCeoSessionPause, getSession, requestCeoSessionPause } from "@cline/shared"
import { OrvantaCeoSessionPauseRequest, OrvantaCeoSessionPauseResponse } from "@shared/proto/cline/orvanta"
import { beginCeoSessionPauseDrain } from "@/orvanta/ceo-session-pause-drain"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import type { Controller } from ".."

export async function pauseCeoSession(
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
		const record = await requestCeoSessionPause(root, sessionId)
		let participantIds: string[] = []
		try {
			const manifest = await getSession(root, sessionId)
			participantIds = manifest.participants.map((p) => p.agentSlugAtJoin)
		} catch {
			participantIds = ["coordinator"]
		}
		await beginCeoSessionPauseDrain(root, sessionId, participantIds)
		const drained = (await getCeoSessionPause(root, sessionId)) ?? record
		return OrvantaCeoSessionPauseResponse.create({
			success: true,
			sessionId: drained.sessionId,
			status: drained.status,
			participantsJson: JSON.stringify(drained.participants ?? {}),
			needsAttentionJson: JSON.stringify(drained.needsAttention ?? []),
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
