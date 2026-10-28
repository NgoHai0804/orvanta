const noop = () => undefined
export const version = "test"
export const commands = { executeCommand: async () => undefined }
export const env = {
	clipboard: {
		readText: async () => "",
		writeText: async () => undefined,
	},
	openExternal: async () => true,
}
export const workspace = {
	workspaceFolders: [],
	getConfiguration: () => ({ get: noop, update: async () => undefined }),
	onDidChangeConfiguration: () => ({ dispose: noop }),
}
export const window = {
	activeTextEditor: undefined,
	visibleTextEditors: [],
	tabGroups: {
		all: [],
		activeTabGroup: { tabs: [] },
		onDidChangeTabs: () => ({ dispose: noop }),
		close: async () => true,
	},
	showInformationMessage: async () => undefined,
	showWarningMessage: async () => undefined,
	showErrorMessage: async () => undefined,
	showTextDocument: async () => undefined,
	createOutputChannel: () => ({
		appendLine: noop,
		append: noop,
		clear: noop,
		show: noop,
		hide: noop,
		dispose: noop,
	}),
	createTextEditorDecorationType: (_options) => ({ key: "mock-decoration-type", dispose: noop }),
	onDidChangeActiveTextEditor: () => ({ dispose: noop }),
	onDidChangeVisibleTextEditors: () => ({ dispose: noop }),
}
export class Position {
	line
	character
	constructor(line = 0, character = 0) {
		this.line = line
		this.character = character
	}
}
export class Range {
	start
	end
	constructor(start = new Position(), end = new Position()) {
		this.start = start
		this.end = end
	}
}
export class Selection extends Range {}
export class ThemeColor {
	id
	constructor(id) {
		this.id = id
	}
}
export class ThemeIcon {
	id
	constructor(id) {
		this.id = id
	}
}
export class Uri {
	fsPath
	scheme
	query
	static file(fsPath) {
		return new Uri(fsPath)
	}
	static parse(value) {
		const schemeSeparator = value.indexOf(":")
		return new Uri(value, schemeSeparator === -1 ? "" : value.slice(0, schemeSeparator))
	}
	constructor(fsPath, scheme = "file", query = "") {
		this.fsPath = fsPath
		this.scheme = scheme
		this.query = query
	}
	with(change) {
		return new Uri(this.fsPath, this.scheme, change.query ?? this.query)
	}
	toString() {
		return this.query ? `${this.fsPath}?${this.query}` : this.fsPath
	}
}
export class CancellationTokenSource {
	dispose() {}
}
export class CancellationError extends Error {}
export class Disposable {
	dispose
	constructor(dispose = noop) {
		this.dispose = dispose
	}
}
export class EventEmitter {
	event = (_listener) => ({ dispose: noop })
	fire(_event) {}
	dispose() {}
}
export class RelativePattern {
	base
	pattern
	constructor(base, pattern) {
		this.base = base
		this.pattern = pattern
	}
}
export class MarkdownString {
	value
	constructor(value = "") {
		this.value = value
	}
}
export const ExtensionKind = { UI: 1, Workspace: 2 }
export const ExtensionMode = { Production: 1, Development: 2, Test: 3 }
export const ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 }
export const TaskRevealKind = { Always: 1, Silent: 2, Never: 3 }
export const TextEditorSelectionChangeKind = { Keyboard: 1, Mouse: 2, Command: 3 }
export const TextEditorCursorStyle = { Line: 1, Block: 2, Underline: 3, LineThin: 4, BlockOutline: 5, UnderlineThin: 6 }
export const TextEditorLineNumbersStyle = { Off: 0, On: 1, Relative: 2 }
export const TextEditorRevealType = { Default: 0, InCenter: 1, InCenterIfOutsideViewport: 2, AtTop: 3 }
export const OverviewRulerLane = { Left: 1, Center: 2, Right: 4, Full: 7 }
export const DecorationRangeBehavior = { OpenOpen: 0, ClosedClosed: 1, OpenClosed: 2, ClosedOpen: 3 }
export const EndOfLine = { LF: 1, CRLF: 2 }
export const QuickPickItemKind = { Separator: -1, Default: 0 }
export const InputBoxValidationSeverity = { Info: 1, Warning: 2, Error: 3 }
export const CodeActionKind = { QuickFix: { value: "quickfix" } }
export const CodeActionTriggerKind = { Invoke: 1, Automatic: 2 }
export const DocumentHighlightKind = { Text: 0, Read: 1, Write: 2 }
export default {
	version,
	commands,
	env,
	workspace,
	window,
	Position,
	Range,
	Selection,
	ThemeColor,
	ThemeIcon,
	Uri,
	CancellationTokenSource,
	CancellationError,
	Disposable,
	EventEmitter,
	RelativePattern,
	MarkdownString,
	ExtensionKind,
	ExtensionMode,
	ColorThemeKind,
	TaskRevealKind,
	TextEditorSelectionChangeKind,
	TextEditorCursorStyle,
	TextEditorLineNumbersStyle,
	TextEditorRevealType,
	OverviewRulerLane,
	DecorationRangeBehavior,
	EndOfLine,
	QuickPickItemKind,
	InputBoxValidationSeverity,
	CodeActionKind,
	CodeActionTriggerKind,
	DocumentHighlightKind,
}
//# sourceMappingURL=vscode-vitest-stub.js.map
