import { buildSessionConfig } from "./cline-session-factory"
import { buildAgentHooks } from "./hooks-adapter"
/**
 * Unlike the CLI interactive runtime, plan-mode sessions do NOT expose a
 * switch_to_act_mode tool: matching the legacy extension, the model cannot
 * switch modes itself and must ask the user to flip the Plan/Act toggle. The
 * plan-mode system prompt (planModeSwitchTool: false in the session factory)
 * carries the matching instructions.
 */
export class SdkSessionConfigBuilder {
	options
	constructor(options) {
		this.options = options
	}
	async build(input) {
		const config = await buildSessionConfig(input)
		if (this.options.onConsecutiveMistakeLimitReached) {
			config.onConsecutiveMistakeLimitReached = this.options.onConsecutiveMistakeLimitReached
		}
		config.hooks = buildAgentHooks(this.options.stateManager, this.options.emitHookMessage, input.cwd)
		return config
	}
}
//# sourceMappingURL=sdk-session-config-builder.js.map
