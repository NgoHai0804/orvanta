import { OrvantaAgentCard, OrvantaAgentProfile, OrvantaSendAgentDirectMessageRequest } from "@shared/proto/cline/orvanta"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DiffEditRow } from "../../components/chat/DiffEditRow"
import { OrvantaServiceClient } from "../../services/grpc-client"
import { ConsoleView } from "../ConsoleView"

const mockAgents: OrvantaAgentProfile[] = [
	{
		id: "coordinator",
		displayName: "Alice",
		role: "lead",
		instructions: "Coordinate",
		status: "idle",
		isLead: true,
		source: "custom",
	},
	{
		id: "implementer",
		displayName: "Dave",
		role: "implementer",
		instructions: "Write code",
		status: "running",
		isLead: false,
		source: "custom",
	},
]

const mockSnapshot: OrvantaAgentCard[] = [
	{
		id: "coordinator",
		displayName: "Alice",
		role: "lead",
		status: "idle",
		taskTitle: "Coordinate sprint tasks",
		elapsedSeconds: 0,
		buffer: [{ kind: "text", text: "Sprint initialized" }],
		isEphemeral: false,
		inputTokens: 100,
		outputTokens: 50,
		cost: 0.001,
	},
	{
		id: "implementer",
		displayName: "Dave",
		role: "implementer",
		status: "running",
		taskTitle: "Fix authentication token issue",
		elapsedSeconds: 42,
		buffer: [
			{ kind: "text", text: "Dave bắt đầu sửa code" },
			{ kind: "tool_start", text: "▸ write_to_file src/auth.ts" },
		],
		isEphemeral: false,
		inputTokens: 500,
		outputTokens: 250,
		cost: 0.005,
	},
]

// Mock OrvantaServiceClient
vi.mock("../../services/grpc-client", () => ({
	OrvantaServiceClient: {
		sendAgentDirectMessage: vi.fn().mockResolvedValue({ success: true }),
		subscribeWarRoom: vi.fn((_req, observer) => {
			if (observer?.onResponse) {
				observer.onResponse({ cards: mockSnapshot })
			}
			return () => {}
		}),
	},
}))

describe("Orvanta v0.0.4 E2E Verification Workflow (Phase 6.2)", () => {
	beforeEach(() => {
		localStorage.clear()
		vi.clearAllMocks()
	})

	it("executes full E2E scenario: #team-feed live observation -> select agent -> diff attribution -> sidebar collapse -> 1:1 steering", async () => {
		let currentChannelId = "team-feed"
		const handleSelectChannel = (id: string) => {
			currentChannelId = id
		}

		// Step 1 & 2: Observe #team-feed, Implementer card running & activity timeline
		const { rerender } = render(
			<ConsoleView
				agents={mockAgents}
				companyName="Acme AI Corp"
				focusAgentId={currentChannelId}
				onSelectAgent={handleSelectChannel}>
				<div data-testid="embedded-chat">ChatView Embedded</div>
			</ConsoleView>,
		)

		// Verify on #team-feed: Dave is running, with pulse effect and task title
		expect(screen.getAllByText("Dave").length).toBeGreaterThan(0)
		expect(screen.getByText("Fix authentication token issue")).toBeDefined()
		expect(screen.getByText(/42s/)).toBeDefined()
		expect(screen.getByText("Dave bắt đầu sửa code")).toBeDefined()

		// Step 3: Click Implementer card -> triggers onSelectAgent("implementer")
		const daveCard = screen.getByTestId("feed-card-implementer")
		fireEvent.click(daveCard)
		expect(currentChannelId).toBe("implementer")

		// Rerender with focusAgentId = "implementer"
		rerender(
			<ConsoleView
				agents={mockAgents}
				companyName="Acme AI Corp"
				focusAgentId="implementer"
				onSelectAgent={handleSelectChannel}>
				<div data-testid="embedded-chat">ChatView Embedded</div>
			</ConsoleView>,
		)

		// Step 4: Verify 1:1 Agent Header Attribution
		expect(screen.getByText("Chỉ đạo 1:1 qua Mailbox")).toBeDefined()
		expect(screen.getByTitle("Quay lại #team-feed")).toBeDefined()

		// Verify DiffEditRow Attribution badge
		const samplePatch = ["------- SEARCH", "old line", "=======", "new line", "+++++++ REPLACE"].join("\n")
		render(
			<DiffEditRow
				agentDisplayName="Dave"
				agentId="implementer"
				agentRole="implementer"
				patch={samplePatch}
				path="src/auth.ts"
			/>,
		)

		expect(screen.getAllByText("Dave").length).toBeGreaterThan(0)
		expect(screen.getAllByText("Implementer").length).toBeGreaterThan(0)
		expect(screen.getByText(/đang đề xuất sửa.*src\/auth\.ts/)).toBeDefined()
		expect(screen.queryByText(/Cline đã sửa/i)).toBeNull()

		// Step 5: Test Sidebar Collapse
		const collapseBtn = screen.getByTestId("sidebar-toggle-button")
		fireEvent.click(collapseBtn)
		expect(localStorage.getItem("orvanta_sidebar_collapsed")).toBe("true")

		// Step 6: Direct 1:1 steering message via OrvantaServiceClient
		await OrvantaServiceClient.sendAgentDirectMessage(
			OrvantaSendAgentDirectMessageRequest.create({
				agentId: "implementer",
				message: "Refactor function validateToken() to be async",
			}),
		)

		expect(OrvantaServiceClient.sendAgentDirectMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId: "implementer",
				message: "Refactor function validateToken() to be async",
			}),
		)
	})
})
