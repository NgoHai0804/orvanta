import { Empty } from "@shared/proto/cline/common"
import { Logger } from "@/shared/services/Logger"
import { getRequestRegistry } from "../grpc-handler"

const activeMarketplaceButtonClickedSubscriptions = new Set()
export async function subscribeToMarketplaceButtonClicked(_controller, _request, responseStream, requestId) {
	activeMarketplaceButtonClickedSubscriptions.add(responseStream)
	const cleanup = () => {
		activeMarketplaceButtonClickedSubscriptions.delete(responseStream)
	}
	if (requestId) {
		getRequestRegistry().registerRequest(
			requestId,
			cleanup,
			{ type: "marketplaceButtonClicked_subscription" },
			responseStream,
		)
	}
}
export async function sendMarketplaceButtonClickedEvent() {
	const promises = Array.from(activeMarketplaceButtonClickedSubscriptions).map(async (responseStream) => {
		try {
			await responseStream(Empty.create({}), false)
		} catch (error) {
			Logger.error("Error sending marketplaceButtonClicked event:", error)
			activeMarketplaceButtonClickedSubscriptions.delete(responseStream)
		}
	})
	await Promise.all(promises)
}
//# sourceMappingURL=subscribeToMarketplaceButtonClicked.js.map
