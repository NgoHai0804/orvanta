import { v4 as uuidv4 } from "uuid"
import { GrpcHandler } from "@/hosts/vscode/hostbridge-grpc-handler"
import { Logger } from "@/shared/services/Logger"
// Create a client for any protobuf service with inferred types
export function createGrpcClient(service) {
	const client = {}
	const grpcHandler = new GrpcHandler()
	Object.values(service.methods).forEach((method) => {
		// Use lowercase method name as the key in the client object
		const methodKey = method.name.charAt(0).toLowerCase() + method.name.slice(1)
		// Streaming method implementation
		if (method.responseStream) {
			client[methodKey] = (request, options) => {
				// Use handleRequest with streaming callbacks
				const requestId = uuidv4()
				// handleRequest is async, but the client contract (GrpcClientType and the
				// generated host-bridge-client-types) requires the cancel function to be
				// returned synchronously. Returning the async IIFE directly would hand
				// callers a Promise, and invoking it (e.g. `unsubscribe()`) throws
				// "... is not a function". Resolve the real cancel function in the
				// background and return a stable wrapper immediately.
				const cancelPromise = (async () => {
					try {
						const result = await grpcHandler.handleRequest(service.fullName, methodKey, request, requestId, options)
						// If the result is a function, it's the cancel function
						if (typeof result === "function") {
							return result
						}
						// This shouldn't happen, but just in case
						Logger.error(`Expected cancel function but got response object for streaming request: ${requestId}`)
						return () => {}
					} catch (error) {
						Logger.error(`Error in streaming request: ${error}`)
						if (options.onError) {
							options.onError(error instanceof Error ? error : new Error(String(error)))
						}
						return () => {}
					}
				})()
				return () => {
					cancelPromise.then((cancel) => cancel()).catch((error) => Logger.error(`Error cancelling stream: ${error}`))
				}
			}
		} else {
			// Unary method implementation
			client[methodKey] = (request) => {
				return new Promise(async (resolve, reject) => {
					const requestId = uuidv4()
					try {
						const response = await grpcHandler.handleRequest(service.fullName, methodKey, request, requestId)
						// Check if the response is a function (streaming)
						if (typeof response === "function") {
							// This shouldn't happen for unary requests
							throw new Error("Received streaming response for unary request")
						}
						resolve(response)
					} catch (e) {
						Logger.log(`[DEBUG] gRPC host ERR to ${service.fullName}.${methodKey} req:${requestId} err:${e}`)
						reject(e)
					}
				})
			}
		}
	})
	return client
}
//# sourceMappingURL=host-grpc-client-base.js.map
