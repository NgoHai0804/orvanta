import { OrvantaAgentProfile, type OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AgentsView from "./AgentsView"

describe("AgentsView", () => {
	const mockCompany: OrvantaCompanyResponse = {
		company: {
			name: "Acme Corp",
			purpose: "Build great software",
			roster: {
				agents: [
					{
						id: "coordinator",
						displayName: "Company Coordinator",
						role: "lead",
						status: "running",
						reportsTo: undefined,
					},
					{
						id: "dev-lead",
						displayName: "Tech Lead",
						role: "lead",
						status: "idle",
						reportsTo: "coordinator",
					},
					{
						id: "developer-1",
						displayName: "Frontend Dev",
						role: "teammate",
						status: "idle",
						reportsTo: "dev-lead",
					},
				],
			},
		},
		profiles: {
			coordinator: {
				id: "coordinator",
				displayName: "Company Coordinator",
				role: "lead",
				description: "Điều phối viên",
				instructions: "## Coordinator\n- Điều phối toàn bộ hoạt động",
			} as OrvantaAgentProfile,
			"dev-lead": {
				id: "dev-lead",
				displayName: "Tech Lead",
				role: "lead",
				description: "Trưởng nhóm kỹ thuật",
				instructions: "## Lead\n- Quản lý kiến trúc",
				reportsTo: "coordinator",
			} as OrvantaAgentProfile,
			"developer-1": {
				id: "developer-1",
				displayName: "Frontend Dev",
				role: "teammate",
				description: "Lập trình viên giao diện",
				instructions: "## Dev\n- Lập trình React",
				reportsTo: "dev-lead",
			} as OrvantaAgentProfile,
		},
	}

	it("renders split view with Tree Chart at top and Editor at bottom", () => {
		render(<AgentsView company={mockCompany} />)

		expect(screen.getByTestId("agents-view")).toBeInTheDocument()
		expect(screen.getByTestId("agent-tree-chart")).toBeInTheDocument()
		expect(screen.getByTestId("split-divider")).toBeInTheDocument()
		expect(screen.getByTestId("agent-editor-panel")).toBeInTheDocument()
	})

	it("defaults to selecting coordinator in editor with coordinator disabled id", () => {
		render(<AgentsView company={mockCompany} />)

		// Coordinator should be active in editor
		const idInput = screen.getByPlaceholderText("ví dụ: reviewer") as HTMLInputElement
		expect(idInput.value).toBe("coordinator")
		expect(idInput).toBeDisabled()
	})

	it("selects agent when clicked in tree and updates bottom editor", () => {
		render(<AgentsView company={mockCompany} />)

		// Click "Tech Lead" card in tree
		const devLeadCard = screen.getByTestId("agent-node-dev-lead")
		fireEvent.click(devLeadCard)

		// Bottom editor should now show Tech Lead
		const nameInput = screen.getByPlaceholderText("Tên agent") as HTMLInputElement
		expect(nameInput.value).toBe("Tech Lead")
	})

	it("opens template picker and creates a new agent draft when template is chosen", () => {
		render(<AgentsView company={mockCompany} />)

		// Click "+ Thêm Agent"
		fireEvent.click(screen.getByTestId("add-agent-button"))

		// Modal should appear
		expect(screen.getByTestId("template-picker-modal")).toBeInTheDocument()

		// Pick "Reviewer" template
		fireEvent.click(screen.getByTestId("template-card-reviewer"))

		// Editor should now show new draft for reviewer
		const nameInput = screen.getByPlaceholderText("Tên agent") as HTMLInputElement
		expect(nameInput.value).toBe("Code Reviewer")

		const idInput = screen.getByPlaceholderText("ví dụ: reviewer") as HTMLInputElement
		expect(idInput.value).toBe("reviewer")
		expect(idInput).not.toBeDisabled()
	})

	it("calls onSaveAgentProfile when saving in editor", async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		render(<AgentsView company={mockCompany} onSaveAgentProfile={onSave} />)

		// Select Tech Lead
		fireEvent.click(screen.getByTestId("agent-node-dev-lead"))

		// Edit display name
		const nameInput = screen.getByPlaceholderText("Tên agent")
		fireEvent.change(nameInput, { target: { value: "Lead Architect" } })

		// Click Save
		const saveButton = screen.getByTestId("editor-save-button")
		fireEvent.click(saveButton)

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "dev-lead",
				displayName: "Lead Architect",
			}),
		)
	})

	it("calls onDeleteAgentProfile when deleting an agent in editor", async () => {
		const onDelete = vi.fn().mockResolvedValue(true)
		render(<AgentsView company={mockCompany} onDeleteAgentProfile={onDelete} />)

		// Select Frontend Dev
		fireEvent.click(screen.getByTestId("agent-node-developer-1"))

		// Click fire button
		const fireBtn = screen.getByTestId("quick-fire-button")
		fireEvent.click(fireBtn)

		// Confirm in modal
		const confirmBtn = screen.getByTestId("confirm-delete-button")
		fireEvent.click(confirmBtn)

		expect(onDelete).toHaveBeenCalledWith("developer-1")
	})
})
