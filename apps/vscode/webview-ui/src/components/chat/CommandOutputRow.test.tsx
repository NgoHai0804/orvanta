import type { ClineMessage } from "@shared/ExtensionMessage"
import { act, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CommandOutputContent, CommandOutputRow } from "./CommandOutputRow"

vi.mock("../common/CodeBlock", () => ({
	default: ({ source }: { source: string }) => <pre>{source}</pre>,
}))

describe("CommandOutputContent", () => {
	it("notifies when visible output changes", async () => {
		const onOutputChange = vi.fn()
		const { rerender } = render(
			<CommandOutputContent
				isContainerExpanded={true}
				isOutputFullyExpanded={false}
				onOutputChange={onOutputChange}
				onToggle={vi.fn()}
				output="first line"
			/>,
		)

		await waitFor(() => expect(onOutputChange).toHaveBeenCalledTimes(1))

		rerender(
			<CommandOutputContent
				isContainerExpanded={true}
				isOutputFullyExpanded={false}
				onOutputChange={onOutputChange}
				onToggle={vi.fn()}
				output={"first line\nsecond line"}
			/>,
		)

		await waitFor(() => expect(onOutputChange).toHaveBeenCalledTimes(2))
	})

	it("notifies when visible output expansion changes", async () => {
		const onOutputChange = vi.fn()
		const { rerender } = render(
			<CommandOutputContent
				isContainerExpanded={true}
				isOutputFullyExpanded={false}
				onOutputChange={onOutputChange}
				onToggle={vi.fn()}
				output={"1\n2\n3\n4\n5\n6"}
			/>,
		)

		await waitFor(() => expect(onOutputChange).toHaveBeenCalledTimes(1))

		rerender(
			<CommandOutputContent
				isContainerExpanded={true}
				isOutputFullyExpanded={true}
				onOutputChange={onOutputChange}
				onToggle={vi.fn()}
				output={"1\n2\n3\n4\n5\n6"}
			/>,
		)

		await waitFor(() => expect(onOutputChange).toHaveBeenCalledTimes(2))
	})

	it("does not notify while the container is collapsed", async () => {
		const onOutputChange = vi.fn()
		render(
			<CommandOutputContent
				isContainerExpanded={false}
				isOutputFullyExpanded={false}
				onOutputChange={onOutputChange}
				onToggle={vi.fn()}
				output="hidden"
			/>,
		)

		await act(async () => {})
		expect(onOutputChange).not.toHaveBeenCalled()
	})
})

describe("CommandOutputRow", () => {
	it("renders the command title without an agent badge", () => {
		const message: ClineMessage = {
			ts: Date.now(),
			type: "say",
			say: "command",
			text: "bun test",
			agentId: "implementer",
			agentDisplayName: "Dave",
			agentRole: "implementer",
		}

		render(
			<CommandOutputRow
				isOutputFullyExpanded={false}
				message={message}
				setIsOutputFullyExpanded={vi.fn()}
				title={<span>Terminal Command</span>}
			/>,
		)

		expect(screen.queryByTestId("agent-badge")).not.toBeInTheDocument()
		expect(screen.getByText("Terminal Command")).toBeInTheDocument()
	})

	it("renders normally without AgentBadge when message has no agent metadata", () => {
		const message: ClineMessage = {
			ts: Date.now(),
			type: "say",
			say: "command",
			text: "bun test",
		}

		render(
			<CommandOutputRow
				isOutputFullyExpanded={false}
				message={message}
				setIsOutputFullyExpanded={vi.fn()}
				title={<span>Terminal Command</span>}
			/>,
		)

		expect(screen.queryByText("Implementer · Dave")).toBeNull()
		expect(screen.getByText("Terminal Command")).toBeInTheDocument()
	})
})
