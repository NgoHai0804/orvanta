import type { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { OrvantaServiceClient } from "@/services/grpc-client"
import LibraryDialog from "./LibraryDialog"

vi.mock("@/services/grpc-client", () => ({
	OrvantaServiceClient: {
		listLibrary: vi.fn(),
		saveCompanyToLibrary: vi.fn(),
		loadCompanyFromLibrary: vi.fn(),
		deleteLibraryCompany: vi.fn(),
	},
}))

describe("LibraryDialog", () => {
	const mockCompany: OrvantaCompanyResponse = {
		status: "ready",
		id: "company-1",
		name: "Orvanta Core",
		purpose: "Xây dựng AI company",
		teamName: "orvanta-core",
		errors: [],
		agents: [
			{ id: "coordinator", displayName: "Coordinator", role: "lead", status: "idle" },
			{ id: "dev", displayName: "Dev", role: "teammate", status: "idle" },
		],
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders Save mode with name, slug preview, and agent count", () => {
		render(<LibraryDialog currentCompany={mockCompany} mode="save" onClose={vi.fn()} />)

		expect(screen.getByDisplayValue("Orvanta Core")).toBeInTheDocument()
		expect(screen.getByDisplayValue("orvanta-core")).toBeInTheDocument()
		expect(screen.getByText(/Sẽ lưu 2 agent/)).toBeInTheDocument()
		expect(screen.getByText("Lưu vào thư viện")).toBeInTheDocument()
	})

	it("calls saveCompanyToLibrary when clicking Save", async () => {
		vi.mocked(OrvantaServiceClient.saveCompanyToLibrary).mockResolvedValue({ entries: [] })
		vi.mocked(OrvantaServiceClient.listLibrary).mockResolvedValue({ entries: [] })

		render(<LibraryDialog currentCompany={mockCompany} mode="save" onClose={vi.fn()} />)

		fireEvent.click(screen.getByText("Lưu vào thư viện"))

		await waitFor(() => {
			expect(OrvantaServiceClient.saveCompanyToLibrary).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Orvanta Core",
					slug: "orvanta-core",
					overwrite: false,
				}),
			)
		})
	})

	it("renders Load mode with company entries, disables broken items", async () => {
		vi.mocked(OrvantaServiceClient.listLibrary).mockResolvedValue({
			entries: [
				{
					slug: "healthy-co",
					name: "Healthy Co",
					savedAt: "2026-10-27T12:00:00Z",
					agentCount: 3,
					purposePreview: "Healthy purpose preview",
					isBroken: false,
					error: "",
				},
				{
					slug: "broken-co",
					name: "Broken Co",
					savedAt: "2026-10-27T10:00:00Z",
					agentCount: 0,
					purposePreview: "",
					isBroken: true,
					error: "Thiếu purpose.md",
				},
			],
		})

		render(<LibraryDialog currentCompany={mockCompany} mode="load" onClose={vi.fn()} />)

		await waitFor(() => {
			expect(screen.getByText("Healthy Co")).toBeInTheDocument()
			expect(screen.getByText("Broken Co")).toBeInTheDocument()
			expect(screen.getByText("Hỏng")).toBeInTheDocument()
		})

		const loadButtons = screen.getAllByRole("button", { name: "Tải" })
		expect(loadButtons[0]).not.toBeDisabled()
		expect(loadButtons[1]).toBeDisabled()
	})

	it("shows replace confirmation modal when load returns needs_replace", async () => {
		vi.mocked(OrvantaServiceClient.listLibrary).mockResolvedValue({
			entries: [
				{
					slug: "other-co",
					name: "Other Co",
					savedAt: "2026-10-27T12:00:00Z",
					agentCount: 2,
					purposePreview: "Preview",
					isBroken: false,
					error: "",
				},
			],
		})
		vi.mocked(OrvantaServiceClient.loadCompanyFromLibrary)
			.mockResolvedValueOnce({
				status: "needs_replace",
				errors: ["needs_replace"],
				id: "",
				name: "",
				purpose: "",
				teamName: "",
				agents: [],
			})
			.mockResolvedValueOnce({
				status: "ready",
				id: "new-id",
				name: "Other Co",
				purpose: "Preview",
				teamName: "other-co",
				errors: [],
				agents: [],
			})

		const onCompanyLoaded = vi.fn()
		render(<LibraryDialog currentCompany={mockCompany} mode="load" onClose={vi.fn()} onCompanyLoaded={onCompanyLoaded} />)

		await waitFor(() => {
			expect(screen.getByText("Other Co")).toBeInTheDocument()
		})

		fireEvent.click(screen.getByRole("button", { name: "Tải" }))

		await waitFor(() => {
			expect(screen.getByText("Thay công ty hiện tại?")).toBeInTheDocument()
		})

		// Confirm replacement
		fireEvent.click(screen.getByRole("button", { name: "Thay thế" }))

		await waitFor(() => {
			expect(OrvantaServiceClient.loadCompanyFromLibrary).toHaveBeenCalledWith(
				expect.objectContaining({
					slug: "other-co",
					replace: true,
				}),
			)
			expect(onCompanyLoaded).toHaveBeenCalled()
		})
	})
})
