import { watch } from "node:fs"
import { join } from "node:path"
import { loadPendingInbox, WORKSPACE_DIRNAME } from "@cline/shared"
import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { globalInboxBadgeTracker } from "@/orvanta/inbox-badge-tracker"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { globalTeamStatusTracker } from "@/orvanta/team-status-tracker"
import { Logger } from "@/shared/services/Logger"

import type { Controller } from ".."
import { getRequestRegistry, type StreamingResponseHandler } from "../grpc-handler"
import { getCompany } from "./getCompany"

export async function subscribeCompany(
	controller: Controller,
	request: EmptyRequest,
	responseStream: StreamingResponseHandler<OrvantaCompanyResponse>,
	requestId?: string,
): Promise<void> {
	const watchers: Array<ReturnType<typeof watch>> = []
	let debounce: ReturnType<typeof setTimeout> | undefined
	let orvantaWatcherAttached = false

	const tryAttachOrvantaWatcher = (workspaceRoot: string) => {
		if (orvantaWatcherAttached) {
			return
		}
		try {
			const w = watch(join(workspaceRoot, WORKSPACE_DIRNAME), { recursive: true }, scheduleEmit)
			watchers.push(w)
			orvantaWatcherAttached = true
		} catch {
			// Company folder may not exist yet; root watch covers creation.
		}
	}

	const emit = async () => {
		try {
			const root = await resolveOrvantaWorkspaceRoot()
			if (root) {
				tryAttachOrvantaWatcher(root)
				try {
					const pending = await loadPendingInbox(root)
					globalInboxBadgeTracker.setBadge(pending.items.filter((i) => i.status === "pending").length)
				} catch {
					// ignore
				}
			}
			const snapshot = await getCompany(controller, request)
			await responseStream(snapshot, false)
		} catch (error) {
			Logger.error("orvanta.subscribeCompany emit failed", error)
		}
	}

	const scheduleEmit = () => {
		if (debounce) {
			clearTimeout(debounce)
		}
		debounce = setTimeout(() => {
			void emit()
		}, 50)
	}

	await emit()

	const root = await resolveOrvantaWorkspaceRoot()
	if (root) {
		try {
			watchers.push(watch(root, scheduleEmit))
		} catch (error) {
			Logger.warn("orvanta.subscribeCompany could not watch workspace root", error)
		}
		tryAttachOrvantaWatcher(root)
	}

	const unsubscribeStatusTracker = globalTeamStatusTracker.subscribeRunningChange(scheduleEmit)

	const cleanup = () => {
		unsubscribeStatusTracker()
		if (debounce) {
			clearTimeout(debounce)
		}

		for (const watcher of watchers) {
			try {
				watcher.close()
			} catch {
				// ignore
			}
		}
	}

	if (requestId) {
		getRequestRegistry().registerRequest(requestId, cleanup, { type: "orvanta_company_subscription" }, responseStream)
	}
}
