import { resolveProviderModelsRecord } from "./providerCatalogShared"
/**
 * Refreshes the Vercel AI Gateway models and returns application types.
 *
 * Model catalogs are consolidated in the SDK: this resolves through the
 * models.dev-backed catalog (bundled + live refresh) via
 * `resolveProviderConfig`, the same source the CLI uses.
 */
export async function refreshVercelAiGatewayModels(controller) {
	return resolveProviderModelsRecord(controller, "vercel-ai-gateway")
}
//# sourceMappingURL=refreshVercelAiGatewayModels.js.map
