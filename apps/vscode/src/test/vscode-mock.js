// Mock implementation of VSCode API for unit tests
export const env = {
	machineId: "test-machine-id",
	appName: "VS Code",
	remoteName: undefined,
	isTelemetryEnabled: true,
	onDidChangeTelemetryEnabled: (_callback) => {
		// Return a disposable mock
		return {
			dispose: () => {},
		}
	},
}
export const version = "1.103.0"
export const workspace = {
	getConfiguration: (section) => {
		return {
			get: (key, defaultValue) => {
				// Return default values for common configuration keys
				if (section === "cline" && key === "telemetrySetting") {
					return "enabled"
				}
				if (section === "telemetry" && key === "telemetryLevel") {
					return "all"
				}
				return defaultValue
			},
		}
	},
}
// Export other commonly used VSCode API mocks as needed
export const window = {
	showErrorMessage: (_message) => Promise.resolve(),
	showWarningMessage: (_message) => Promise.resolve(),
	showInformationMessage: (_message) => Promise.resolve(),
	createTextEditorDecorationType: (_options) => ({
		key: "mock-decoration-type",
		dispose: () => {},
	}),
	createOutputChannel: (_name) => ({
		appendLine: (message) => console.debug(message),
		append: (message) => console.debug(message),
		clear: () => {},
		show: () => {},
		hide: () => {},
		dispose: () => {},
	}),
}
export const commands = {
	executeCommand: (_command, ..._args) => Promise.resolve(),
}
export const Uri = {
	file: (path) => ({ fsPath: path, toString: () => path }),
	parse: (uri) => ({ fsPath: uri, toString: () => uri }),
}
export const ExtensionContextMock = {}
export const StatusBarAlignmentMock = { Left: 1, Right: 2 }
export const ViewColumnMock = { One: 1, Two: 2, Three: 3 }
//# sourceMappingURL=vscode-mock.js.map
