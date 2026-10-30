import { type DecisionItem, type HistoryInboxEntry, loadHistoryInbox, loadPendingInbox } from "@cline/shared"
import { EmptyRequest } from "@shared/proto/cline/common"
import { OrvantaDecisionItem, OrvantaHistoryEntry, OrvantaInboxResponse } from "@shared/proto/cline/orvanta"
import { HostProvider } from "@/hosts/host-provider"
import { globalInboxBadgeTracker } from "@/orvanta/inbox-badge-tracker"
import type { Controller } from ".."

export function toProtoDecisionItem(item: DecisionItem): OrvantaDecisionItem {
	return OrvantaDecisionItem.create({
		id: item.id,
		type: item.type,
		status: item.status,
		createdAt: item.createdAt,
		createdBy: item.createdBy,
		title: item.title,
		summary: item.summary,
		payloadJson: JSON.stringify(item.payload ?? {}),
		urgency: item.urgency,
	})
}

export function toProtoHistoryEntry(entry: HistoryInboxEntry): OrvantaHistoryEntry {
	return OrvantaHistoryEntry.create({
		id: entry.id,
		type: entry.type,
		status: entry.status,
		resolvedAt: entry.resolvedAt,
		resolvedBy: entry.resolvedBy,
		note: entry.note ?? "",
		title: entry.title ?? "",
		summary: entry.summary ?? "",
		payloadJson: JSON.stringify(entry.payload ?? {}),
		urgency: entry.urgency ?? "normal",
		createdAt: entry.createdAt ?? "",
		createdBy: entry.createdBy ?? "",
	})
}

export async function listInbox(_controller: Controller, _request: EmptyRequest): Promise<OrvantaInboxResponse> {
	const { paths } = await HostProvider.workspace.getWorkspacePaths({})
	const roots = [...new Set(paths.filter((workspacePath) => workspacePath.trim().length > 0))]
	if (roots.length === 0) {
		globalInboxBadgeTracker.setBadge(0)
		return OrvantaInboxResponse.create({
			pending: [],
			deferred: [],
			history: [],
			pendingCount: 0,
		})
	}

	const inboxes = await Promise.all(
		roots.map(async (root) => ({
			pending: await loadPendingInbox(root),
			history: await loadHistoryInbox(root),
		})),
	)
	const allPending = inboxes.flatMap(({ pending }) => pending.items)
	const pendingItems = allPending.filter((item) => item.status === "pending")
	const deferredItems = allPending.filter((item) => item.status === "deferred")
	const history = inboxes.flatMap(({ history: entries }) => entries)

	globalInboxBadgeTracker.setBadge(pendingItems.length)

	return OrvantaInboxResponse.create({
		pending: pendingItems.map(toProtoDecisionItem),
		deferred: deferredItems.map(toProtoDecisionItem),
		history: history.map(toProtoHistoryEntry),
		pendingCount: pendingItems.length,
	})
}
