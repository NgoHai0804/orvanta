/**
 * Enum defining different reasons why a user might be logged out
 * Used for telemetry tracking to understand logout patterns
 *
 * Single source for the user.auth_logged_out reason vocabulary — the SDK
 * auth service (src/sdk/auth-service.ts) re-exports this enum.
 */
export var LogoutReason
;((LogoutReason) => {
	/** User explicitly clicked logout button in UI */
	LogoutReason["USER_INITIATED"] = "user_initiated"
	/** Auth tokens were cleared in another VSCode window (cross-window sync) */
	LogoutReason["CROSS_WINDOW_SYNC"] = "cross_window_sync"
	/** Auth provider encountered an error and cleared tokens */
	LogoutReason["ERROR_RECOVERY"] = "error_recovery"
	/**
	 * Refresh token rejected as invalid/expired — a real involuntary logout.
	 * For the SDK auth service this value is emitted by the SDK credential
	 * resolver (getValidClineCredentials), the single owner of that event.
	 */
	LogoutReason["TOKEN_INVALID"] = "token_invalid"
	/** Restoring the stored session on activation threw an unexpected error */
	LogoutReason["RESTORE_ERROR"] = "restore_error"
	/** Unknown or unspecified reason */
	LogoutReason["UNKNOWN"] = "unknown"
})(LogoutReason || (LogoutReason = {}))
//# sourceMappingURL=types.js.map
