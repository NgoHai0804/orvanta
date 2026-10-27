import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import OrvantaShell from "./OrvantaShell"

vi.mock("./HomeView", () => ({
	default: () => <div data-testid="mock-home-view">Mock HomeView</div>,
}))

vi.mock("./useOrvantaCompany", () => ({
	useOrvantaCompany: () => ({
		company: { status: "missing", errors: [], id: "", name: "", purpose: "", teamName: "", agents: [] },
		loading: false,
		creating: false,
		createError: undefined,
		createCompany: vi.fn(),
	}),
}))

describe("OrvantaShell", () => {
	it("renders 4 tabs: Home, Inbox, Chat, War room", () => {
		render(<OrvantaShell activeTab="home" onTabChange={vi.fn()} />)
		expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "War room" })).toBeInTheDocument()
	})

	it("disables Inbox and War room tabs with 'Pha sau' tooltip", () => {
		render(<OrvantaShell activeTab="home" onTabChange={vi.fn()} />)
		const inboxBtn = screen.getByRole("button", { name: "Inbox" })
		const warRoomBtn = screen.getByRole("button", { name: "War room" })

		expect(inboxBtn).toBeDisabled()
		expect(inboxBtn).toHaveAttribute("title", "Pha sau")

		expect(warRoomBtn).toBeDisabled()
		expect(warRoomBtn).toHaveAttribute("title", "Pha sau")
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

	it("does not render HomeView when activeTab is chat", () => {
		render(<OrvantaShell activeTab="chat" onTabChange={vi.fn()} />)
		expect(screen.queryByTestId("mock-home-view")).not.toBeInTheDocument()
	})
})
