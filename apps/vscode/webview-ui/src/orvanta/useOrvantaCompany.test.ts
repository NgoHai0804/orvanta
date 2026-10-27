import type { OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { OrvantaServiceClient } from "@/services/grpc-client"
import { useOrvantaCompany } from "./useOrvantaCompany"

vi.mock("@/services/grpc-client", () => ({
	OrvantaServiceClient: {
		getCompany: vi.fn(),
		subscribeCompany: vi.fn(),
		createCompany: vi.fn(),
	},
}))

describe("useOrvantaCompany", () => {
	const mockGetCompany = vi.mocked(OrvantaServiceClient.getCompany)
	const mockSubscribeCompany = vi.mocked(OrvantaServiceClient.subscribeCompany)
	const mockCreateCompany = vi.mocked(OrvantaServiceClient.createCompany)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("initializes with loading and subscribes on mount", async () => {
		let streamCallback: ((resp: OrvantaCompanyResponse) => void) | undefined
		const unsubscribe = vi.fn()

		mockGetCompany.mockResolvedValue({
			status: "missing",
			errors: [],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		})

		mockSubscribeCompany.mockImplementation((_req, callbacks) => {
			streamCallback = callbacks.onResponse
			return unsubscribe
		})

		const { result } = renderHook(() => useOrvantaCompany())

		await act(async () => {
			await Promise.resolve()
		})

		expect(mockGetCompany).toHaveBeenCalled()
		expect(mockSubscribeCompany).toHaveBeenCalled()

		// Stream emits ready state
		act(() => {
			streamCallback?.({
				status: "ready",
				errors: [],
				id: "corp-1",
				name: "Acme",
				purpose: "Build great things",
				teamName: "acme",
				agents: [],
			})
		})

		expect(result.current.loading).toBe(false)
		expect(result.current.company.status).toBe("ready")
		expect(result.current.company.name).toBe("Acme")
	})

	it("createCompany updates company on success", async () => {
		mockGetCompany.mockResolvedValue({
			status: "missing",
			errors: [],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		})
		mockSubscribeCompany.mockReturnValue(vi.fn())

		const readyCompany: OrvantaCompanyResponse = {
			status: "ready",
			errors: [],
			id: "corp-new",
			name: "New Corp",
			purpose: "Valid purpose for testing",
			teamName: "new-corp",
			agents: [],
		}
		mockCreateCompany.mockResolvedValue(readyCompany)

		const { result } = renderHook(() => useOrvantaCompany())

		await act(async () => {
			await result.current.createCompany("New Corp", "Valid purpose for testing")
		})

		expect(mockCreateCompany).toHaveBeenCalledWith({
			name: "New Corp",
			purpose: "Valid purpose for testing",
		})
		expect(result.current.company.status).toBe("ready")
		expect(result.current.company.id).toBe("corp-new")
		expect(result.current.createError).toBeUndefined()
	})

	it("createCompany sets createError on failure", async () => {
		mockGetCompany.mockResolvedValue({
			status: "missing",
			errors: [],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		})
		mockSubscribeCompany.mockReturnValue(vi.fn())

		mockCreateCompany.mockResolvedValue({
			status: "missing",
			errors: ["Tên đã tồn tại"],
			id: "",
			name: "",
			purpose: "",
			teamName: "",
			agents: [],
		})

		const { result } = renderHook(() => useOrvantaCompany())

		await act(async () => {
			await result.current.createCompany("Existing Corp", "Valid purpose for testing")
		})

		expect(result.current.createError).toBe("Tên đã tồn tại")
	})

	it("marks company broken when getCompany fails", async () => {
		mockGetCompany.mockRejectedValue(new Error("Unauthorized"))
		mockSubscribeCompany.mockReturnValue(vi.fn())

		const { result } = renderHook(() => useOrvantaCompany())

		await act(async () => {
			await Promise.resolve()
			await Promise.resolve()
		})

		expect(result.current.loading).toBe(false)
		expect(result.current.company.status).toBe("broken")
		expect(result.current.company.errors[0]).toContain("Unauthorized")
	})
})
