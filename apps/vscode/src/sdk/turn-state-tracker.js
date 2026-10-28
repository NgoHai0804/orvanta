// Authoritative UI-mode tracker for the current agent turn.
//
// The backend knows the true phase at every SDK lifecycle point (it drives the session and owns
// every interaction promise), so it sets the phase explicitly here rather than letting the
// webview infer it from the tail of the message array. The webview renders
// footer/buttons/thinking from this.
//
// Each transition stamps a fresh `seq` from the shared minter so the webview keeps only the
// newest TurnState and ignores stale/out-of-order ones (a late "streaming" can never overwrite
// a newer "completed").
export class TurnStateTracker {
	minter
	phase = "idle"
	anchorTs
	seq
	constructor(minter) {
		this.minter = minter
		this.seq = minter.nextSeq()
	}
	/** Set the phase (and optional anchor message ts), advancing seq. No-op metadata if unchanged. */
	set(phase, anchorTs) {
		this.phase = phase
		this.anchorTs = anchorTs
		this.seq = this.minter.nextSeq()
	}
	/** Current immutable snapshot for inclusion in the state payload. */
	get() {
		return { phase: this.phase, anchorTs: this.anchorTs, seq: this.seq }
	}
	get currentPhase() {
		return this.phase
	}
}
//# sourceMappingURL=turn-state-tracker.js.map
