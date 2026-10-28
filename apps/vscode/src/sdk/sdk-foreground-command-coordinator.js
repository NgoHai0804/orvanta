/**
 * Tracks in-flight foreground (VS Code terminal) command executions so the
 * "Proceed While Running" button can detach them: each pending tool call
 * returns with its partial output while the command keeps running in the
 * user's terminal, streaming further output to a log file.
 *
 * Owned by SdkController so it outlives session rebuilds (which recreate the
 * tool set and its reused executor closure). Handles are registered per tool
 * invocation — never on the reused executor — so parallel commands in one
 * tool call each get their own handle and log file.
 */
import { Logger } from "@/shared/services/Logger"
export class SdkForegroundCommandCoordinator {
	options
	handles = new Set()
	constructor(options = {}) {
		this.options = options
	}
	/** Whether any foreground command is currently awaited by a tool call. */
	get isRunning() {
		return this.handles.size > 0
	}
	/**
	 * Track one in-flight foreground execution. Returns an unregister
	 * function the caller must invoke when the execution settles (completes,
	 * fails, aborts, or detaches) — typically from a `finally` block.
	 */
	register(handle) {
		const wasRunning = this.isRunning
		this.handles.add(handle)
		this.notifyIfChanged(wasRunning)
		return () => {
			const wasRunningBefore = this.isRunning
			if (this.handles.delete(handle)) {
				this.notifyIfChanged(wasRunningBefore)
			}
		}
	}
	/**
	 * Detach every in-flight foreground command ("Proceed While Running").
	 * Each pending tool execution resolves with its partial output and log
	 * file path; the commands keep running in their terminals.
	 *
	 * @returns the number of commands detached (0 when none were running).
	 */
	proceedWhileRunning() {
		const handles = [...this.handles]
		for (const handle of handles) {
			try {
				handle.detach()
			} catch (error) {
				Logger.error("[ForegroundCommands] Failed to detach foreground command:", error)
			}
		}
		return handles.length
	}
	notifyIfChanged(wasRunning) {
		if (this.isRunning !== wasRunning) {
			this.options.onRunningChanged?.(this.isRunning)
		}
	}
}
//# sourceMappingURL=sdk-foreground-command-coordinator.js.map
