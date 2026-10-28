import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaChannelItem, OrvantaConsoleStateSnapshot } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { globalWarRoomTracker } from "@/orvanta/war-room-tracker"
import { loadCompany } from "@/orvanta/workspace-store"
import { Logger } from "@/shared/services/Logger"

import type { Controller } from ".."
import { getRequestRegistry, type StreamingResponseHandler } from "../grpc-request-registry"

export async function subscribeConsoleState(
	_controller: Controller,
	_request: EmptyRequest,
	responseStream: StreamingResponseHandler<OrvantaConsoleStateSnapshot>,
	requestId?: string,
): Promise<void> {
	const loadMeta = async () => {
		try {
			const root = await resolveOrvantaWorkspaceRoot()
			if (!root) return
			const load = await loadCompany(root)
			if (load.status === "ready") {
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
			Logger.warn("subscribeConsoleState: loadMeta failed", error)
		}
	}

	await loadMeta()

	const buildChannels = (): OrvantaChannelItem[] => {
		const cards = globalWarRoomTracker.getSnapshot()
		const anyRunning = cards.some((c) => c.status === "running")

		const teamFeed = OrvantaChannelItem.create({
			id: "team-feed",
			name: "#team-feed",
			role: "channel",
			status: anyRunning ? "running" : "idle",
			isChannel: true,
			isEphemeral: false,
			unreadCount: 0,
			runningElapsed: 0,
			currentTask: "",
		})

		const agentChannels = cards.map((card) =>
			OrvantaChannelItem.create({
				id: card.id,
				name: card.displayName || card.id,
				role: card.role || "teammate",
				status: card.status || "idle",
				isChannel: false,
				isEphemeral: card.isEphemeral || false,
				unreadCount: 0,
				runningElapsed: card.elapsedSeconds || 0,
				currentTask: card.taskTitle || "",
			}),
		)

		return [teamFeed, ...agentChannels]
	}

	const emit = async () => {
		try {
			const snapshot = OrvantaConsoleStateSnapshot.create({
				activeChannelId: "team-feed",
				channels: buildChannels(),
				isSidebarCollapsed: false,
			})
			await responseStream(snapshot, false)
		} catch (error) {
			Logger.error("subscribeConsoleState: emit failed", error)
		}
	}

	await emit()

	const unsubscribe = globalWarRoomTracker.subscribeChange(() => {
		void emit()
	})

	const cleanup = () => {
		unsubscribe()
	}

	if (requestId) {
		getRequestRegistry().registerRequest(requestId, cleanup, { type: "orvanta_console_state_subscription" }, responseStream)
	}
}
