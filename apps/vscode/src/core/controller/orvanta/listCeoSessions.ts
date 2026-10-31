import { listSessions, SessionCorruptError, SessionUnsupportedVersionError } from "@cline/shared"
import { EmptyRequest } from "@shared/proto/cline/common"
import {
	OrvantaCeoSessionIndexItem,
	OrvantaCeoSessionListResponse,
	OrvantaCeoSessionParticipant,
} from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import type { Controller } from ".."

export async function listCeoSessions(_controller: Controller, _request: EmptyRequest): Promise<OrvantaCeoSessionListResponse> {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		return OrvantaCeoSessionListResponse.create({
			success: false,
			error: "No workspace folder open",
			status: "workspace_mismatch",
			sessions: [],
		})
	}
	try {
		const page = await listSessions(root, { page: 1, pageSize: 100 })
		return OrvantaCeoSessionListResponse.create({
			success: true,
			status: "ready",
			sessions: page.sessions.map((item) =>
				OrvantaCeoSessionIndexItem.create({
					sessionId: item.sessionId,
					companyId: item.companyId,
					title: item.title,
					createdAt: item.createdAt,
					updatedAt: item.updatedAt,
					status: item.status,
					isFavorited: item.isFavorited ?? false,
					participants: item.participantSummaries.map((p) =>
						OrvantaCeoSessionParticipant.create({
							agentNumericId: p.agentNumericId,
							agentSlug: p.agentSlugAtJoin,
							displayName: p.displayNameAtJoin,
							role: p.roleAtJoin,
							taskId: p.taskId,
							runIds: [],
							status: "active",
						}),
					),
				}),
			),
		})
	} catch (error) {
		if (error instanceof SessionCorruptError || error instanceof SessionUnsupportedVersionError) {
			return OrvantaCeoSessionListResponse.create({
				success: false,
				error: error.message,
				status: "corrupt",
				sessions: [],
			})
		}
		return OrvantaCeoSessionListResponse.create({
			success: false,
			error: error instanceof Error ? error.message : String(error),
			status: "missing_index",
			sessions: [],
		})
	}
}
