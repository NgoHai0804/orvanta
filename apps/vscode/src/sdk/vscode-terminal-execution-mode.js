/**
 * True when running as the standalone (JetBrains/CLI) build. Statically rewritten
 * by esbuild to the literal string "true"/"false" (see esbuild.mjs); compare with
 * strict string equality since the string "false" is truthy in JS.
 */
export function isStandaloneHost() {
	return process.env.IS_STANDALONE === "true"
}
/**
 * Clamps a requested terminal execution mode to `backgroundExec` when the current
 * host cannot support real VS Code terminals (i.e. the standalone build).
 */
export function getEffectiveTerminalExecutionMode(requested) {
	if (requested === "vscodeTerminal" && isStandaloneHost()) {
		return "backgroundExec"
	}
	return requested
}
//# sourceMappingURL=vscode-terminal-execution-mode.js.map
