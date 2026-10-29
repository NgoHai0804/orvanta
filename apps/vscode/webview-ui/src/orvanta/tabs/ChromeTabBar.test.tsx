import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ChromeTabBar } from "./ChromeTabBar"
import type { ChatTab } from "./types"

describe("ChromeTabBar", () => {
	const sampleTabs: ChatTab[] = [
		{
			id: "tab-1",
			title: "Tab One",
			activeAgentId: "team-feed",
			createdAt: 1000,
			lastActiveAt: 1000,
		},
		{
			id: "tab-2",
			title: "Tab Two",
			activeAgentId: "implementer",
			createdAt: 2000,
			lastActiveAt: 2000,
			isRunning: true,
		},
	]

	it("renders all tabs and highlights active tab", () => {
		render(
			<ChromeTabBar
				activeTabId="tab-2"
				onCloseTab={vi.fn()}
				onNewTab={vi.fn()}
				onSelectTab={vi.fn()}
				onToggleHistory={vi.fn()}
				tabs={sampleTabs}
			/>,
		)

		expect(screen.getByText("Tab One")).toBeInTheDocument()
		expect(screen.getByText("Tab Two")).toBeInTheDocument()

		const tabRoles = screen.getAllByRole("tab")
		expect(tabRoles[0]).toHaveAttribute("aria-selected", "false")
		expect(tabRoles[1]).toHaveAttribute("aria-selected", "true")
	})

	it("triggers onSelectTab when clicking a tab", () => {
		const handleSelect = vi.fn()
		render(
			<ChromeTabBar
				activeTabId="tab-1"
				onCloseTab={vi.fn()}
				onNewTab={vi.fn()}
				onSelectTab={handleSelect}
				onToggleHistory={vi.fn()}
				tabs={sampleTabs}
			/>,
		)

		fireEvent.click(screen.getByText("Tab Two"))
		expect(handleSelect).toHaveBeenCalledWith("tab-2")
	})

	it("triggers onCloseTab when clicking the close button", () => {
		const handleClose = vi.fn()
		render(
			<ChromeTabBar
				activeTabId="tab-1"
				onCloseTab={handleClose}
				onNewTab={vi.fn()}
				onSelectTab={vi.fn()}
				onToggleHistory={vi.fn()}
				tabs={sampleTabs}
			/>,
		)

		const closeBtn = screen.getByLabelText("Đóng tab Tab One")
		fireEvent.click(closeBtn)
		expect(handleClose).toHaveBeenCalledWith("tab-1", expect.anything())
	})

	it("triggers onNewTab when clicking the plus button", () => {
		const handleNew = vi.fn()
		render(
			<ChromeTabBar
				activeTabId="tab-1"
				onCloseTab={vi.fn()}
				onNewTab={handleNew}
				onSelectTab={vi.fn()}
				onToggleHistory={vi.fn()}
				tabs={sampleTabs}
			/>,
		)

		const plusBtn = screen.getByLabelText("Tạo cuộc trò chuyện mới")
		fireEvent.click(plusBtn)
		expect(handleNew).toHaveBeenCalledTimes(1)
	})

	it("triggers onToggleHistory when clicking the history button", () => {
		const handleToggleHistory = vi.fn()
		render(
			<ChromeTabBar
				activeTabId="tab-1"
				onCloseTab={vi.fn()}
				onNewTab={vi.fn()}
				onSelectTab={vi.fn()}
				onToggleHistory={handleToggleHistory}
				tabs={sampleTabs}
			/>,
		)

		const histBtn = screen.getByLabelText("Mở lịch sử cuộc trò chuyện")
		fireEvent.click(histBtn)
		expect(handleToggleHistory).toHaveBeenCalledTimes(1)
	})
})
