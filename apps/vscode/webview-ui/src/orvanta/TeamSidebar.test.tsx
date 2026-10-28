import type { OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TeamSidebar } from "./TeamSidebar"

const mockAgents: OrvantaRosterAgent[] = [
	{
		id: "implementer",
		displayName: "Coder Bot",
		role: "teammate",
		status: "running",
	},
	{
		id: "coordinator",
		displayName: "Lead Bot",
		role: "lead",
		status: "idle",
	},
	{
		id: "reviewer",
		displayName: "Reviewer Bot",
		role: "teammate",
		status: "idle",
	},
]

describe("TeamSidebar", () => {
	it("renders all agent display names and IDs", () => {
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={vi.fn()} />)

		expect(screen.getByText("Lead Bot")).toBeInTheDocument()
		expect(screen.getByText("Coder Bot")).toBeInTheDocument()
		expect(screen.getByText("Reviewer Bot")).toBeInTheDocument()
		expect(screen.getByText("@coordinator")).toBeInTheDocument()
		expect(screen.getByText("@implementer")).toBeInTheDocument()
		expect(screen.getByText("@reviewer")).toBeInTheDocument()
	})

	it("sorts lead/coordinator first with ★ symbol", () => {
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={vi.fn()} />)

		const buttons = screen.getAllByRole("button").filter((b) => b.getAttribute("data-testid")?.startsWith("agent-row-"))
		expect(buttons).toHaveLength(3)
		expect(buttons[0]).toHaveAttribute("data-testid", "agent-row-coordinator")
		expect(buttons[0].querySelector('[data-testid="lead-star"]')).toBeInTheDocument()
	})

	it("highlights the focused agent with aria-current", () => {
		render(<TeamSidebar agents={mockAgents} focusAgentId="implementer" onHire={vi.fn()} onSelectAgent={vi.fn()} />)

		const implementerRow = screen.getByTestId("agent-row-implementer")
		const coordinatorRow = screen.getByTestId("agent-row-coordinator")

		expect(implementerRow).toHaveAttribute("aria-current", "true")
		expect(coordinatorRow).not.toHaveAttribute("aria-current")
	})

	it("calls onSelectAgent when an agent row is clicked", () => {
		const onSelectAgent = vi.fn()
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={onSelectAgent} />)

		fireEvent.click(screen.getByTestId("agent-row-reviewer"))
		expect(onSelectAgent).toHaveBeenCalledWith("reviewer")
	})

	it("calls onSelectAgent with team-feed when #team-feed channel is clicked", () => {
		const onSelectAgent = vi.fn()
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={onSelectAgent} />)

		const channelBtn = screen.getByTestId("channel-team-feed")
		fireEvent.click(channelBtn)
		expect(onSelectAgent).toHaveBeenCalledWith("team-feed")
	})

	it("renders cleanly without war room and hire agent buttons in footer", () => {
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={vi.fn()} />)

		// 2 nút Mở War room và Hire agent đã được lược bỏ để tinh gọn giao diện
		expect(screen.queryByRole("button", { name: /mở war room/i })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: /\+ hire agent/i })).not.toBeInTheDocument()
	})
	it("switches between expanded mode (190px) and collapsed mode (48px) via toggle button", () => {
		localStorage.clear()
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={vi.fn()} />)

		const sidebar = screen.getByTestId("orvanta-team-sidebar")
		expect(sidebar).toHaveStyle({ width: "190px" })
		expect(sidebar).toHaveAttribute("data-collapsed", "false")

		const toggleButton = screen.getByTestId("sidebar-toggle-button")
		expect(toggleButton).toHaveAttribute("title", "Thu gọn thanh kênh (Ctrl+B)")

		// Click to collapse
		fireEvent.click(toggleButton)

		expect(sidebar).toHaveStyle({ width: "48px" })
		expect(sidebar).toHaveAttribute("data-collapsed", "true")
		expect(screen.getByTestId("sidebar-toggle-button")).toHaveAttribute("title", "Mở rộng thanh kênh (Ctrl+B)")

		// Click to expand again
		fireEvent.click(screen.getByTestId("sidebar-toggle-button"))

		expect(sidebar).toHaveStyle({ width: "190px" })
		expect(sidebar).toHaveAttribute("data-collapsed", "false")
		expect(screen.getByTestId("sidebar-toggle-button")).toHaveAttribute("title", "Thu gọn thanh kênh (Ctrl+B)")
	})

	it("persists collapsed state to localStorage and restores it on mount", () => {
		localStorage.clear()
		localStorage.setItem("orvanta_sidebar_collapsed", "true")

		const { unmount } = render(
			<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={vi.fn()} />,
		)

		const sidebar = screen.getByTestId("orvanta-team-sidebar")
		expect(sidebar).toHaveStyle({ width: "48px" })
		expect(sidebar).toHaveAttribute("data-collapsed", "true")
		expect(screen.getByTestId("sidebar-toggle-button")).toHaveAttribute("title", "Mở rộng thanh kênh (Ctrl+B)")

		// Expand it
		fireEvent.click(screen.getByTestId("sidebar-toggle-button"))
		expect(localStorage.getItem("orvanta_sidebar_collapsed")).toBe("false")

		unmount()

		// Re-render and verify it reads "false"
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={vi.fn()} />)
		const reloadedSidebar = screen.getByTestId("orvanta-team-sidebar")
		expect(reloadedSidebar).toHaveStyle({ width: "190px" })
		expect(reloadedSidebar).toHaveAttribute("data-collapsed", "false")

		localStorage.clear()
	})

	it("toggles collapsed state using Ctrl+B and Cmd+B keyboard shortcut", () => {
		localStorage.clear()
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={vi.fn()} onSelectAgent={vi.fn()} />)

		const sidebar = screen.getByTestId("orvanta-team-sidebar")
		expect(sidebar).toHaveStyle({ width: "190px" })

		// Press Ctrl+B
		fireEvent.keyDown(window, { key: "b", ctrlKey: true })
		expect(sidebar).toHaveStyle({ width: "48px" })

		// Press Cmd+B (metaKey)
		fireEvent.keyDown(window, { key: "b", metaKey: true })
		expect(sidebar).toHaveStyle({ width: "190px" })

		// When focus is inside an input, Ctrl+B should not collapse sidebar
		const input = document.createElement("input")
		document.body.appendChild(input)
		input.focus()

		fireEvent.keyDown(input, { key: "b", ctrlKey: true })
		expect(sidebar).toHaveStyle({ width: "190px" })

		document.body.removeChild(input)
		localStorage.clear()
	})

	it("renders mini avatar buttons with status dot and mini footer in collapsed mode", () => {
		const onSelectAgent = vi.fn()
		const onOpenWarRoom = vi.fn()
		render(
			<TeamSidebar
				agents={mockAgents}
				focusAgentId="implementer"
				isCollapsed={true}
				onHire={vi.fn()}
				onOpenWarRoom={onOpenWarRoom}
				onSelectAgent={onSelectAgent}
			/>,
		)

		const sidebar = screen.getByTestId("orvanta-team-sidebar")
		expect(sidebar).toHaveStyle({ width: "48px" })
		expect(sidebar).toHaveAttribute("data-collapsed", "true")

		// Agent avatar rows are rendered
		const implementerButton = screen.getByTestId("agent-row-implementer")
		expect(implementerButton).toBeInTheDocument()
		expect(implementerButton).toHaveAttribute("aria-current", "true")
		expect(implementerButton).toHaveAttribute("title", "Coder Bot (@implementer) - running")

		// Click selects agent
		fireEvent.click(implementerButton)
		expect(onSelectAgent).toHaveBeenCalledWith("implementer")

		// Footer buttons are not rendered
		expect(screen.queryByTestId("mini-warroom-button")).not.toBeInTheDocument()
		expect(screen.queryByTestId("mini-hire-button")).not.toBeInTheDocument()
	})

	it("notifies onToggleCollapse callback when provided", () => {
		const onToggleCollapse = vi.fn()
		render(
			<TeamSidebar
				agents={mockAgents}
				focusAgentId="coordinator"
				onHire={vi.fn()}
				onSelectAgent={vi.fn()}
				onToggleCollapse={onToggleCollapse}
			/>,
		)

		fireEvent.click(screen.getByTestId("sidebar-toggle-button"))
		expect(onToggleCollapse).toHaveBeenCalledWith(true)
	})
})
