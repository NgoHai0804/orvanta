import * as vscode from "vscode"
import { Setting } from "@/shared/proto/index.host"
/**
 * Subscribe to changes to the telemetry settings.
 */
export async function subscribeToTelemetrySettings(_, responseStream, _requestId) {
	vscode.env.onDidChangeTelemetryEnabled((isTelemetryEnabled) => {
		const event = { isEnabled: isTelemetryEnabled ? Setting.ENABLED : Setting.DISABLED }
		responseStream(event, false)
	})
}
//# sourceMappingURL=subscribeToTelemetrySettings.js.map
