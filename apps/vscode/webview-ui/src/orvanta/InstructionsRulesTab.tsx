import { IconChevronDown, IconChevronUp, IconEye, IconPencil, IconPlus, IconSearch } from "@tabler/icons-react"
import { useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"

export interface WorkspaceRuleItem {
	id: string
	name: string
	description?: string
	source?: string
}

export const DEFAULT_WORKSPACE_RULES: WorkspaceRuleItem[] = [
	{
		id: "clinerules",
		name: ".clinerules",
		description: "Quy tắc chung và nguyên tắc ứng xử cho toàn bộ workspace",
		source: ".clinerules",
	},
	{
		id: "cursorrules",
		name: ".cursorrules",
		description: "Tương thích các quy tắc cấu trúc code Cursor",
		source: ".cursorrules",
	},
	{
		id: "bun-and-node",
		name: "bun-and-node.md",
		description: "Sử dụng Bun làm tooling và Node làm runtime thực thi",
		source: ".cline/rules/bun-and-node.md",
	},
	{
		id: "network",
		name: "network.md",
		description: "Quy chuẩn network, fetch wrapper và proxy request",
		source: ".cline/rules/network.md",
	},
	{
		id: "code-style",
		name: "code-style.md",
		description: "Quy chuẩn TypeScript, formatting, linting và naming",
		source: ".cline/rules/code-style.md",
	},
	{
		id: "security",
		name: "security.md",
		description: "Bảo mật secrets, khóa file purpose và không lộ API key",
		source: ".cline/rules/security.md",
	},
]

export interface InstructionsRulesTabProps {
	instructions: string
	setInstructions: (val: string) => void
	selectedRules: string[]
	setSelectedRules: (rules: string[]) => void
	availableRules?: WorkspaceRuleItem[]
}

export const InstructionsRulesTab = ({
	instructions,
	setInstructions,
	selectedRules,
	setSelectedRules,
	availableRules,
}: InstructionsRulesTabProps) => {
	const [mode, setMode] = useState<"edit" | "preview">("edit")
	const [isExpanded, setIsExpanded] = useState(true)
	const [ruleSearch, setRuleSearch] = useState("")
	const [newCustomRule, setNewCustomRule] = useState("")

	const allRules = useMemo<WorkspaceRuleItem[]>(() => {
		const base = availableRules && availableRules.length > 0 ? availableRules : DEFAULT_WORKSPACE_RULES
		const knownIds = new Set(base.map((r) => r.id))
		const extras: WorkspaceRuleItem[] = selectedRules
			.filter((id) => !knownIds.has(id))
			.map((id) => ({
				id,
				name: id,
				description: "Quy tắc tùy chỉnh",
				source: "custom",
			}))
		return [...base, ...extras]
	}, [availableRules, selectedRules])

	const filteredRules = useMemo(() => {
		const q = ruleSearch.trim().toLowerCase()
		if (!q) return allRules
		return allRules.filter(
			(r) =>
				r.name.toLowerCase().includes(q) ||
				r.id.toLowerCase().includes(q) ||
				(r.description && r.description.toLowerCase().includes(q)),
		)
	}, [allRules, ruleSearch])

	const handleToggleRule = (ruleId: string) => {
		if (selectedRules.includes(ruleId)) {
			setSelectedRules(selectedRules.filter((id) => id !== ruleId))
		} else {
			setSelectedRules([...selectedRules, ruleId])
		}
	}

	const handleAddCustomRule = () => {
		const trimmed = newCustomRule.trim()
		if (!trimmed) return
		if (!selectedRules.includes(trimmed)) {
			setSelectedRules([...selectedRules, trimmed])
		}
		setNewCustomRule("")
	}

	const handleSelectAllRules = () => {
		const allIds = Array.from(new Set([...selectedRules, ...filteredRules.map((r) => r.id)]))
		setSelectedRules(allIds)
	}

	const handleDeselectAllRules = () => {
		const filteredIds = new Set(filteredRules.map((r) => r.id))
		setSelectedRules(selectedRules.filter((id) => !filteredIds.has(id)))
	}

	const wordCount = useMemo(() => {
		const trimmed = instructions.trim()
		if (!trimmed) return 0
		return trimmed.split(/\s+/).length
	}, [instructions])

	return (
		<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-rules">
			{/* Section 1: Instructions Markdown with Collapsible Header */}
			<div className="rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3.5 flex flex-col gap-2.5">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<button
							className="flex items-center gap-1.5 font-semibold text-xs text-(--vscode-foreground) hover:opacity-80 cursor-pointer"
							data-testid="toggle-instructions-collapse"
							onClick={() => setIsExpanded(!isExpanded)}
							type="button">
							{isExpanded ? (
								<IconChevronUp className="text-(--vscode-descriptionForeground)" size={14} stroke={1.5} />
							) : (
								<IconChevronDown className="text-(--vscode-descriptionForeground)" size={14} stroke={1.5} />
							)}
							<span>Instructions (System Prompt)</span>
						</button>
						<span className="font-mono text-[10px] text-(--vscode-descriptionForeground) opacity-80">
							{wordCount} từ • {instructions.length} ký tự
						</span>
					</div>

					{isExpanded && (
						<div className="flex items-center gap-1 bg-(--vscode-editor-background)/80 p-0.5 rounded border border-border-panel">
							<button
								className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
									mode === "edit"
										? "bg-(--vscode-button-background) text-(--vscode-button-foreground) font-medium"
										: "text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground)"
								}`}
								data-testid="instructions-mode-edit"
								onClick={() => setMode("edit")}
								type="button">
								<IconPencil size={12} stroke={1.5} />
								<span>Soạn thảo</span>
							</button>
							<button
								className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
									mode === "preview"
										? "bg-(--vscode-button-background) text-(--vscode-button-foreground) font-medium"
										: "text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground)"
								}`}
								data-testid="instructions-mode-preview"
								onClick={() => setMode("preview")}
								type="button">
								<IconEye size={12} stroke={1.5} />
								<span>Xem trước</span>
							</button>
						</div>
					)}
				</div>

				{isExpanded ? (
					mode === "edit" ? (
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center gap-1.5 pb-1">
								<button
									className="px-2 py-0.5 text-[11px] rounded border border-border-panel hover:bg-white/5 text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) font-mono transition-colors cursor-pointer"
									data-testid="btn-format-h2"
									onClick={() =>
										setInstructions(instructions ? `${instructions}\n\n## Tiêu đề\n` : "## Tiêu đề\n")
									}
									type="button">
									H2
								</button>
								<button
									className="px-2 py-0.5 text-[11px] rounded border border-border-panel hover:bg-white/5 text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) font-bold transition-colors cursor-pointer"
									data-testid="btn-format-bold"
									onClick={() => setInstructions(instructions ? `${instructions} **đậm**` : "**đậm**")}
									type="button">
									B
								</button>
								<button
									className="px-2 py-0.5 text-[11px] rounded border border-border-panel hover:bg-white/5 text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) font-mono transition-colors cursor-pointer"
									data-testid="btn-format-code"
									onClick={() =>
										setInstructions(
											instructions ? `${instructions}\n\`\`\`\ncode\n\`\`\`\n` : "```\ncode\n```\n",
										)
									}
									type="button">
									Code
								</button>
							</div>
							<textarea
								className="field-sizing-content min-h-36 w-full resize-y rounded border border-border-panel bg-input-background p-3 font-mono text-xs leading-relaxed text-(--vscode-foreground) focus:outline-hidden focus:border-(--vscode-focusBorder)"
								data-testid="instructions-textarea"
								onChange={(e) => setInstructions(e.target.value)}
								placeholder="Hướng dẫn chi tiết vai trò, mục tiêu và nguyên tắc hành xử của agent..."
								required
								rows={7}
								value={instructions}
							/>
							<span className="text-[11px] text-(--vscode-descriptionForeground) opacity-80">
								Định dạng Markdown (# tiêu đề, - danh sách, ```code)
							</span>
						</div>
					) : (
						<div
							className="min-h-36 w-full rounded border border-border-panel bg-input-background/50 p-3.5 text-xs leading-relaxed"
							data-testid="instructions-preview-content">
							{instructions.trim() ? (
								<div className="prose prose-invert max-w-none text-xs text-(--vscode-foreground)">
									<ReactMarkdown>{instructions}</ReactMarkdown>
								</div>
							) : (
								<div className="text-(--vscode-descriptionForeground) italic text-center py-8">
									Chưa có nội dung instructions để xem trước.
								</div>
							)}
						</div>
					)
				) : (
					<div
						className="text-xs text-(--vscode-descriptionForeground) truncate cursor-pointer hover:text-(--vscode-foreground) py-0.5 opacity-80"
						onClick={() => setIsExpanded(true)}>
						{instructions.trim()
							? instructions.slice(0, 100) + (instructions.length > 100 ? "…" : "")
							: "(Trống - bấm để mở rộng soạn thảo)"}
					</div>
				)}
			</div>

			{/* Section 2: Checklist Rules with Switch Toggles & Scroll */}
			<div className="rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3.5 flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold text-(--vscode-foreground)">Rules Hệ Thống & Workspace</span>
						<span
							className="text-[10px] text-(--vscode-badge-foreground) bg-(--vscode-badge-background) px-1.5 py-0.5 rounded-full font-medium"
							data-testid="rules-count-badge">
							{selectedRules.length} gán
						</span>
					</div>

					<div className="flex items-center gap-2 text-xs">
						<button
							className="text-[11px] text-(--vscode-textLink-foreground) hover:underline cursor-pointer"
							data-testid="btn-select-all-rules"
							onClick={handleSelectAllRules}
							type="button">
							Chọn tất cả
						</button>
						<span className="opacity-40">•</span>
						<button
							className="text-[11px] text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) cursor-pointer"
							data-testid="btn-deselect-all-rules"
							onClick={handleDeselectAllRules}
							type="button">
							Bỏ chọn
						</button>
					</div>
				</div>

				<div className="relative">
					<IconSearch
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--vscode-descriptionForeground)"
						size={13}
						stroke={1.5}
					/>
					<input
						className="w-full rounded border border-border-panel bg-input-background pl-8 pr-2.5 py-1.5 text-xs text-(--vscode-foreground) focus:outline-hidden focus:border-(--vscode-focusBorder)"
						data-testid="rules-search-input"
						onChange={(e) => setRuleSearch(e.target.value)}
						placeholder="Tìm kiếm rule..."
						type="text"
						value={ruleSearch}
					/>
				</div>

				{/* Rules List with Switch Toggles */}
				<div className="flex flex-col gap-1.5" data-testid="rules-checklist">
					{filteredRules.map((rule) => {
						const isChecked = selectedRules.includes(rule.id)
						return (
							<div
								className={`flex items-center justify-between gap-3 p-2 rounded-md border transition-colors ${
									isChecked
										? "bg-(--vscode-button-background)/10 border-(--vscode-button-background)/40"
										: "bg-input-background/40 border-border-panel/70 hover:bg-input-background/70"
								}`}
								data-testid={`rule-item-${rule.id}`}
								key={rule.id}>
								<div className="flex flex-col min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="font-medium text-xs text-(--vscode-foreground) truncate">
											{rule.name}
										</span>
										{rule.source && (
											<span className="font-mono text-[10px] text-(--vscode-descriptionForeground) bg-(--vscode-editor-background) border border-border-panel px-1 py-0.2 rounded shrink-0">
												{rule.source}
											</span>
										)}
									</div>
									{rule.description && (
										<span className="text-[11px] text-(--vscode-descriptionForeground) mt-0.5 truncate">
											{rule.description}
										</span>
									)}
								</div>

								{/* Switch Toggle */}
								<label className="relative inline-flex items-center cursor-pointer shrink-0">
									<input
										checked={isChecked}
										className="sr-only peer"
										data-testid={`rule-checkbox-${rule.id}`}
										onChange={() => handleToggleRule(rule.id)}
										type="checkbox"
									/>
									<div className="w-8 h-4.5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-(--vscode-button-background)" />
								</label>
							</div>
						)
					})}

					{filteredRules.length === 0 && (
						<div className="text-center text-(--vscode-descriptionForeground) text-xs py-4">
							Không tìm thấy rule nào khớp với từ khóa.
						</div>
					)}
				</div>

				{/* Custom Rule Add */}
				<div className="flex gap-2 pt-2 border-t border-border-panel">
					<input
						className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs text-(--vscode-foreground)"
						data-testid="input-custom-rule"
						onChange={(e) => setNewCustomRule(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault()
								handleAddCustomRule()
							}
						}}
						placeholder="Thêm đường dẫn rule (ví dụ: .cline/rules/my-rule.md)..."
						type="text"
						value={newCustomRule}
					/>
					<button
						className="flex items-center gap-1 rounded bg-(--vscode-button-background) hover:bg-(--vscode-button-hoverBackground) px-3 py-1 text-xs font-medium text-(--vscode-button-foreground) transition-colors cursor-pointer shrink-0"
						data-testid="btn-add-custom-rule"
						onClick={handleAddCustomRule}
						type="button">
						<IconPlus size={13} stroke={1.5} />
						<span>Thêm rule</span>
					</button>
				</div>
			</div>
		</div>
	)
}
