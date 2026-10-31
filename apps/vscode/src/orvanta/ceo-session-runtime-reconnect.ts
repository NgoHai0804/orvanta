/**
 * Tracks live CEO-session → SDK session bindings so a VS Code reload/reopen
 * reconnects instead of starting a duplicate team runtime.
 */

export interface CeoRuntimeBinding {
	orvantaSessionId: string
	sdkSessionId: string
	registeredAt: number
}

const liveByCeoSession = new Map<string, CeoRuntimeBinding>()

export function registerCeoSessionRuntime(binding: { orvantaSessionId: string; sdkSessionId: string }): CeoRuntimeBinding {
	const orvantaSessionId = binding.orvantaSessionId.trim()
	const sdkSessionId = binding.sdkSessionId.trim()
	if (!orvantaSessionId || !sdkSessionId) {
		throw new Error("orvantaSessionId and sdkSessionId are required")
	}
	const record: CeoRuntimeBinding = {
		orvantaSessionId,
		sdkSessionId,
		registeredAt: Date.now(),
	}
	liveByCeoSession.set(orvantaSessionId, record)
	return record
}

export function unregisterCeoSessionRuntime(orvantaSessionId: string): void {
	const id = orvantaSessionId.trim()
	if (id) liveByCeoSession.delete(id)
}

export function unregisterCeoSessionRuntimeBySdkSessionId(sdkSessionId: string): void {
	const id = sdkSessionId.trim()
	if (!id) return
	for (const [ceoId, binding] of liveByCeoSession) {
		if (binding.sdkSessionId === id) {
			liveByCeoSession.delete(ceoId)
		}
	}
}

export function getLiveCeoSessionRuntime(orvantaSessionId: string): CeoRuntimeBinding | undefined {
	return liveByCeoSession.get(orvantaSessionId.trim())
}

/**
 * If a live binding exists for this CEO session, return it (reconnect — do not
 * start a duplicate). Otherwise return undefined so the caller may start/recover.
 */
export function adoptLiveCeoSessionRuntime(input: {
	orvantaSessionId: string
	sdkSessionId?: string
}): { mode: "reconnect"; binding: CeoRuntimeBinding } | { mode: "start" } {
	const id = input.orvantaSessionId.trim()
	if (!id) return { mode: "start" }
	const existing = liveByCeoSession.get(id)
	if (!existing) return { mode: "start" }
	// Same CEO session already has a live SDK runtime — never start a second one.
	if (input.sdkSessionId?.trim() && input.sdkSessionId.trim() !== existing.sdkSessionId) {
		return { mode: "reconnect", binding: existing }
	}
	return { mode: "reconnect", binding: existing }
}

/** Test helper — clear registry between cases. */
export function __resetCeoSessionRuntimeRegistryForTests(): void {
	liveByCeoSession.clear()
}
