import { OrvantaAgentProfile } from "@shared/proto/cline/orvanta"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AgentEditor from "./AgentEditor"

describe("AgentEditor", () => {
	const coordinatorProfile = OrvantaAgentProfile.create({
		id: "coordinator",
		displayName: "Coordinator",
		role: "lead",
		description: "Điều phối toàn bộ dự án",
		maxIterations: 40,
		instructions: "You are coordinator.",
		tools: { allow: ["bash", "read_files"], deny: [] },
		scopePaths: { allow: ["**/*"], denyWrite: [".orvanta/company.json"] },
	})

	const teammateProfile = OrvantaAgentProfile.create({
		id: "implementer",
		displayName: "Implementer",
		role: "teammate",
		description: "Lập trình viên",
		maxIterations: 30,
		instructions: "You implement features.",
		tools: { allow: ["read_files", "edit_file"], deny: ["bash"] },
		scopePaths: { allow: ["src/**/*"], denyWrite: [] },
	})

	it("renders coordinator editor with ID disabled and no delete button", () => {
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={coordinatorProfile}
				isCoordinator={true}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		expect(screen.getByText("Sửa agent: Coordinator")).toBeInTheDocument()
		expect(screen.getByText("Lead")).toBeInTheDocument()
		const idInput = screen.getByPlaceholderText("ví dụ: reviewer") as HTMLInputElement
		expect(idInput.disabled).toBe(true)
		expect(screen.queryByRole("button", { name: "Xóa" })).not.toBeInTheDocument()
	})

	it("renders teammate editor with delete button when not new", () => {
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		expect(screen.getByText("Sửa agent: Implementer")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Xóa" })).toBeInTheDocument()
	})

	it("allows editing id when isNew is true", () => {
		render(
			<AgentEditor
				existingIds={["coordinator"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={true}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		const idInput = screen.getByPlaceholderText("ví dụ: reviewer") as HTMLInputElement
		expect(idInput.disabled).toBe(false)
	})

	it("allows editing basic fields and saving", async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const onClose = vi.fn()

		render(
			<AgentEditor
				existingIds={["coordinator"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={onClose}
				onDelete={vi.fn()}
				onSave={onSave}
			/>,
		)

		const nameInput = screen.getByDisplayValue("Implementer")
		fireEvent.change(nameInput, { target: { value: "Lead Implementer" } })

		const saveButton = screen.getByRole("button", { name: "Lưu" })
		await act(async () => {
			fireEvent.click(saveButton)
		})

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				displayName: "Lead Implementer",
				id: "implementer",
			}),
		)
	})

	it("confirms before deleting a teammate agent", async () => {
		const onDelete = vi.fn().mockResolvedValue(true)
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={onDelete}
				onSave={vi.fn()}
			/>,
		)

		const deleteBtn = screen.getByRole("button", { name: "Xóa" })
		fireEvent.click(deleteBtn)

		expect(screen.getByText("Xóa agent?")).toBeInTheDocument()
		const confirmBtn = screen.getByRole("button", { name: "Xác nhận xóa" })
		await act(async () => {
			fireEvent.click(confirmBtn)
		})

		expect(onDelete).toHaveBeenCalledWith("implementer")
	})

	it("renders all 5 sub-tabs and allows switching between them", () => {
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		expect(screen.getByTestId("editor-tab-profile")).toBeInTheDocument()
		expect(screen.getByTestId("editor-tab-model")).toBeInTheDocument()
		expect(screen.getByTestId("editor-tab-tools")).toBeInTheDocument()
		expect(screen.getByTestId("editor-tab-rules")).toBeInTheDocument()
		expect(screen.getByTestId("editor-tab-skills")).toBeInTheDocument()

		// Default is profile
		expect(screen.getByTestId("tab-panel-profile")).toBeInTheDocument()

		// Switch to model
		fireEvent.click(screen.getByTestId("editor-tab-model"))
		expect(screen.getByTestId("tab-panel-model")).toBeInTheDocument()

		// Switch to tools
		fireEvent.click(screen.getByTestId("editor-tab-tools"))
		expect(screen.getByTestId("tab-panel-tools")).toBeInTheDocument()

		// Switch to rules
		fireEvent.click(screen.getByTestId("editor-tab-rules"))
		expect(screen.getByTestId("tab-panel-rules")).toBeInTheDocument()

		// Switch to skills
		fireEvent.click(screen.getByTestId("editor-tab-skills"))
		expect(screen.getByTestId("tab-panel-skills")).toBeInTheDocument()
	})

	it("renders locked purpose paths under denyWrite in tools tab", () => {
		render(
			<AgentEditor
				defaultTab="tools"
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		expect(screen.getByText(/\.orvanta\/purpose\.md/)).toBeInTheDocument()
		expect(screen.getByText(/\.orvanta\/company\.json/)).toBeInTheDocument()
		expect(screen.getByText(/\.orvanta\/org\/roster\.json/)).toBeInTheDocument()
	})

	it("disables id, role, and reportsTo for coordinator", () => {
		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={coordinatorProfile}
				isCoordinator={true}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		const idInput = screen.getByPlaceholderText("ví dụ: reviewer")
		expect(idInput).toBeDisabled()

		const roleSelect = screen.getByTestId("agent-role-select")
		expect(roleSelect).toBeDisabled()
		expect(roleSelect).toHaveValue("lead")

		expect(screen.getByDisplayValue("Không (Root Coordinator)")).toBeDisabled()
	})

	it("enables role and reportsTo for regular agents and populates allowed managers", async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const rosterAgents = [
			{ id: "coordinator", displayName: "Company Coordinator", role: "lead", status: "idle" },
			{ id: "lead-dev", displayName: "Tech Lead", role: "lead", status: "idle", reportsTo: "coordinator" },
			{ id: "implementer", displayName: "Dev", role: "teammate", status: "idle", reportsTo: "lead-dev" },
		]

		render(
			<AgentEditor
				existingIds={["coordinator", "lead-dev", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={onSave}
				rosterAgents={rosterAgents}
			/>,
		)

		const roleSelect = screen.getByTestId("agent-role-select")
		expect(roleSelect).not.toBeDisabled()
		fireEvent.change(roleSelect, { target: { value: "lead" } })
		expect(roleSelect).toHaveValue("lead")

		const reportsToSelect = screen.getByTestId("agent-reports-to-select")
		expect(reportsToSelect).not.toBeDisabled()

		// Allowed managers should have coordinator and lead-dev
		expect(screen.getByRole("option", { name: /Company Coordinator/ })).toBeInTheDocument()
		expect(screen.getByRole("option", { name: /Tech Lead/ })).toBeInTheDocument()

		// Change manager to coordinator
		fireEvent.change(reportsToSelect, { target: { value: "coordinator" } })
		expect(reportsToSelect).toHaveValue("coordinator")

		// Click Save
		const saveBtn = screen.getByRole("button", { name: "Lưu" })
		await act(async () => {
			fireEvent.click(saveBtn)
		})

		expect(onSave).toHaveBeenCalled()
		const savedProfile = onSave.mock.calls[0][0]
		expect(savedProfile.role).toBe("lead")
		expect(savedProfile.reportsTo).toBe("coordinator")
	})

	it("supports quick actions: Chat, War room, and Sa thải agent", () => {
		const onChatWithAgent = vi.fn()
		const onOpenWarRoom = vi.fn()

		render(
			<AgentEditor
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onChatWithAgent={onChatWithAgent}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onOpenWarRoom={onOpenWarRoom}
				onSave={vi.fn()}
			/>,
		)

		const chatBtn = screen.getByTestId("quick-chat-button")
		fireEvent.click(chatBtn)
		expect(onChatWithAgent).toHaveBeenCalledWith("implementer")

		const warRoomBtn = screen.getByTestId("quick-war-room-button")
		fireEvent.click(warRoomBtn)
		expect(onOpenWarRoom).toHaveBeenCalled()

		const fireBtn = screen.getByTestId("quick-fire-button")
		fireEvent.click(fireBtn)
		expect(screen.getByText("Xóa agent?")).toBeInTheDocument()
	})

	it("renders Tab 2 (Model & AI Params) and handles model selection, reasoning, vision, and presets", async () => {
		const onSave = vi.fn().mockResolvedValue(true)

		render(
			<AgentEditor
				defaultTab="model"
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onDelete={vi.fn()}
				onSave={onSave}
			/>,
		)

		// Verify Tab 2 panel rendered
		expect(screen.getByTestId("tab-panel-model")).toBeInTheDocument()

		// 1. Model Combobox: open picker
		const triggerBtn = screen.getByTestId("model-combobox-trigger")
		fireEvent.click(triggerBtn)
		expect(screen.getByTestId("model-combobox-popover")).toBeInTheDocument()

		// Select Claude 3.7 Sonnet
		const claudeOption = screen.getByTestId("model-option-claude-3-7-sonnet-20250219")
		fireEvent.click(claudeOption)

		// Check auto-populated context and reasoning
		const contextInput = screen.getByTestId("context-window-input")
		expect(contextInput).toHaveValue(200000)

		const maxOutputInput = screen.getByTestId("max-output-tokens-input")
		expect(maxOutputInput).toHaveValue(8192)

		// 2. Reasoning Effort Segmented Control
		const highBtn = screen.getByTestId("reasoning-effort-high")
		fireEvent.click(highBtn)

		// 3. Supports Images Toggle
		const visionToggle = screen.getByTestId("supports-images-toggle")
		expect(visionToggle).toHaveAttribute("aria-checked", "true")
		fireEvent.click(visionToggle)
		expect(visionToggle).toHaveAttribute("aria-checked", "false")

		// 4. Presets
		const presetContext1M = screen.getByTestId("preset-context-1000000")
		fireEvent.click(presetContext1M)
		expect(contextInput).toHaveValue(1000000)

		const presetOutput16K = screen.getByTestId("preset-output-16384")
		fireEvent.click(presetOutput16K)
		expect(maxOutputInput).toHaveValue(16384)

		// 5. Temperature Slider
		const tempSlider = screen.getByTestId("temperature-slider")
		fireEvent.change(tempSlider, { target: { value: "1.2" } })
		expect(screen.getByTestId("temperature-display-value")).toHaveTextContent("1.2")

		// 6. Max Iterations
		const iterInput = screen.getByTestId("max-iterations-input")
		fireEvent.change(iterInput, { target: { value: "50" } })

		// Click Save
		const saveBtn = screen.getByRole("button", { name: "Lưu" })
		await act(async () => {
			fireEvent.click(saveBtn)
		})

		expect(onSave).toHaveBeenCalled()
		const saved = onSave.mock.calls[0][0]
		expect(saved.modelId).toBe("claude-3-7-sonnet-20250219")
		expect(saved.providerId).toBe("Anthropic")
		expect(saved.reasoningEffort).toBe("high")
		expect(saved.supportsImages).toBe(false)
		expect(saved.contextWindow).toBe(1000000)
		expect(saved.maxOutputTokens).toBe(16384)
		expect(saved.temperature).toBe(1.2)
		expect(saved.maxIterations).toBe(50)
	})

	it("supports entering custom model ID manually", () => {
		render(
			<AgentEditor
				defaultTab="model"
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onSave={vi.fn()}
			/>,
		)

		// Open popover
		fireEvent.click(screen.getByTestId("model-combobox-trigger"))

		// Click manual ID mode
		fireEvent.click(screen.getByTestId("enter-custom-model-id"))

		const customInput = screen.getByTestId("custom-model-id-input")
		fireEvent.change(customInput, { target: { value: "my-custom-provider/my-model" } })
		expect(customInput).toHaveValue("my-custom-provider/my-model")
	})

	it("renders Tab 3 (Tools & Quyền Hạn) and handles allow/deny tools, auto-removal, and scope paths", async () => {
		const onSave = vi.fn().mockResolvedValue(true)

		render(
			<AgentEditor
				defaultTab="tools"
				existingIds={["coordinator", "implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onSave={onSave}
			/>,
		)

		// 1. Verify Tab 3 panel
		expect(screen.getByTestId("tab-panel-tools")).toBeInTheDocument()

		// Initial allow tools has read_files
		expect(screen.getByTestId("allow-tool-chip-read_files")).toBeInTheDocument()

		// 2. Add allow tool from dropdown
		const allowSelect = screen.getByTestId("select-allow-tool-category")
		fireEvent.change(allowSelect, { target: { value: "browser_action" } })
		expect(screen.getByTestId("allow-tool-chip-browser_action")).toBeInTheDocument()

		// 3. Add tool to deny that was in allow: read_files
		const denySelect = screen.getByTestId("select-deny-tool-category")
		fireEvent.change(denySelect, { target: { value: "read_files" } })

		// Should now be in denyTools
		expect(screen.getByTestId("deny-tool-chip-read_files")).toBeInTheDocument()
		// And automatically removed from allowTools!
		expect(screen.queryByTestId("allow-tool-chip-read_files")).not.toBeInTheDocument()

		// 4. Test Scope Paths: allow patterns
		expect(screen.getByTestId("allow-path-chip-src/**/*")).toBeInTheDocument()
		const allowPathInput = screen.getByTestId("input-allow-path")
		fireEvent.change(allowPathInput, { target: { value: "docs/**" } })
		fireEvent.click(screen.getByTestId("btn-add-allow-path"))
		expect(screen.getByTestId("allow-path-chip-docs/**")).toBeInTheDocument()

		// 5. Test Scope Paths: mandatory denyWrite locked
		expect(screen.getByTestId("mandatory-deny-path-.orvanta/purpose.md")).toHaveTextContent("🔒.orvanta/purpose.md")

		// Add custom deny write path
		const customDenyInput = screen.getByTestId("input-deny-write-path")
		fireEvent.change(customDenyInput, { target: { value: ".env" } })
		fireEvent.click(screen.getByTestId("btn-add-deny-write-path"))
		expect(screen.getByTestId("custom-deny-path-.env")).toBeInTheDocument()

		// 6. Save and verify data
		const saveBtn = screen.getByRole("button", { name: "Lưu" })
		await act(async () => {
			fireEvent.click(saveBtn)
		})

		expect(onSave).toHaveBeenCalled()
		const saved = onSave.mock.calls[0][0]
		expect(saved.tools?.allow).toContain("browser_action")
		expect(saved.tools?.allow).not.toContain("read_files")
		expect(saved.tools?.deny).toContain("read_files")
		expect(saved.scopePaths?.allow).toContain("docs/**")
		expect(saved.scopePaths?.denyWrite).toContain(".env")
		expect(saved.scopePaths?.denyWrite).toContain(".orvanta/purpose.md")
	})

	it("renders Tab 4 Instructions & Rules, supports markdown preview, formatting, rule toggling and custom rules", async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const profile = OrvantaAgentProfile.create({
			id: "doc-writer",
			displayName: "Doc Writer",
			role: "teammate",
			instructions: "# Role\nYou write docs.",
			rules: ["clinerules"],
		})

		render(
			<AgentEditor
				defaultTab="rules"
				existingIds={["coordinator", "doc-writer"]}
				initialProfile={profile}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onSave={onSave}
			/>,
		)

		// 1. Verify Tab 4 panel
		expect(screen.getByTestId("tab-panel-rules")).toBeInTheDocument()

		// Initial instructions value
		const textarea = screen.getByTestId("instructions-textarea") as HTMLTextAreaElement
		expect(textarea.value).toBe("# Role\nYou write docs.")

		// Switch to Preview tab
		fireEvent.click(screen.getByTestId("instructions-mode-preview"))
		expect(screen.getByTestId("instructions-preview-content")).toBeInTheDocument()

		// Switch back to Edit tab
		fireEvent.click(screen.getByTestId("instructions-mode-edit"))
		expect(screen.getByTestId("instructions-textarea")).toBeInTheDocument()

		// Quick formatting button: H2
		fireEvent.click(screen.getByTestId("btn-format-h2"))
		expect((screen.getByTestId("instructions-textarea") as HTMLTextAreaElement).value).toContain("## Tiêu đề")

		// 2. Rules checklist
		// Verify clinerules checkbox is checked
		const clinerulesCheckbox = screen.getByTestId("rule-checkbox-clinerules") as HTMLInputElement
		expect(clinerulesCheckbox.checked).toBe(true)

		// Toggle bun-and-node on
		const bunCheckbox = screen.getByTestId("rule-checkbox-bun-and-node") as HTMLInputElement
		expect(bunCheckbox.checked).toBe(false)
		fireEvent.click(bunCheckbox)
		expect(bunCheckbox.checked).toBe(true)

		// Search rule
		const searchInput = screen.getByTestId("rules-search-input")
		fireEvent.change(searchInput, { target: { value: "security" } })
		expect(screen.getByTestId("rule-item-security")).toBeInTheDocument()

		// Clear search
		fireEvent.change(searchInput, { target: { value: "" } })

		// Add custom rule
		const customInput = screen.getByTestId("input-custom-rule")
		fireEvent.change(customInput, { target: { value: "custom-company-rule.md" } })
		fireEvent.click(screen.getByTestId("btn-add-custom-rule"))
		expect(screen.getByTestId("rule-item-custom-company-rule.md")).toBeInTheDocument()
		expect((screen.getByTestId("rule-checkbox-custom-company-rule.md") as HTMLInputElement).checked).toBe(true)

		// 3. Save and verify data
		const saveBtn = screen.getByRole("button", { name: "Lưu" })
		await act(async () => {
			fireEvent.click(saveBtn)
		})

		expect(onSave).toHaveBeenCalled()
		const saved = onSave.mock.calls[0][0]
		expect(saved.rules).toContain("clinerules")
		expect(saved.rules).toContain("bun-and-node")
		expect(saved.rules).toContain("custom-company-rule.md")
	})

	it("manages Tab 5 Skills with switch toggles and custom skills", async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const profileWithSkills = OrvantaAgentProfile.create({
			id: "developer",
			displayName: "Senior Developer",
			role: "teammate",
			description: "Core developer",
			instructions: "Write clean code",
			skills: ["test-driven-development"],
		})

		render(
			<AgentEditor
				defaultTab="skills"
				existingIds={["coordinator", "developer"]}
				initialProfile={profileWithSkills}
				isCoordinator={false}
				isNew={false}
				onClose={vi.fn()}
				onSave={onSave}
			/>,
		)

		expect(screen.getByTestId("tab-panel-skills")).toBeInTheDocument()

		// 1. Initial toggle states
		const tddToggle = screen.getByTestId("skill-toggle-test-driven-development")
		expect(tddToggle).toHaveAttribute("aria-checked", "true")

		const reviewToggle = screen.getByTestId("skill-toggle-code-review-and-quality")
		expect(reviewToggle).toHaveAttribute("aria-checked", "false")

		// 2. Toggle code-review-and-quality on
		fireEvent.click(reviewToggle)
		expect(reviewToggle).toHaveAttribute("aria-checked", "true")

		// 3. Toggle test-driven-development off
		fireEvent.click(tddToggle)
		expect(tddToggle).toHaveAttribute("aria-checked", "false")

		// 4. Search skill
		const searchInput = screen.getByTestId("skill-search-input")
		fireEvent.change(searchInput, { target: { value: "Security" } })
		expect(screen.getByTestId("skill-card-security-and-hardening")).toBeInTheDocument()

		// Clear search
		fireEvent.change(searchInput, { target: { value: "" } })

		// 5. Add custom skill
		const customInput = screen.getByTestId("new-custom-skill-input")
		fireEvent.change(customInput, { target: { value: "custom-graphql-skill" } })
		fireEvent.click(screen.getByTestId("add-custom-skill-btn"))

		expect(screen.getByTestId("skill-card-custom-graphql-skill")).toBeInTheDocument()
		expect(screen.getByTestId("skill-toggle-custom-graphql-skill")).toHaveAttribute("aria-checked", "true")

		// 6. Save and verify data
		const saveBtn = screen.getByRole("button", { name: "Lưu" })
		await act(async () => {
			fireEvent.click(saveBtn)
		})

		expect(onSave).toHaveBeenCalled()
		const saved = onSave.mock.calls[0][0]
		expect(saved.skills).toContain("code-review-and-quality")
		expect(saved.skills).toContain("custom-graphql-skill")
		expect(saved.skills).not.toContain("test-driven-development")
	})

	it("shows saveSuccess banner and spinner when saving succeeds", async () => {
		const onSave = vi.fn().mockResolvedValue(true)
		const onClose = vi.fn()

		render(
			<AgentEditor
				existingIds={["implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={onClose}
				onSave={onSave}
			/>,
		)

		const saveBtn = screen.getByTestId("save-agent-button")
		expect(saveBtn).toHaveTextContent("Lưu")

		await act(async () => {
			fireEvent.click(saveBtn)
		})

		expect(onSave).toHaveBeenCalled()
		expect(screen.getByTestId("save-success-banner")).toBeInTheDocument()
		expect(screen.getByTestId("save-success-banner")).toHaveTextContent("Đã lưu thông tin agent thành công!")
	})

	it("tracks dirty state, triggers onDirtyChange, and displays dirty indicator in action footer", async () => {
		const onDirtyChange = vi.fn()
		const onClose = vi.fn()

		render(
			<AgentEditor
				existingIds={["implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={onClose}
				onDirtyChange={onDirtyChange}
				onSave={vi.fn().mockResolvedValue(true)}
			/>,
		)

		// Initially clean
		expect(screen.getByText("Đã đồng bộ")).toBeInTheDocument()
		expect(screen.queryByTestId("dirty-indicator")).not.toBeInTheDocument()

		// Change display name
		const nameInput = screen.getByPlaceholderText("Tên agent")
		fireEvent.change(nameInput, { target: { value: "Reviewer Modified Name" } })

		// Now dirty
		expect(onDirtyChange).toHaveBeenLastCalledWith(true)
		expect(screen.getByTestId("dirty-indicator")).toBeInTheDocument()
		expect(screen.getByTestId("dirty-indicator")).toHaveTextContent("Có thay đổi chưa lưu")

		// Footer save button is also present
		expect(screen.getByTestId("editor-save-button")).toBeInTheDocument()
	})

	it("guards against unsaved changes on close and allows user to discard or continue", async () => {
		const onClose = vi.fn()

		render(
			<AgentEditor
				existingIds={["implementer"]}
				initialProfile={teammateProfile}
				isCoordinator={false}
				isNew={false}
				onClose={onClose}
				onSave={vi.fn().mockResolvedValue(true)}
			/>,
		)

		// Change instructions to make it dirty
		fireEvent.click(screen.getByTestId("editor-tab-rules"))
		const textarea = screen.getByTestId("instructions-textarea")
		fireEvent.change(textarea, { target: { value: "Modified instructions" } })

		// Click Close button
		const closeButtons = screen.getAllByRole("button", { name: /Đóng/ })
		fireEvent.click(closeButtons[0])

		// Discard confirm modal appears
		expect(screen.getByTestId("discard-confirm-modal")).toBeInTheDocument()
		expect(screen.getByTestId("discard-confirm-modal")).toHaveTextContent(
			"Bạn có thay đổi chưa lưu trên Agent này. Bạn có muốn bỏ thay đổi không?",
		)
		expect(onClose).not.toHaveBeenCalled()

		// User clicks "Tiếp tục chỉnh sửa"
		fireEvent.click(screen.getByRole("button", { name: "Tiếp tục chỉnh sửa" }))
		expect(screen.queryByTestId("discard-confirm-modal")).not.toBeInTheDocument()
		expect(onClose).not.toHaveBeenCalled()

		// Click Close again and confirm discard
		fireEvent.click(closeButtons[0])
		expect(screen.getByTestId("discard-confirm-modal")).toBeInTheDocument()
		fireEvent.click(screen.getByTestId("discard-confirm-button"))

		expect(onClose).toHaveBeenCalled()
	})
})
