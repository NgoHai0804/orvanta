import { existsSync } from "node:fs"
import { readGlobalSettings, setTelemetryOptOutGlobally } from "@cline/core"
import { resolveGlobalSettingsPath } from "@cline/shared/storage"
import { Logger } from "@/shared/services/Logger"
export function telemetrySettingFromSharedGlobalSettings() {
	return readGlobalSettings().telemetryOptOut ? "disabled" : "enabled"
}
function normalizeLegacyTelemetrySetting(value) {
	if (value === false) {
		return "disabled"
	}
	if (value === true) {
		return "enabled"
	}
	if (value === "disabled" || value === "enabled" || value === "unset") {
		return value
	}
	return undefined
}
export function syncTelemetrySettingFromSharedGlobalSettings(stateManager) {
	try {
		const sharedSettingsPath = resolveGlobalSettingsPath()
		if (!existsSync(sharedSettingsPath)) {
			const legacyTelemetrySetting = normalizeLegacyTelemetrySetting(stateManager.getGlobalSettingsKey("telemetrySetting"))
			if (legacyTelemetrySetting !== undefined) {
				// One-time migration from the legacy VS Code globalState.json field into
				// the CLI/shared global settings file. Older builds stored this as a
				// boolean where false meant telemetry was disabled.
				// Do not emit opt-out telemetry for migration; this is not a new explicit
				// user action.
				setTelemetryOptOutGlobally(legacyTelemetrySetting === "disabled")
			}
		}
		const telemetrySetting = telemetrySettingFromSharedGlobalSettings()
		const remoteTelemetrySetting = stateManager.getRemoteConfigSettings().telemetrySetting
		if (remoteTelemetrySetting === undefined && stateManager.getGlobalSettingsKey("telemetrySetting") !== telemetrySetting) {
			// Keep the legacy in-memory state mirrored so existing VS Code telemetry
			// providers that still read StateManager observe the shared setting.
			stateManager.setGlobalState("telemetrySetting", telemetrySetting)
		}
	} catch (error) {
		Logger.warn(`[SdkController] Failed to sync shared telemetry setting: ${error}`)
	}
}
//# sourceMappingURL=telemetry-settings-sync.js.map
