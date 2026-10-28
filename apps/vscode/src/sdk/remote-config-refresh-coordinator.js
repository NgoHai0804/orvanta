export class RemoteConfigRefreshCoordinator {
	performRefresh
	generation = 0
	inFlight
	constructor(performRefresh) {
		this.performRefresh = performRefresh
	}
	refresh(identity, options = {}) {
		// force: callers that just mutated refresh inputs (toggles, opt-out) must
		// not coalesce onto an in-flight run that already sampled the old values.
		if (!options.force && this.inFlight?.identity === identity) {
			return this.inFlight.promise
		}
		const generation = ++this.generation
		const promise = this.performRefresh(() => generation === this.generation).finally(() => {
			if (this.inFlight?.promise === promise) {
				this.inFlight = undefined
			}
		})
		this.inFlight = { identity, promise }
		return promise
	}
	/**
	 * Marks any in-flight refresh stale without starting a new one. Used by
	 * authoritative local clears (sign-out) so a refresh that already fetched
	 * under the old identity cannot republish the state being cleared.
	 */
	invalidate() {
		this.generation += 1
		this.inFlight = undefined
	}
}
//# sourceMappingURL=remote-config-refresh-coordinator.js.map
