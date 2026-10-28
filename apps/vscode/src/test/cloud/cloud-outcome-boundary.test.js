import { SessionSource } from "@cline/core"
import { afterEach, describe, expect, it, vi } from "vitest"
import { HostProvider } from "@/hosts/host-provider"
import { CloudSessionHost } from "@/sdk/cloud-session-host"
import { MessageIdMinter } from "@/sdk/message-id-minter"
import { SdkCloudSessionCoordinator } from "@/sdk/sdk-cloud-session-coordinator"
import { sessionHistoryRecordToHistoryItem } from "@/sdk/sdk-task-history"
import { CloudSessionsService } from "@/services/cloud/CloudSessionsService"
import { startLocalCloudEnvironment } from "./local-cloud-environment"

// Only the IDE window and model-catalog refresh are replaced; transport, runtime,
// status tracking, registry and History conversion are the shipped implementations.
vi.mock("@/hosts/host-provider", () => ({ HostProvider: { window: { showMessage: vi.fn(async () => ({})) } } }))
vi.mock("@/core/controller/models/refreshClineRecommendedModels", () => ({ refreshClineRecommendedModels: vi.fn() }))
function deferred() {
	let resolve
	const promise = new Promise((done) => {
		resolve = done
	})
	return { promise, resolve }
}
describe("cloud outcome → History and notifications through a real Hub", () => {
	let environment
	let coordinator
	let release
	let unsubscribeEnded
	afterEach(async () => {
		release?.()
		unsubscribeEnded?.()
		unsubscribeEnded = undefined
		await coordinator?.dispose()
		await environment?.dispose()
		vi.restoreAllMocks()
		vi.clearAllMocks()
	})
	it.each(["completed", "cancelled", "unknown"])("projects %s without fabricating completion", async (outcome) => {
		const modelEntered = deferred()
		const modelReleased = deferred()
		release = () => modelReleased.resolve()
		environment = await startLocalCloudEnvironment({
			beforeModelResponse: async (signal) => {
				modelEntered.resolve()
				if (signal?.aborted) throw signal.reason
				await new Promise((resolve, reject) => {
					const aborted = () => reject(signal?.reason)
					signal?.addEventListener("abort", aborted, { once: true })
					void modelReleased.promise.then(() => {
						signal?.removeEventListener("abort", aborted)
						resolve()
					})
				})
			},
		})
		const service = new CloudSessionsService({
			apiBaseUrl: environment.apiBaseUrl,
			appBaseUrl: environment.apiBaseUrl,
			getAuthToken: async () => environment?.accessToken,
			getActiveOrganizationId: () => undefined,
		})
		const record = await service.createSession({ modelId: "fixture-model", repoUrl: "https://github.com/cline/fixture" })
		const owned = await environment.activateSession(record.id)
		const connect = CloudSessionHost.connect.bind(CloudSessionHost)
		let host
		const statuses = []
		const completed = deferred()
		vi.spyOn(CloudSessionHost, "connect").mockImplementation(async (options) => {
			host = await connect({
				...options,
				workspaceRoot: owned.root,
				onStatusChange: (status) => {
					statuses.push(status)
					options.onStatusChange?.(status)
					if (status === "completed") completed.resolve()
				},
			})
			return host
		})
		let task
		const options = {
			cloudSessions: service,
			stateManager: { getGlobalSettingsKey: () => "act", getGlobalStateKey: () => ({}), setGlobalState: vi.fn() },
			sessionConfigBuilder: { build: vi.fn() },
			sessions: { attachExistingSession: vi.fn() },
			messages: { finalizeMessagesForSave: (messages) => messages },
			getMinter: () => new MessageIdMinter(),
			getTask: () => task,
			setTask: (next) => {
				task = next
			},
			clearTask: async () => {
				task = undefined
				return () => false
			},
			claimTaskViewGeneration: () => () => false,
			getAuthToken: async () => environment?.accessToken,
			isSignedIn: () => true,
			isEnabled: () => true,
			resetMessageTranslator: vi.fn(),
			setTurnPhase: vi.fn(),
			postStateToWebview: vi.fn(async () => {}),
			invalidateHistoryCache: vi.fn(),
			onAskResponse: vi.fn(),
			onCancelTask: vi.fn(),
		}
		coordinator = new SdkCloudSessionCoordinator(options)
		await coordinator.openCloudTask(record.id)
		await host.start({
			source: SessionSource.VSCODE,
			config: {
				providerId: "cline",
				modelId: "fixture-model",
				apiKey: "fixture-key",
				systemPrompt: "Cline test guidance",
				enableTools: false,
				enableSpawnAgent: false,
				enableAgentTeams: false,
				cwd: owned.root,
				workspaceRoot: owned.root,
			},
		})
		const ended = deferred()
		unsubscribeEnded = host.subscribe((event) => {
			if (event.type === "ended" && event.payload.sessionId === record.id) ended.resolve()
		})
		options.setTask(undefined)
		const sending = host.send({ sessionId: record.id, prompt: "wait for the barrier" })
		// Attach rejection handling before deliberately severing the transport.
		const settled = sending.then(
			() => undefined,
			(error) => error,
		)
		await modelEntered.promise
		expect(host.status).toBe("running")
		if (outcome === "cancelled") {
			await host.abort(record.id)
			await settled
		} else if (outcome === "unknown") {
			environment.disconnectClients()
			expect(await settled).toBeInstanceOf(Error)
			// A fresh real Hub snapshot proves the disconnected sandbox is still busy.
			expect(await host.get(record.id)).toMatchObject({ status: "running" })
		} else {
			modelReleased.resolve()
			await sending
		}
		expect(host.status).toBe(outcome)
		const history = (await coordinator.listHistoryRecords())[0]
		expect(history.status).toBe(outcome === "unknown" ? "pending" : outcome)
		expect(history.exitCode).toBe(outcome === "completed" ? 0 : undefined)
		expect(sessionHistoryRecordToHistoryItem(history).cloudStatus).toBe(outcome)
		if (outcome === "completed") {
			expect(HostProvider.window.showMessage).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ message: expect.stringContaining("Cloud task finished") }),
			)
		} else {
			expect(HostProvider.window.showMessage).not.toHaveBeenCalled()
		}
		if (outcome === "unknown") {
			modelReleased.resolve()
			await completed.promise
			expect(host.status).toBe("completed")
			expect(statuses).toContain("unknown")
			// The UI completion event precedes server persistence and workspace cleanup.
			await ended.promise
		}
	})
})
//# sourceMappingURL=cloud-outcome-boundary.test.js.map
