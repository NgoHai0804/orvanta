import { beforeEach, describe, expect, it, vi } from "vitest"

const {
	scenarios,
	prepareRemoteConfigCoreIntegration,
	clearMaterializedRemoteConfigRuntime,
	applyRemoteConfig,
	clearRemoteConfig,
	captureRemoteConfigRefresh,
} = vi.hoisted(() => ({
	scenarios: [],
	prepareRemoteConfigCoreIntegration: vi.fn(),
	clearMaterializedRemoteConfigRuntime: vi.fn(),
	applyRemoteConfig: vi.fn(),
	clearRemoteConfig: vi.fn(),
	captureRemoteConfigRefresh: vi.fn(),
}))
vi.mock("@cline/core", () => ({ prepareRemoteConfigCoreIntegration }))
vi.mock("@cline/shared", () => ({ clearMaterializedRemoteConfigRuntime }))
vi.mock("@/services/telemetry", () => ({ telemetryService: { captureRemoteConfigRefresh } }))
vi.mock("./utils", () => ({ applyRemoteConfig, clearRemoteConfig }))
vi.mock("./sdk-control-plane", () => ({
	SdkRemoteConfigControlPlane: class {
		scenario = scenarios.shift()
		getLastRemoteConfig() {
			return this.scenario?.remoteConfig
		}
		getLastConfiguredKeys() {
			return {}
		}
		wasExplicitNoConfig() {
			return this.scenario?.explicitNoConfig ?? false
		}
		isRemoteConfigAvailable() {
			return Boolean(this.scenario?.remoteConfig)
		}
	},
}))

import { clearSdkRemoteConfig, refreshSdkRemoteConfig } from "./sdk-refresh"

function deferred() {
	let resolve
	let reject
	const promise = new Promise((resolvePromise, rejectPromise) => {
		resolve = resolvePromise
		reject = rejectPromise
	})
	return { promise, resolve, reject }
}
function integration(version) {
	return {
		prepared: { bundle: { version, remoteConfig: { version } } },
		dispose: vi.fn().mockResolvedValue(undefined),
	}
}
function makeController(initialVersion = "existing") {
	let currentIntegration = integration(initialVersion)
	const setRemoteConfigCoreIntegration = vi.fn(async (next) => {
		currentIntegration = next
	})
	return {
		controller: {
			authService: { getActiveOrganizationId: () => "org-current" },
			mcpHub: {},
			stateManager: { setGlobalState: vi.fn() },
			setRemoteConfigAvailable: vi.fn(),
			postStateToWebview: vi.fn().mockResolvedValue(undefined),
			setRemoteConfigCoreIntegration,
		},
		setRemoteConfigCoreIntegration,
		getCurrentIntegration: () => currentIntegration,
	}
}
describe("refreshSdkRemoteConfig", () => {
	beforeEach(() => {
		scenarios.length = 0
		prepareRemoteConfigCoreIntegration.mockReset().mockImplementation(({ controlPlane }) => controlPlane.scenario.preparation)
		applyRemoteConfig.mockReset().mockResolvedValue(undefined)
		clearRemoteConfig.mockReset()
		clearMaterializedRemoteConfigRuntime.mockReset().mockResolvedValue(undefined)
		captureRemoteConfigRefresh.mockReset()
	})
	it("awaits telemetry cleanup before publishing a cleared integration", async () => {
		const cleanup = deferred()
		const started = deferred()
		clearRemoteConfig.mockImplementation(() => {
			started.resolve()
			return cleanup.promise
		})
		const { controller, setRemoteConfigCoreIntegration } = makeController()
		const clearing = clearSdkRemoteConfig(controller, { workspacePath: "/tmp/remote-config-test" })
		await started.promise
		expect(setRemoteConfigCoreIntegration).not.toHaveBeenCalled()
		cleanup.resolve()
		await clearing
		expect(setRemoteConfigCoreIntegration).toHaveBeenCalledWith(undefined)
	})
	it("does not let an older response overwrite a newer published integration", async () => {
		const older = deferred()
		const newer = deferred()
		scenarios.push(
			{ preparation: older.promise, remoteConfig: { version: "older" } },
			{ preparation: newer.promise, remoteConfig: { version: "newer" } },
		)
		const { controller, getCurrentIntegration } = makeController()
		let currentGeneration = 1
		const firstRefresh = refreshSdkRemoteConfig(controller, {
			workspacePath: "/workspace",
			isCurrent: () => currentGeneration === 1,
		})
		currentGeneration = 2
		const secondRefresh = refreshSdkRemoteConfig(controller, {
			workspacePath: "/workspace",
			isCurrent: () => currentGeneration === 2,
		})
		const newerIntegration = integration("newer")
		newer.resolve(newerIntegration)
		await secondRefresh
		const olderIntegration = integration("older")
		older.resolve(olderIntegration)
		await firstRefresh
		expect(olderIntegration.dispose).toHaveBeenCalledOnce()
		expect(getCurrentIntegration()).toBe(newerIntegration)
	})
	it("applies compatibility state before publishing the SDK integration", async () => {
		const candidate = integration("current")
		scenarios.push({ preparation: Promise.resolve(candidate), remoteConfig: { version: "current" } })
		const { controller, setRemoteConfigCoreIntegration } = makeController()
		await refreshSdkRemoteConfig(controller, { workspacePath: "/workspace" })
		expect(applyRemoteConfig).toHaveBeenCalledOnce()
		expect(setRemoteConfigCoreIntegration).toHaveBeenCalledWith(candidate)
		expect(applyRemoteConfig.mock.invocationCallOrder[0]).toBeLessThan(
			setRemoteConfigCoreIntegration.mock.invocationCallOrder[0],
		)
		expect(captureRemoteConfigRefresh).toHaveBeenCalledWith(
			expect.objectContaining({ outcome: "applied", managed: true, configVersion: "current" }),
		)
		expect(controller.stateManager.setGlobalState).toHaveBeenCalledWith("lastManagedOrganizationId", "org-current")
	})
	it("preserves the previous integration and disposes the candidate when compatibility application fails", async () => {
		const candidate = integration("candidate")
		scenarios.push({ preparation: Promise.resolve(candidate), remoteConfig: { version: "candidate" } })
		applyRemoteConfig.mockRejectedValueOnce(new Error("compatibility bridge failed"))
		const { controller, setRemoteConfigCoreIntegration, getCurrentIntegration } = makeController("last-known-good")
		const previous = getCurrentIntegration()
		await refreshSdkRemoteConfig(controller, { workspacePath: "/workspace" })
		expect(getCurrentIntegration()).toBe(previous)
		expect(setRemoteConfigCoreIntegration).not.toHaveBeenCalled()
		expect(candidate.dispose).toHaveBeenCalledOnce()
		expect(controller.postStateToWebview).not.toHaveBeenCalled()
	})
	it("serializes compatibility application so a newer generation leaves the final state", async () => {
		const olderApplyStarted = deferred()
		const finishOlderApply = deferred()
		applyRemoteConfig.mockImplementation(async (remoteConfig) => {
			if (remoteConfig.version === "older") {
				olderApplyStarted.resolve()
				await finishOlderApply.promise
			}
		})
		const olderIntegration = integration("older")
		const newerIntegration = integration("newer")
		scenarios.push(
			{ preparation: Promise.resolve(olderIntegration), remoteConfig: { version: "older" } },
			{ preparation: Promise.resolve(newerIntegration), remoteConfig: { version: "newer" } },
		)
		const { controller, getCurrentIntegration } = makeController("initial")
		let currentGeneration = 1
		const olderRefresh = refreshSdkRemoteConfig(controller, {
			workspacePath: "/workspace",
			isCurrent: () => currentGeneration === 1,
		})
		await olderApplyStarted.promise
		currentGeneration = 2
		const newerRefresh = refreshSdkRemoteConfig(controller, {
			workspacePath: "/workspace",
			isCurrent: () => currentGeneration === 2,
		})
		await Promise.resolve()
		expect(applyRemoteConfig).toHaveBeenCalledTimes(1)
		finishOlderApply.resolve()
		await Promise.all([olderRefresh, newerRefresh])
		expect(applyRemoteConfig.mock.calls.map(([config]) => config.version)).toEqual(["older", "newer"])
		expect(olderIntegration.dispose).toHaveBeenCalledOnce()
		expect(getCurrentIntegration()).toBe(newerIntegration)
	})
	it("disposes a superseded candidate without publishing either state", async () => {
		const candidate = integration("stale")
		scenarios.push({ preparation: Promise.resolve(candidate), remoteConfig: { version: "stale" } })
		const { controller, setRemoteConfigCoreIntegration, getCurrentIntegration } = makeController("current")
		const previous = getCurrentIntegration()
		await refreshSdkRemoteConfig(controller, { workspacePath: "/workspace", isCurrent: () => false })
		expect(candidate.dispose).toHaveBeenCalledOnce()
		expect(applyRemoteConfig).not.toHaveBeenCalled()
		expect(setRemoteConfigCoreIntegration).not.toHaveBeenCalled()
		expect(getCurrentIntegration()).toBe(previous)
		expect(controller.postStateToWebview).not.toHaveBeenCalled()
	})
	it("does not clear current state when a superseded request reports no config", async () => {
		scenarios.push({ preparation: Promise.reject(new Error("stale no-config")), explicitNoConfig: true })
		const { controller, setRemoteConfigCoreIntegration, getCurrentIntegration } = makeController("current")
		const previous = getCurrentIntegration()
		await refreshSdkRemoteConfig(controller, { workspacePath: "/workspace", isCurrent: () => false })
		expect(clearRemoteConfig).not.toHaveBeenCalled()
		expect(setRemoteConfigCoreIntegration).not.toHaveBeenCalled()
		expect(getCurrentIntegration()).toBe(previous)
	})
	it("preserves the previous integration after a transient preparation failure", async () => {
		scenarios.push({ preparation: Promise.reject(new Error("temporary network failure")) })
		const { controller, setRemoteConfigCoreIntegration, getCurrentIntegration } = makeController("last-known-good")
		const previous = getCurrentIntegration()
		await refreshSdkRemoteConfig(controller, { workspacePath: "/workspace" })
		expect(getCurrentIntegration()).toBe(previous)
		expect(setRemoteConfigCoreIntegration).not.toHaveBeenCalled()
		expect(clearRemoteConfig).not.toHaveBeenCalled()
		expect(clearMaterializedRemoteConfigRuntime).not.toHaveBeenCalled()
	})
	it("disposes an empty prepared candidate and clears both states", async () => {
		const candidate = integration("empty")
		scenarios.push({ preparation: Promise.resolve(candidate) })
		const { controller, setRemoteConfigCoreIntegration, getCurrentIntegration } = makeController()
		await refreshSdkRemoteConfig(controller, { workspacePath: "/workspace" })
		expect(candidate.dispose).toHaveBeenCalledOnce()
		expect(clearRemoteConfig).toHaveBeenCalledOnce()
		expect(clearMaterializedRemoteConfigRuntime).toHaveBeenCalledWith({ workspacePath: "/workspace" })
		expect(setRemoteConfigCoreIntegration).toHaveBeenCalledWith(undefined)
		expect(getCurrentIntegration()).toBeUndefined()
		expect(controller.postStateToWebview).toHaveBeenCalledOnce()
	})
	it("clears SDK and compatibility state after explicit no-config", async () => {
		scenarios.push({
			preparation: Promise.reject(new Error("no bundle")),
			explicitNoConfig: true,
		})
		const { controller, setRemoteConfigCoreIntegration, getCurrentIntegration } = makeController()
		await refreshSdkRemoteConfig(controller, { workspacePath: "/workspace" })
		expect(clearRemoteConfig).toHaveBeenCalledOnce()
		expect(clearMaterializedRemoteConfigRuntime).toHaveBeenCalledWith({ workspacePath: "/workspace" })
		expect(setRemoteConfigCoreIntegration).toHaveBeenCalledWith(undefined)
		expect(getCurrentIntegration()).toBeUndefined()
		expect(controller.postStateToWebview).toHaveBeenCalledOnce()
	})
	it("still clears state and reports success when file cleanup fails on the cleared path", async () => {
		scenarios.push({ preparation: Promise.reject(new Error("no bundle")), explicitNoConfig: true })
		clearMaterializedRemoteConfigRuntime.mockRejectedValueOnce(new Error("EACCES: permission denied"))
		const { controller, setRemoteConfigCoreIntegration, getCurrentIntegration } = makeController()
		const refreshed = await refreshSdkRemoteConfig(controller, { workspacePath: "/workspace" })
		expect(refreshed).toBe(true)
		expect(clearRemoteConfig).toHaveBeenCalledOnce()
		expect(setRemoteConfigCoreIntegration).toHaveBeenCalledWith(undefined)
		expect(getCurrentIntegration()).toBeUndefined()
	})
	it("clearSdkRemoteConfig clears state and integration even when file cleanup fails", async () => {
		clearMaterializedRemoteConfigRuntime.mockRejectedValueOnce(new Error("EACCES: permission denied"))
		const { controller, getCurrentIntegration } = makeController("signed-in")
		await clearSdkRemoteConfig(controller, { workspacePath: "/workspace", organizationId: "org-current" })
		expect(clearRemoteConfig).toHaveBeenCalledWith("org-current")
		expect(getCurrentIntegration()).toBeUndefined()
		expect(controller.setRemoteConfigAvailable).toHaveBeenCalledWith(false)
	})
})
//# sourceMappingURL=sdk-refresh.test.js.map
