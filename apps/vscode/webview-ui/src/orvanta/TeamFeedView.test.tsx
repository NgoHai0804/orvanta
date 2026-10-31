import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TeamFeedView } from "./TeamFeedView"

const mockSnapshot = {
	companyName: "Acme Corp",
	purposeOneLiner: "Pioneering AI tech",
	cards: [
		{
			id: "coordinator",
			displayName: "Lead Bot",
			role: "lead",
			status: "running",
			taskTitle: "Coordinate Sprint 1",
			elapsedSeconds: 75,
			buffer: [
				{ kind: "progress", text: "Assigning task to implementer" },
				{ kind: "text", text: "Please review Auth PR" },
			],
			isEphemeral: false,
			inputTokens: 100,
			outputTokens: 50,
			cost: 0.01,
		},
		{
			id: "implementer",
			displayName: "Dave Coder",
			role: "implementer",
			status: "idle",
			taskTitle: "Refactor module",
			elapsedSeconds: 0,
			buffer: [{ kind: "tool_result", text: "npm test passed" }],
			isEphemeral: false,
			inputTokens: 200,
			outputTokens: 100,
			cost: 0.02,
		},
	],
}

let currentSnapshot = mockSnapshot

vi.mock("./useWarRoom", () => ({
	useWarRoom: () => ({
		snapshot: currentSnapshot,
		syncStatus: "live",
		lastUpdatedAt: undefined,
		pauseStatus: "none",
		needsAttention: [],
		pauseError: undefined,
		canPauseRuntime: false,
		requestRuntimePause: vi.fn(),
		requestRuntimeResume: vi.fn(),
		paused: false,
		filter: "all",
		setPaused: vi.fn(),
		setFilter: vi.fn(),
	}),
}))

describe("TeamFeedView", () => {
	beforeEach(() => {
		currentSnapshot = mockSnapshot
		vi.clearAllMocks()
	})

	it("renders header with team-feed, company name, and running count badge", () => {
		render(<TeamFeedView companyName="Acme Corp" onSelectAgent={vi.fn()} />)

		expect(screen.getByText("team-feed")).toBeInTheDocument()
		expect(screen.getByText("(Acme Corp)")).toBeInTheDocument()
		expect(screen.getByText("1 đang chạy")).toBeInTheDocument()
	})

	it("renders Mini War Room live cards grid with agent details and elapsed time", () => {
		const onSelectAgent = vi.fn()
		render(<TeamFeedView companyName="Acme Corp" onSelectAgent={onSelectAgent} />)

		expect(screen.getByText(/Mini War Room/)).toBeInTheDocument()
		expect(screen.getAllByText("Lead Bot").length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText("Dave Coder").length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText("Coordinate Sprint 1")).toBeInTheDocument()
		expect(screen.getByText("1m15s")).toBeInTheDocument()

		// Clicking card triggers onSelectAgent
		const card = screen.getByTestId("feed-card-coordinator")
		fireEvent.click(card)
		expect(onSelectAgent).toHaveBeenCalledWith("coordinator")
	})

	it("renders Global Activity Timeline with merged events from agent buffers", () => {
		render(<TeamFeedView companyName="Acme Corp" onSelectAgent={vi.fn()} />)

		expect(screen.getByText(/Dòng Thời Gian Hoạt Động/)).toBeInTheDocument()
		expect(screen.getByText("Assigning task to implementer")).toBeInTheDocument()
		expect(screen.getByText("Please review Auth PR")).toBeInTheDocument()
		expect(screen.getByText("npm test passed")).toBeInTheDocument()
	})

	it("renders empty timeline state when agents have empty buffers and zero decorative emojis", () => {
		currentSnapshot = {
			...mockSnapshot,
			cards: [
				{
					...mockSnapshot.cards[0],
					buffer: [],
				},
				{
					...mockSnapshot.cards[1],
					buffer: [],
				},
			],
		}

		const { container } = render(<TeamFeedView companyName="Acme Corp" onSelectAgent={vi.fn()} />)

		expect(screen.getByText("Kênh chung #team-feed đang chờ hoạt động.")).toBeInTheDocument()

		// Ensure zero decorative emojis
		const text = container.textContent || ""
		expect(text).not.toContain("🎉")
		expect(text).not.toContain("★")
		expect(text).not.toContain("⭐")
		expect(text).not.toContain("✓")
		expect(text).not.toContain("✗")
	})
})
