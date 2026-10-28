import { MANDATORY_DENY_WRITE_PATHS } from "@cline/shared/orvanta"
import { OrvantaAgentProfile, type OrvantaRosterAgent } from "@shared/proto/cline/orvanta"
import { useEffect, useMemo, useState } from "react"
import { InstructionsRulesTab, type WorkspaceRuleItem } from "./InstructionsRulesTab"
import { ModelParamsTab } from "./ModelParamsTab"
import { SkillsTab, type WorkspaceSkillItem } from "./SkillsTab"
import { ToolsPermissionsTab } from "./ToolsPermissionsTab"
import { getAllowedManagers } from "./tree-utils"

const AGENT_ID_RE = /^[a-z][a-z0-9_-]{1,31}$/

export type EditorTab = "profile" | "model" | "tools" | "rules" | "skills"

export interface EditorTabInfo {
	id: EditorTab
	label: string
	icon: string
}

export const EDITOR_TABS: EditorTabInfo[] = [
	{ id: "profile", label: "Profile", icon: "👤" },
	{ id: "model", label: "Model & Thông số", icon: "🧠" },
	{ id: "tools", label: "Tools", icon: "🛠️" },
	{ id: "rules", label: "Rules", icon: "📜" },
	{ id: "skills", label: "Skills", icon: "⚡" },
]

export type AgentEditorProps = {
	initialProfile: OrvantaAgentProfile
	isNew: boolean
	isCoordinator: boolean
	existingIds: string[]
	rosterAgents?: OrvantaRosterAgent[]
	allProfiles?: Record<string, OrvantaAgentProfile>
	availableRules?: WorkspaceRuleItem[]
	availableSkills?: WorkspaceSkillItem[]
	defaultTab?: EditorTab
	onSave: (profile: OrvantaAgentProfile) => Promise<boolean>
	onDelete?: (agentId: string) => Promise<boolean>
	onClose: () => void
	onChatWithAgent?: (agentId: string) => void
	onOpenWarRoom?: () => void
	onDirtyChange?: (isDirty: boolean) => void
}

export const AgentEditor = ({
	initialProfile,
	isNew,
	isCoordinator,
	existingIds,
	rosterAgents,
	allProfiles,
	availableRules,
	availableSkills,
	defaultTab,
	onSave,
	onDelete,
	onClose,
	onChatWithAgent,
	onOpenWarRoom,
	onDirtyChange,
}: AgentEditorProps) => {
	const [activeTab, setActiveTab] = useState<EditorTab>(defaultTab ?? "profile")
	const [id, setId] = useState(initialProfile.id)
	const [displayName, setDisplayName] = useState(initialProfile.displayName)
	const [description, setDescription] = useState(initialProfile.description)
	const initialRole = initialProfile.role || (isCoordinator ? "lead" : "teammate")
	const [role, setRole] = useState<string>(initialRole)
	const initialReportsTo = initialProfile.reportsTo ?? (isCoordinator ? null : "coordinator")
	const [reportsTo, setReportsTo] = useState<string | null>(initialReportsTo)
	const [modelId, setModelId] = useState(initialProfile.modelId ?? "")
	const [providerId, setProviderId] = useState(initialProfile.providerId ?? "")
	const [reasoningEffort, setReasoningEffort] = useState<string>(initialProfile.reasoningEffort || "none")
	const [supportsImages, setSupportsImages] = useState<boolean>(initialProfile.supportsImages ?? true)
	const [contextWindow, setContextWindow] = useState<number>(initialProfile.contextWindow || 128000)
	const [maxOutputTokens, setMaxOutputTokens] = useState<number>(initialProfile.maxOutputTokens || 8192)
	const [maxIterations, setMaxIterations] = useState<number>(initialProfile.maxIterations || 40)
	const initialTemperature =
		initialProfile.temperature !== undefined && initialProfile.temperature !== null
			? String(initialProfile.temperature)
			: "0.7"
	const [temperature, setTemperature] = useState<string>(initialTemperature)
	const [instructions, setInstructions] = useState(initialProfile.instructions)
	const [rules, setRules] = useState<string[]>(initialProfile.rules ?? [])
	const [skills, setSkills] = useState<string[]>(initialProfile.skills ?? [])
	const [allowTools, setAllowTools] = useState<string[]>(initialProfile.tools?.allow ?? [])
	const [denyTools, setDenyTools] = useState<string[]>(initialProfile.tools?.deny ?? [])

	const initialAllowPaths =
		initialProfile.scopePaths?.allow && initialProfile.scopePaths.allow.length > 0
			? initialProfile.scopePaths.allow
			: ["**/*"]
	const [allowPaths, setAllowPaths] = useState<string[]>(initialAllowPaths)

	const initialCustomDeny = (initialProfile.scopePaths?.denyWrite ?? []).filter(
		(p) => !(MANDATORY_DENY_WRITE_PATHS as readonly string[]).includes(p),
	)
	const [customDenyPaths, setCustomDenyPaths] = useState<string[]>(initialCustomDeny)

	const [error, setError] = useState<string | undefined>()
	const [saving, setSaving] = useState(false)
	const [saveSuccess, setSaveSuccess] = useState(false)
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const availableRosterAgents = useMemo<OrvantaRosterAgent[]>(() => {
		if (rosterAgents && rosterAgents.length > 0) {
			return rosterAgents
		}
		return existingIds.map((eid) => ({
			id: eid,
			displayName: eid === "coordinator" ? "Company Coordinator" : eid,
			role: eid === "coordinator" ? "lead" : "teammate",
			status: "idle",
			reportsTo: eid === "coordinator" ? undefined : "coordinator",
		}))
	}, [rosterAgents, existingIds])

	const allowedManagers = useMemo(() => {
		if (isCoordinator || id === "coordinator") {
			return []
		}
		return getAllowedManagers(id, availableRosterAgents, allProfiles)
	}, [id, isCoordinator, availableRosterAgents, allProfiles])

	const handleQuickChat = () => {
		if (onChatWithAgent) {
			onChatWithAgent(id)
		} else {
			window.postMessage(
				{
					type: "orvanta_switch_tab",
					tab: "chat",
					contextAgent: { id, displayName },
				},
				"*",
			)
		}
	}

	const handleQuickWarRoom = () => {
		if (onOpenWarRoom) {
			onOpenWarRoom()
		} else {
			window.postMessage({ type: "orvanta_switch_tab", tab: "war-room" }, "*")
		}
	}

	const isDirty =
		id !== initialProfile.id ||
		displayName !== initialProfile.displayName ||
		description !== initialProfile.description ||
		(!isCoordinator && role !== initialRole) ||
		(!isCoordinator && reportsTo !== initialReportsTo) ||
		modelId !== (initialProfile.modelId ?? "") ||
		providerId !== (initialProfile.providerId ?? "") ||
		reasoningEffort !== (initialProfile.reasoningEffort || "none") ||
		supportsImages !== (initialProfile.supportsImages ?? true) ||
		contextWindow !== (initialProfile.contextWindow || 128000) ||
		maxOutputTokens !== (initialProfile.maxOutputTokens || 8192) ||
		maxIterations !== (initialProfile.maxIterations || 40) ||
		temperature !== initialTemperature ||
		instructions !== initialProfile.instructions ||
		JSON.stringify(rules) !== JSON.stringify(initialProfile.rules ?? []) ||
		JSON.stringify(skills) !== JSON.stringify(initialProfile.skills ?? []) ||
		JSON.stringify(allowTools) !== JSON.stringify(initialProfile.tools?.allow ?? []) ||
		JSON.stringify(denyTools) !== JSON.stringify(initialProfile.tools?.deny ?? []) ||
		JSON.stringify(allowPaths) !== JSON.stringify(initialAllowPaths) ||
		JSON.stringify(customDenyPaths) !== JSON.stringify(initialCustomDeny)

	useEffect(() => {
		onDirtyChange?.(isDirty)
	}, [isDirty, onDirtyChange])

	const handleCloseRequest = () => {
		if (isDirty) {
			setShowDiscardConfirm(true)
		} else {
			onClose()
		}
	}

	const handleSave = async () => {
		const trimmedId = id.trim()
		const trimmedName = displayName.trim()
		const trimmedDesc = description.trim()
		const trimmedInstructions = instructions.trim()

		if (!AGENT_ID_RE.test(trimmedId)) {
			setError("Id chỉ được dùng chữ thường a-z, số 0-9, gạch ngang/dưới (2-32 ký tự, bắt đầu bằng chữ)")
			return
		}
		if (isNew && existingIds.includes(trimmedId)) {
			setError(`Id '${trimmedId}' đã tồn tại trong danh sách agent`)
			return
		}
		if (!trimmedName || trimmedName.length > 48) {
			setError("Tên hiển thị phải từ 1 đến 48 ký tự")
			return
		}
		if (!trimmedInstructions) {
			setError("Instructions không được để trống")
			return
		}
		if (maxIterations < 1 || maxIterations > 200) {
			setError("Max iterations phải trong khoảng 1–200")
			return
		}

		let parsedTemp: number | undefined
		if (temperature.trim() !== "") {
			const n = parseFloat(temperature.trim())
			if (Number.isNaN(n) || n < 0 || n > 2) {
				setError("Temperature phải là số từ 0 đến 2, hoặc để trống")
				return
			}
			parsedTemp = n
		}

		const allDenyWrite = Array.from(new Set([...MANDATORY_DENY_WRITE_PATHS, ...customDenyPaths]))

		const profileToSave = OrvantaAgentProfile.create({
			id: trimmedId,
			displayName: trimmedName,
			description: trimmedDesc,
			role: isCoordinator ? "lead" : role,
			reportsTo: isCoordinator ? undefined : reportsTo?.trim() ? reportsTo.trim() : undefined,
			providerId: providerId.trim() ? providerId.trim() : undefined,
			modelId: modelId.trim() ? modelId.trim() : undefined,
			reasoningEffort: reasoningEffort !== "none" ? reasoningEffort : undefined,
			supportsImages: supportsImages,
			contextWindow: contextWindow > 0 ? contextWindow : undefined,
			maxOutputTokens: maxOutputTokens > 0 ? maxOutputTokens : undefined,
			maxIterations,
			temperature: parsedTemp,
			instructions: trimmedInstructions,
			rules: rules,
			skills: skills,
			filePath: initialProfile.filePath || `org/agents/${trimmedId}/profile.md`,
			tools: {
				allow: allowTools,
				deny: denyTools,
			},
			scopePaths: {
				allow: allowPaths,
				denyWrite: allDenyWrite,
			},
		})

		setError(undefined)
		setSaving(true)
		try {
			const success = await onSave(profileToSave)
			if (success) {
				setSaveSuccess(true)
				setTimeout(() => {
					onClose()
				}, 600)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async () => {
		if (isCoordinator || !onDelete) return
		setSaving(true)
		try {
			const success = await onDelete(initialProfile.id)
			if (success) {
				onClose()
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
			setShowDeleteConfirm(false)
		}
	}

	return (
		<div
			className="relative flex h-full min-h-0 w-full flex-col bg-[#0b1021] text-sm text-slate-100"
			data-testid="agent-editor-panel">
			<div className="flex shrink-0 items-center justify-between border-b border-border-panel px-4 py-2.5">
				<div className="flex items-center gap-2">
					<span className="font-semibold text-base">
						{isNew ? "Thêm agent mới" : `Sửa agent: ${displayName || id}`}
					</span>
					{isCoordinator && (
						<span className="rounded bg-(--vscode-badge-background) px-1.5 py-0.5 text-[10px] font-semibold uppercase text-(--vscode-badge-foreground)">
							Lead
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{!isNew && !isCoordinator && onDelete && (
						<button
							className="rounded px-2.5 py-1 text-xs text-error hover:bg-error/10"
							disabled={saving}
							onClick={() => setShowDeleteConfirm(true)}
							type="button">
							Xóa
						</button>
					)}
					<button
						className="rounded border border-border-panel px-3 py-1 text-xs hover:bg-white/5"
						disabled={saving}
						onClick={handleCloseRequest}
						type="button">
						Đóng
					</button>
					<button
						className="flex items-center gap-1.5 rounded bg-(--vscode-button-background) px-3 py-1 text-xs text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) disabled:opacity-50"
						data-testid="save-agent-button"
						disabled={saving}
						onClick={handleSave}
						type="button">
						{saving && (
							<span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
						)}
						<span>{saving ? "Đang lưu…" : "Lưu"}</span>
					</button>
				</div>
			</div>

			{/* Sub-tabs bar */}
			<div className="flex items-center gap-1 border-b border-border-panel bg-[#10162a]/90 px-4 py-2 shrink-0 overflow-x-auto">
				{EDITOR_TABS.map((tab) => {
					const isActive = activeTab === tab.id
					return (
						<button
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
								isActive
									? "bg-indigo-600 text-white shadow-xs scale-100"
									: "text-slate-400 hover:text-slate-200 hover:bg-white/5"
							}`}
							data-testid={`editor-tab-${tab.id}`}
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							type="button">
							<span>{tab.icon}</span>
							<span>{tab.label}</span>
						</button>
					)
				})}
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
				{error && <div className="rounded border border-error/50 bg-error/10 p-2.5 text-xs text-error">{error}</div>}
				{saveSuccess && (
					<div
						className="rounded border border-emerald-500/50 bg-emerald-950/30 p-2.5 text-xs text-emerald-300 flex items-center gap-2"
						data-testid="save-success-banner">
						<span>✓</span>
						<span>Đã lưu thông tin agent thành công!</span>
					</div>
				)}

				{/* Tab 1: Profile */}
				{activeTab === "profile" && (
					<div className="flex flex-col gap-4" data-testid="tab-panel-profile">
						<div className="grid grid-cols-2 gap-3">
							<label className="flex flex-col gap-1">
								<span className="text-xs font-bold uppercase tracking-wide opacity-70">Id</span>
								<input
									className="rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs disabled:opacity-50"
									disabled={!isNew || isCoordinator}
									onChange={(e) => setId(e.target.value.toLowerCase())}
									placeholder="ví dụ: reviewer"
									value={id}
								/>
							</label>

							<label className="flex flex-col gap-1">
								<span className="text-xs font-bold uppercase tracking-wide opacity-70">Tên hiển thị</span>
								<input
									className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
									maxLength={48}
									onChange={(e) => setDisplayName(e.target.value)}
									placeholder="Tên agent"
									value={displayName}
								/>
							</label>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<label className="flex flex-col gap-1">
								<span className="text-xs font-bold uppercase tracking-wide opacity-70">Vai trò (Role)</span>
								<select
									className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs disabled:opacity-50"
									data-testid="agent-role-select"
									disabled={isCoordinator}
									onChange={(e) => setRole(e.target.value)}
									value={role}>
									<option value="teammate">Teammate (Thành viên)</option>
									<option value="lead">Lead (Trưởng nhóm)</option>
								</select>
							</label>

							<label className="flex flex-col gap-1">
								<span className="text-xs font-bold uppercase tracking-wide opacity-70">
									Quản lý bởi (reportsTo)
								</span>
								{isCoordinator ? (
									<input
										className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs opacity-60"
										disabled
										value="Không (Root Coordinator)"
									/>
								) : (
									<select
										className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
										data-testid="agent-reports-to-select"
										onChange={(e) => setReportsTo(e.target.value || null)}
										value={reportsTo ?? ""}>
										{allowedManagers.map((m) => (
											<option key={m.id} value={m.id}>
												{m.displayName} (@{m.id})
											</option>
										))}
										{allowedManagers.length === 0 && <option value="">Không có quản lý khả dụng</option>}
									</select>
								)}
							</label>
						</div>

						<label className="flex flex-col gap-1">
							<span className="text-xs font-bold uppercase tracking-wide opacity-70">Mô tả</span>
							<input
								className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
								maxLength={200}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Nhiệm vụ chính của agent..."
								value={description}
							/>
						</label>

						{/* Quick action row */}
						<div className="flex items-center justify-between pt-3 border-t border-border-panel">
							<span className="text-xs font-bold uppercase tracking-wide opacity-70">Hành động nhanh</span>
							<div className="flex items-center gap-2">
								<button
									className="flex items-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs text-white transition-colors"
									data-testid="quick-chat-button"
									onClick={handleQuickChat}
									type="button">
									<span>💬</span>
									<span>Chat</span>
								</button>

								<button
									className="flex items-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs text-white transition-colors"
									data-testid="quick-war-room-button"
									onClick={handleQuickWarRoom}
									type="button">
									<span>⚔️</span>
									<span>War room</span>
								</button>

								{!isNew && !isCoordinator && onDelete && (
									<button
										className="flex items-center gap-1.5 rounded bg-red-950/40 border border-red-800/50 hover:bg-red-900/50 px-2.5 py-1 text-xs text-red-300 transition-colors"
										data-testid="quick-fire-button"
										disabled={saving}
										onClick={() => setShowDeleteConfirm(true)}
										type="button">
										<span>🗑️</span>
										<span>Sa thải agent</span>
									</button>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Tab 2: Model & Thông số AI */}
				{activeTab === "model" && (
					<ModelParamsTab
						contextWindow={contextWindow}
						maxIterations={maxIterations}
						maxOutputTokens={maxOutputTokens}
						modelId={modelId}
						providerId={providerId}
						reasoningEffort={reasoningEffort}
						setContextWindow={setContextWindow}
						setMaxIterations={setMaxIterations}
						setMaxOutputTokens={setMaxOutputTokens}
						setModelId={setModelId}
						setProviderId={setProviderId}
						setReasoningEffort={setReasoningEffort}
						setSupportsImages={setSupportsImages}
						setTemperature={setTemperature}
						supportsImages={supportsImages}
						temperature={temperature}
					/>
				)}
				{/* Tab 3: Tools & Quyền Hạn */}
				{activeTab === "tools" && (
					<ToolsPermissionsTab
						allowPaths={allowPaths}
						allowTools={allowTools}
						customDenyPaths={customDenyPaths}
						denyTools={denyTools}
						setAllowPaths={setAllowPaths}
						setAllowTools={setAllowTools}
						setCustomDenyPaths={setCustomDenyPaths}
						setDenyTools={setDenyTools}
					/>
				)}

				{/* Tab 4: Rules & Instructions */}
				{activeTab === "rules" && (
					<InstructionsRulesTab
						availableRules={availableRules}
						instructions={instructions}
						selectedRules={rules}
						setInstructions={setInstructions}
						setSelectedRules={setRules}
					/>
				)}

				{/* Tab 5: Skills */}
				{activeTab === "skills" && (
					<SkillsTab availableSkills={availableSkills} selectedSkills={skills} setSelectedSkills={setSkills} />
				)}
			</div>

			{/* Action Footer */}
			<div className="flex shrink-0 items-center justify-between border-t border-border-panel bg-[#10162a]/95 px-4 py-2.5">
				<div className="flex items-center gap-2">
					{isDirty ? (
						<span
							className="flex items-center gap-1.5 text-xs text-amber-400 font-medium"
							data-testid="dirty-indicator">
							<span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
							<span>Có thay đổi chưa lưu</span>
						</span>
					) : (
						<span className="text-xs text-slate-400">Đã đồng bộ</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					<button
						className="rounded border border-border-panel px-3 py-1 text-xs hover:bg-white/5"
						disabled={saving}
						onClick={handleCloseRequest}
						type="button">
						Đóng / Hủy
					</button>
					<button
						className="flex items-center gap-1.5 rounded bg-indigo-600 px-3.5 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-sm"
						data-testid="editor-save-button"
						disabled={saving}
						onClick={handleSave}
						type="button">
						{saving && (
							<span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
						)}
						<span>{saving ? "Đang lưu…" : "Lưu thay đổi"}</span>
					</button>
				</div>
			</div>

			{/* Confirm Discard Modal */}
			{showDiscardConfirm && (
				<div
					className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
					data-testid="discard-confirm-modal">
					<div className="flex flex-col gap-3 rounded-lg border border-border-panel bg-[#12182b] p-4 shadow-2xl max-w-sm w-full">
						<div className="flex items-center gap-2">
							<span className="text-lg">⚠️</span>
							<h3 className="font-semibold text-sm text-slate-100">Thay đổi chưa được lưu</h3>
						</div>
						<p className="text-xs text-slate-300">
							Bạn có thay đổi chưa lưu trên Agent này. Bạn có muốn bỏ thay đổi không?
						</p>
						<div className="flex justify-end gap-2 pt-2">
							<button
								className="rounded border border-border-panel px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
								onClick={() => setShowDiscardConfirm(false)}
								type="button">
								Tiếp tục chỉnh sửa
							</button>
							<button
								className="rounded bg-error px-3 py-1.5 text-xs font-semibold text-white hover:bg-error/80"
								data-testid="discard-confirm-button"
								onClick={() => {
									setShowDiscardConfirm(false)
									onClose()
								}}
								type="button">
								Bỏ thay đổi
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Confirm Delete Modal */}
			{showDeleteConfirm && (
				<div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
					<div className="flex flex-col gap-3 rounded border border-border-panel bg-(--vscode-editor-background) p-4 shadow-xl max-w-sm w-full">
						<h3 className="font-semibold text-sm text-error">Xóa agent?</h3>
						<p className="text-xs opacity-80">
							Bạn có chắc chắn muốn xóa agent <strong>{displayName || id}</strong>? File profile và thư mục của
							agent sẽ bị xóa.
						</p>
						<div className="flex justify-end gap-2 pt-1">
							<button
								className="rounded border border-border-panel px-3 py-1 text-xs hover:bg-white/5"
								onClick={() => setShowDeleteConfirm(false)}
								type="button">
								Hủy
							</button>
							<button
								className="rounded bg-error px-3 py-1 text-xs text-white hover:bg-error/80"
								data-testid="confirm-delete-button"
								onClick={handleDelete}
								type="button">
								Xác nhận xóa
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default AgentEditor
