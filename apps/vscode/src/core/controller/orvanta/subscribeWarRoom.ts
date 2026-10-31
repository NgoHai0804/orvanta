import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaWarRoomSnapshot } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { hydrateWarRoomFromTeamStore } from "@/orvanta/team-runtime-hydrate"
import { globalWarRoomTracker } from "@/orvanta/war-room-tracker"
import { loadCompany } from "@/orvanta/workspace-store"
import { Logger } from "@/shared/services/Logger"

import type { Controller } from ".."
import { getRequestRegistry, type StreamingResponseHandler } from "../grpc-handler"

export async function subscribeWarRoom(
	_controller: Controller,
	_request: EmptyRequest,
	responseStream: StreamingResponseHandler<OrvantaWarRoomSnapshot>,
	requestId?: string,
): Promise<void> {
	let companyName = ""
	let purposeOneLiner = ""
	let teamName: string | undefined
	let workspaceRoot: string | undefined

	const loadMeta = async () => {
		try {
			const root = await resolveOrvantaWorkspaceRoot()
			if (!root) return
			workspaceRoot = root
			const load = await loadCompany(root)
			if (load.status === "ready") {
				companyName = load.company.name
				teamName = load.company.teamName
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

	const emit = async (syncStatus: "live" | "stale" | "reconnecting" = "live") => {
		try {
			const snapshot = OrvantaWarRoomSnapshot.create({
				cards: globalWarRoomTracker.getSnapshot(),
				companyName,
				purposeOneLiner,
				syncStatus,
				lastUpdatedAt: new Date().toISOString(),
			})
			await responseStream(snapshot, false)
		} catch (error) {
			Logger.error("subscribeWarRoom: emit failed", error)
		}
	}

	// Roster → TeamStore hydrate → live subscribe (snapshot before stream).
	await loadMeta()
	if (workspaceRoot) {
		await hydrateWarRoomFromTeamStore(workspaceRoot, teamName)
	}
	await emit("live")

	const unsubscribe = globalWarRoomTracker.subscribeChange(() => {
		void emit("live")
	})

	const cleanup = () => {
		unsubscribe()
	}

	if (requestId) {
		getRequestRegistry().registerRequest(requestId, cleanup, { type: "orvanta_war_room_subscription" }, responseStream)
	}
}
