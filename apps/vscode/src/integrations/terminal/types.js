/**
 * Shared terminal process types for the VSCode foreground terminal manager.
 *
 * These types describe the event/process surface implemented by
 * `VscodeTerminalProcess` and consumed by `VscodeTerminalManager`. The
 * standalone (CLI/JetBrains) terminal manager was removed — those hosts run
 * commands through the SDK's built-in `run_commands` (child_process) tool.
 */
/** Derive cleanup and reporting policy from the same unobserved-command snapshot. */
export function getUnobservedTerminalCommandDisposition(command) {
	return command.source === "sendText" && command.ownership === "managed" ? "disposeBeforeNextTerminalAcquisition" : "preserve"
}
//# sourceMappingURL=types.js.map
