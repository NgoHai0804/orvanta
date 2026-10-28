import { String } from "@shared/proto/cline/common"
import * as vscode from "vscode"
export async function clipboardReadText(_) {
	const text = await vscode.env.clipboard.readText()
	return String.create({ value: text })
}
//# sourceMappingURL=clipboardReadText.js.map
