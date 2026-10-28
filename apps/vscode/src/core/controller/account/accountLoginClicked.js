import { AuthService } from "@/sdk/auth-service"
/**
 * Handles the user clicking the login link in the UI.
 * Uses the SDK-backed AuthService to initiate the Cline OAuth flow.
 * The SDK spawns a local callback server and opens the browser.
 *
 * @param controller The controller instance.
 * @returns The login URL as a string.
 */
export async function accountLoginClicked(_controller, _) {
	return await AuthService.getInstance().createAuthRequest()
}
//# sourceMappingURL=accountLoginClicked.js.map
