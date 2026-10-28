import { Empty } from "@shared/proto/cline/common"
/**
 * Handles the account logout action.
 * Delegates to the SdkController which uses the SDK-backed AuthService.
 * @param controller The controller instance
 * @param _request The empty request object
 * @returns Empty response
 */
export async function accountLogoutClicked(controller, _request) {
	await controller.handleSignOut()
	return Empty.create({})
}
//# sourceMappingURL=accountLogoutClicked.js.map
