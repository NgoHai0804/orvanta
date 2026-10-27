import { OrvantaAgentProfile } from "@shared/proto/cline/orvanta"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AgentEditor from "./AgentEditor"

describe("AgentEditor", () => {
	const coordinatorProfile = OrvantaAgentProfile.create({
		id: "coordinator",
		displayName: "Coordinator",
		role: "lead",
		description: "Điều phối toàn bộ dự án",
		maxIterations: 40,
		instructions: "You are coordinator.",
		tools: { allow: ["bash", "read_files"], deny: [] },
		scopePaths: { allow: ["**/*"], denyWrite: [".orvanta/company.json"] },
	})

	const teammateProfile = OrvantaAgentProfile.create({
		id: "implementer",
		displayName: "Implementer",
		role: "teammate",
		description: "Lập trình viên",
		maxIterations: 30,
		instructions: "You implement features.",
		tools: { allow: ["read_files", "edit_file"], deny: ["bash"] },
		scopePaths: { allow: ["src/**/*"], denyWrite: [] },
	})

	it("renders coordinator editor with ID disabled and no delete button", () => {
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={coordinatorProfile}
				isCoordinator={true}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		expect(screen.getByText("Sửa agent: Coordinator")).toBeInTheDocument()
		expect(screen.getByText("Lead")).toBeInTheDocument()
		const idInput = screen.getByPlaceholderText("ví dụ: reviewer") as HTMLInputElement
		expect(idInput.disabled).toBe(true)
		expect(screen.queryByRole("button", { name: "Xóa" })).not.toBeInTheDocument()
	})

	it("renders teammate editor with delete button when not new", () => {
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		expect(screen.getByText("Sửa agent: Implementer")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Xóa" })).toBeInTheDocument()
	})

	it("allows editing id when isNew is true", () => {
		render(
			<AgentEditor
				existingIds={["coordinator"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={true}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		const idInput = screen.getByPlaceholderText("ví dụ: reviewer") as HTMLInputElement
		expect(idInput.disabled).toBe(false)
	})

	it("allows editing basic fields and saving", async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const onClose = vi.fn()

		render(
			<AgentEditor
				existingIds={["coordinator"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={onClose}
				onDelete={vi.fn()}
				onSave={onSave}
			/>,
		)

		const nameInput = screen.getByDisplayValue("Implementer")
		fireEvent.change(nameInput, { target: { value: "Lead Implementer" } })

		const saveButton = screen.getByRole("button", { name: "Lưu" })
		await act(async () => {
			fireEvent.click(saveButton)
		})

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				displayName: "Lead Implementer",
				id: "implementer",
			}),
		)
	})

	it("confirms before deleting a teammate agent", async () => {
		const onDelete = vi.fn().mockResolvedValue(true)
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={onDelete}
				onSave={vi.fn()}
			/>,
		)

		const deleteBtn = screen.getByRole("button", { name: "Xóa" })
		fireEvent.click(deleteBtn)

		expect(screen.getByText("Xóa agent?")).toBeInTheDocument()
		const confirmBtn = screen.getByRole("button", { name: "Xác nhận xóa" })
		await act(async () => {
			fireEvent.click(confirmBtn)
		})

		expect(onDelete).toHaveBeenCalledWith("implementer")
	})

	it("renders locked purpose paths under denyWrite", () => {
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		expect(screen.getByText(/\.orvanta\/purpose\.md/)).toBeInTheDocument()
		expect(screen.getByText(/\.orvanta\/company\.json/)).toBeInTheDocument()
		expect(screen.getByText(/\.orvanta\/org\/roster\.json/)).toBeInTheDocument()
	})
})
