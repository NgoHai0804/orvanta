import { useMemo, useState } from "react"

export interface WorkspaceSkillItem {
	id: string
	name: string
	description?: string
	source?: string
	category?: string
}

export const DEFAULT_WORKSPACE_SKILLS: WorkspaceSkillItem[] = [
	{
		id: "test-driven-development",
		name: "Test-Driven Development (TDD)",
		description: "Phát triển hướng kiểm thử — viết unit test trước khi triển khai code",
		source: ".agents/skills/tdd/",
		category: "testing",
	},
	{
		id: "code-review-and-quality",
		name: "Code Review & Quality",
		description: "Đánh giá chất lượng mã nguồn, phát hiện code smells và tuân thủ clean code",
		source: ".agents/skills/code-review/",
		category: "review",
	},
	{
		id: "browser-testing-with-devtools",
		name: "Browser Testing & DevTools",
		description: "Tương tác trình duyệt, kiểm thử console logs, network và chụp ảnh UI",
		source: ".cline/skills/devtools/",
		category: "testing",
	},
	{
		id: "git-workflow-and-versioning",
		name: "Git Workflow & Versioning",
		description: "Quản lý nhánh Git, tạo commit quy chuẩn và tuân thủ semantic versioning",
		source: ".agents/skills/git-workflow/",
		category: "git",
	},
	{
		id: "security-and-hardening",
		name: "Security & Hardening",
		description: "Rà soát lỗ hổng bảo mật, ngăn chặn injection và kiểm tra dependencies",
		source: ".cline/skills/security/",
		category: "security",
	},
	{
		id: "api-and-interface-design",
		name: "API & Interface Design",
		description: "Thiết kế RESTful / gRPC APIs, chuẩn hóa protobuf data contracts",
		source: ".agents/skills/api-design/",
		category: "architecture",
	},
	{
		id: "debugging-and-error-recovery",
		name: "Debugging & Error Recovery",
		description: "Phân tích stack trace, forensics log và tự động đề xuất phương án khắc phục",
		source: ".agents/skills/debugging/",
		category: "debugging",
	},
	{
		id: "documentation-and-adrs",
		name: "Documentation & ADRs",
		description: "Soạn thảo Architecture Decision Records (ADRs) và technical specs chuẩn",
		source: ".agents/skills/documentation/",
		category: "docs",
	},
	{
		id: "performance-optimization",
		name: "Performance Optimization",
		description: "Tối ưu hóa hiệu năng runtime, giảm bundle size và xử lý memory leaks",
		source: ".cline/skills/perf/",
		category: "perf",
	},
]

export interface SkillsTabProps {
	availableSkills?: WorkspaceSkillItem[]
	selectedSkills: string[]
	setSelectedSkills: (skills: string[]) => void
}

export const SkillsTab = ({ availableSkills, selectedSkills, setSelectedSkills }: SkillsTabProps) => {
	const [search, setSearch] = useState("")
	const [newSkillId, setNewSkillId] = useState("")

	const skillList = useMemo(() => {
		const baseList = availableSkills && availableSkills.length > 0 ? availableSkills : DEFAULT_WORKSPACE_SKILLS
		const existingIds = new Set(baseList.map((s) => s.id))
		const extras: WorkspaceSkillItem[] = selectedSkills
			.filter((id) => !existingIds.has(id))
			.map((id) => ({
				id,
				name: id,
				description: "Kỹ năng tùy chỉnh được cấu hình riêng cho agent",
				source: "custom",
				category: "custom",
			}))
		return [...baseList, ...extras]
	}, [availableSkills, selectedSkills])

	const filteredSkills = useMemo(() => {
		const q = search.trim().toLowerCase()
		if (!q) return skillList
		return skillList.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				s.id.toLowerCase().includes(q) ||
				(s.description && s.description.toLowerCase().includes(q)),
		)
	}, [skillList, search])

	const handleToggleSkill = (skillId: string) => {
		if (selectedSkills.includes(skillId)) {
			setSelectedSkills(selectedSkills.filter((id) => id !== skillId))
		} else {
			setSelectedSkills([...selectedSkills, skillId])
		}
	}

	const handleEnableAll = () => {
		const allIds = Array.from(new Set([...selectedSkills, ...filteredSkills.map((s) => s.id)]))
		setSelectedSkills(allIds)
	}

	const handleDisableAll = () => {
		const filteredIdSet = new Set(filteredSkills.map((s) => s.id))
		setSelectedSkills(selectedSkills.filter((id) => !filteredIdSet.has(id)))
	}

	const handleAddCustomSkill = () => {
		const trimmed = newSkillId.trim().toLowerCase().replace(/\s+/g, "-")
		if (!trimmed) return
		if (!selectedSkills.includes(trimmed)) {
			setSelectedSkills([...selectedSkills, trimmed])
		}
		setNewSkillId("")
	}

	return (
		<div className="flex flex-col gap-4" data-testid="tab-panel-skills">
			{/* Top Header & Actions */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Kỹ Năng Chuyên Biệt (Skills)</span>
						<span
							className="rounded bg-indigo-950/60 border border-indigo-700/50 text-[10px] text-indigo-300 px-2 py-0.5 font-semibold"
							data-testid="skills-count-badge">
							{selectedSkills.length} / {skillList.length} đã bật
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							className="text-[11px] px-2 py-0.5 rounded border border-slate-700 hover:bg-white/5 text-slate-300 transition-colors"
							data-testid="enable-all-skills-btn"
							onClick={handleEnableAll}
							type="button">
							Bật tất cả
						</button>
						<button
							className="text-[11px] px-2 py-0.5 rounded border border-slate-700 hover:bg-white/5 text-slate-300 transition-colors"
							data-testid="disable-all-skills-btn"
							onClick={handleDisableAll}
							type="button">
							Tắt tất cả
						</button>
					</div>
				</div>
				<p className="text-[11px] text-slate-400">
					Kích hoạt các skills từ <code className="text-indigo-300">.agents/skills/</code> hoặc{" "}
					<code className="text-indigo-300">.cline/skills/</code> để trang bị chuyên môn sâu cho agent.
				</p>
			</div>

			{/* Search input */}
			<input
				className="rounded border border-border-panel bg-input-background px-2.5 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
				data-testid="skill-search-input"
				onChange={(e) => setSearch(e.target.value)}
				placeholder="Tìm kiếm skill theo tên hoặc mô tả..."
				type="text"
				value={search}
			/>

			{/* Skill List with Switch Toggles */}
			<div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
				{filteredSkills.map((skill) => {
					const isEnabled = selectedSkills.includes(skill.id)
					return (
						<div
							className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
								isEnabled
									? "border-indigo-500/50 bg-indigo-950/20"
									: "border-border-panel bg-[#10162a]/40 hover:border-slate-700"
							}`}
							data-testid={`skill-card-${skill.id}`}
							key={skill.id}>
							<div className="flex flex-col gap-1 pr-3">
								<div className="flex items-center gap-2">
									<span className="text-xs font-semibold text-slate-100">{skill.name}</span>
									{skill.source && (
										<span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
											{skill.source}
										</span>
									)}
								</div>
								{skill.description && (
									<span className="text-[11px] text-slate-400 leading-relaxed">{skill.description}</span>
								)}
							</div>

							{/* Switch Toggle */}
							<button
								aria-checked={isEnabled}
								className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
									isEnabled ? "bg-indigo-600" : "bg-slate-700"
								}`}
								data-testid={`skill-toggle-${skill.id}`}
								onClick={() => handleToggleSkill(skill.id)}
								role="switch"
								type="button">
								<span
									className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
										isEnabled ? "translate-x-4" : "translate-x-0"
									}`}
								/>
							</button>
						</div>
					)
				})}
			</div>

			{/* Add Custom Skill input */}
			<div className="flex gap-2 pt-2 border-t border-border-panel">
				<input
					className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs"
					data-testid="new-custom-skill-input"
					onChange={(e) => setNewSkillId(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault()
							handleAddCustomSkill()
						}
					}}
					placeholder="Thêm skill custom (ví dụ: performance-tuning)..."
					type="text"
					value={newSkillId}
				/>
				<button
					className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs text-slate-200 border border-slate-700 transition-colors"
					data-testid="add-custom-skill-btn"
					onClick={handleAddCustomSkill}
					type="button">
					+ Thêm skill
				</button>
			</div>
		</div>
	)
}
