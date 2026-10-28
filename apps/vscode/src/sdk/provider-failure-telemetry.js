export const PROVIDER_FAILURE_ERROR_TYPE = {
	AUTH: "auth",
	BALANCE: "balance",
	SEND_ERROR: "send_error",
	TASK_INIT: "task_init",
	SDK_AGENT_ERROR: "sdk_agent_error",
	SDK_AGENT_DONE_ERROR: "sdk_agent_done_error",
}
export const PROVIDER_FAILURE_PHASE = {
	PREFLIGHT: "preflight",
	STREAMING: "streaming",
}
export class ProviderFailureTelemetryTurnGate {
	turnCounter = 0
	activeTurnId
	streamingFailureCapturedTurnId
	beginTurn() {
		this.turnCounter += 1
		this.activeTurnId = this.turnCounter
	}
	shouldCaptureStreamingFailure() {
		if (this.activeTurnId === undefined) {
			return true
		}
		if (this.streamingFailureCapturedTurnId === this.activeTurnId) {
			return false
		}
		this.streamingFailureCapturedTurnId = this.activeTurnId
		return true
	}
}
//# sourceMappingURL=provider-failure-telemetry.js.map
