import { window } from "vscode"
import { SelectedResponse, ShowMessageType } from "@/shared/proto/index.host"

const DEFAULT_OPTIONS = { modal: false, items: [] }
export async function showMessage(request) {
	const { message, type, options } = request
	const { modal, detail, items } = { ...DEFAULT_OPTIONS, ...options }
	const option = { modal, detail }
	let selectedOption
	switch (type) {
		case ShowMessageType.ERROR:
			selectedOption = await window.showErrorMessage(message, option, ...items)
			break
		case ShowMessageType.WARNING:
			selectedOption = await window.showWarningMessage(message, option, ...items)
			break
		default:
			selectedOption = await window.showInformationMessage(message, option, ...items)
			break
	}
	return SelectedResponse.create({ selectedOption })
}
//# sourceMappingURL=showMessage.js.map
