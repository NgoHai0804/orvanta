import { MANDATORY_DENY_WRITE_PATHS } from "@cline/shared/orvanta"
import { OrvantaAgentProfile } from "@shared/proto/cline/orvanta"
import { useState } from "react"

const AGENT_ID_RE = /^[a-z][a-z0-9_-]{1,31}$/

export type AgentEditorProps = {
	initialProfile: OrvantaAgentProfile
	isNew: boolean
	isCoordinator: boolean
	existingIds: string[]
	onSave: (profile: OrvantaAgentProfile) => Promise<boolean>
	onDelete?: (agentId: string) => Promise<boolean>
	onClose: () => void
}

export const AgentEditor = ({
	initialProfile,
	isNew,
	isCoordinator,
	existingIds,
	onSave,
	onDelete,
	onClose,
}: AgentEditorProps) => {
	const [id, setId] = useState(initialProfile.id)
	const [displayName, setDisplayName] = useState(initialProfile.displayName)
	const [description, setDescription] = useState(initialProfile.description)
	const [modelId, setModelId] = useState(initialProfile.modelId ?? "")
	const [maxIterations, setMaxIterations] = useState<number>(initialProfile.maxIterations || 40)
	const [temperature, setTemperature] = useState<string>(
		initialProfile.temperature !== undefined && initialProfile.temperature !== null ? String(initialProfile.temperature) : "",
	)
	const [instructions, setInstructions] = useState(initialProfile.instructions)
	const [allowTools, setAllowTools] = useState<string[]>(initialProfile.tools?.allow ?? [])
	const [denyTools, setDenyTools] = useState<string[]>(initialProfile.tools?.deny ?? [])
	const [newAllowTool, setNewAllowTool] = useState("")
	const [newDenyTool, setNewDenyTool] = useState("")

	const [allowPaths] = useState<string[]>(
		initialProfile.scopePaths?.allow && initialProfile.scopePaths.allow.length > 0
			? initialProfile.scopePaths.allow
			: ["**/*"],
	)

	const initialCustomDeny = (initialProfile.scopePaths?.denyWrite ?? []).filter(
		(p) => !(MANDATORY_DENY_WRITE_PATHS as readonly string[]).includes(p),
	)
	const [customDenyPaths, setCustomDenyPaths] = useState<string[]>(initialCustomDeny)
	const [newDenyPath, setNewDenyPath] = useState("")

	const [error, setError] = useState<string | undefined>()
	const [saving, setSaving] = useState(false)
	const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const isDirty =
		id !== initialProfile.id ||
		displayName !== initialProfile.displayName ||
		description !== initialProfile.description ||
		modelId !== (initialProfile.modelId ?? "") ||
		maxIterations !== (initialProfile.maxIterations || 40) ||
		instructions !== initialProfile.instructions ||
		JSON.stringify(allowTools) !== JSON.stringify(initialProfile.tools?.allow ?? []) ||
		JSON.stringify(denyTools) !== JSON.stringify(initialProfile.tools?.deny ?? []) ||
		JSON.stringify(customDenyPaths) !== JSON.stringify(initialCustomDeny)

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
			role: isCoordinator ? "lead" : "teammate",
			modelId: modelId.trim() ? modelId.trim() : undefined,
			maxIterations,
			temperature: parsedTemp,
			instructions: trimmedInstructions,
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
				onClose()
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
		<div className="absolute inset-0 z-30 flex flex-col bg-(--vscode-editor-background) text-sm text-(--vscode-foreground)">
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
						className="rounded bg-(--vscode-button-background) px-3 py-1 text-xs text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) disabled:opacity-50"
						disabled={saving}
						onClick={handleSave}
						type="button">
						{saving ? "Đang lưu…" : "Lưu"}
					</button>
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
				{error && <div className="rounded border border-error/50 bg-error/10 p-2.5 text-xs text-error">{error}</div>}

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

				<div className="grid grid-cols-3 gap-3">
					<label className="flex flex-col gap-1">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Model ID</span>
						<input
							className="rounded border border-border-panel bg-input-background px-2.5 py-1 font-mono text-xs"
							onChange={(e) => setModelId(e.target.value)}
							placeholder="Kế thừa (để trống)"
							value={modelId}
						/>
					</label>

					<label className="flex flex-col gap-1">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Max iterations</span>
						<input
							className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
							max={200}
							min={1}
							onChange={(e) => setMaxIterations(parseInt(e.target.value, 10) || 40)}
							type="number"
							value={maxIterations}
						/>
					</label>

					<label className="flex flex-col gap-1">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Temperature</span>
						<input
							className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
							max={2}
							min={0}
							onChange={(e) => setTemperature(e.target.value)}
							placeholder="Kế thừa"
							step="0.1"
							type="number"
							value={temperature}
						/>
					</label>
				</div>
				{/* Tools configuration */}
				<div className="grid grid-cols-2 gap-3">
					<div className="flex flex-col gap-1.5 rounded border border-border-panel p-2.5">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Tools cho phép</span>
						<div className="flex flex-wrap gap-1">
							{allowTools.map((t) => (
								<span className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs" key={t}>
									{t}
									<button
										className="opacity-60 hover:opacity-100"
										onClick={() => setAllowTools(allowTools.filter((x) => x !== t))}
										type="button">
										×
									</button>
								</span>
							))}
						</div>
						<div className="flex gap-1 pt-1">
							<input
								className="flex-1 rounded border border-border-panel bg-input-background px-2 py-0.5 font-mono text-xs"
								onChange={(e) => setNewAllowTool(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && newAllowTool.trim()) {
										e.preventDefault()
										if (!allowTools.includes(newAllowTool.trim())) {
											setAllowTools([...allowTools, newAllowTool.trim()])
										}
										setNewAllowTool("")
									}
								}}
								placeholder="Thêm tool..."
								value={newAllowTool}
							/>
							<button
								className="rounded border border-border-panel px-2 text-xs hover:bg-white/5"
								onClick={() => {
									if (newAllowTool.trim() && !allowTools.includes(newAllowTool.trim())) {
										setAllowTools([...allowTools, newAllowTool.trim()])
										setNewAllowTool("")
									}
								}}
								type="button">
								+
							</button>
						</div>
					</div>

					<div className="flex flex-col gap-1.5 rounded border border-border-panel p-2.5">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Tools cấm</span>
						<div className="flex flex-wrap gap-1">
							{denyTools.map((t) => (
								<span
									className="flex items-center gap-1 rounded bg-error/15 px-2 py-0.5 text-xs text-error"
									key={t}>
									{t}
									<button
										className="opacity-60 hover:opacity-100"
										onClick={() => setDenyTools(denyTools.filter((x) => x !== t))}
										type="button">
										×
									</button>
								</span>
							))}
						</div>
						<div className="flex gap-1 pt-1">
							<input
								className="flex-1 rounded border border-border-panel bg-input-background px-2 py-0.5 font-mono text-xs"
								onChange={(e) => setNewDenyTool(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && newDenyTool.trim()) {
										e.preventDefault()
										if (!denyTools.includes(newDenyTool.trim())) {
											setDenyTools([...denyTools, newDenyTool.trim()])
										}
										setNewDenyTool("")
									}
								}}
								placeholder="Cấm tool..."
								value={newDenyTool}
							/>
							<button
								className="rounded border border-border-panel px-2 text-xs hover:bg-white/5"
								onClick={() => {
									if (newDenyTool.trim() && !denyTools.includes(newDenyTool.trim())) {
										setDenyTools([...denyTools, newDenyTool.trim()])
										setNewDenyTool("")
									}
								}}
								type="button">
								+
							</button>
						</div>
					</div>
				</div>

				{/* Scope Paths */}
				<div className="flex flex-col gap-2 rounded border border-border-panel p-2.5">
					<span className="text-xs font-bold uppercase tracking-wide opacity-70">Cấm ghi (Deny write paths)</span>
					<div className="flex flex-wrap gap-1">
						{MANDATORY_DENY_WRITE_PATHS.map((p) => (
							<span
								className="flex items-center gap-1 rounded bg-error/15 px-2 py-0.5 text-xs text-error"
								key={p}
								title="Bắt buộc bởi purpose-lock">
								🔒 {p}
							</span>
						))}
						{customDenyPaths.map((p) => (
							<span className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs" key={p}>
								{p}
								<button
									className="opacity-60 hover:opacity-100"
									onClick={() => setCustomDenyPaths(customDenyPaths.filter((x) => x !== p))}
									type="button">
									×
								</button>
							</span>
						))}
					</div>
					<div className="flex gap-1 pt-1">
						<input
							className="flex-1 rounded border border-border-panel bg-input-background px-2 py-0.5 font-mono text-xs"
							onChange={(e) => setNewDenyPath(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && newDenyPath.trim()) {
									e.preventDefault()
									if (!customDenyPaths.includes(newDenyPath.trim())) {
										setCustomDenyPaths([...customDenyPaths, newDenyPath.trim()])
									}
									setNewDenyPath("")
								}
							}}
							placeholder="Thêm path cấm ghi (ví dụ: secret.env)..."
							value={newDenyPath}
						/>
						<button
							className="rounded border border-border-panel px-2 text-xs hover:bg-white/5"
							onClick={() => {
								if (newDenyPath.trim() && !customDenyPaths.includes(newDenyPath.trim())) {
									setCustomDenyPaths([...customDenyPaths, newDenyPath.trim()])
									setNewDenyPath("")
								}
							}}
							type="button">
							+
						</button>
					</div>
				</div>

				{/* Instructions textarea */}
				<label className="flex min-h-64 flex-1 flex-col gap-1">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Instructions</span>
						<span className="text-[11px] opacity-50">Markdown / System Prompt</span>
					</div>
					<textarea
						className="min-h-48 flex-1 resize-y rounded border border-border-panel bg-input-background p-2.5 font-mono text-xs leading-relaxed"
						onChange={(e) => setInstructions(e.target.value)}
						placeholder="Hướng dẫn và nguyên tắc hành vi của agent..."
						required
						value={instructions}
					/>
				</label>
			</div>

			{/* Confirm Discard Modal */}
			{showDiscardConfirm && (
				<div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
					<div className="flex flex-col gap-3 rounded border border-border-panel bg-(--vscode-editor-background) p-4 shadow-xl max-w-sm w-full">
						<h3 className="font-semibold text-sm">Bỏ thay đổi?</h3>
						<p className="text-xs opacity-80">Các thay đổi bạn vừa chỉnh sửa sẽ không được lưu.</p>
						<div className="flex justify-end gap-2 pt-1">
							<button
								className="rounded border border-border-panel px-3 py-1 text-xs hover:bg-white/5"
								onClick={() => setShowDiscardConfirm(false)}
								type="button">
								Tiếp tục sửa
							</button>
							<button
								className="rounded bg-error px-3 py-1 text-xs text-white hover:bg-error/80"
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
