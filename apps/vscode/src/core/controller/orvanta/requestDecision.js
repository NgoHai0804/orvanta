import { loadPendingInbox, requestDecision as requestDecisionInStore } from "@cline/shared"
import { globalInboxBadgeTracker } from "@/orvanta/inbox-badge-tracker"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import { toProtoDecisionItem } from "./listInbox"
export async function requestDecision(_controller, request) {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		throw new Error("No workspace root found")
	}
	let payload = {}
	if (request.payloadJson) {
		try {
			payload = JSON.parse(request.payloadJson)
		} catch {
			payload = {}
		}
	}
	const result = await requestDecisionInStore(root, {
		type: request.type,
		title: request.title,
		summary: request.summary,
		payload,
		urgency: request.urgency ? request.urgency : undefined,
		createdBy: "ceo",
	})
	const pending = await loadPendingInbox(root)
	const pendingCount = pending.items.filter((i) => i.status === "pending").length
	globalInboxBadgeTracker.setBadge(pendingCount)
	return toProtoDecisionItem(result.item)
}
//# sourceMappingURL=requestDecision.js.map
