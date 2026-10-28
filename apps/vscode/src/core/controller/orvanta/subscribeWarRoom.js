import { OrvantaWarRoomSnapshot } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { globalWarRoomTracker } from "@/orvanta/war-room-tracker"
import { loadCompany } from "@/orvanta/workspace-store"
import { Logger } from "@/shared/services/Logger"
import { getRequestRegistry } from "../grpc-handler"
export async function subscribeWarRoom(_controller, _request, responseStream, requestId) {
	let companyName = ""
	let purposeOneLiner = ""
	const loadMeta = async () => {
		try {
			const root = await resolveOrvantaWorkspaceRoot()
			if (!root) return
			const load = await loadCompany(root)
			if (load.status === "ready") {
				companyName = load.company.name
				// first non-empty line of purpose
				purposeOneLiner =
					load.purpose
						.split("\n")
						.find((l) => l.trim().length > 0)
						?.trim() ?? ""
				globalWarRoomTracker.syncRoster(
					load.roster.agents.map((a) => ({
						id: a.id,
						displayName: a.displayName,
						role: a.role,
						status: a.status,
					})),
				)
			}
		} catch (error) {
			Logger.warn("subscribeWarRoom: loadMeta failed", error)
		}
	}
	const emit = async () => {
		try {
			const snapshot = OrvantaWarRoomSnapshot.create({
				cards: globalWarRoomTracker.getSnapshot(),
				companyName,
				purposeOneLiner,
			})
			await responseStream(snapshot, false)
		} catch (error) {
			Logger.error("subscribeWarRoom: emit failed", error)
		}
	}
	await loadMeta()
	await emit()
	const unsubscribe = globalWarRoomTracker.subscribeChange(() => {
		void emit()
	})
	const cleanup = () => {
		unsubscribe()
	}
	if (requestId) {
		getRequestRegistry().registerRequest(requestId, cleanup, { type: "orvanta_war_room_subscription" }, responseStream)
	}
}
//# sourceMappingURL=subscribeWarRoom.js.map
