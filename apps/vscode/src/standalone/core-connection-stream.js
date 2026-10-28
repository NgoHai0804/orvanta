import { CoreConnectionServiceClient } from "@generated/grpc-js/host/core_connection"
import * as grpc from "@grpc/grpc-js"
import { hostBridgeGrpcMetadata } from "@/hosts/external/host-bridge-auth"
/** Owns the authenticated gRPC stream without depending on the Controller world. */
export function connectCoreStream(address, credentials, handlers, onDisconnect) {
	const client = new CoreConnectionServiceClient(address, grpc.credentials.createInsecure(), {
		"grpc.enable_http_proxy": 0,
		"grpc.max_receive_message_length": 256 * 1024 * 1024,
		"grpc.max_send_message_length": 256 * 1024 * 1024,
	})
	// The in-band hello already proves identity for this stream; the header keeps
	// it uniform with every other bridge call so the host can authenticate at the
	// transport boundary rather than per-service.
	const stream = client.connect(hostBridgeGrpcMetadata())
	return new Promise((resolve, reject) => {
		let connected = false
		let closed = false
		const failStartup = (error) => {
			if (!connected && !closed) {
				closed = true
				client.close()
				reject(error)
			}
		}
		const disconnect = (error) => {
			failStartup(error)
			if (connected && !closed) {
				closed = true
				client.close()
				onDisconnect(error)
			}
		}
		stream.on("data", (message) => {
			if (message.ready) {
				if (!connected) {
					connected = true
					resolve({
						close() {
							closed = true
							stream.end()
							client.close()
						},
					})
				}
				return
			}
			if (message.request) {
				void handlers.onRequest(message.request, (outgoing) => writeMessage(stream, outgoing)).catch(disconnect)
				return
			}
			if (message.cancel) handlers.onCancel(message.cancel.requestId)
		})
		stream.once("error", disconnect)
		stream.once("end", () =>
			disconnect(
				new Error(
					connected
						? "Host Bridge closed the active core connection"
						: "Host Bridge closed the core connection during startup",
				),
			),
		)
		stream.write({ hello: credentials }, (error) => {
			if (error) failStartup(error)
		})
	})
}
function writeMessage(stream, message) {
	return new Promise((resolve, reject) => {
		stream.write(message, (error) => {
			if (error) reject(error)
			else resolve()
		})
	})
}
//# sourceMappingURL=core-connection-stream.js.map
