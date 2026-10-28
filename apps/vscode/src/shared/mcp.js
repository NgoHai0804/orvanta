/**
 * Identifier for the MCP tools that are used in native tool calls,
 * where each tool name is the combination of the server name + identifier + tool name.
 * This enables to uniquely identify which MCP server a tool belongs to.
 *
 * The timeout constants are re-exported from @cline/shared so the extension,
 * CLI, and standalone core all resolve the same default and bounds.
 */
export {
	DEFAULT_MCP_TIMEOUT_SECONDS,
	MAX_MCP_TIMEOUT_SECONDS,
	MIN_MCP_TIMEOUT_SECONDS,
	resolveMcpTimeoutSeconds,
} from "@cline/shared"
//# sourceMappingURL=mcp.js.map
