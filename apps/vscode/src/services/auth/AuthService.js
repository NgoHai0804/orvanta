// Replaces classic src/services/auth/AuthService.ts (see origin/main)
//
// The AuthService class is now provided by the SDK adapter layer.
// All modules that import AuthService from this path continue to work
// because the SDK AuthService exposes the same interface.
export { AuthService } from "@/sdk/auth-service" // ServiceConfig was defined in the classic AuthService but never imported
//# sourceMappingURL=AuthService.js.map
