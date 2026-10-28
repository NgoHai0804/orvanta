import { ClineRecommendedModel, ClineRecommendedModelsResponse } from "@shared/proto/cline/models"
import { refreshClineRecommendedModels } from "./refreshClineRecommendedModels"
export async function refreshClineRecommendedModelsRpc(_controller, _request) {
	const models = await refreshClineRecommendedModels()
	return ClineRecommendedModelsResponse.create({
		recommended: models.recommended.map((model) =>
			ClineRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
		free: models.free.map((model) =>
			ClineRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
		clinePass: (models.clinePass ?? []).map((model) =>
			ClineRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
		clineCloud: (models.clineCloud ?? []).map((model) =>
			ClineRecommendedModel.create({
				id: model.id,
				name: model.name,
				description: model.description,
				tags: model.tags,
			}),
		),
	})
}
//# sourceMappingURL=refreshClineRecommendedModelsRpc.js.map
