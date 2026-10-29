import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ExtensionStateContext } from "@/context/ExtensionStateContext"
import { TaskServiceClient } from "@/services/grpc-client"
import { ConsoleHistoryDrawer } from "./ConsoleHistoryDrawer"

vi.mock("@/services/grpc-client", () => ({
	TaskServiceClient: {
		deleteTasksWithIds: vi.fn().mockResolvedValue({}),
	},
}))

vi.mock("../useOrvantaCompany", () => ({
	useOrvantaCompany: () => ({
		company: {
			status: "ready",
			agents: [
				{ id: "coordinator", displayName: "Coordinator (Lead)", role: "lead" },
				{ id: "implementer", displayName: "Frontend Developer", role: "teammate" },
			],
		},
	}),
}))

describe("ConsoleHistoryDrawer", () => {
	const mockTasks = [
		{
			id: "task-1",
			ts: Date.now() - 1000 * 60 * 5, // 5 mins ago
			task: "Fix layout bug in Chrome tab bar",
			tokensIn: 500,
			tokensOut: 200,
			totalCost: 0.012,
			agents: [{ id: "coordinator", displayName: "Coordinator (Lead)", role: "lead" }],
		},
		{
			id: "task-2",
			ts: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
			task: "Implement purpose lock mechanism",
			tokensIn: 1000,
			tokensOut: 400,
			totalCost: 0.035,
			agents: [{ id: "implementer", displayName: "Frontend Developer", role: "teammate" }],
		},
	]

	beforeEach(() => {
		vi.clearAllMocks()
	})

	const renderWithContext = (ui: React.ReactElement) => {
		return render(
			<ExtensionStateContext.Provider value={{ taskHistory: mockTasks } as any}>{ui}</ExtensionStateContext.Provider>,
		)
	}

	it("renders nothing when isOpen is false", () => {
		const { container } = renderWithContext(<ConsoleHistoryDrawer isOpen={false} onClose={vi.fn()} onSelectTask={vi.fn()} />)
		expect(container.firstChild).toBeNull()
	})

	it("renders task history list when isOpen is true without filter chips", () => {
		renderWithContext(<ConsoleHistoryDrawer isOpen={true} onClose={vi.fn()} onSelectTask={vi.fn()} />)

		expect(screen.getByText("Lịch sử cuộc trò chuyện")).toBeInTheDocument()
		expect(screen.getByText("Fix layout bug in Chrome tab bar")).toBeInTheDocument()
		expect(screen.getByText("Implement purpose lock mechanism")).toBeInTheDocument()

		// Verify old filter chips are removed
		expect(screen.queryByText("Hôm nay")).not.toBeInTheDocument()
		expect(screen.queryByText("Tất cả")).not.toBeInTheDocument()
		expect(screen.queryByText("@reviewer")).not.toBeInTheDocument()

		// Verify agent badges are shown
		expect(screen.getByText("@coordinator")).toBeInTheDocument()
		expect(screen.getByText("@implementer")).toBeInTheDocument()
	})

	it("filters tasks by search input (prompt or agent)", () => {
		renderWithContext(<ConsoleHistoryDrawer isOpen={true} onClose={vi.fn()} onSelectTask={vi.fn()} />)

		const input = screen.getByPlaceholderText("Tìm kiếm yêu cầu, mã task, hoặc agent...")

		// Search by prompt text
		fireEvent.change(input, { target: { value: "purpose lock" } })
		expect(screen.queryByText("Fix layout bug in Chrome tab bar")).not.toBeInTheDocument()
		expect(screen.getByText("Implement purpose lock mechanism")).toBeInTheDocument()

		// Search by agent name
		fireEvent.change(input, { target: { value: "coordinator" } })
		expect(screen.getByText("Fix layout bug in Chrome tab bar")).toBeInTheDocument()
		expect(screen.queryByText("Implement purpose lock mechanism")).not.toBeInTheDocument()
	})

	it("shows inline confirmation and deletes task when confirmed", async () => {
		const handleDeleteTask = vi.fn()
		renderWithContext(
			<ConsoleHistoryDrawer isOpen={true} onClose={vi.fn()} onDeleteTask={handleDeleteTask} onSelectTask={vi.fn()} />,
		)

		const deleteButtons = screen.getAllByLabelText("Xóa cuộc trò chuyện")
		fireEvent.click(deleteButtons[0])

		// Expect inline confirmation prompt
		expect(screen.getByText("Xác nhận xóa?")).toBeInTheDocument()
		const confirmDeleteBtn = screen.getByRole("button", { name: "Xóa" })

		fireEvent.click(confirmDeleteBtn)

		await waitFor(() => {
			expect(TaskServiceClient.deleteTasksWithIds).toHaveBeenCalledTimes(1)
			expect(handleDeleteTask).toHaveBeenCalledWith("task-1")
		})
	})

	it("cancels deletion when clicking Hủy", () => {
		renderWithContext(<ConsoleHistoryDrawer isOpen={true} onClose={vi.fn()} onSelectTask={vi.fn()} />)

		const deleteButtons = screen.getAllByLabelText("Xóa cuộc trò chuyện")
		fireEvent.click(deleteButtons[0])
		expect(screen.getByText("Xác nhận xóa?")).toBeInTheDocument()

		const cancelBtn = screen.getByRole("button", { name: "Hủy" })
		fireEvent.click(cancelBtn)

		expect(screen.queryByText("Xác nhận xóa?")).not.toBeInTheDocument()
		expect(TaskServiceClient.deleteTasksWithIds).not.toHaveBeenCalled()
	})

	it("invokes onSelectTask when a task item is clicked", () => {
		const handleSelect = vi.fn()
		renderWithContext(<ConsoleHistoryDrawer isOpen={true} onClose={vi.fn()} onSelectTask={handleSelect} />)

		fireEvent.click(screen.getByText("Fix layout bug in Chrome tab bar"))
		expect(handleSelect).toHaveBeenCalledWith("task-1", "Fix layout bug in Chrome tab bar", "coordinator", undefined)
	})

	it("invokes onClose when clicking close button", () => {
		const handleClose = vi.fn()
		renderWithContext(<ConsoleHistoryDrawer isOpen={true} onClose={handleClose} onSelectTask={vi.fn()} />)

		fireEvent.click(screen.getByLabelText("Đóng lịch sử"))
		expect(handleClose).toHaveBeenCalledTimes(1)
	})
})
