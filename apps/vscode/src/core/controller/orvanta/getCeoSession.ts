import { getSession, SessionCorruptError, SessionNotFoundError, SessionUnsupportedVersionError } from "@cline/shared"
import {
	OrvantaCeoSessionIndexItem,
	OrvantaCeoSessionParticipant,
	OrvantaCeoSessionRequest,
	OrvantaCeoSessionResponse,
} from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import type { Controller } from ".."

export async function getCeoSession(
	_controller: Controller,
	request: OrvantaCeoSessionRequest,
): Promise<OrvantaCeoSessionResponse> {
	const sessionId = request.sessionId?.trim()
	if (!sessionId) {
		return OrvantaCeoSessionResponse.create({
			success: false,
			error: "sessionId is required",
			status: "none",
			manifestJson: "",
		})
	}
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return OrvantaCeoSessionResponse.create({
			success: false,
			error: "No workspace folder open",
			status: "workspace_mismatch",
			manifestJson: "",
		})
	}
	try {
		const manifest = await getSession(root, sessionId)
		return OrvantaCeoSessionResponse.create({
			success: true,
			status: "ready",
			session: OrvantaCeoSessionIndexItem.create({
				sessionId: manifest.sessionId,
				companyId: manifest.companyId,
				title: manifest.title,
				createdAt: manifest.createdAt,
				updatedAt: manifest.updatedAt,
				status: manifest.status,
				isFavorited: manifest.isFavorited ?? false,
				participants: manifest.participants.map((p) =>
					OrvantaCeoSessionParticipant.create({
						agentNumericId: p.agentNumericId,
						agentSlug: p.agentSlugAtJoin,
						displayName: p.displayNameAtJoin,
						role: p.roleAtJoin,
						taskId: p.taskId,
						sdkSessionId: p.transcript?.sdkSessionId,
						runIds: p.transcript?.runIds ?? [],
						status: p.status,
					}),
				),
			}),
			manifestJson: JSON.stringify(manifest),
		})
	} catch (error) {
		if (error instanceof SessionNotFoundError) {
			return OrvantaCeoSessionResponse.create({
				success: false,
				error: error.message,
				status: "not_found",
				manifestJson: "",
			})
		}
		if (error instanceof SessionCorruptError || error instanceof SessionUnsupportedVersionError) {
			return OrvantaCeoSessionResponse.create({
				success: false,
				error: error.message,
				status: "corrupt",
				manifestJson: "",
			})
		}
		return OrvantaCeoSessionResponse.create({
			success: false,
			error: error instanceof Error ? error.message : String(error),
			status: "none",
			manifestJson: "",
		})
	}
}
