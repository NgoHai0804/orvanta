import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { OrvantaDecisionItem, OrvantaHistoryEntry } from "../../../src/shared/proto/cline/orvanta"
import InboxView from "./InboxView"

describe("InboxView", () => {
	const mockPending: OrvantaDecisionItem[] = [
		{
			id: "dec-hire",
			type: "hire_agent",
			status: "pending",
			createdAt: "2026-10-28T00:00:00.000Z",
			createdBy: "coordinator",
			title: "Tuyển Dev Tester",
			summary: "Cần tuyển tester phụ trách unit test",
			payloadJson: JSON.stringify({
				agentId: "dev-tester",
				displayName: "Dev Tester",
				rolePromptPreview: "Write tests",
			}),
			urgency: "normal",
		},
		{
			id: "dec-purpose",
			type: "change_purpose",
			status: "pending",
			createdAt: "2026-10-28T01:00:00.000Z",
			createdBy: "coordinator",
			title: "Cập nhật Purpose",
			summary: "Chuyển hướng kinh doanh sang AI coding",
			payloadJson: JSON.stringify({
				from: "Old purpose",
				to: "New purpose for company",
			}),
			urgency: "high",
		},
	]

	const mockDeferred: OrvantaDecisionItem[] = [
		{
			id: "dec-def",
			type: "fire_agent",
			status: "deferred",
			createdAt: "2026-10-28T00:30:00.000Z",
			createdBy: "coordinator",
			title: "Sa thải agent cũ",
			summary: "Agent không còn dùng",
			payloadJson: JSON.stringify({ agentId: "old-agent", reason: "Deprecated" }),
			urgency: "low",
		},
	]

	const mockHistory: OrvantaHistoryEntry[] = [
		{
			id: "dec-hist",
			type: "hire_agent",
			status: "approved",
			resolvedAt: "2026-10-27T00:00:00.000Z",
			resolvedBy: "ceo",
			note: "Good hire",
			title: "Đã tuyển researcher",
			summary: "Research",
			payloadJson: JSON.stringify({ agentId: "researcher" }),
			urgency: "normal",
			createdAt: "2026-10-26T00:00:00.000Z",
			createdBy: "coordinator",
		},
	]

	it("renders subtabs with counts", () => {
		render(
			<InboxView
				deferred={mockDeferred}
				history={mockHistory}
				onRefresh={vi.fn()}
				onResolve={vi.fn()}
				pending={mockPending}
			/>,
		)

		expect(screen.getByRole("button", { name: "Chờ duyệt (2)" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Để sau (1)" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Lịch sử (1)" })).toBeInTheDocument()
	})

	it("renders list of pending items and details for first selected item", () => {
		render(
			<InboxView
				deferred={mockDeferred}
				history={mockHistory}
				onRefresh={vi.fn()}
				onResolve={vi.fn()}
				pending={mockPending}
			/>,
		)

		expect(screen.getAllByText("Tuyển Dev Tester").length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText("Cập nhật Purpose")).toBeInTheDocument()
		expect(screen.getByText("dev-tester")).toBeInTheDocument()
	})

	it("filters items by type", () => {
		render(
			<InboxView
				deferred={mockDeferred}
				history={mockHistory}
				onRefresh={vi.fn()}
				onResolve={vi.fn()}
				pending={mockPending}
			/>,
		)

		const typeSelect = screen.getByLabelText("Lọc theo loại quyết định")
		fireEvent.change(typeSelect, { target: { value: "change_purpose" } })

		expect(screen.queryByText("Tuyển Dev Tester")).not.toBeInTheDocument()
		expect(screen.getAllByText("Cập nhật Purpose").length).toBeGreaterThanOrEqual(1)
	})

	it("requires confirmation modal when approving change_purpose", () => {
		render(
			<InboxView
				deferred={mockDeferred}
				focusId="dec-purpose"
				history={mockHistory}
				onRefresh={vi.fn()}
				onResolve={vi.fn()}
				pending={mockPending}
			/>,
		)

		fireEvent.click(screen.getAllByText("Cập nhật Purpose")[0])
		const approveBtn = screen.getByRole("button", { name: "Duyệt..." })
		fireEvent.click(approveBtn)

		expect(screen.getByText("Xác nhận đổi Purpose công ty?")).toBeInTheDocument()
		expect(screen.getByText(/Purpose mới sẽ được ghi đè lên purpose.md/)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Xác nhận duyệt" })).toBeInTheDocument()
	})

	it("switches to Deferred tab and displays reopen button", () => {
		const onResolve = vi.fn().mockResolvedValue(true)
		render(
			<InboxView
				deferred={mockDeferred}
				history={mockHistory}
				onRefresh={vi.fn()}
				onResolve={onResolve}
				pending={mockPending}
			/>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Để sau (1)" }))
		expect(screen.getAllByText("Sa thải agent cũ").length).toBeGreaterThanOrEqual(1)

		const reopenBtn = screen.getByRole("button", { name: "Mở lại (Chuyển về Chờ duyệt)" })
		fireEvent.click(reopenBtn)

		expect(onResolve).toHaveBeenCalledWith("dec-def", "reopen")
	})
})
