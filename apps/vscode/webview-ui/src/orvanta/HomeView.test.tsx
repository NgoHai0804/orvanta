import type { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import HomeView from "./HomeView"

vi.mock("@/components/common/MarkdownBlock", () => ({
	default: ({ markdown }: { markdown: string }) => <div data-testid="markdown-content">{markdown}</div>,
}))

describe("HomeView", () => {
	const defaultProps = {
		creating: false,
		onCreate: vi.fn(),
	}

	it("renders loading state when loading is true", () => {
		const company: OrvantaCompanyResponse = {
			status: "missing",
			errors: [],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} loading={true} />)
		expect(screen.getByText("Đang tải…")).toBeInTheDocument()
	})

	it("renders 'Mở một folder workspace' when missing and no folder is open", () => {
		const company: OrvantaCompanyResponse = {
			status: "missing",
			errors: ["no_folder"],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} />)
		expect(screen.getByText("Mở một folder workspace để lập công ty.")).toBeInTheDocument()
	})

	it("renders CreateCompanyForm when proto omits errors and agents", () => {
		const company = {
			status: "missing",
			id: "",
			name: "",
			purpose: "",
			teamName: "",
		} as OrvantaCompanyResponse
		render(<HomeView {...defaultProps} company={company} />)
		expect(screen.getByText("Lập công ty cho folder này")).toBeInTheDocument()
	})

	it("renders CreateCompanyForm when missing with a workspace folder", () => {
		const company: OrvantaCompanyResponse = {
			status: "missing",
			errors: [],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} />)
		expect(screen.getByText("Lập công ty cho folder này")).toBeInTheDocument()
		expect(screen.getByPlaceholderText("Tên công ty")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Lập công ty" })).toBeInTheDocument()
	})

	it("submits the form with trimmed name and purpose", () => {
		const onCreate = vi.fn().mockResolvedValue(undefined)
		const company: OrvantaCompanyResponse = {
			status: "missing",
			errors: [],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} onCreate={onCreate} />)

		const nameInput = screen.getByPlaceholderText("Tên công ty")
		fireEvent.change(nameInput, { target: { value: "  Orvanta Corp  " } })

		const submitButton = screen.getByRole("button", { name: "Lập công ty" })
		fireEvent.click(submitButton)

		expect(onCreate).toHaveBeenCalledWith("Orvanta Corp", expect.stringContaining("Purpose"))
	})

	it("validates client-side if name is empty or purpose is too short", () => {
		const onCreate = vi.fn().mockResolvedValue(undefined)
		const company: OrvantaCompanyResponse = {
			status: "missing",
			errors: [],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} onCreate={onCreate} />)

		const nameInput = screen.getByPlaceholderText("Tên công ty")
		fireEvent.change(nameInput, { target: { value: "   " } })

		const submitButton = screen.getByRole("button", { name: "Lập công ty" })
		fireEvent.click(submitButton)

		expect(onCreate).not.toHaveBeenCalled()
		expect(screen.getByText("Vui lòng nhập tên công ty")).toBeInTheDocument()
	})

	it("displays createError when provided", () => {
		const company: OrvantaCompanyResponse = {
			status: "missing",
			errors: [],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} createError="Công ty đã tồn tại" />)
		expect(screen.getByText("Công ty đã tồn tại")).toBeInTheDocument()
	})

	it("displays broken state with errors list", () => {
		const company: OrvantaCompanyResponse = {
			status: "broken",
			errors: ["thiếu purpose.md", "org/roster.json không hợp lệ"],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} />)
		expect(screen.getByText("Công ty bị lỗi")).toBeInTheDocument()
		expect(screen.getByText("thiếu purpose.md")).toBeInTheDocument()
		expect(screen.getByText("org/roster.json không hợp lệ")).toBeInTheDocument()
	})

	it("displays ready state with company name, purpose, and roster", () => {
		const company: OrvantaCompanyResponse = {
			status: "ready",
			errors: [],
			id: "orvanta-123",
			name: "Acme Corp",
			purpose: "# Purpose\n\n## Chúng ta đang làm gì\nXây dựng AI agent",
			teamName: "acme-corp",
			agents: [
				{
					id: "coordinator",
					displayName: "Coordinator",
					role: "lead",
					status: "idle",
				},
			],
		}
		render(<HomeView {...defaultProps} company={company} />)
		expect(screen.getByText("Acme Corp")).toBeInTheDocument()
		expect(screen.getByText("Chúng ta đang làm gì")).toBeInTheDocument()
		expect(screen.getByTestId("markdown-content")).toBeInTheDocument()
		expect(screen.getByText("Coordinator")).toBeInTheDocument()
		expect(screen.getByText("lead")).toBeInTheDocument()
		expect(screen.getByText("idle")).toBeInTheDocument()
	})

	it("toggles purpose expand and collapse", () => {
		const company: OrvantaCompanyResponse = {
			status: "ready",
			errors: [],
			id: "orvanta-123",
			name: "Acme Corp",
			purpose: "Mục đích dài...",
			teamName: "acme-corp",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} />)
		const toggleBtn = screen.getByRole("button", { name: "Xem thêm" })
		fireEvent.click(toggleBtn)
		expect(screen.getByRole("button", { name: "Thu gọn" })).toBeInTheDocument()
	})
	it("renders inbox teaser with pending count and items", () => {
		const onOpenInbox = vi.fn()
		const company: OrvantaCompanyResponse = {
			status: "ready",
			errors: [],
			id: "orvanta-123",
			name: "Acme Corp",
			purpose: "Mục đích",
			teamName: "acme-corp",
			agents: [],
		}
		const inboxPending = [
			{
				id: "dec-1",
				type: "hire_agent",
				status: "pending",
				createdAt: "",
				createdBy: "coord",
				title: "Tuyển tester",
				summary: "Need QA",
				payloadJson: "{}",
				urgency: "normal",
			},
		]
		render(<HomeView {...defaultProps} company={company} inboxPending={inboxPending} onOpenInbox={onOpenInbox} />)
		expect(screen.getByText("Quyết định chờ")).toBeInTheDocument()
		expect(screen.getByText("Tuyển tester")).toBeInTheDocument()

		fireEvent.click(screen.getByRole("button", { name: "Mở Inbox →" }))
		expect(onOpenInbox).toHaveBeenCalledWith()

		fireEvent.click(screen.getByText("Tuyển tester"))
		expect(onOpenInbox).toHaveBeenCalledWith("dec-1")
	})

	it("opens Edit Purpose modal and requests decision", async () => {
		const onRequestDecision = vi.fn().mockResolvedValue({ id: "dec-purpose" })
		const company: OrvantaCompanyResponse = {
			status: "ready",
			errors: [],
			id: "orvanta-123",
			name: "Acme Corp",
			purpose: "Mục đích cũ của công ty",
			teamName: "acme-corp",
			agents: [],
		}
		render(<HomeView {...defaultProps} company={company} onRequestDecision={onRequestDecision} />)

		fireEvent.click(screen.getByRole("button", { name: "Sửa Purpose" }))
		expect(screen.getByText("Đề xuất đổi Purpose công ty")).toBeInTheDocument()

		const textarea = screen.getByPlaceholderText("Nhập purpose mới cho công ty...")
		fireEvent.change(textarea, { target: { value: "Mục đích mới đã được cập nhật dài hơn 20 ký tự" } })

		fireEvent.click(screen.getByRole("button", { name: "Gửi đề xuất vào Inbox" }))

		expect(onRequestDecision).toHaveBeenCalledWith(
			"change_purpose",
			"Đề xuất đổi Purpose",
			"Cập nhật purpose công ty",
			expect.objectContaining({
				from: "Mục đích cũ của công ty",
				to: "Mục đích mới đã được cập nhật dài hơn 20 ký tự",
			}),
			"high",
		)
	})
})
