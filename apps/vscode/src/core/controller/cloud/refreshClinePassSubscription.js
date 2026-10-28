import { Empty } from "@shared/proto/cline/common"
/** Re-checks the account's ClinePass plan; the coordinator re-posts state when the answer changes. */
export async function refreshClinePassSubscription(controller, _request) {
	await controller.refreshClinePassSubscription()
	return Empty.create()
}
//# sourceMappingURL=refreshClinePassSubscription.js.map
