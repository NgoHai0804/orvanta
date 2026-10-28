/**
 * Reads the current conversation of a session. The persisted transcript is
 * written after Core reports a turn done, so a host that tracks live
 * sessions is asked for the in-memory conversation first; the persisted
 * transcript is the answer for a host that does not, or for a session that
 * is no longer resident. Every reader that maps a visible message to its
 * position in the conversation must use this, so that a lookup and the edit
 * it enables agree on which messages exist.
 */
export function readCurrentMessages(sessionHost, sessionId) {
	return sessionHost.readLiveMessages?.(sessionId) ?? sessionHost.readMessages(sessionId)
}
//# sourceMappingURL=session-host.js.map
