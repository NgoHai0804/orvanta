import { AuthService } from "@/sdk/auth-service"
import { Logger } from "@/shared/services/Logger"
/**
 * Signs out of OpenAI Codex by clearing stored credentials.
 * Uses the SDK-backed AuthService to clear provider settings.
 */
export async function openAiCodexSignOut(controller, _) {
	try {
		// Clear stored credentials via SDK-backed AuthService
		await AuthService.getInstance().clearCodexCredentials()
		// Update the state to reflect sign out
		await controller.postStateToWebview()
	} catch (error) {
		Logger.error("[openAiCodexSignOut] Failed to sign out:", error)
		throw error
	}
	return {}
}
//# sourceMappingURL=openAiCodexSignOut.js.map
