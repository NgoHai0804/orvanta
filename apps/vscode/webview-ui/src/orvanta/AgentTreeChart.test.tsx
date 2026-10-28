import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AgentTreeChart from "./AgentTreeChart"
import type { AgentTreeNode } from "./tree-utils"

describe("AgentTreeChart", () => {
	const mockTree: AgentTreeNode = {
		id: "coordinator",
		displayName: "Company Coordinator",
		role: "lead",
		status: "running",
		reportsTo: null,
		depth: 0,
		children: [
			{
				id: "lead-dev",
				displayName: "Tech Lead",
				role: "lead",
				status: "idle",
				reportsTo: "coordinator",
				depth: 1,
				children: [
					{
						id: "coder",
						displayName: "Core Implementer",
						role: "teammate",
						status: "running",
						reportsTo: "lead-dev",
						depth: 2,
						children: [],
					},
				],
			},
			{
				id: "reviewer",
				displayName: "Code Reviewer",
				role: "teammate",
				status: "idle",
				reportsTo: "coordinator",
				depth: 1,
				children: [],
			},
		],
	}

	it("renders empty state message when tree is null", () => {
		render(<AgentTreeChart onSelectAgent={vi.fn()} tree={null} />)
		expect(screen.getByText("Chưa có dữ liệu cơ cấu tổ chức")).toBeInTheDocument()
		expect(screen.getByText("0 agents")).toBeInTheDocument()
	})

	it("renders tree nodes with display names, role badges and count", () => {
		render(<AgentTreeChart onSelectAgent={vi.fn()} tree={mockTree} />)

		expect(screen.getByText("4 agents")).toBeInTheDocument()
		expect(screen.getByText("Company Coordinator")).toBeInTheDocument()
		expect(screen.getByText("@coordinator")).toBeInTheDocument()
		expect(screen.getByText("Tech Lead")).toBeInTheDocument()
		expect(screen.getByText("@lead-dev")).toBeInTheDocument()
		expect(screen.getByText("Core Implementer")).toBeInTheDocument()
		expect(screen.getByText("@coder")).toBeInTheDocument()
		expect(screen.getByText("Code Reviewer")).toBeInTheDocument()
		expect(screen.getByText("@reviewer")).toBeInTheDocument()

		// Badges
		expect(screen.getAllByText("LEAD").length).toBeGreaterThanOrEqual(2)
		expect(screen.getAllByText("TEAM").length).toBeGreaterThanOrEqual(2)
	})

	it("calls onSelectAgent when a node is clicked", () => {
		const onSelectAgent = vi.fn()
		render(<AgentTreeChart onSelectAgent={onSelectAgent} tree={mockTree} />)

		const coderNode = screen.getByTestId("agent-node-coder")
		fireEvent.click(coderNode)

		expect(onSelectAgent).toHaveBeenCalledWith("coder")
	})

	it("highlights the active selected agent", () => {
		render(<AgentTreeChart onSelectAgent={vi.fn()} selectedAgentId="coder" tree={mockTree} />)

		expect(screen.getByText("✓")).toBeInTheDocument()
		expect(screen.getByText("Đang chọn")).toBeInTheDocument()

		const coderNode = screen.getByTestId("agent-node-coder")
		expect(coderNode.className).toContain("ring-indigo-500")
	})

	it("handles zoom controls", () => {
		render(<AgentTreeChart onSelectAgent={vi.fn()} tree={mockTree} />)

		expect(screen.getByText("100%")).toBeInTheDocument()

		fireEvent.click(screen.getByTestId("zoom-in-button"))
		expect(screen.getByText("110%")).toBeInTheDocument()

		fireEvent.click(screen.getByTestId("zoom-out-button"))
		expect(screen.getByText("100%")).toBeInTheDocument()

		fireEvent.click(screen.getByTestId("zoom-out-button"))
		expect(screen.getByText("90%")).toBeInTheDocument()

		fireEvent.click(screen.getByTestId("zoom-reset-button"))
		expect(screen.getByText("100%")).toBeInTheDocument()
	})

	it("allows collapsing and expanding child branches", () => {
		render(<AgentTreeChart onSelectAgent={vi.fn()} tree={mockTree} />)

		// Initially all children are visible
		expect(screen.getByText("Core Implementer")).toBeInTheDocument()

		// Collapse lead-dev branch
		const toggleLead = screen.getByTestId("collapse-toggle-lead-dev")
		fireEvent.click(toggleLead)

		// Child should now be hidden
		expect(screen.queryByText("Core Implementer")).not.toBeInTheDocument()
		// Count badge (+1) visible on toggle
		expect(screen.getByText("(1)")).toBeInTheDocument()

		// Expand back
		fireEvent.click(toggleLead)
		expect(screen.getByText("Core Implementer")).toBeInTheDocument()
	})

	it("opens template picker modal and triggers onAddAgent", () => {
		const onAddAgent = vi.fn()
		render(<AgentTreeChart onAddAgent={onAddAgent} onSelectAgent={vi.fn()} tree={mockTree} />)

		expect(screen.queryByTestId("template-picker-modal")).not.toBeInTheDocument()

		// Click + Thêm Agent
		fireEvent.click(screen.getByTestId("add-agent-button"))

		expect(screen.getByTestId("template-picker-modal")).toBeInTheDocument()
		expect(screen.getByText("Thêm Agent mới")).toBeInTheDocument()

		// Select 'implementer'
		fireEvent.click(screen.getByTestId("template-card-implementer"))

		expect(onAddAgent).toHaveBeenCalledWith("implementer")
		expect(screen.queryByTestId("template-picker-modal")).not.toBeInTheDocument()
	})

	it("closes template modal on cancel", () => {
		const onAddAgent = vi.fn()
		render(<AgentTreeChart onAddAgent={onAddAgent} onSelectAgent={vi.fn()} tree={mockTree} />)

		fireEvent.click(screen.getByTestId("add-agent-button"))
		expect(screen.getByTestId("template-picker-modal")).toBeInTheDocument()

		fireEvent.click(screen.getByText("Hủy"))
		expect(screen.queryByTestId("template-picker-modal")).not.toBeInTheDocument()
		expect(onAddAgent).not.toHaveBeenCalled()
	})
})
