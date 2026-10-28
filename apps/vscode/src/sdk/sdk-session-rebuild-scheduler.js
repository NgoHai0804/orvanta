import { Logger } from "@/shared/services/Logger"

/**
 * A rebuild replaces the session, so it may only run between turns. Core
 * drains its own prompt queue the moment a turn ends, so a session with
 * queued prompts is about to run again: treat it as busy until Core has
 * emptied the queue.
 */
function isIdle(session) {
	return session !== undefined && !session.isRunning && session.queuedPromptCount === 0
}
/** Serializes passive session rebuilds and drains them only while the session is idle (see isIdle). */
export class SdkSessionRebuildScheduler {
	options
	pending = new Map()
	drainInFlight
	latestGeneration = new Map()
	constructor(options) {
		this.options = options
	}
	/**
	 * Queues a rebuild, replacing any queued rebuild for the same reason. A
	 * rebuild for the same reason that is already running is superseded: its
	 * context.isCurrent() turns false and this request runs after it.
	 */
	request(reason, run) {
		const generation = (this.latestGeneration.get(reason) ?? 0) + 1
		this.latestGeneration.set(reason, generation)
		this.pending.set(reason, { run, generation })
		this.drainIfIdle()
	}
	async runExclusive(operation) {
		while (this.drainInFlight) {
			await this.drainInFlight
		}
		let resolveExclusive = () => {}
		const exclusive = new Promise((resolve) => {
			resolveExclusive = resolve
		})
		this.drainInFlight = exclusive
		try {
			return await operation()
		} finally {
			resolveExclusive()
			if (this.drainInFlight === exclusive) {
				this.drainInFlight = undefined
			}
			this.drainIfIdle()
		}
	}
	/**
	 * Moves the displayed task at the session-rebuild consistency boundary.
	 * Queued rebuilds belong to the outgoing session, so the transition drops
	 * them before ending that session. Rebuilds requested during the transition
	 * remain queued until the new task view is complete.
	 */
	async runTaskTransition(operation) {
		return this.runExclusive(async () => {
			this.pending.clear()
			return operation()
		})
	}
	sessionBecameIdle() {
		this.drainIfIdle()
	}
	drainIfIdle() {
		const activeSession = this.options.sessions.getActiveSession()
		if (this.drainInFlight || this.pending.size === 0 || !activeSession || !isIdle(activeSession)) {
			return
		}
		// Cloud sessions run on the sandbox with its own tools/provider; local
		// MCP, provider and terminal changes do not apply and must not rebuild
		// the sandbox conversation into a local one.
		if (activeSession.sdkHost && "isCloud" in activeSession.sdkHost) {
			this.pending.clear()
			return
		}
		const drain = async () => {
			while (this.pending.size > 0) {
				const activeSession = this.options.sessions.getActiveSession()
				if (!activeSession) {
					this.pending.clear()
					return
				}
				if (!isIdle(activeSession)) {
					return
				}
				const next = this.pending.entries().next().value
				if (!next) {
					return
				}
				const [reason, rebuild] = next
				this.pending.delete(reason)
				try {
					await rebuild.run({ isCurrent: () => rebuild.generation === this.latestGeneration.get(reason) })
				} catch (error) {
					Logger.error(`[SdkController] Failed scheduled ${reason} session rebuild:`, error)
				}
			}
		}
		this.drainInFlight = drain().finally(() => {
			this.drainInFlight = undefined
			this.drainIfIdle()
		})
	}
}
//# sourceMappingURL=sdk-session-rebuild-scheduler.js.map
