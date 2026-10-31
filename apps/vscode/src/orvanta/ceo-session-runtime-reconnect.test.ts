import { afterEach, describe, expect, it } from "vitest"
import {
	__resetCeoSessionRuntimeRegistryForTests,
	adoptLiveCeoSessionRuntime,
	getLiveCeoSessionRuntime,
	registerCeoSessionRuntime,
	unregisterCeoSessionRuntime,
} from "./ceo-session-runtime-reconnect"

describe("ceo-session-runtime-reconnect", () => {
	afterEach(() => {
		__resetCeoSessionRuntimeRegistryForTests()
	})

	it("reconnects to the live binding instead of starting a duplicate", () => {
		registerCeoSessionRuntime({
			orvantaSessionId: "ceo_1",
			sdkSessionId: "sdk_abc",
		})
		const first = adoptLiveCeoSessionRuntime({ orvantaSessionId: "ceo_1" })
		expect(first).toEqual({
			mode: "reconnect",
			binding: expect.objectContaining({
				orvantaSessionId: "ceo_1",
				sdkSessionId: "sdk_abc",
			}),
		})
		const clash = adoptLiveCeoSessionRuntime({
			orvantaSessionId: "ceo_1",
			sdkSessionId: "sdk_other",
		})
		expect(clash.mode).toBe("reconnect")
		if (clash.mode === "reconnect") {
			expect(clash.binding.sdkSessionId).toBe("sdk_abc")
		}
	})

	it("allows start when no live runtime is registered", () => {
		expect(adoptLiveCeoSessionRuntime({ orvantaSessionId: "ceo_new" })).toEqual({
			mode: "start",
		})
	})

	it("unregisters so a later open may start fresh after runtime death", () => {
		registerCeoSessionRuntime({
			orvantaSessionId: "ceo_1",
			sdkSessionId: "sdk_abc",
		})
		unregisterCeoSessionRuntime("ceo_1")
		expect(getLiveCeoSessionRuntime("ceo_1")).toBeUndefined()
		expect(adoptLiveCeoSessionRuntime({ orvantaSessionId: "ceo_1" }).mode).toBe("start")
	})
})
