import type { OrvantaWarRoomSnapshot } from "@shared/proto/cline/orvanta"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WarRoomView } from "./WarRoomView"

const makeSnapshot = (overrides?: Partial<OrvantaWarRoomSnapshot>): OrvantaWarRoomSnapshot => ({
	cards: [
		{
			id: "coordinator",
			displayName: "Coordinator",
			role: "lead",
			status: "running",
			taskTitle: "Build feature X",
			elapsedSeconds: 42,
			buffer: [
				{ kind: "progress", text: "Reading files..." },
				{ kind: "tool_start", text: "▸ read_file" },
			],
			isEphemeral: false,
		},
		{
			id: "reviewer",
			displayName: "Reviewer Bot",
			role: "teammate",
			status: "idle",
			taskTitle: "",
			elapsedSeconds: 0,
			buffer: [],
			isEphemeral: false,
		},
		{
			id: "scout-1",
			displayName: "Scout",
			role: "teammate",
			status: "idle",
			taskTitle: "",
			elapsedSeconds: 0,
			buffer: [],
			isEphemeral: true,
		},
	],
	companyName: "Acme Corp",
	purposeOneLiner: "Xây dựng AI agent",
	...overrides,
})

const defaultProps = {
	paused: false,
	filter: "all" as const,
	onPauseToggle: vi.fn(),
	onFilterChange: vi.fn(),
	onTalkToAgent: vi.fn(),
}

describe("WarRoomView", () => {
	it("shows loading state when snapshot is null", () => {
		render(<WarRoomView {...defaultProps} snapshot={null} />)
		expect(screen.getByText(/ket noi War room/i)).toBeInTheDocument()
	})

	it("shows empty state with no company", () => {
		render(<WarRoomView {...defaultProps} snapshot={{ cards: [], companyName: "", purposeOneLiner: "" }} />)
		expect(screen.getByText(/Lap cong ty tren Home/i)).toBeInTheDocument()
	})

	it("shows empty state with company but no agents", () => {
		render(<WarRoomView {...defaultProps} snapshot={{ cards: [], companyName: "Acme", purposeOneLiner: "Build AI" }} />)
		expect(screen.getByText(/Coordinator dang idle/i)).toBeInTheDocument()
	})

	it("renders cards with company header", () => {
		render(<WarRoomView {...defaultProps} snapshot={makeSnapshot()} />)
		expect(screen.getByText("Acme Corp")).toBeInTheDocument()
		expect(screen.getByText("Coordinator")).toBeInTheDocument()
		expect(screen.getByText("Reviewer Bot")).toBeInTheDocument()
	})

	it("renders ephemeral card under Guest section", () => {
		render(<WarRoomView {...defaultProps} snapshot={makeSnapshot()} />)
		expect(screen.getByText(/Guest tam thoi/i)).toBeInTheDocument()
		expect(screen.getByText("Scout")).toBeInTheDocument()
	})

	it("shows buffer lines for running card", () => {
		render(<WarRoomView {...defaultProps} snapshot={makeSnapshot()} />)
		expect(screen.getByText("Reading files...")).toBeInTheDocument()
		expect(screen.getByText("▸ read_file")).toBeInTheDocument()
	})

	it("pause button calls onPauseToggle", () => {
		const onPauseToggle = vi.fn()
		render(<WarRoomView {...defaultProps} onPauseToggle={onPauseToggle} snapshot={makeSnapshot()} />)
		fireEvent.click(screen.getByText(/Pause/i))
		expect(onPauseToggle).toHaveBeenCalledWith(true)
	})

	it("shows paused indicator when paused=true", () => {
		render(<WarRoomView {...defaultProps} paused={true} snapshot={makeSnapshot()} />)
		expect(screen.getByText(/Paused/i)).toBeInTheDocument()
		expect(screen.getByText(/Resume/i)).toBeInTheDocument()
	})

	it("filter buttons call onFilterChange", () => {
		const onFilterChange = vi.fn()
		render(<WarRoomView {...defaultProps} onFilterChange={onFilterChange} snapshot={makeSnapshot()} />)
		fireEvent.click(screen.getByText(/Dang chay/i))
		expect(onFilterChange).toHaveBeenCalledWith("running")
	})

	it("Noi button calls onTalkToAgent with agentId", () => {
		const onTalkToAgent = vi.fn()
		render(<WarRoomView {...defaultProps} onTalkToAgent={onTalkToAgent} snapshot={makeSnapshot()} />)
		const noiButtons = screen.getAllByText(/Noi$/i)
		fireEvent.click(noiButtons[0])
		expect(onTalkToAgent).toHaveBeenCalledWith("coordinator")
	})

	it("Expand panel opens on Mo click and closes on X", () => {
		render(<WarRoomView {...defaultProps} snapshot={makeSnapshot()} />)
		const moButtons = screen.getAllByText("Mo")
		fireEvent.click(moButtons[0])
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		fireEvent.click(screen.getByLabelText("Dong expand"))
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	it("no approve button visible on any card", () => {
		render(<WarRoomView {...defaultProps} snapshot={makeSnapshot()} />)
		expect(screen.queryByText(/approve/i)).not.toBeInTheDocument()
		expect(screen.queryByText(/duyet/i)).not.toBeInTheDocument()
	})

	it("search input filters cards by name", () => {
		render(<WarRoomView {...defaultProps} snapshot={makeSnapshot()} />)
		const searchInput = screen.getByLabelText("Tim kiem agent")
		fireEvent.change(searchInput, { target: { value: "Reviewer" } })
		expect(screen.getByText("Reviewer Bot")).toBeInTheDocument()
		expect(screen.queryByText("Coordinator")).not.toBeInTheDocument()
	})

	it("layout buttons toggle column layout", () => {
		render(<WarRoomView {...defaultProps} snapshot={makeSnapshot()} />)
		const col2Btn = screen.getByLabelText("2 cot")
		fireEvent.click(col2Btn)
		expect(col2Btn).toHaveClass("bg-(--vscode-button-background)")
		const col3Btn = screen.getByLabelText("3 cot")
		fireEvent.click(col3Btn)
		expect(col3Btn).toHaveClass("bg-(--vscode-button-background)")
	})

	it("virtualizes when cards > 12: mounts max 12, prioritizes running first, shows pagination", () => {
		const manyCards = Array.from({ length: 15 }, (_, i) => ({
			id: `agent-${i}`,
			displayName: `Agent ${i}`,
			role: "teammate",
			status: i === 14 ? "running" : "idle",
			taskTitle: "",
			elapsedSeconds: i === 14 ? 10 : 0,
			buffer: [],
			isEphemeral: false,
			inputTokens: 0,
			outputTokens: 0,
			cost: 0,
		}))
		render(<WarRoomView {...defaultProps} snapshot={{ cards: manyCards, companyName: "Big Co", purposeOneLiner: "Scale" }} />)
		expect(screen.getByText(/Trang 1 \/ 2/i)).toBeInTheDocument()
		// Running agent (agent-14) is prioritized and present on page 1
		expect(screen.getByText("Agent 14")).toBeInTheDocument()
		// Click Sau to go to page 2
		fireEvent.click(screen.getByText("Sau"))
		expect(screen.getByText(/Trang 2 \/ 2/i)).toBeInTheDocument()
	})

	it("Expand panel displays tokens and cost stats", () => {
		const snap = makeSnapshot({
			cards: [
				{
					id: "coder",
					displayName: "Coder",
					role: "teammate",
					status: "running",
					taskTitle: "Code task",
					elapsedSeconds: 50,
					buffer: [{ kind: "text", text: "Streaming output..." }],
					isEphemeral: false,
					inputTokens: 2000,
					outputTokens: 500,
					cost: 0.0125,
				},
			],
		})
		render(<WarRoomView {...defaultProps} snapshot={snap} />)
		fireEvent.click(screen.getByText("Mo"))
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		expect(screen.getByText(/\$0\.0125/)).toBeInTheDocument()
		expect(screen.getByText(/2,500/)).toBeInTheDocument()
	})
})
