import { isChatCompatibleModel } from "@cline/shared"
export function filterChatModelMap(models) {
	return new Map([...models].filter(([, model]) => isChatCompatibleModel(model)))
}
export function resolveChatModelDefault(defaultModelId, models) {
	return defaultModelId && models.has(defaultModelId) ? defaultModelId : undefined
}
//# sourceMappingURL=chat-models.js.map
