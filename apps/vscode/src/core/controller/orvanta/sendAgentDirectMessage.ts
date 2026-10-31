import { getActiveTaskBinding, getCeoSessionPause, isCeoSessionDispatchBlocked } from "@cline/shared"
import { OrvantaSendAgentDirectMessageRequest, OrvantaSendAgentDirectMessageResponse } from "@shared/proto/cline/orvanta"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { globalWarRoomTracker } from "@/orvanta/war-room-tracker"
import { Logger } from "@/shared/services/Logger"

import type { Controller } from ".."

export async function sendAgentDirectMessage(
	controller: Controller,
	request: OrvantaSendAgentDirectMessageRequest,
): Promise<OrvantaSendAgentDirectMessageResponse> {
	try {
		Logger.info(`sendAgentDirectMessage: sending message to ${request.agentId}`)

		const taskId = controller.task?.taskId?.trim()
		const binding = taskId ? getActiveTaskBinding(taskId) : undefined
		const ceoSessionId = binding?.sessionId?.trim()
		if (ceoSessionId) {
			const root = binding?.workspaceRoot || (await resolveOrvantaWorkspaceRoot())
			if (root) {
				const pause = await getCeoSessionPause(root, ceoSessionId)
				if (isCeoSessionDispatchBlocked(pause)) {
					return OrvantaSendAgentDirectMessageResponse.create({
						success: false,
						error: `CEO session is ${pause?.status ?? "paused"}; resume before sending new work.`,
					})
				}
			}
		}

		const targetId = request.agentId.trim().toLowerCase()
		const isLead = targetId === "coordinator" || targetId === "lead"

		if (isLead) {
			// Direct message to Coordinator -> route to main Cline session
			if (controller.task) {
				await controller.task.handleWebviewAskResponse("messageResponse", request.message)
			} else if (typeof (controller as any).initTask === "function") {
				await (controller as any).initTask(request.message)
			} else {
				throw new Error("No active coordinator session to receive message")
			}
		} else {
			// Direct message to Teammate -> deliver to mailbox via AgentTeamsRuntime
			// biome-ignore lint/suspicious/noExplicitAny: access global team runtime if running
			const runtime = (globalThis as any).__activeTeamRuntime
			if (runtime && typeof runtime.sendMessage === "function") {
				try {
					const fromAgentId = runtime.getLeadAgentId?.() || "lead"
					runtime.sendMessage(fromAgentId, request.agentId, request.subject || "Direct Steer from CEO", request.message)
				} catch (err) {
					Logger.warn(`sendAgentDirectMessage: runtime.sendMessage error: ${err}`)
				}
			}
			// Always record into WarRoomTracker for the agent's live buffer & transcript
			globalWarRoomTracker.recordDirectMessage(request.agentId, request.message, request.subject)
		}

		return OrvantaSendAgentDirectMessageResponse.create({
			success: true,
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		Logger.error(`sendAgentDirectMessage failed: ${errorMessage}`, error)
		return OrvantaSendAgentDirectMessageResponse.create({
			success: false,
			error: errorMessage,
		})
	}
}
