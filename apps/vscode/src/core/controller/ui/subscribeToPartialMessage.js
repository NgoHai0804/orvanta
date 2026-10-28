import { Logger } from "@/shared/services/Logger"
import { getRequestRegistry } from "../grpc-handler"

// Keep track of active partial message subscriptions (gRPC streams)
const activePartialMessageSubscriptions = new Set()
const callbackSubscriptions = new Set()
/**
 * Subscribe to partial message events
 * @param controller The controller instance
 * @param request The empty request
 * @param responseStream The streaming response handler
 * @param requestId The ID of the request (passed by the gRPC handler)
 */
export async function subscribeToPartialMessage(_controller, _request, responseStream, requestId) {
	// Add this subscription to the active subscriptions
	activePartialMessageSubscriptions.add(responseStream)
	// Register cleanup when the connection is closed
	const cleanup = () => {
		activePartialMessageSubscriptions.delete(responseStream)
	}
	// Register the cleanup function with the request registry if we have a requestId
	if (requestId) {
		getRequestRegistry().registerRequest(requestId, cleanup, { type: "partial_message_subscription" }, responseStream)
	}
}
/**
 * Send a partial message event to all active subscribers
 * @param partialMessage The ClineMessage to send
 */
export async function sendPartialMessageEvent(partialMessage) {
	// FIRE-AND-FORGET: do NOT await delivery to the webview. The webview can be hidden,
	// reloaded, or closed, and VSCode's postMessage may hang or resolve false; awaiting it
	// could stall the backend's turn loop on a dead consumer. Correctness does not depend on
	// any single delivery arriving — the webview is a convergent replica that merges by id/seq
	// and reconciles from full state.
	for (const responseStream of activePartialMessageSubscriptions) {
		responseStream(partialMessage, false).catch((error) => {
			Logger.error("Error sending partial message event:", error)
			// Remove the subscription if there was an error
			activePartialMessageSubscriptions.delete(responseStream)
		})
	}
	// Send to callback subscribers (synchronous)
	for (const callback of callbackSubscriptions) {
		try {
			callback(partialMessage)
		} catch (error) {
			Logger.error("Error in partial message callback:", error)
		}
	}
}
//# sourceMappingURL=subscribeToPartialMessage.js.map
