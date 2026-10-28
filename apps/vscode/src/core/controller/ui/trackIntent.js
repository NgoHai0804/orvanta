import { Empty } from "@shared/proto/cline/common"
import { telemetryService } from "@/services/telemetry"
export async function trackIntent(_controller, request) {
	switch (request.action) {
		case "new_task_clicked":
			telemetryService.captureNewTaskClicked(request.source, request.hasActiveTask)
			break
		case "prompt_submitted":
			telemetryService.capturePromptSubmitted({
				source: request.source,
				hasText: request.hasText,
				hasImages: request.hasImages,
				hasFiles: request.hasFiles,
				hasActiveTask: request.hasActiveTask,
				textLength: request.textLength,
			})
			break
	}
	return Empty.create({})
}
//# sourceMappingURL=trackIntent.js.map
