import { afterEach, beforeEach, describe, it, mock } from "bun:test"
import "should"
import * as actualDiskModule from "@core/storage/disk"
import fs, * as actualFsPromises from "fs/promises"
import os from "os"
import path from "path"
import sinon from "sinon"

// bun loads real ESM, so sinon cannot stub the `@core/storage/disk` namespace
// export, and `fs.promises` (the default import below) is NOT the same object as
// the SUT's `import * as fs from "fs/promises"`. Inject module-level sinon stubs
// via mock.module so the full sinon stub API keeps working on the exact
// specifiers the SUT imports. `writeFile` defaults to the real implementation so
// the test's own settings-file writes still hit disk.
// Capture the genuine writeFile before mock.module overrides `fs/promises`, so
// the test's pass-through stub does not recurse into itself.
const realWriteFile = actualFsPromises.writeFile
const getMcpSettingsFilePathStub = sinon.stub()
const writeFileStub = sinon.stub()
const diskMock = () => ({ ...actualDiskModule, getMcpSettingsFilePath: getMcpSettingsFilePathStub })
const fsPromisesNamespace = { ...actualFsPromises, writeFile: writeFileStub }
const fsPromisesMock = () => ({ ...fsPromisesNamespace, default: fsPromisesNamespace })
mock.module("@core/storage/disk", diskMock)
mock.module("@/core/storage/disk", diskMock)
mock.module("fs/promises", fsPromisesMock)
mock.module("node:fs/promises", fsPromisesMock)
// The settings write goes through settingsLock.ts, which writes the file with
// synchronous `node:fs` (temp file + rename), not `fs/promises`. Wrap
// writeFileSync/renameSync at the module level so a test can observe that the
// real settings path is only ever produced by an atomic rename — never written
// in place. Both default to the real implementation so the lock and the write
// still hit disk.
const actualNodeFs = await import("node:fs")
// Capture the genuine sync writers as values BEFORE mock.module overrides
// `node:fs`, so the pass-through spies do not recurse into themselves.
const realWriteFileSync = actualNodeFs.writeFileSync
const realRenameSync = actualNodeFs.renameSync
const writeFileSyncSpy = sinon.stub()
const renameSyncSpy = sinon.stub()
const nodeFsNamespace = { ...actualNodeFs, writeFileSync: writeFileSyncSpy, renameSync: renameSyncSpy }
const nodeFsMock = () => ({ ...nodeFsNamespace, default: nodeFsNamespace })
mock.module("fs", nodeFsMock)
mock.module("node:fs", nodeFsMock)

import { McpHub } from "../McpHub"

function makeConnection(name) {
	return {
		server: {
			name,
			config: JSON.stringify({ type: "stdio", command: "test", timeout: 60 }),
			status: "connected",
			disabled: false,
		},
		client: {},
		transport: {},
	}
}
describe("McpHub.deleteServerRPC", () => {
	let sandbox
	let tempDir
	let settingsPath
	let hub
	const writeSettings = async (mcpServers) => {
		await fs.writeFile(settingsPath, JSON.stringify({ mcpServers }, null, 2))
	}
	beforeEach(async () => {
		sandbox = sinon.createSandbox()
		tempDir = path.join(os.tmpdir(), `mcp-delete-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
		await fs.mkdir(tempDir, { recursive: true })
		settingsPath = path.join(tempDir, "cline_mcp_settings.json")
		getMcpSettingsFilePathStub.reset()
		getMcpSettingsFilePathStub.resolves(settingsPath)
		// Default writeFile to the real implementation; individual tests can wrap
		// it to observe behavior.
		writeFileStub.reset()
		writeFileStub.callsFake((...args) => realWriteFile(...args))
		// node:fs writeFileSync/renameSync default to the real implementation so the
		// settings lock and atomic write still hit disk; individual tests wrap them
		// to observe the write path.
		writeFileSyncSpy.reset()
		writeFileSyncSpy.callsFake((...args) => realWriteFileSync(...args))
		renameSyncSpy.reset()
		renameSyncSpy.callsFake((...args) => realRenameSync(...args))
		hub = Object.create(McpHub.prototype)
		hub.getSettingsDirectoryPath = async () => tempDir
		hub.connections = [makeConnection("alpha"), makeConnection("beta")]
		// clearOAuthForConnection touches the OAuth manager; stub it out.
		sandbox.stub(hub, "clearOAuthForConnection").resolves()
		// updateServerConnectionsRPC normally opens real transports; reproduce only
		// the relevant behavior: drop connections no longer present in the new set.
		sandbox.stub(hub, "updateServerConnectionsRPC").callsFake((...args) => {
			const newServers = args[0]
			hub.connections = hub.connections.filter((c) => Object.hasOwn(newServers, c.server.name))
			return Promise.resolve()
		})
	})
	afterEach(async () => {
		sandbox.restore()
		try {
			await fs.rm(tempDir, { recursive: true, force: true })
		} catch {
			// Ignore cleanup errors
		}
	})
	it("returns the remaining servers (not an empty list) after deleting one", async () => {
		await writeSettings({ alpha: { type: "stdio", command: "a" }, beta: { type: "stdio", command: "b" } })
		const result = await hub.deleteServerRPC("alpha")
		result.should.have.length(1)
		result.map((s) => s.name).should.deepEqual(["beta"])
	})
	it("persists the remaining server to the settings file", async () => {
		await writeSettings({ alpha: { type: "stdio", command: "a" }, beta: { type: "stdio", command: "b" } })
		await hub.deleteServerRPC("alpha")
		const persisted = JSON.parse(await fs.readFile(settingsPath, "utf-8"))
		Object.keys(persisted.mcpServers).should.deepEqual(["beta"])
	})
	it("writes atomically (temp file + rename), never truncating the real file", async () => {
		await writeSettings({ alpha: { type: "stdio", command: "a" }, beta: { type: "stdio", command: "b" } })
		// A reader must never observe the real settings file in a truncated or
		// empty state, since a client that reads it mid-write could conclude
		// there are no servers. settingsLock.ts writes synchronously via node:fs:
		// it writes the new contents to a temp file, then renames that temp file
		// onto the real settings path. So writeFileSync must only ever target a
		// path other than the settings file, and the real path only changes via
		// renameSync. Wrap the module-level node:fs spies (mock.module) — the
		// write goes through node:fs, not fs/promises.
		const writeSyncTargets = []
		writeFileSyncSpy.callsFake((...args) => {
			writeSyncTargets.push(String(args[0]))
			return realWriteFileSync(...args)
		})
		const renameTargets = []
		renameSyncSpy.callsFake((...args) => {
			renameTargets.push(String(args[1]))
			return realRenameSync(...args)
		})
		await hub.deleteServerRPC("alpha")
		// Some writeFileSync call produced the new settings, but never in place.
		writeSyncTargets.length.should.be.greaterThan(0)
		writeSyncTargets.every((target) => target !== settingsPath).should.be.true()
		// The real settings path only ever appears as a rename destination.
		renameTargets.includes(settingsPath).should.be.true()
		// The final file is complete and correct.
		const persisted = JSON.parse(await fs.readFile(settingsPath, "utf-8"))
		Object.keys(persisted.mcpServers).should.deepEqual(["beta"])
	})
	it("pre-seeds the connection fingerprint so the watcher skips its own write", async () => {
		await writeSettings({ alpha: { type: "stdio", command: "a" }, beta: { type: "stdio", command: "b" } })
		await hub.deleteServerRPC("alpha")
		// After the write, lastConnectionFingerprint reflects the just-written,
		// schema-validated content, so the watcher's "change" event for our own
		// write is a no-op. Read the file back through the same validating reader
		// the implementation uses so the expected fingerprint includes the schema
		// defaults (autoApprove, timeout) the impl seeds.
		const validated = await hub.readAndValidateMcpSettingsFile()
		const expected = hub.computeConnectionFingerprint(validated.mcpServers)
		hub.lastConnectionFingerprint.should.equal(expected)
	})
	it("throws when the server is not found", async () => {
		await writeSettings({ beta: { type: "stdio", command: "b" } })
		let threw
		try {
			await hub.deleteServerRPC("missing")
		} catch (err) {
			threw = err
		}
		;(threw === undefined).should.be.false()
		threw.message.should.match(/not found in MCP configuration/)
	})
})
//# sourceMappingURL=McpHub.deleteServerRPC.test.js.map
