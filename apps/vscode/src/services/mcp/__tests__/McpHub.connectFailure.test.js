import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { StateManager } from "@core/storage/StateManager"
import sinon from "sinon"
import { McpHub } from "../McpHub"

/**
 * A server whose connection attempt fails must remain visible in the
 * in-memory server list as a disconnected entry carrying the error, and
 * reconciliation must notify the webview of that state. These tests drive
 * the real `connectToServer` failure path (a stdio command that cannot
 * spawn) rather than stubbing it.
 */
describe("McpHub connect failure", () => {
	let sandbox
	beforeEach(() => {
		sandbox = sinon.createSandbox()
		sandbox.stub(StateManager, "get").returns({
			getRemoteConfigSettings: () => ({}),
		})
	})
	afterEach(() => {
		sandbox.restore()
	})
	function createHub() {
		const hub = Object.create(McpHub.prototype)
		hub.connections = []
		hub.isConnecting = false
		hub.clientVersion = "0.0.0"
		sandbox.stub(hub, "notifyWebviewOfServerChanges").resolves()
		return hub
	}
	it("keeps a failed server visible as disconnected with its error", async () => {
		const hub = createHub()
		const config = {
			type: "stdio",
			command: "this-command-does-not-exist-anywhere",
			args: [],
			autoApprove: [],
			disabled: false,
			timeout: 60,
		}
		await expect(hub.connectToServer("broken-server", config, "internal")).rejects.toThrow()
		const connection = hub.connections.find((conn) => conn.server.name === "broken-server")
		expect(connection).toBeDefined()
		expect(connection.server.status).toBe("disconnected")
		expect(connection.server.error.length).toBeGreaterThan(0)
	})
	it("notifies the webview when a reconnect after a config change fails", async () => {
		const hub = createHub()
		sandbox.stub(hub, "removeAllFileWatchers")
		sandbox.stub(hub, "setupFileWatcher")
		sandbox.stub(hub, "deleteConnection").callsFake(async () => {
			hub.connections = []
		})
		hub.connections = [
			{
				server: {
					name: "broken-server",
					config: JSON.stringify({ type: "stdio", command: "old-command", timeout: 60 }),
					status: "connected",
					disabled: false,
				},
				client: {},
				transport: {},
			},
		]
		await hub.updateServerConnections({
			"broken-server": {
				type: "stdio",
				command: "this-command-does-not-exist-anywhere",
				args: [],
				autoApprove: [],
				disabled: false,
				timeout: 60,
			},
		})
		const connection = hub.connections.find((conn) => conn.server.name === "broken-server")
		expect(connection).toBeDefined()
		expect(connection.server.status).toBe("disconnected")
		// The final notification must fire so the webview leaves "connecting"
		// and shows the errored entry.
		expect(hub.notifyWebviewOfServerChanges.callCount).toBeGreaterThanOrEqual(2)
	})
})
//# sourceMappingURL=McpHub.connectFailure.test.js.map
