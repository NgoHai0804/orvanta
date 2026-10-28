import { createMcpTools } from "@cline/core"
import { resolveMcpServerTimeoutMs } from "@/services/mcp/timeout"
import { Logger } from "@/shared/services/Logger"
import { createVscodeRunCommandsTool, VSCODE_FOREGROUND_RUN_COMMANDS_TIMEOUT_MS } from "./vscode-run-commands-tool"
export class McpHubToolProvider {
	mcpHub
	constructor(mcpHub) {
		this.mcpHub = mcpHub
	}
	async listTools(serverName) {
		const servers = this.mcpHub.getServers()
		const server = servers.find((entry) => entry.name === serverName)
		if (!server) {
			Logger.warn(`[McpHubToolProvider] Server not found: ${serverName}`)
			return []
		}
		return (server.tools ?? []).map((tool) => ({
			name: tool.name,
			description: tool.description ?? undefined,
			inputSchema: tool.inputSchema ?? {
				type: "object",
				properties: {},
			},
			...(tool._meta ? { _meta: tool._meta } : {}),
		}))
	}
	async callTool(request) {
		const ulid = `sdk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
		return this.mcpHub.callTool(request.serverName, request.toolName, request.arguments ?? {}, ulid, request.context?.signal)
	}
	async readResource(request) {
		return this.mcpHub.readResource(request.serverName, request.uri, request.context?.signal)
	}
}
export async function createVscodeExtraTools(mcpHub, options) {
	const provider = new McpHubToolProvider(mcpHub)
	const mcpTools = await Promise.all(
		mcpHub.getServers().map(async (server) => {
			try {
				return await createMcpTools({
					serverName: server.name,
					provider,
					// Keep the tool wrapper timeout in agreement with the MCP
					// request timeout: both derive from the server's config.
					timeoutMs: resolveMcpServerTimeoutMs(server.config),
				})
			} catch (error) {
				Logger.warn(
					`[VscodeRuntimeTools] Failed to load tools from MCP server "${server.name}": ${error instanceof Error ? error.message : String(error)}`,
				)
				return []
			}
		}),
	)
	// No completion tool is exposed: the agent simply ends its turn with a text
	// response, and the turn-end inference in message-translator.ts styles that
	// final text as the completion feedback row.
	const tools = [...mcpTools.flat()]
	// Add the custom run_commands tool when a terminal manager is available.
	// This replaces the SDK's built-in run_commands, which is suppressed via
	// tool executor capabilities in VscodeSessionHost.
	if (options?.getTerminalManager) {
		const executionMode = options.vscodeTerminalExecutionMode ?? "vscodeTerminal"
		tools.push(
			createVscodeRunCommandsTool({
				cwd: options.cwd ?? process.cwd(),
				getTerminalManager: options.getTerminalManager,
				bashTimeoutMs: executionMode === "vscodeTerminal" ? VSCODE_FOREGROUND_RUN_COMMANDS_TIMEOUT_MS : undefined,
				vscodeTerminalExecutionMode: executionMode,
				foregroundCommands: options.foregroundCommands,
			}),
		)
		Logger.log(
			`[VscodeRuntimeTools] Added custom run_commands tool (mode=${executionMode}, timeoutMs=${executionMode === "vscodeTerminal" ? VSCODE_FOREGROUND_RUN_COMMANDS_TIMEOUT_MS : "default"})`,
		)
	}
	Logger.log(`[VscodeRuntimeTools] Prepared ${tools.length} VSCode extra tools`)
	return tools
}
//# sourceMappingURL=vscode-runtime-builder.js.map
