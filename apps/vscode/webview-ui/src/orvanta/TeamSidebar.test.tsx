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
		expect(buttons[0]).toHaveTextContent("★")
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

	it("renders footer buttons and calls onHire", () => {
		const onHire = vi.fn()
		render(<TeamSidebar agents={mockAgents} focusAgentId="coordinator" onHire={onHire} onSelectAgent={vi.fn()} />)

		const warRoomButton = screen.getByRole("button", { name: /mở war room/i })
		expect(warRoomButton).toBeDisabled()

		const hireButton = screen.getByRole("button", { name: /\+ hire agent/i })
		fireEvent.click(hireButton)
		expect(onHire).toHaveBeenCalled()
	})

	it("enables war room button when onOpenWarRoom is provided and triggers callback", () => {
		const onOpenWarRoom = vi.fn()
		render(
			<TeamSidebar
				agents={mockAgents}
				focusAgentId="coordinator"
				onHire={vi.fn()}
				onOpenWarRoom={onOpenWarRoom}
				onSelectAgent={vi.fn()}
			/>,
		)

		const warRoomButton = screen.getByRole("button", { name: /mở war room/i })
		expect(warRoomButton).toBeEnabled()
		fireEvent.click(warRoomButton)
		expect(onOpenWarRoom).toHaveBeenCalled()
	})
})
