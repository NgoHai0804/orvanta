import { AuthService } from "@/sdk/auth-service"
export async function subscribeToAuthStatusUpdate(controller, request, responseStream, requestId) {
	return AuthService.getInstance().subscribeToAuthStatusUpdate(controller, request, responseStream, requestId)
}
//# sourceMappingURL=subscribeToAuthStatusUpdate.js.map
