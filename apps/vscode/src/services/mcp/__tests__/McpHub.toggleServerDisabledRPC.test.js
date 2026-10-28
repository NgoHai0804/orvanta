import { afterEach, beforeEach, describe, it } from "mocha"
import "should"
import * as diskModule from "@core/storage/disk"
import fs from "fs/promises"
import os from "os"
import path from "path"
import sinon from "sinon"
import { HostProvider } from "@/hosts/host-provider"
import { McpHub } from "../McpHub"

function makeConnection(name, disabled) {
	return {
		server: {
			name,
			config: JSON.stringify({ type: "stdio", command: "test", timeout: 60, disabled }),
			status: disabled ? "disconnected" : "connected",
			disabled,
		},
		client: disabled ? null : {},
		transport: disabled ? null : {},
	}
}
describe("McpHub.toggleServerDisabledRPC", () => {
	let sandbox
	let tempDir
	let settingsPath
	let hub
	let connectArgs
	let notifyCount
	const writeSettings = async (mcpServers) => {
		await fs.writeFile(settingsPath, JSON.stringify({ mcpServers }, null, 2))
	}
	beforeEach(async () => {
		sandbox = sinon.createSandbox()
		tempDir = path.join(os.tmpdir(), `mcp-toggle-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
		await fs.mkdir(tempDir, { recursive: true })
		settingsPath = path.join(tempDir, "cline_mcp_settings.json")
		sandbox.stub(diskModule, "getMcpSettingsFilePath").resolves(settingsPath)
		connectArgs = []
		notifyCount = 0
		hub = Object.create(McpHub.prototype)
		hub.getSettingsDirectoryPath = async () => tempDir
		hub.connections = []
		hub.isConnecting = false
		// deleteConnection just drops the connection from the in-memory list.
		sandbox.stub(hub, "deleteConnection").callsFake(async (...args) => {
			const name = args[0]
			hub.connections = hub.connections.filter((c) => c.server.name !== name)
		})
		// connectToServer records the (name, disabled) it was asked to build and
		// pushes a connection matching what the real method would create.
		sandbox.stub(hub, "connectToServer").callsFake(async (...args) => {
			const name = args[0]
			const config = args[1]
			connectArgs.push({ name, disabled: Boolean(config.disabled) })
			hub.connections.push(makeConnection(name, Boolean(config.disabled)))
		})
		sandbox.stub(hub, "notifyWebviewOfServerChanges").callsFake(async () => {
			notifyCount++
		})
		// The error path calls HostProvider.window.showMessage; stub the static
		// getter so it's harmless without a fully-initialized HostProvider.
		sandbox.stub(HostProvider, "window").get(() => ({ showMessage: sinon.stub().resolves({}) }))
	})
	afterEach(async () => {
		sandbox.restore()
		try {
			await fs.rm(tempDir, { recursive: true, force: true })
		} catch {
			// Ignore cleanup errors
		}
	})
	it("persists disabled=true and rebuilds the connection when disabling", async () => {
		await writeSettings({ alpha: { type: "stdio", command: "a" } })
		hub.connections = [makeConnection("alpha", false)]
		await hub.toggleServerDisabledRPC("alpha", true)
		const persisted = JSON.parse(await fs.readFile(settingsPath, "utf-8"))
		persisted.mcpServers.alpha.disabled.should.equal(true)
		// Rebuilt as a disabled connection.
		connectArgs.should.deepEqual([{ name: "alpha", disabled: true }])
		notifyCount.should.be.greaterThan(0)
	})
	it("reconnects (not stuck connecting) when re-enabling a disabled server", async () => {
		await writeSettings({ alpha: { type: "stdio", command: "a", disabled: true } })
		hub.connections = [makeConnection("alpha", false)]
		hub.connections[0].server.disabled = true
		hub.connections[0].client = null
		hub.connections[0].transport = null
		const result = await hub.toggleServerDisabledRPC("alpha", false)
		// File reflects enabled.
		const persisted = JSON.parse(await fs.readFile(settingsPath, "utf-8"))
		persisted.mcpServers.alpha.disabled.should.equal(false)
		// The connection was actually rebuilt as enabled — this is the fix: a
		// real connect happens rather than just flipping the flag to "connecting".
		connectArgs.should.deepEqual([{ name: "alpha", disabled: false }])
		// The returned (and in-memory) server is enabled and connected, not
		// stuck on the "connecting" yellow state.
		const alpha = result.find((s) => s.name === "alpha")
		alpha.disabled.should.equal(false)
		alpha.status.should.equal("connected")
	})
	it("throws when the server is not found", async () => {
		await writeSettings({ beta: { type: "stdio", command: "b" } })
		let threw
		try {
			await hub.toggleServerDisabledRPC("missing", true)
		} catch (err) {
			threw = err
		}
		;(threw === undefined).should.be.false()
		threw.message.should.match(/not found in MCP configuration/)
		connectArgs.should.have.length(0)
	})
})
//# sourceMappingURL=McpHub.toggleServerDisabledRPC.test.js.map
