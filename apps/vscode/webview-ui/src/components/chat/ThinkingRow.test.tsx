import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ThinkingRow } from "./ThinkingRow"

describe("ThinkingRow", () => {
	it("renders streaming title styling and expanded reasoning content", () => {
		render(
			<ThinkingRow
				isExpanded={true}
				isStreaming={true}
				isVisible={true}
				reasoningContent="Inspecting files..."
				showTitle={true}
				title="Thinking..."
			/>,
		)

		const title = screen.getByText("Thinking...")
		expect(title).toBeInTheDocument()
		expect(title).toHaveClass("animate-shimmer")
		expect(screen.getByText("Inspecting files...")).toBeInTheDocument()
	})

	it("calls onToggle when header is clicked", () => {
		const onToggle = vi.fn()

		render(
			<ThinkingRow
				isExpanded={false}
				isVisible={true}
				onToggle={onToggle}
				reasoningContent="some reasoning"
				showTitle={true}
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: /Thinking/i }))
		expect(onToggle).toHaveBeenCalledTimes(1)
	})

	it("renders AgentBadge and thinking status when agent metadata is provided", () => {
		render(
			<ThinkingRow
				agentDisplayName="Dave"
				agentId="implementer"
				agentRole="implementer"
				isExpanded={true}
				isStreaming={true}
				isVisible={true}
				reasoningContent="Analyzing codebase..."
				showTitle={true}
			/>,
		)

		const badge = screen.getByTestId("agent-badge")
		expect(badge).toBeInTheDocument()
		expect(badge.textContent).toContain("Dave")
		expect(screen.getByText("đang suy nghĩ...")).toBeInTheDocument()
	})
})
