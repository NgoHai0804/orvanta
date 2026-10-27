import {
	type DecisionType,
	type DecisionUrgency,
	loadPendingInbox,
	requestDecision as requestDecisionInStore,
} from "@cline/shared"
import { OrvantaDecisionItem, OrvantaRequestDecisionRequest } from "@shared/proto/cline/orvanta"
import { globalInboxBadgeTracker } from "@/orvanta/inbox-badge-tracker"
import { resolveOrvantaWorkspaceRoot } from "@/orvanta/resolve-workspace"
import type { Controller } from ".."
import { toProtoDecisionItem } from "./listInbox"

export async function requestDecision(
	_controller: Controller,
	request: OrvantaRequestDecisionRequest,
): Promise<OrvantaDecisionItem> {
	const root = await resolveOrvantaWorkspaceRoot()
	if (!root) {
		throw new Error("No workspace root found")
	}

	let payload: Record<string, unknown> = {}
	if (request.payloadJson) {
		try {
			payload = JSON.parse(request.payloadJson)
		} catch {
			payload = {}
		}
	}

	const result = await requestDecisionInStore(root, {
		type: request.type as DecisionType,
		title: request.title,
		summary: request.summary,
		payload,
		urgency: request.urgency ? (request.urgency as DecisionUrgency) : undefined,
		createdBy: "ceo",
	})

	const pending = await loadPendingInbox(root)
	const pendingCount = pending.items.filter((i) => i.status === "pending").length
	globalInboxBadgeTracker.setBadge(pendingCount)

	return toProtoDecisionItem(result.item)
}
