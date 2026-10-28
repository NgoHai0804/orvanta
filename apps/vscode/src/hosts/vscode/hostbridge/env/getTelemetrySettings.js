import * as vscode from "vscode"
import { Setting } from "@/shared/proto/index.host"
export async function getTelemetrySettings(_) {
	const config = vscode.workspace.getConfiguration("telemetry")
	const errorLevel = config?.get("telemetryLevel") || "all"
	if (vscode.env.isTelemetryEnabled) {
		return { isEnabled: Setting.ENABLED, errorLevel }
	}
	return { isEnabled: Setting.DISABLED, errorLevel }
}
//# sourceMappingURL=getTelemetrySettings.js.map
