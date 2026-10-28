import { CommandExitError, CommandSpawnError, CommandTerminationError } from "@cline/core"
/**
 * Classifies the error a background executor rejected with, so a failure that
 * produced no exit code is still labelled in `task.terminal_execution`. Without
 * this, "the shell is missing" was indistinguishable from an abort or a
 * closed terminal in the same success=false bucket.
 */
export function describeBackgroundFailure(error) {
	if (error instanceof CommandExitError) {
		return { exitCode: error.exitCode }
	}
	if (error instanceof CommandTerminationError) {
		return { errorCode: error.signal ? "signal" : "no_exit_code" }
	}
	if (error instanceof CommandSpawnError) {
		// spawn says ENOENT for a missing executable and for a missing working
		// directory alike; the error already checked which, so keep them apart.
		if (error.missing === "cwd") {
			return { errorCode: "ENOENT_CWD" }
		}
		return { errorCode: error.code ?? "spawn" }
	}
	if (error instanceof Error && (error.name === "AbortError" || /\baborted\b/i.test(error.message))) {
		return { errorCode: "aborted" }
	}
	return { errorCode: "other" }
}
//# sourceMappingURL=background-failure.js.map
