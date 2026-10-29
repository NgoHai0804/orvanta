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

	it("renders change_scope item and displays outside purpose reason", () => {
		const scopePending: OrvantaDecisionItem[] = [
			{
				id: "dec-scope",
				type: "change_scope",
				status: "pending",
				createdAt: "2026-10-28T02:00:00.000Z",
				createdBy: "coordinator",
				title: "Mở rộng scope sang Docker",
				summary: "Cần docker",
				payloadJson: JSON.stringify({
					taskId: "task-infra-1",
					title: "Setup Docker",
					whyOutsidePurpose: "Purpose không bao gồm docker infrastructure",
					proposedScope: "Dockerfile, compose.yml",
				}),
				urgency: "normal",
			},
		]

		render(<InboxView deferred={[]} history={[]} onRefresh={vi.fn()} onResolve={vi.fn()} pending={scopePending} />)

		expect(screen.getAllByText("Mở rộng scope sang Docker").length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText("Purpose không bao gồm docker infrastructure")).toBeInTheDocument()
		expect(screen.getByText("Dockerfile, compose.yml")).toBeInTheDocument()
	})

	it("requires note >= 8 chars when rejecting merge decision", () => {
		const mergePending: OrvantaDecisionItem[] = [
			{
				id: "dec-merge",
				type: "merge",
				status: "pending",
				createdAt: "2026-10-28T03:00:00.000Z",
				createdBy: "implementer",
				title: "Duyệt merge Auth v2",
				summary: "PR #12",
				payloadJson: JSON.stringify({
					outcomeId: "out-auth-12",
					authorAgentId: "implementer",
					diffSummary: "+200 -50 lines in auth.ts",
					files: ["src/auth.ts"],
				}),
				urgency: "high",
			},
		]

		render(<InboxView deferred={[]} history={[]} onRefresh={vi.fn()} onResolve={vi.fn()} pending={mergePending} />)

		expect(screen.getAllByText("Duyệt merge Auth v2").length).toBeGreaterThanOrEqual(1)
		expect(screen.getByText("out-auth-12")).toBeInTheDocument()

		// Click Từ chối
		const rejectBtn = screen.getByRole("button", { name: /Từ chối/ })
		fireEvent.click(rejectBtn)

		// Modal opens
		expect(screen.getByRole("heading", { name: /Từ chối Merge/ })).toBeInTheDocument()
		const confirmRejectBtn = screen.getByRole("button", { name: "Xác nhận từ chối" })
		// Disabled because note is empty (< 8 chars)
		expect(confirmRejectBtn).toBeDisabled()

		// Type short note < 8 chars
		const noteInput = screen.getByLabelText(/Lý do từ chối/)
		fireEvent.change(noteInput, { target: { value: "Short" } })
		expect(confirmRejectBtn).toBeDisabled()
		expect(screen.getByText(/Lý do cần tối thiểu 8 ký tự/)).toBeInTheDocument()

		// Type valid note >= 8 chars
		fireEvent.change(noteInput, { target: { value: "Thiếu unit test cho auth module" } })
		expect(confirmRejectBtn).not.toBeDisabled()
	})

	it("filters items by urgency including critical", () => {
		const criticalPending: OrvantaDecisionItem[] = [
			{
				id: "dec-crit",
				type: "over_budget",
				status: "pending",
				createdAt: "2026-10-28T04:00:00.000Z",
				createdBy: "coordinator",
				title: "Vượt ngân sách khẩn cấp",
				summary: "Chi phí vượt $500",
				payloadJson: JSON.stringify({ estimatedCostUsd: 550, budgetLimitUsd: 500 }),
				urgency: "critical",
			},
			{
				id: "dec-normal",
				type: "hire_agent",
				status: "pending",
				createdAt: "2026-10-28T04:30:00.000Z",
				createdBy: "coordinator",
				title: "Tuyển tester bình thường",
				summary: "Tuyển tester",
				payloadJson: JSON.stringify({ agentId: "tester" }),
				urgency: "normal",
			},
		]

		render(<InboxView deferred={[]} history={[]} onRefresh={vi.fn()} onResolve={vi.fn()} pending={criticalPending} />)

		const urgencySelect = screen.getByLabelText("Lọc theo mức độ khẩn cấp")
		fireEvent.change(urgencySelect, { target: { value: "critical" } })

		expect(screen.getAllByText("Vượt ngân sách khẩn cấp").length).toBeGreaterThanOrEqual(1)
		expect(screen.queryByText("Tuyển tester bình thường")).not.toBeInTheDocument()
	})

	it("renders Maker-Checker audit and Impact Analysis sections", () => {
		const auditPending: OrvantaDecisionItem[] = [
			{
				id: "dec-audit",
				type: "hire_agent",
				status: "pending",
				createdAt: "2026-10-28T05:00:00.000Z",
				createdBy: "coordinator",
				title: "Tuyển Security Auditor",
				summary: "Cần bảo mật hệ thống",
				payloadJson: JSON.stringify({
					agentId: "sec-auditor",
					displayName: "Sec Pro",
					reviewer: "skeptic",
					tokensEstimate: "~2.5k tokens",
				}),
				urgency: "high",
			},
		]

		render(<InboxView deferred={[]} history={[]} onRefresh={vi.fn()} onResolve={vi.fn()} pending={auditPending} />)

		// Maker-Checker Audit
		expect(screen.getByText(/Biên bản thẩm định độc lập/)).toBeInTheDocument()
		expect(screen.getByText("DoD Verified")).toBeInTheDocument()
		expect(screen.getByText("@skeptic")).toBeInTheDocument()
		expect(screen.getByText(/Phân tách thẩm quyền Maker-Checker/)).toBeInTheDocument()

		// Impact Analysis
		expect(screen.getByText(/Đánh giá tác động & Rủi ro/)).toBeInTheDocument()
		expect(screen.getByText("~2.5k tokens")).toBeInTheDocument()

		// Sticky Action Footer
		expect(screen.getByText("Hành động phê duyệt sẽ được ghi vào audit log")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Để sau" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Từ chối" })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Phê duyệt" })).toBeInTheDocument()
	})

	it("renders clean empty state with IconCheck and zero decorative emojis", () => {
		const { container } = render(
			<InboxView deferred={[]} history={[]} onRefresh={vi.fn()} onResolve={vi.fn()} pending={[]} />,
		)

		expect(screen.getByText("Hộp thư sạch sẽ!")).toBeInTheDocument()
		expect(screen.getByText("Toàn bộ công việc đang diễn ra tự động và trơn tru.")).toBeInTheDocument()

		// Verify zero decorative emojis like 🎉, ✓, ✗, ★
		const text = container.textContent || ""
		expect(text).not.toContain("🎉")
		expect(text).not.toContain("✓")
		expect(text).not.toContain("✗")
		expect(text).not.toContain("★")
	})
})
