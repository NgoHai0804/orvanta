import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const openFileRelativePath = vi.fn().mockResolvedValue(undefined)
vi.mock("@/services/grpc-client", () => ({
	FileServiceClient: { openFileRelativePath: (request: unknown) => openFileRelativePath(request) },
}))
vi.mock("@shared/proto/cline/common", () => ({
	StringRequest: { create: (x: unknown) => x },
}))

import { DiffEditRow } from "./DiffEditRow"

const patch = ["------- SEARCH", "old line", "=======", "new line", "+++++++ REPLACE"].join("\n")

describe("DiffEditRow", () => {
	it("opens a local task's file in the editor", () => {
		openFileRelativePath.mockClear()
		render(<DiffEditRow patch={patch} path="src/app.ts" />)

		fireEvent.click(screen.getByText("src/app.ts"))

		expect(openFileRelativePath).toHaveBeenCalledWith({ value: "src/app.ts" })
	})

	it("does not offer to open a file that lives in a cloud sandbox", () => {
		openFileRelativePath.mockClear()
		render(<DiffEditRow canOpenFile={false} patch={patch} path="src/app.ts" />)

		// The path is relative to the sandbox's /workspace; resolving it against the
		// local workspace would open an unrelated file or fail.
		fireEvent.click(screen.getByText("src/app.ts"))

		expect(openFileRelativePath).not.toHaveBeenCalled()
		expect(screen.queryByTitle("Open file in editor")).toBeNull()
	})

	it("renders AgentBadge and attribution text when agent metadata is provided", () => {
		render(
			<DiffEditRow
				agentDisplayName="Dave"
				agentId="implementer"
				agentRole="implementer"
				patch={patch}
				path="src/auth.ts"
			/>,
		)

		// Check AgentBadge rendered
		const badge = screen.getByTestId("agent-badge")
		expect(badge).toBeInTheDocument()
		expect(badge.textContent).toContain("Dave")
		// Check attribution text contains "đang đề xuất sửa" and path
		expect(screen.getByText(/đang đề xuất sửa.*src\/auth\.ts/)).toBeInTheDocument()
	})
})
