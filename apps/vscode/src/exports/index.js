import { sendChatButtonClickedEvent } from "@core/controller/ui/subscribeToChatButtonClicked"
import { Logger } from "@/shared/services/Logger"
export function createClineAPI(sidebarController) {
	const api = {
		startNewTask: async (task, images) => {
			await sidebarController.clearTask()
			await sidebarController.postStateToWebview()
			await sendChatButtonClickedEvent()
			await sidebarController.initTask(task, images)
		},
		sendMessage: async (message, images) => {
			if (sidebarController.task) {
				await sidebarController.task.handleWebviewAskResponse("messageResponse", message || "", images || [])
			} else {
				Logger.error("No active task to send message to")
			}
		},
		pressPrimaryButton: async () => {
			if (sidebarController.task) {
				await sidebarController.task.handleWebviewAskResponse("yesButtonClicked", "", [])
			} else {
				Logger.error("No active task to press button for")
			}
		},
		pressSecondaryButton: async () => {
			if (sidebarController.task) {
				await sidebarController.task.handleWebviewAskResponse("noButtonClicked", "", [])
			} else {
				Logger.error("No active task to press button for")
			}
		},
	}
	return api
}
//# sourceMappingURL=index.js.map
