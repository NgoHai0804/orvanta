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
		<div className="flex flex-col gap-5" data-testid="tab-panel-rules">
			{/* Section 1: Instructions Markdown with Preview */}
			<div className="flex flex-col gap-2 rounded-lg border border-border-panel bg-[#10162a]/60 p-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Instructions (System Prompt)</span>
						<span className="text-[10px] text-indigo-400 bg-indigo-950/60 border border-indigo-800 px-1.5 py-0.5 rounded">
							Markdown
						</span>
					</div>

					{/* Edit vs Preview Mode Switch */}
					<div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
						<button
							className={`px-2.5 py-1 text-xs rounded transition-colors ${
								mode === "edit" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-slate-200"
							}`}
							data-testid="instructions-mode-edit"
							onClick={() => setMode("edit")}
							type="button">
							✏️ Soạn thảo
						</button>
						<button
							className={`px-2.5 py-1 text-xs rounded transition-colors ${
								mode === "preview"
									? "bg-indigo-600 text-white font-medium"
									: "text-slate-400 hover:text-slate-200"
							}`}
							data-testid="instructions-mode-preview"
							onClick={() => setMode("preview")}
							type="button">
							👁️ Xem trước
						</button>
					</div>
				</div>

				{mode === "edit" ? (
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-1.5 pb-0.5">
							<button
								className="px-2 py-0.5 rounded text-[11px] border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors"
								data-testid="btn-format-h2"
								onClick={() => setInstructions(`${instructions}\n\n## Tiêu đề\n`)}
								type="button">
								H2
							</button>
							<button
								className="px-2 py-0.5 rounded text-[11px] border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors"
								data-testid="btn-format-bullet"
								onClick={() => setInstructions(`${instructions}\n- Mục 1\n- Mục 2\n`)}
								type="button">
								List
							</button>
							<button
								className="px-2 py-0.5 rounded text-[11px] border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors"
								data-testid="btn-format-code"
								onClick={() => setInstructions(`${instructions}\n\`\`\`ts\n// code\n\`\`\`\n`)}
								type="button">
								Code
							</button>
						</div>
						<textarea
							className="min-h-56 w-full resize-y rounded border border-border-panel bg-input-background p-3 font-mono text-xs leading-relaxed focus:outline-hidden focus:border-indigo-500"
							data-testid="instructions-textarea"
							onChange={(e) => setInstructions(e.target.value)}
							placeholder="Hướng dẫn chi tiết vai trò, mục tiêu và nguyên tắc hành xử của agent..."
							required
							value={instructions}
						/>
						<div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
							<span>Hỗ trợ định dạng Markdown đầy đủ (# tiêu đề, - danh sách, ```code)</span>
							<span data-testid="instructions-stats">
								{wordCount} từ • {instructions.length} ký tự
							</span>
						</div>
					</div>
				) : (
					<div
						className="min-h-56 w-full rounded border border-border-panel bg-slate-900/60 p-4 text-xs leading-relaxed overflow-y-auto max-h-96"
						data-testid="instructions-preview-content">
						{instructions.trim() ? (
							<div className="prose prose-invert max-w-none text-xs">
								<ReactMarkdown>{instructions}</ReactMarkdown>
							</div>
						) : (
							<div className="text-slate-500 italic text-center py-10">
								Chưa có nội dung instructions để xem trước.
							</div>
						)}
					</div>
				)}
			</div>

			{/* Section 2: Checklist Rules */}
			<div className="flex flex-col gap-3 rounded-lg border border-border-panel bg-[#10162a]/60 p-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Rules Hệ Thống & Workspace</span>
						<span
							className="text-[10px] text-indigo-300 bg-indigo-950/80 border border-indigo-700 px-2 py-0.5 rounded-full font-semibold"
							data-testid="rules-count-badge">
							{selectedRules.length} rules được gán
						</span>
					</div>

					<div className="flex items-center gap-2 text-xs">
						<button
							className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
							data-testid="btn-select-all-rules"
							onClick={handleSelectAllRules}
							type="button">
							Chọn tất cả
						</button>
						<span className="text-slate-600">•</span>
						<button
							className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
							data-testid="btn-deselect-all-rules"
							onClick={handleDeselectAllRules}
							type="button">
							Bỏ chọn
						</button>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<input
						className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
						data-testid="rules-search-input"
						onChange={(e) => setRuleSearch(e.target.value)}
						placeholder="Tìm kiếm rule..."
						type="text"
						value={ruleSearch}
					/>
				</div>

				{/* Rules List */}
				<div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1" data-testid="rules-checklist">
					{filteredRules.map((rule) => {
						const isChecked = selectedRules.includes(rule.id)
						return (
							<label
								className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-colors ${
									isChecked
										? "bg-indigo-950/30 border-indigo-600/60 text-slate-100"
										: "bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/40"
								}`}
								data-testid={`rule-item-${rule.id}`}
								key={rule.id}>
								<input
									checked={isChecked}
									className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
									data-testid={`rule-checkbox-${rule.id}`}
									onChange={() => handleToggleRule(rule.id)}
									type="checkbox"
								/>
								<div className="flex flex-col flex-1">
									<div className="flex items-center justify-between">
										<span className="font-semibold text-xs text-slate-200">{rule.name}</span>
										{rule.source && (
											<span className="font-mono text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
												{rule.source}
											</span>
										)}
									</div>
									{rule.description && (
										<span className="text-[11px] text-slate-400 mt-0.5">{rule.description}</span>
									)}
								</div>
							</label>
						)
					})}

					{filteredRules.length === 0 && (
						<div className="text-center text-slate-500 text-xs py-4">Không tìm thấy rule nào khớp với từ khóa.</div>
					)}
				</div>

				{/* Custom Rule Add */}
				<div className="flex gap-1.5 pt-1 border-t border-slate-800/80">
					<input
						className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs"
						data-testid="input-custom-rule"
						onChange={(e) => setNewCustomRule(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault()
								handleAddCustomRule()
							}
						}}
						placeholder="Thêm đường dẫn rule custom (ví dụ: .cline/rules/my-rule.md)..."
						type="text"
						value={newCustomRule}
					/>
					<button
						className="rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs text-slate-200 transition-colors"
						data-testid="btn-add-custom-rule"
						onClick={handleAddCustomRule}
						type="button">
						Thêm rule
					</button>
				</div>
			</div>
		</div>
	)
}
