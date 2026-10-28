/**
 * Spawn-time facts about this cline-core process, reported by the host that
 * launched it. Only out-of-process hosts (the JetBrains plugin) set these; the
 * VS Code extension runs in-process and reports nothing, so the fields are
 * simply absent there, the way `host_plugin_version` is absent on the CLI.
 *
 * Same contract as `IS_DEV` -> `is_dev` and `CLINE_ROLLOUT_VARIANT`: the host
 * states a fact at spawn, core owns the telemetry. Without these, a core that
 * crash-restarted three times and a user with three project windows both look
 * like three `user.extension_activated` events.
 */
import { CORE_SPAWN_REASONS } from "@cline/shared"
export const CORE_SPAWN_ORDINAL_ENV = "CLINE_CORE_SPAWN_ORDINAL"
export const CORE_SPAWN_REASON_ENV = "CLINE_CORE_SPAWN_REASON"
export { CORE_SPAWN_REASONS }
export function getCoreSpawnTelemetryMetadata(env = process.env) {
	const metadata = {}
	const ordinal = Number(env[CORE_SPAWN_ORDINAL_ENV])
	if (Number.isInteger(ordinal) && ordinal >= 1) {
		metadata.core_spawn_ordinal = ordinal
	}
	const reason = env[CORE_SPAWN_REASON_ENV]
	if (isCoreSpawnReason(reason)) {
		metadata.core_spawn_reason = reason
	}
	return metadata
}
function isCoreSpawnReason(value) {
	return value !== undefined && CORE_SPAWN_REASONS.includes(value)
}
//# sourceMappingURL=core-spawn-metadata.js.map
