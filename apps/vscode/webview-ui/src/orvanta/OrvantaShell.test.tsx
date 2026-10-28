import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import OrvantaShell from "./OrvantaShell"

let mockCompanyStatus = "missing"
let mockPendingCount = 0

vi.mock("./HomeView", () => ({
	default: () => <div data-testid="mock-home-view">Mock HomeView</div>,
}))

vi.mock("./InboxView", () => ({
	default: () => <div data-testid="mock-inbox-view">Mock InboxView</div>,
}))

vi.mock("./useOrvantaCompany", () => ({
	useOrvantaCompany: () => ({
		company: {
			status: mockCompanyStatus,
			errors: [],
			id: "co-1",
			name: "Test",
			purpose: "Purpose",
			teamName: "team",
			agents: [],
		},
		loading: false,
		creating: false,
		createError: undefined,
		createCompany: vi.fn(),
	}),
}))

vi.mock("./useOrvantaInbox", () => ({
	useOrvantaInbox: () => ({
		pending: mockPendingCount > 0 ? [{ id: "dec-1", title: "Test Decision", urgency: "normal" }] : [],
		deferred: [],
		history: [],
		pendingCount: mockPendingCount,
		loading: false,
		error: null,
		resolveDecision: vi.fn(),
		requestDecision: vi.fn(),
		refresh: vi.fn(),
	}),
}))

vi.mock("./useWarRoom", () => ({
	useWarRoom: () => ({
		snapshot: null,
		paused: false,
		filter: "all",
		setPaused: vi.fn(),
		setFilter: vi.fn(),
	}),
}))

describe("OrvantaShell", () => {
	it("renders 4 tabs: Home, Inbox, Chat, War room", () => {
		mockCompanyStatus = "missing"
		mockPendingCount = 0
		render(<OrvantaShell activeTab="home" onTabChange={vi.fn()} />)
		expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "War room" })).toBeInTheDocument()
	})

	it("disables Inbox when company missing; war-room disabled without company", () => {
		mockCompanyStatus = "missing"
		render(<OrvantaShell activeTab="home" onTabChange={vi.fn()} />)
		const inboxBtn = screen.getByRole("button", { name: "Inbox" })
		const warRoomBtn = screen.getByRole("button", { name: "War room" })

		expect(inboxBtn).toBeDisabled()
		expect(inboxBtn).toHaveAttribute("title", "Lập công ty trên Home để mở Inbox")

		expect(warRoomBtn).toBeDisabled()
		expect(warRoomBtn).toHaveAttribute("title", "Lập công ty trên Home để mở War room")
	})

	it("enables Inbox tab and displays badge when company is ready and has pending decisions", () => {
		mockCompanyStatus = "ready"
		mockPendingCount = 3
		const onTabChange = vi.fn()
		render(<OrvantaShell activeTab="home" onTabChange={onTabChange} />)

		const inboxBtn = screen.getByRole("button", { name: "Inbox, 3 pending" })
		expect(inboxBtn).toBeEnabled()
		expect(screen.getByText("3")).toBeInTheDocument()

		fireEvent.click(inboxBtn)
		expect(onTabChange).toHaveBeenCalledWith("inbox")
	})

	it("enables Home and Chat tabs and calls onTabChange when clicked", () => {
		const onTabChange = vi.fn()
		render(<OrvantaShell activeTab="home" onTabChange={onTabChange} />)

		const chatBtn = screen.getByRole("button", { name: "Chat" })
		expect(chatBtn).toBeEnabled()
		fireEvent.click(chatBtn)
		expect(onTabChange).toHaveBeenCalledWith("chat")
	})

	it("renders HomeView when activeTab is home", () => {
		render(<OrvantaShell activeTab="home" onTabChange={vi.fn()} />)
		expect(screen.getByTestId("mock-home-view")).toBeInTheDocument()
	})

	it("renders InboxView when activeTab is inbox", () => {
		render(<OrvantaShell activeTab="inbox" onTabChange={vi.fn()} />)
		expect(screen.getByTestId("mock-inbox-view")).toBeInTheDocument()
	})

	it("does not render HomeView or InboxView when activeTab is chat", () => {
		render(<OrvantaShell activeTab="chat" onTabChange={vi.fn()} />)
		expect(screen.queryByTestId("mock-home-view")).not.toBeInTheDocument()
		expect(screen.queryByTestId("mock-inbox-view")).not.toBeInTheDocument()
	})
})
