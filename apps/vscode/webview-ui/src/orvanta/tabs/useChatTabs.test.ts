import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TaskServiceClient } from "@/services/grpc-client"
import { DEFAULT_TAB_TITLE } from "./types"
import { useChatTabs } from "./useChatTabs"

vi.mock("@/services/grpc-client", () => ({
	TaskServiceClient: {
		showTaskWithId: vi.fn().mockResolvedValue({}),
		clearTask: vi.fn().mockResolvedValue({}),
	},
}))

describe("useChatTabs", () => {
	beforeEach(() => {
		localStorage.clear()
		vi.clearAllMocks()
	})

	it("initializes with 1 default tab when storage is empty", () => {
		const { result } = renderHook(() => useChatTabs({ initialFocusAgentId: "coordinator" }))
		expect(result.current.tabs).toHaveLength(1)
		expect(result.current.tabs[0].title).toBe(DEFAULT_TAB_TITLE)
		expect(result.current.tabs[0].activeAgentId).toBe("coordinator")
		expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
	})

	it("creates a new tab and calls clearTask", async () => {
		const { result } = renderHook(() => useChatTabs())
		await act(async () => {
			await result.current.createNewTab("implementer")
		})

		expect(result.current.tabs).toHaveLength(2)
		expect(result.current.activeTab.activeAgentId).toBe("implementer")
		expect(TaskServiceClient.clearTask).toHaveBeenCalled()
	})

	it("switches tabs and calls showTaskWithId for task tabs", async () => {
		const { result } = renderHook(() => useChatTabs())
		let firstTabId: string

		await act(async () => {
			firstTabId = result.current.activeTabId
			result.current.updateActiveTab({ taskId: "task-100", title: "Task 100" })
			await result.current.createNewTab("reviewer")
		})

		expect(result.current.tabs).toHaveLength(2)

		await act(async () => {
			await result.current.selectTab(firstTabId)
		})

		expect(result.current.activeTabId).toBe(firstTabId)
		expect(TaskServiceClient.showTaskWithId).toHaveBeenCalledWith(expect.objectContaining({ value: "task-100" }))
	})

	it("closes a tab and activates neighbor", async () => {
		const { result } = renderHook(() => useChatTabs())
		let tab2Id = ""

		await act(async () => {
			const tab2 = await result.current.createNewTab("coordinator")
			tab2Id = tab2.id
		})

		expect(result.current.tabs).toHaveLength(2)
		expect(result.current.activeTabId).toBe(tab2Id)

		await act(async () => {
			await result.current.closeTab(tab2Id)
		})

		expect(result.current.tabs).toHaveLength(1)
		expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
	})

	it("resets to a single blank tab when closing the only remaining tab", async () => {
		const { result } = renderHook(() => useChatTabs())
		const singleTabId = result.current.activeTabId

		await act(async () => {
			await result.current.closeTab(singleTabId)
		})

		expect(result.current.tabs).toHaveLength(1)
		expect(result.current.tabs[0].title).toBe(DEFAULT_TAB_TITLE)
		expect(TaskServiceClient.clearTask).toHaveBeenCalled()
	})

	it("opens a task from history into existing or new tab", async () => {
		const { result } = renderHook(() => useChatTabs())

		// Reuses initial empty tab
		await act(async () => {
			await result.current.openTaskInTab("task-past-1", "Past Task 1", "implementer")
		})

		expect(result.current.tabs).toHaveLength(1)
		expect(result.current.tabs[0].taskId).toBe("task-past-1")
		expect(result.current.tabs[0].title).toBe("Past Task 1")
		expect(TaskServiceClient.showTaskWithId).toHaveBeenCalledWith(expect.objectContaining({ value: "task-past-1" }))

		// Creates a second tab when already has task
		await act(async () => {
			await result.current.openTaskInTab("task-past-2", "Past Task 2", "reviewer")
		})

		expect(result.current.tabs).toHaveLength(2)
		expect(result.current.activeTab.taskId).toBe("task-past-2")
	})

	it("resets tab taskId and calls clearTask when active task is deleted", async () => {
		const { result } = renderHook(() => useChatTabs())

		await act(async () => {
			await result.current.openTaskInTab("task-to-delete", "Task To Delete", "coordinator")
		})

		expect(result.current.activeTab.taskId).toBe("task-to-delete")

		await act(async () => {
			await result.current.handleTaskDeleted("task-to-delete")
		})

		expect(result.current.activeTab.taskId).toBeUndefined()
		expect(result.current.activeTab.title).toBe(DEFAULT_TAB_TITLE)
		expect(TaskServiceClient.clearTask).toHaveBeenCalled()
	})

	it("switches agents within the same tab, restoring agent task or clearing for new agent", async () => {
		const { result } = renderHook(() => useChatTabs({ initialFocusAgentId: "coordinator" }))

		// First, bind task-coord-1 to coordinator
		await act(async () => {
			result.current.bindTaskToActiveAgent("task-coord-1", "Auth Feature")
		})

		expect(result.current.activeTab.agentTasks.coordinator).toBe("task-coord-1")

		// Switch to implementer (which has no task yet)
		await act(async () => {
			await result.current.switchAgentInActiveTab("implementer")
		})

		expect(result.current.activeTab.activeAgentId).toBe("implementer")
		expect(result.current.activeTab.taskId).toBeUndefined()
		expect(TaskServiceClient.clearTask).toHaveBeenCalled()

		// Bind task-impl-2 to implementer
		await act(async () => {
			result.current.bindTaskToActiveAgent("task-impl-2")
		})

		expect(result.current.activeTab.agentTasks.implementer).toBe("task-impl-2")

		// Switch back to coordinator (should restore task-coord-1)
		await act(async () => {
			await result.current.switchAgentInActiveTab("coordinator")
		})

		expect(result.current.activeTab.activeAgentId).toBe("coordinator")
		expect(result.current.activeTab.taskId).toBe("task-coord-1")
		expect(TaskServiceClient.showTaskWithId).toHaveBeenCalledWith(expect.objectContaining({ value: "task-coord-1" }))
	})
})
