import { MANDATORY_DENY_WRITE_PATHS } from "@cline/shared/orvanta"
import { type AgentAutoApproval } from "@shared/AutoApprovalSettings"
import { IconBan, IconCheck, IconLock, IconShieldCheck, IconShieldLock } from "@tabler/icons-react"
import { useState } from "react"

export interface ToolItem {
	id: string
	name: string
	description?: string
}

export interface ToolCategory {
	name: string
	icon: string
	tools: ToolItem[]
}

export const TOOL_CATEGORIES: ToolCategory[] = [
	{
		name: "Thao tác Tệp (Files)",
		icon: "",
		tools: [
			{ id: "read_files", name: "read_files", description: "Đọc nội dung tệp" },
			{ id: "write_to_file", name: "write_to_file", description: "Tạo / ghi đè tệp" },
			{ id: "apply_diff", name: "apply_diff", description: "Sửa đổi qua diff patch" },
			{ id: "list_files", name: "list_files", description: "Liệt kê tệp thư mục" },
		],
	},
	{
		name: "Tìm kiếm & Tra cứu (Search)",
		icon: "",
		tools: [
			{ id: "grep", name: "grep", description: "Tìm regex trong nội dung" },
			{ id: "search_codebase", name: "search_codebase", description: "Tìm kiếm codebase" },
			{ id: "list_code_definition_names", name: "list_code_definition_names", description: "Liệt kê định nghĩa code" },
		],
	},
	{
		name: "Thực thi Lệnh (Execution)",
		icon: "",
		tools: [{ id: "execute_command", name: "execute_command", description: "Chạy lệnh trong terminal" }],
	},
	{
		name: "Web & Trình duyệt (Web)",
		icon: "",
		tools: [
			{ id: "web_fetch", name: "web_fetch", description: "Tải trang web / API" },
			{ id: "browser_action", name: "browser_action", description: "Thao tác trên trình duyệt" },
		],
	},
	{
		name: "Cộng tác Nhóm (Team)",
		icon: "",
		tools: [
			{ id: "orvanta_submit_handoff", name: "orvanta_submit_handoff", description: "Bàn giao kết quả" },
			{ id: "team_spawn_teammate", name: "team_spawn_teammate", description: "Khởi tạo teammate" },
			{ id: "team_task", name: "team_task", description: "Giao việc cho teammate" },
		],
	},
]

export interface ToolsPermissionsTabProps {
	allowTools: string[]
	setAllowTools: (tools: string[]) => void
	denyTools: string[]
	setDenyTools: (tools: string[]) => void
	allowPaths: string[]
	setAllowPaths: (paths: string[]) => void
	customDenyPaths: string[]
	setCustomDenyPaths: (paths: string[]) => void
	autoApproval?: AgentAutoApproval
	setAutoApproval?: (autoApproval: AgentAutoApproval) => void
}

export const ToolsPermissionsTab = ({
	allowTools,
	setAllowTools,
	denyTools,
	setDenyTools,
	allowPaths,
	setAllowPaths,
	customDenyPaths,
	setCustomDenyPaths,
	autoApproval,
	setAutoApproval,
}: ToolsPermissionsTabProps) => {
	const [newAllowTool, setNewAllowTool] = useState("")
	const [newDenyTool, setNewDenyTool] = useState("")
	const [newAllowPath, setNewAllowPath] = useState("")
	const [newDenyPath, setNewDenyPath] = useState("")

	const handleAddAllowTool = (tool: string) => {
		const t = tool.trim()
		if (!t) return
		if (!allowTools.includes(t)) {
			setAllowTools([...allowTools, t])
		}
		if (denyTools.includes(t)) {
			setDenyTools(denyTools.filter((x) => x !== t))
		}
		setNewAllowTool("")
	}

	const handleAddDenyTool = (tool: string) => {
		const t = tool.trim()
		if (!t) return
		if (!denyTools.includes(t)) {
			setDenyTools([...denyTools, t])
		}
		if (allowTools.includes(t)) {
			setAllowTools(allowTools.filter((x) => x !== t))
		}
		setNewDenyTool("")
	}

	const handleAddAllowPath = (path: string) => {
		const p = path.trim()
		if (!p) return
		if (!allowPaths.includes(p)) {
			setAllowPaths([...allowPaths, p])
		}
		setNewAllowPath("")
	}

	const handleAddDenyPath = (path: string) => {
		const p = path.trim()
		if (!p) return
		if (!customDenyPaths.includes(p)) {
			setCustomDenyPaths([...customDenyPaths, p])
		}
		setNewDenyPath("")
	}

	return (
		<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-tools">
			{/* Tools Allow & Deny Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				{/* Tools Allow */}
				<div className="flex flex-col gap-2.5 rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3">
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
							<IconCheck size={13} stroke={2} />
							<span>Tools cho phép (Allow)</span>
						</span>
						<span className="text-[11px] text-(--vscode-descriptionForeground)">{allowTools.length} tools</span>
					</div>

					<div
						className="flex flex-wrap gap-1.5 min-h-9 p-1.5 rounded border border-border-panel bg-input-background"
						data-testid="allow-tools-chips">
						{allowTools.map((t) => (
							<span
								className="flex items-center gap-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-xs text-emerald-300"
								data-testid={`allow-tool-chip-${t}`}
								key={t}>
								<span className="font-mono text-[11px]">{t}</span>
								<button
									className="text-emerald-400 hover:text-white text-xs cursor-pointer ml-0.5"
									onClick={() => setAllowTools(allowTools.filter((x) => x !== t))}
									type="button">
									×
								</button>
							</span>
						))}
						{allowTools.length === 0 && (
							<span className="text-xs text-(--vscode-descriptionForeground) italic py-0.5">Chưa có tool nào</span>
						)}
					</div>

					<div className="flex flex-col gap-1.5 pt-0.5">
						<select
							className="rounded border border-border-panel bg-input-background px-2 py-1 text-xs text-(--vscode-foreground)"
							data-testid="select-allow-tool-category"
							defaultValue=""
							onChange={(e) => {
								if (e.target.value) {
									handleAddAllowTool(e.target.value)
									e.target.value = ""
								}
							}}>
							<option disabled value="">
								+ Chọn tool từ danh mục...
							</option>
							{TOOL_CATEGORIES.map((cat) => (
								<optgroup key={cat.name} label={cat.name}>
									{cat.tools.map((tool) => (
										<option disabled={allowTools.includes(tool.id)} key={tool.id} value={tool.id}>
											{tool.name}
										</option>
									))}
								</optgroup>
							))}
						</select>

						<div className="flex gap-1.5">
							<input
								className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs text-(--vscode-foreground)"
								data-testid="input-custom-allow-tool"
								onChange={(e) => setNewAllowTool(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault()
										handleAddAllowTool(newAllowTool)
									}
								}}
								placeholder="Tên tool tùy chỉnh..."
								type="text"
								value={newAllowTool}
							/>
							<button
								className="rounded bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) px-2.5 py-1 text-xs font-medium cursor-pointer"
								data-testid="btn-add-allow-tool"
								onClick={() => handleAddAllowTool(newAllowTool)}
								type="button">
								Thêm
							</button>
						</div>
					</div>
				</div>

				{/* Tools Deny */}
				<div className="flex flex-col gap-2.5 rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3">
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
							<IconBan size={13} stroke={1.5} />
							<span>Tools bị cấm (Deny)</span>
						</span>
						<span className="text-[11px] text-(--vscode-descriptionForeground)">{denyTools.length} tools</span>
					</div>

					<div
						className="flex flex-wrap gap-1.5 min-h-9 p-1.5 rounded border border-border-panel bg-input-background"
						data-testid="deny-tools-chips">
						{denyTools.map((t) => (
							<span
								className="flex items-center gap-1.5 rounded bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 text-xs text-rose-300"
								data-testid={`deny-tool-chip-${t}`}
								key={t}>
								<span className="font-mono text-[11px]">{t}</span>
								<button
									className="text-rose-400 hover:text-white text-xs cursor-pointer ml-0.5"
									onClick={() => setDenyTools(denyTools.filter((x) => x !== t))}
									type="button">
									×
								</button>
							</span>
						))}
						{denyTools.length === 0 && (
							<span className="text-xs text-(--vscode-descriptionForeground) italic py-0.5">
								Không cấm tool nào
							</span>
						)}
					</div>

					<div className="flex flex-col gap-1.5 pt-0.5">
						<select
							className="rounded border border-border-panel bg-input-background px-2 py-1 text-xs text-(--vscode-foreground)"
							data-testid="select-deny-tool-category"
							defaultValue=""
							onChange={(e) => {
								if (e.target.value) {
									handleAddDenyTool(e.target.value)
									e.target.value = ""
								}
							}}>
							<option disabled value="">
								+ Chọn tool để cấm...
							</option>
							{TOOL_CATEGORIES.map((cat) => (
								<optgroup key={cat.name} label={cat.name}>
									{cat.tools.map((tool) => (
										<option disabled={denyTools.includes(tool.id)} key={tool.id} value={tool.id}>
											{tool.name}
										</option>
									))}
								</optgroup>
							))}
						</select>

						<div className="flex gap-1.5">
							<input
								className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs text-(--vscode-foreground)"
								data-testid="input-custom-deny-tool"
								onChange={(e) => setNewDenyTool(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault()
										handleAddDenyTool(newDenyTool)
									}
								}}
								placeholder="Tên tool tùy chỉnh..."
								type="text"
								value={newDenyTool}
							/>
							<button
								className="rounded bg-error/80 text-white hover:bg-error px-2.5 py-1 text-xs font-medium cursor-pointer"
								data-testid="btn-add-deny-tool"
								onClick={() => handleAddDenyTool(newDenyTool)}
								type="button">
								Cấm
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Scope Paths Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				{/* Scope Paths: Allow */}
				<div className="flex flex-col gap-2.5 rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-(--vscode-foreground)">Phạm vi truy cập (Scope)</span>
						<span className="text-[11px] text-(--vscode-descriptionForeground)">Mặc định: **/*</span>
					</div>

					<div
						className="flex flex-wrap gap-1.5 min-h-9 p-1.5 rounded border border-border-panel bg-input-background"
						data-testid="allow-paths-chips">
						{allowPaths.map((p) => (
							<span
								className="flex items-center gap-1.5 rounded bg-(--vscode-badge-background) border border-border-panel px-2 py-0.5 font-mono text-xs text-(--vscode-badge-foreground)"
								data-testid={`allow-path-chip-${p}`}
								key={p}>
								<span>{p}</span>
								{allowPaths.length > 1 && (
									<button
										className="text-(--vscode-descriptionForeground) hover:text-white text-xs cursor-pointer ml-0.5"
										onClick={() => setAllowPaths(allowPaths.filter((x) => x !== p))}
										type="button">
										×
									</button>
								)}
							</span>
						))}
					</div>

					<div className="flex gap-1.5 pt-0.5">
						<input
							className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs text-(--vscode-foreground)"
							data-testid="input-allow-path"
							onChange={(e) => setNewAllowPath(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault()
									handleAddAllowPath(newAllowPath)
								}
							}}
							placeholder="Thêm pattern (ví dụ: src/**)..."
							type="text"
							value={newAllowPath}
						/>
						<button
							className="rounded bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) px-2.5 py-1 text-xs font-medium cursor-pointer"
							data-testid="btn-add-allow-path"
							onClick={() => handleAddAllowPath(newAllowPath)}
							type="button">
							Thêm
						</button>
					</div>

					<div className="flex items-center gap-1.5 pt-0.5">
						<span className="text-[10px] text-(--vscode-descriptionForeground)">Gợi ý:</span>
						{["**/*", "src/**", "docs/**"].map((preset) => (
							<button
								className="text-[10px] px-1.5 py-0.5 rounded border border-border-panel bg-input-background text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) cursor-pointer"
								data-testid={`preset-allow-path-${preset}`}
								key={preset}
								onClick={() => handleAddAllowPath(preset)}
								type="button">
								{preset}
							</button>
						))}
					</div>
				</div>

				{/* Scope Paths: Deny Write */}
				<div className="flex flex-col gap-2.5 rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-semibold text-(--vscode-foreground)">Đường dẫn cấm ghi (Deny Write)</span>
						<span className="flex items-center gap-1 text-[11px] text-amber-400">
							<IconShieldLock size={12} stroke={1.5} />
							<span>3 đường dẫn bảo vệ</span>
						</span>
					</div>

					<div
						className="flex flex-wrap gap-1.5 min-h-9 p-1.5 rounded border border-border-panel bg-input-background"
						data-testid="deny-write-paths-chips">
						{/* Mandatory Locked Paths */}
						{MANDATORY_DENY_WRITE_PATHS.map((p) => (
							<span
								className="flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 font-mono text-xs text-rose-300"
								data-testid={`mandatory-deny-path-${p}`}
								key={p}
								title="Bắt buộc bởi Purpose Lock — Không thể sửa hoặc xóa">
								<IconLock className="text-amber-400 shrink-0" size={12} stroke={1.5} />
								<span className="sr-only">🔒</span>
								<span>{p}</span>
							</span>
						))}

						{/* Custom Deny Paths */}
						{customDenyPaths.map((p) => (
							<span
								className="flex items-center gap-1.5 rounded bg-input-background border border-border-panel px-2 py-0.5 font-mono text-xs text-(--vscode-foreground)"
								data-testid={`custom-deny-path-${p}`}
								key={p}>
								<span>{p}</span>
								<button
									className="text-(--vscode-descriptionForeground) hover:text-white text-xs cursor-pointer ml-0.5"
									onClick={() => setCustomDenyPaths(customDenyPaths.filter((x) => x !== p))}
									type="button">
									×
								</button>
							</span>
						))}
					</div>

					<div className="flex gap-1.5 pt-0.5">
						<input
							className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs text-(--vscode-foreground)"
							data-testid="input-deny-write-path"
							onChange={(e) => setNewDenyPath(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault()
									handleAddDenyPath(newDenyPath)
								}
							}}
							placeholder="Thêm pattern cấm ghi (ví dụ: .env)..."
							type="text"
							value={newDenyPath}
						/>
						<button
							className="rounded bg-(--vscode-button-background) text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) px-2.5 py-1 text-xs font-medium cursor-pointer"
							data-testid="btn-add-deny-write-path"
							onClick={() => handleAddDenyPath(newDenyPath)}
							type="button">
							Thêm
						</button>
					</div>

					<div className="flex items-center gap-1.5 pt-0.5">
						<span className="text-[10px] text-(--vscode-descriptionForeground)">Gợi ý:</span>
						{["*.env", "secrets/**", "dist/**"].map((preset) => (
							<button
								className="text-[10px] px-1.5 py-0.5 rounded border border-border-panel bg-input-background text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) cursor-pointer"
								data-testid={`preset-deny-path-${preset}`}
								key={preset}
								onClick={() => handleAddDenyPath(preset)}
								type="button">
								{preset}
							</button>
						))}
					</div>
				</div>

				{/* Auto-Approval Settings for this Agent */}
				{autoApproval && setAutoApproval && (
					<div className="flex flex-col gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3.5">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<IconShieldCheck className="text-indigo-400" size={16} />
								<div>
									<span className="text-xs font-semibold text-slate-100">
										Cấu hình Tự động duyệt (Auto-Approve)
									</span>
									<div className="text-[11px] text-(--vscode-descriptionForeground)">
										Áp dụng riêng cho Agent này. Không dùng chung trạng thái giữa các Agent.
									</div>
								</div>
							</div>
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									checked={autoApproval.enabled}
									className="sr-only peer"
									onChange={(e) => setAutoApproval({ ...autoApproval, enabled: e.target.checked })}
									type="checkbox"
								/>
								<div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
							</label>
						</div>

						{autoApproval.enabled && (
							<div className="space-y-3 pt-1 border-t border-indigo-500/10">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
									<label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors">
										<input
											checked={!!autoApproval.readFiles}
											className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
											onChange={(e) => setAutoApproval({ ...autoApproval, readFiles: e.target.checked })}
											type="checkbox"
										/>
										<span>📖 Tự động đọc tệp tin (Read files)</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors">
										<input
											checked={!!autoApproval.editFiles}
											className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
											onChange={(e) => setAutoApproval({ ...autoApproval, editFiles: e.target.checked })}
											type="checkbox"
										/>
										<span>✏️ Tự động sửa tệp tin (Edit files)</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors">
										<input
											checked={!!autoApproval.executeCommands}
											className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
											onChange={(e) =>
												setAutoApproval({ ...autoApproval, executeCommands: e.target.checked })
											}
											type="checkbox"
										/>
										<span>⚡ Tự động chạy lệnh (Execute commands)</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors">
										<input
											checked={!!autoApproval.useBrowser}
											className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
											onChange={(e) => setAutoApproval({ ...autoApproval, useBrowser: e.target.checked })}
											type="checkbox"
										/>
										<span>🌐 Tự động thao tác browser (Browser)</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white/5 transition-colors sm:col-span-2">
										<input
											checked={!!autoApproval.useMcp}
											className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
											onChange={(e) => setAutoApproval({ ...autoApproval, useMcp: e.target.checked })}
											type="checkbox"
										/>
										<span>🔌 Tự động gọi công cụ MCP (MCP Tools)</span>
									</label>
								</div>

								<div className="flex items-center justify-between pt-2 border-t border-indigo-500/10 text-xs">
									<span className="text-(--vscode-descriptionForeground)">Giới hạn số yêu cầu tối đa:</span>
									<input
										className="w-20 rounded border border-border-panel bg-input-background px-2 py-0.5 text-xs text-right font-mono"
										max={100}
										min={1}
										onChange={(e) =>
											setAutoApproval({
												...autoApproval,
												maxRequests: parseInt(e.target.value, 10) || 20,
											})
										}
										type="number"
										value={autoApproval.maxRequests ?? 20}
									/>
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
