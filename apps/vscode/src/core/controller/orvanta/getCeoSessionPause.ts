import { getCeoSessionPause as readCeoSessionPause } from "@cline/shared"
import { OrvantaCeoSessionPauseRequest, OrvantaCeoSessionPauseResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import type { Controller } from ".."

export async function getCeoSessionPause(
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
		const record = await readCeoSessionPause(root, sessionId)
		if (!record) {
			return OrvantaCeoSessionPauseResponse.create({
				success: true,
				sessionId,
				status: "none",
				participantsJson: "{}",
				needsAttentionJson: "[]",
			})
		}
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
