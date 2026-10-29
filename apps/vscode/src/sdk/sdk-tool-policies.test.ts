import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings"
import { describe, expect, it } from "vitest"
import { isAgentAutoApproved, isToolAutoApproved } from "./sdk-tool-policies"

describe("isToolAutoApproved", () => {
	it("does not auto-approve command tools by default", () => {
		expect(isToolAutoApproved("run_commands", DEFAULT_AUTO_APPROVAL_SETTINGS)).toBe(false)
	})

	it("uses executeSafeCommands as the single command approval flag", () => {
		const settings = {
			...DEFAULT_AUTO_APPROVAL_SETTINGS,
			actions: {
				...DEFAULT_AUTO_APPROVAL_SETTINGS.actions,
				executeSafeCommands: false,
				executeAllCommands: true,
			},
		}

		expect(isToolAutoApproved("run_commands", settings)).toBe(false)
	})

	it("auto-approves all MCP tools when the Use MCP servers toggle is on", () => {
		const settings = {
			...DEFAULT_AUTO_APPROVAL_SETTINGS,
			actions: { ...DEFAULT_AUTO_APPROVAL_SETTINGS.actions, useMcp: true },
		}

		expect(isToolAutoApproved("firecrawl__scrape", settings)).toBe(true)
	})

	it("prompts for MCP tools when the Use MCP servers toggle is off", () => {
		const settings = {
			...DEFAULT_AUTO_APPROVAL_SETTINGS,
			actions: { ...DEFAULT_AUTO_APPROVAL_SETTINGS.actions, useMcp: false },
		}

		expect(isToolAutoApproved("firecrawl__scrape", settings)).toBe(false)
	})
})

describe("isAgentAutoApproved", () => {
	it("returns false for all tools when agent auto-approval is disabled", () => {
		const autoApproval = {
			enabled: false,
			readFiles: true,
			editFiles: true,
			executeCommands: true,
			useBrowser: true,
			useMcp: true,
		}

		expect(isAgentAutoApproved("read_files", autoApproval)).toBe(false)
		expect(isAgentAutoApproved("editor", autoApproval)).toBe(false)
		expect(isAgentAutoApproved("run_commands", autoApproval)).toBe(false)
		expect(isAgentAutoApproved("web_search", autoApproval)).toBe(false)
		expect(isAgentAutoApproved("mcp__test__tool", autoApproval)).toBe(false)
	})

	it("approves only tools explicitly enabled for the agent", () => {
		const autoApproval = {
			enabled: true,
			readFiles: true,
			editFiles: false,
			executeCommands: false,
			useBrowser: false,
			useMcp: false,
		}

		expect(isAgentAutoApproved("read_files", autoApproval)).toBe(true)
		expect(isAgentAutoApproved("list_files", autoApproval)).toBe(true)
		expect(isAgentAutoApproved("search_codebase", autoApproval)).toBe(true)
		expect(isAgentAutoApproved("editor", autoApproval)).toBe(false)
		expect(isAgentAutoApproved("run_commands", autoApproval)).toBe(false)
	})

	it("supports command and mcp approval when configured", () => {
		const autoApproval = {
			enabled: true,
			readFiles: false,
			editFiles: false,
			executeCommands: true,
			useBrowser: false,
			useMcp: true,
		}

		expect(isAgentAutoApproved("run_commands", autoApproval)).toBe(true)
		expect(isAgentAutoApproved("execute_command", autoApproval)).toBe(true)
		expect(isAgentAutoApproved("github__list_repos", autoApproval)).toBe(true)
		expect(isAgentAutoApproved("read_files", autoApproval)).toBe(false)
		expect(isAgentAutoApproved("editor", autoApproval)).toBe(false)
	})
})
