import { PURPOSE_TEMPLATE } from "@cline/shared/orvanta"
import { StringRequest } from "@shared/proto/cline/common"
import type { OrvantaAgentProfile, OrvantaCompanyResponse, OrvantaDecisionItem } from "@shared/proto/cline/orvanta"
import {
	IconAlertTriangle,
	IconArrowRight,
	IconCopy,
	IconDots,
	IconDownload,
	IconFileCode,
	IconFolder,
	IconLoader2,
	IconRefresh,
	IconTrash,
	IconUpload,
	IconX,
} from "@tabler/icons-react"
import { useMemo, useState } from "react"
import MarkdownBlock from "@/components/common/MarkdownBlock"
import { OrvantaServiceClient } from "@/services/grpc-client"
import EditPurposeModal from "./EditPurposeModal"
import LibraryDialog, { type LibraryDialogMode } from "./LibraryDialog"
import type { OrvantaTab } from "./OrvantaShell"

interface WorkTask {
	id: string
	title: string
	description?: string
	status: "pending" | "in_progress" | "blocked" | "completed" | "canceled"
	assignee?: string
	dependsOn?: string[]
	updatedAt?: string
	reason?: string
}

type HomeViewProps = {
	company: OrvantaCompanyResponse
	loading?: boolean
	creating: boolean
	createError?: string
	onCreate: (name: string, purpose: string) => Promise<unknown>
	onRefresh?: () => Promise<void>
	agentProfiles?: Record<string, OrvantaAgentProfile>
	onSaveAgentProfile?: (profile: OrvantaAgentProfile) => Promise<boolean>
	onDeleteAgentProfile?: (agentId: string) => Promise<boolean>
	inboxPending?: OrvantaDecisionItem[]
	onOpenInbox?: (focusId?: string) => void
	onRequestDecision?: (
		type: string,
		title: string,
		summary: string,
		payload: Record<string, unknown>,
		urgency?: string,
	) => Promise<unknown>
	isTeamSessionActive?: boolean
	onTabChange?: (tab: OrvantaTab) => void
}

const HomeView = ({
	company,
	loading,
	creating,
	createError,
	onCreate,
	onRefresh,
	inboxPending,
	onOpenInbox,
	onRequestDecision,
	onTabChange,
}: HomeViewProps) => {
	const [expandedPurpose, setExpandedPurpose] = useState(false)
	const [showMenu, setShowMenu] = useState(false)
	const [libraryDialogMode, setLibraryDialogMode] = useState<LibraryDialogMode | undefined>()
	const [showEditPurposeModal, setShowEditPurposeModal] = useState(false)
	const [purposeSubmitting, setPurposeSubmitting] = useState(false)
	const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
	const [syncing, setSyncing] = useState(false)
	const [showViewCompanyJson, setShowViewCompanyJson] = useState(false)
	const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false)
	const [deleteConfirmName, setDeleteConfirmName] = useState("")
	const [deletingCompany, setDeletingCompany] = useState(false)
	const [showAllTasks, setShowAllTasks] = useState(false)

	const coordinatorAgent = company.agents?.find((a) => a.role === "lead" || a.id === "coordinator")

	const handleSync = async () => {
		setSyncing(true)
		try {
			if (onRefresh) {
				await onRefresh()
			}
			setNoticeMessage("Đã đồng bộ công ty.")
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err)
			setNoticeMessage(`Lỗi đồng bộ: ${msg}`)
		} finally {
			setSyncing(false)
		}
	}

	const handleCopyPurpose = () => {
		setShowMenu(false)
		if (navigator.clipboard) {
			navigator.clipboard
				.writeText(purpose)
				.then(() => {
					setNoticeMessage("Đã sao chép Purpose vào clipboard.")
				})
				.catch(() => {
					setNoticeMessage("Không thể sao chép Purpose.")
				})
		}
	}

	const handleDeleteCompany = async () => {
		if (deleteConfirmName.trim() !== company.name.trim()) {
			setNoticeMessage("Tên công ty xác nhận không đúng.")
			return
		}
		setDeletingCompany(true)
		try {
			await OrvantaServiceClient.deleteCompany(StringRequest.create({ value: deleteConfirmName.trim() }))
			setShowDeleteCompanyModal(false)
			setDeleteConfirmName("")
			setNoticeMessage("Đã xóa công ty thành công.")
			if (onRefresh) {
				await onRefresh()
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err)
			setNoticeMessage(`Lỗi xóa công ty: ${msg}`)
		} finally {
			setDeletingCompany(false)
		}
	}

	const errors = company.errors ?? []
	const agents = company.agents ?? []
	const purpose = company.purpose ?? ""

	const runningCount = useMemo(() => agents.filter((a) => a.status === "running").length, [agents])
	const idleCount = useMemo(() => agents.filter((a) => a.status === "idle").length, [agents])

	const workTasks: WorkTask[] = useMemo(() => {
		if (!company.tasksJson) return []
		try {
			const parsed = JSON.parse(company.tasksJson)
			return Array.isArray(parsed.tasks) ? parsed.tasks : []
		} catch {
			return []
		}
	}, [company.tasksJson])

	const inProgressTasks = useMemo(() => workTasks.filter((t) => t.status === "in_progress"), [workTasks])
	const blockedTasks = useMemo(() => workTasks.filter((t) => t.status === "blocked"), [workTasks])
	const queueTasks = useMemo(() => workTasks.filter((t) => t.status === "pending"), [workTasks])

	const hasInterrupted = useMemo(() => {
		return (company.agents ?? []).some((a) => a.status === "interrupted")
	}, [company.agents])

	if (loading && company.status === "missing" && !company.id) {
		return (
			<div className="flex flex-1 items-center justify-center p-4 text-xs opacity-70">
				<IconLoader2 className="animate-spin mr-2" size={16} stroke={1.5} />
				Đang tải…
			</div>
		)
	}

	const noFolder = errors.includes("no_folder")
	if (company.status === "missing" && noFolder) {
		return (
			<div className="flex flex-col gap-2 p-3 text-sm">
				<h2 className="text-base font-semibold">Orvanta</h2>
				<p className="opacity-80">Mở một folder workspace để lập công ty.</p>
			</div>
		)
	}

	if (company.status === "broken") {
		return (
			<div className="flex flex-col gap-2 p-3 text-sm">
				<h2 className="text-base font-semibold text-error">Công ty bị lỗi</h2>
				<ul className="list-disc pl-4 text-error text-xs space-y-1">
					{errors.length > 0 ? (
						errors.map((error) => <li key={error}>{error}</li>)
					) : (
						<li>Cấu trúc thư mục .orvanta không hợp lệ.</li>
					)}
				</ul>
			</div>
		)
	}

	if (company.status === "ready") {
		const purposeTagline = (() => {
			const lines = purpose
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean)
			const contentLine = lines.find((line) => !/^#\s*purpose$/i.test(line)) || lines[0] || ""
			return contentLine.replace(/^#+\s*/, "").slice(0, 120)
		})()

		return (
			<div className="flex min-h-0 flex-1 flex-col gap-3 scroller-y p-3 text-sm">
				<header className="flex items-start justify-between">
					<div>
						<h2 className="text-base font-semibold">{company.name}</h2>
						{purposeTagline && <p className="text-xs opacity-75">{purposeTagline}</p>}
					</div>
					<div className="flex items-center gap-1.5">
						<button
							className="rounded p-1 text-xs opacity-70 hover:bg-(--vscode-list-hoverBackground) hover:opacity-100 disabled:opacity-40 cursor-pointer flex items-center justify-center transition-colors"
							disabled={syncing}
							onClick={handleSync}
							title="Đồng bộ công ty"
							type="button">
							<IconRefresh className={syncing ? "animate-spin" : ""} size={14} stroke={1.5} />
						</button>
						<div className="relative">
							<button
								className="rounded p-1 text-xs opacity-70 hover:bg-(--vscode-list-hoverBackground) hover:opacity-100 cursor-pointer flex items-center justify-center transition-colors"
								onClick={() => setShowMenu((prev) => !prev)}
								title="Tùy chọn công ty"
								type="button">
								<IconDots size={16} stroke={1.5} />
							</button>
							{showMenu && (
								<div className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-md border border-border-panel bg-(--vscode-editor-background) p-1 shadow-xl">
									<button
										className="w-full rounded px-2.5 py-1 text-left text-xs hover:bg-(--vscode-list-hoverBackground) flex items-center gap-2 cursor-pointer transition-colors"
										onClick={() => {
											setShowMenu(false)
											setNoticeMessage("Thư mục cấu hình công ty: .orvanta/")
										}}
										type="button">
										<IconFolder className="shrink-0 text-muted-foreground" size={13} stroke={1.5} />
										<span>Mở thư mục .orvanta</span>
									</button>
									<button
										className="w-full rounded px-2.5 py-1 text-left text-xs hover:bg-(--vscode-list-hoverBackground) flex items-center gap-2 cursor-pointer transition-colors"
										onClick={handleCopyPurpose}
										type="button">
										<IconCopy className="shrink-0 text-muted-foreground" size={13} stroke={1.5} />
										<span>Sao chép Purpose</span>
									</button>
									<button
										className="w-full rounded px-2.5 py-1 text-left text-xs hover:bg-(--vscode-list-hoverBackground) flex items-center gap-2 cursor-pointer transition-colors"
										onClick={() => {
											setShowMenu(false)
											setShowViewCompanyJson(true)
										}}
										type="button">
										<IconFileCode className="shrink-0 text-muted-foreground" size={13} stroke={1.5} />
										<span>Xem company.json</span>
									</button>
									<button
										className="w-full rounded px-2.5 py-1 text-left text-xs hover:bg-(--vscode-list-hoverBackground) flex items-center gap-2 cursor-pointer transition-colors"
										onClick={() => {
											setShowMenu(false)
											setLibraryDialogMode("save")
										}}
										type="button">
										<IconDownload className="shrink-0 text-muted-foreground" size={13} stroke={1.5} />
										<span>Lưu vào thư viện…</span>
									</button>
									<button
										className="w-full rounded px-2.5 py-1 text-left text-xs hover:bg-(--vscode-list-hoverBackground) flex items-center gap-2 cursor-pointer transition-colors"
										onClick={() => {
											setShowMenu(false)
											setLibraryDialogMode("load")
										}}
										type="button">
										<IconUpload className="shrink-0 text-muted-foreground" size={13} stroke={1.5} />
										<span>Tải từ thư viện…</span>
									</button>
									<div className="my-1 border-t border-border-panel" />
									<button
										className="w-full rounded px-2.5 py-1 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer transition-colors"
										onClick={() => {
											setShowMenu(false)
											setShowDeleteCompanyModal(true)
										}}
										type="button">
										<IconTrash className="shrink-0 text-red-400" size={13} stroke={1.5} />
										<span>Xóa công ty…</span>
									</button>
								</div>
							)}
						</div>
					</div>
				</header>

				{noticeMessage && (
					<div className="flex items-center justify-between rounded bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-xs text-blue-300">
						<span>{noticeMessage}</span>
						<button
							aria-label="Đóng thông báo"
							className="ml-2 opacity-60 hover:opacity-100 cursor-pointer p-0.5"
							onClick={() => setNoticeMessage(null)}
							type="button">
							<IconX size={12} stroke={1.5} />
						</button>
					</div>
				)}

				{hasInterrupted && (
					<div className="flex items-center justify-between rounded bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-300">
						<div className="flex items-center gap-2">
							<IconAlertTriangle className="text-amber-400 shrink-0" size={15} stroke={1.5} />
							<span>Phiên làm việc trước bị gián đoạn (interrupted).</span>
						</div>
						<button
							className="rounded bg-amber-600 px-2.5 py-1 text-xs text-white hover:bg-amber-500 font-medium inline-flex items-center gap-1 cursor-pointer"
							onClick={() => {
								window.postMessage(
									{
										type: "orvanta_switch_tab",
										tab: "chat",
										focusAgentId: coordinatorAgent?.id || "coordinator",
									},
									"*",
								)
							}}
							type="button">
							<span>Tiếp tục</span>
							<IconArrowRight size={12} stroke={1.5} />
						</button>
					</div>
				)}

				{inboxPending !== undefined && onOpenInbox && (
					<section className="rounded border border-border-panel bg-surface-secondary/20 p-2.5">
						<div className="flex items-center justify-between mb-1.5">
							<div className="flex items-center gap-1.5 font-semibold text-xs">
								<span>Quyết định chờ</span>
								<span className="rounded-full bg-(--vscode-badge-background) px-1.5 py-0.2 text-[10px] text-(--vscode-badge-foreground)">
									{inboxPending.length}
								</span>
							</div>
							<button
								aria-label="Mở Inbox →"
								className="text-xs text-(--vscode-textLink-foreground) hover:underline inline-flex items-center gap-1 cursor-pointer"
								onClick={() => onOpenInbox()}
								type="button">
								<span>Mở Inbox</span>
								<IconArrowRight size={12} stroke={1.5} />
							</button>
						</div>
						{inboxPending.length === 0 ? (
							<div className="text-xs text-muted-foreground">Không có quyết định chờ.</div>
						) : (
							<div className="space-y-1">
								{inboxPending.slice(0, 3).map((item) => (
									<button
										className="w-full text-left rounded p-1.5 text-xs hover:bg-surface-secondary flex items-center justify-between transition-colors"
										key={item.id}
										onClick={() => onOpenInbox(item.id)}
										type="button">
										<div className="flex items-center gap-1.5 truncate">
											<span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
											<span className="font-medium truncate">{item.title}</span>
										</div>
										<span className="text-[10px] opacity-60 shrink-0 capitalize">{item.urgency}</span>
									</button>
								))}
							</div>
						)}
					</section>
				)}

				<section className="flex flex-col gap-2 rounded border border-border-panel p-2.5">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold uppercase tracking-wide opacity-70">Work now</h3>
						{workTasks.length > 5 && (
							<button
								className="text-xs text-(--vscode-textLink-foreground) hover:underline"
								onClick={() => setShowAllTasks((prev) => !prev)}
								type="button">
								{showAllTasks ? "Thu gọn" : "Xem tất cả"}
							</button>
						)}
					</div>
					{workTasks.length === 0 ? (
						<div className="text-xs text-muted-foreground">Chưa có việc. Nói với coordinator trên Chat.</div>
					) : (
						<div className="space-y-2">
							{inProgressTasks.length > 0 && (
								<div className="space-y-1">
									<div className="font-semibold text-[11px] opacity-75">
										In progress ({inProgressTasks.length})
									</div>
									{inProgressTasks.slice(0, showAllTasks ? 100 : 20).map((task) => (
										<TaskRow key={task.id} onRequestDecision={onRequestDecision} task={task} />
									))}
								</div>
							)}
							{blockedTasks.length > 0 && (
								<div className="space-y-1">
									<div className="font-semibold text-[11px] text-amber-400">
										Blocked ({blockedTasks.length})
									</div>
									{blockedTasks.slice(0, showAllTasks ? 100 : 20).map((task) => (
										<TaskRow key={task.id} onRequestDecision={onRequestDecision} task={task} />
									))}
								</div>
							)}
							{queueTasks.length > 0 && (
								<div className="space-y-1">
									<div className="font-semibold text-[11px] opacity-75">Queue ({queueTasks.length})</div>
									{queueTasks.slice(0, showAllTasks ? 100 : 20).map((task) => (
										<TaskRow key={task.id} onRequestDecision={onRequestDecision} task={task} />
									))}
								</div>
							)}
						</div>
					)}
				</section>

				<section className="flex flex-col gap-1">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold uppercase tracking-wide opacity-70">Purpose</h3>
						<div className="flex items-center gap-2">
							{onRequestDecision && (
								<button
									className="text-xs text-(--vscode-textLink-foreground) hover:underline"
									onClick={() => setShowEditPurposeModal(true)}
									type="button">
									Sửa Purpose
								</button>
							)}
							<button
								className="text-xs text-(--vscode-textLink-foreground) hover:underline"
								onClick={() => setExpandedPurpose((prev) => !prev)}
								type="button">
								{expandedPurpose ? "Thu gọn" : "Xem thêm"}
							</button>
						</div>
					</div>
					<div className={expandedPurpose ? "" : "max-h-48 overflow-hidden line-clamp-8"}>
						<MarkdownBlock markdown={purpose} />
					</div>
				</section>
				<section className="rounded border border-border-panel bg-surface-secondary/20 p-2.5">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-1.5 font-semibold text-xs">
							<span>Đội ngũ Agents</span>
							<span className="rounded-full bg-(--vscode-badge-background) px-1.5 py-0.2 text-[10px] text-(--vscode-badge-foreground)">
								{agents.length}
							</span>
						</div>
						<button
							aria-label="Xem sơ đồ cây & Quản lý Agents →"
							className="text-xs text-(--vscode-textLink-foreground) hover:underline flex items-center gap-1 cursor-pointer"
							onClick={() => {
								if (onTabChange) {
									onTabChange("agents")
								} else {
									window.postMessage({ type: "orvanta_switch_tab", tab: "agents" }, "*")
								}
							}}
							type="button">
							<span>Xem sơ đồ cây & Quản lý Agents</span>
							<IconArrowRight size={12} stroke={1.5} />
						</button>
					</div>
					<div className="flex flex-wrap items-center gap-4 text-xs">
						<div className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-full bg-slate-400" />
							<span className="opacity-75">Tổng:</span>
							<span className="font-semibold">{agents.length} agents</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
							<span className="opacity-75">Đang chạy:</span>
							<span className="font-semibold text-amber-300">{runningCount} running</span>
						</div>
						<div className="flex items-center gap-1.5">
							<span className="h-2 w-2 rounded-full bg-emerald-400" />
							<span className="opacity-75">Đang chờ:</span>
							<span className="font-semibold text-emerald-300">{idleCount} idle</span>
						</div>
					</div>
				</section>

				{/* Library Dialog Overlay */}
				{libraryDialogMode && (
					<LibraryDialog
						currentCompany={company}
						mode={libraryDialogMode}
						onClose={() => setLibraryDialogMode(undefined)}
						onCompanyLoaded={async () => {
							setLibraryDialogMode(undefined)
							if (onRefresh) {
								await onRefresh()
							}
						}}
					/>
				)}
				{/* Edit Purpose Modal */}
				{showEditPurposeModal && (
					<EditPurposeModal
						currentPurpose={purpose}
						onClose={() => setShowEditPurposeModal(false)}
						onSubmit={async (newPurpose, reason) => {
							if (!onRequestDecision) return
							setPurposeSubmitting(true)
							try {
								await onRequestDecision(
									"change_purpose",
									"Đề xuất đổi Purpose",
									reason,
									{ from: purpose, to: newPurpose },
									"high",
								)
								setShowEditPurposeModal(false)
								setNoticeMessage("Đã gửi đề xuất đổi Purpose vào Inbox để CEO phê duyệt.")
							} catch (err: unknown) {
								const msg = err instanceof Error ? err.message : String(err)
								setNoticeMessage(`Lỗi: ${msg}`)
							} finally {
								setPurposeSubmitting(false)
							}
						}}
						submitting={purposeSubmitting}
					/>
				)}

				{/* View company.json Modal */}
				{showViewCompanyJson && (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
						<div className="flex max-w-md w-full flex-col gap-3 rounded-md border border-border-panel bg-(--vscode-editor-background) p-4 shadow-xl">
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-sm">company.json</h3>
								<button
									aria-label="Đóng"
									className="text-xs opacity-60 hover:opacity-100 cursor-pointer p-0.5 rounded"
									onClick={() => setShowViewCompanyJson(false)}
									type="button">
									<IconX size={14} stroke={1.5} />
								</button>
							</div>
							<pre className="scroller max-h-64 rounded border border-border-panel bg-black/40 p-2 font-mono text-[11px]">
								{JSON.stringify(
									{
										id: company.id,
										name: company.name,
										teamName: company.teamName,
										purpose: company.purpose,
										agentsCount: company.agents?.length,
									},
									null,
									2,
								)}
							</pre>
							<div className="flex justify-end">
								<button
									className="rounded border border-border-panel px-3 py-1 text-xs hover:bg-(--vscode-list-hoverBackground) cursor-pointer"
									onClick={() => setShowViewCompanyJson(false)}
									type="button">
									Đóng
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Delete Company Modal */}
				{showDeleteCompanyModal && (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
						<div className="flex max-w-sm w-full flex-col gap-3 rounded-md border border-red-500/40 bg-(--vscode-editor-background) p-4 shadow-xl">
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-sm text-red-400">Xóa công ty</h3>
								<button
									aria-label="Đóng"
									className="text-xs opacity-60 hover:opacity-100 cursor-pointer p-0.5 rounded"
									onClick={() => setShowDeleteCompanyModal(false)}
									type="button">
									<IconX size={14} stroke={1.5} />
								</button>
							</div>
							<p className="text-xs opacity-80">
								Hành động này sẽ xóa hoàn toàn thư mục <code className="text-red-300">.orvanta/</code>. Để xác
								nhận, vui lòng gõ tên công ty <strong>{company.name}</strong>:
							</p>
							<input
								className="rounded border border-border-panel bg-input-background px-2 py-1 text-xs"
								onChange={(e) => setDeleteConfirmName(e.target.value)}
								placeholder={company.name}
								value={deleteConfirmName}
							/>
							<div className="flex items-center justify-end gap-2">
								<button
									className="rounded border border-border-panel px-2.5 py-1 text-xs hover:bg-white/5"
									onClick={() => setShowDeleteCompanyModal(false)}
									type="button">
									Hủy
								</button>
								<button
									className="rounded bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-500 disabled:opacity-50 font-medium"
									disabled={deletingCompany || deleteConfirmName.trim() !== company.name.trim()}
									onClick={handleDeleteCompany}
									type="button">
									{deletingCompany ? "Đang xóa…" : "Xác nhận xóa"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		)
	}

	return (
		<>
			<CreateCompanyForm
				creating={creating}
				error={createError}
				onCreate={onCreate}
				onOpenLoadLibrary={() => setLibraryDialogMode("load")}
			/>
			{libraryDialogMode && (
				<LibraryDialog
					currentCompany={company}
					mode={libraryDialogMode}
					onClose={() => setLibraryDialogMode(undefined)}
					onCompanyLoaded={async () => {
						setLibraryDialogMode(undefined)
						if (onRefresh) {
							await onRefresh()
						}
					}}
				/>
			)}
		</>
	)
}

const CreateCompanyForm = ({
	creating,
	error,
	onCreate,
	onOpenLoadLibrary,
}: {
	creating: boolean
	error?: string
	onCreate: (name: string, purpose: string) => Promise<unknown>
	onOpenLoadLibrary: () => void
}) => {
	const [name, setName] = useState("")
	const [purpose, setPurpose] = useState(PURPOSE_TEMPLATE)
	const [clientError, setClientError] = useState<string | undefined>()

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault()
		const trimmedName = name.trim()
		const trimmedPurpose = purpose.trim()
		if (!trimmedName) {
			setClientError("Vui lòng nhập tên công ty")
			return
		}
		if (trimmedPurpose.length < 20) {
			setClientError("Purpose phải có ít nhất 20 ký tự")
			return
		}
		setClientError(undefined)
		void onCreate(trimmedName, trimmedPurpose)
	}

	const displayError = clientError || error

	return (
		<form className="flex min-h-0 flex-1 flex-col gap-3 scroller-y p-3 text-sm" onSubmit={handleSubmit}>
			<h2 className="text-base font-semibold">Lập công ty cho folder này</h2>
			<label className="flex flex-col gap-1">
				<span className="text-xs font-bold uppercase tracking-wide opacity-70">Tên</span>
				<input
					className="rounded border border-border-panel bg-input-background px-2 py-1"
					maxLength={64}
					onChange={(event) => {
						setName(event.target.value)
						if (clientError) setClientError(undefined)
					}}
					placeholder="Tên công ty"
					required
					value={name}
				/>
			</label>
			<label className="flex min-h-40 flex-1 flex-col gap-1">
				<span className="text-xs font-bold uppercase tracking-wide opacity-70">Purpose</span>
				<textarea
					className="min-h-32 flex-1 resize-y rounded border border-border-panel bg-input-background px-2 py-1 font-mono text-xs"
					onChange={(event) => {
						setPurpose(event.target.value)
						if (clientError) setClientError(undefined)
					}}
					required
					value={purpose}
				/>
			</label>
			{displayError && <p className="text-xs text-error">{displayError}</p>}
			<div className="flex items-center gap-2">
				<button
					className="flex-1 rounded bg-(--vscode-button-background) px-3 py-1.5 text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) disabled:opacity-50"
					disabled={creating}
					type="submit">
					{creating ? "Đang ghi .orvanta…" : "Lập công ty"}
				</button>
				<button
					className="rounded border border-border-panel px-3 py-1.5 text-xs hover:bg-white/5"
					onClick={onOpenLoadLibrary}
					type="button">
					Tải từ thư viện
				</button>
			</div>
		</form>
	)
}

const TaskRow = ({
	task,
	onRequestDecision,
}: {
	task: WorkTask
	onRequestDecision?: (
		type: string,
		title: string,
		summary: string,
		payload: Record<string, unknown>,
		urgency?: string,
	) => Promise<unknown>
}) => {
	const handleChatTask = () => {
		window.postMessage(
			{
				type: "orvanta_switch_tab",
				tab: "chat",
				contextTask: { id: task.id, title: task.title },
			},
			"*",
		)
	}

	const handleWarRoom = () => {
		window.postMessage({ type: "orvanta_switch_tab", tab: "war-room" }, "*")
	}

	const handleEscalate = async () => {
		if (onRequestDecision) {
			await onRequestDecision(
				"escalate_blocked",
				`Task '${task.title}' bị block`,
				task.reason || "Yêu cầu tháo gỡ tắc nghẽn từ CEO",
				{ taskId: task.id, reason: task.reason },
				"high",
			)
		}
	}

	return (
		<div className="flex items-center justify-between rounded border border-border-panel bg-(--vscode-editor-background) p-1.5 text-xs">
			<div className="flex items-center gap-2 truncate">
				<span
					className={`h-2 w-2 rounded-full shrink-0 ${
						task.status === "in_progress"
							? "bg-green-500"
							: task.status === "blocked"
								? "bg-amber-500"
								: "bg-blue-400"
					}`}
				/>
				<span className="font-medium truncate">{task.title}</span>
				<span className="text-[10px] opacity-60 shrink-0">{task.assignee ? `@${task.assignee}` : "unassigned"}</span>
				{task.dependsOn && task.dependsOn.length > 0 && (
					<span className="text-[10px] text-amber-300/80 shrink-0">chờ {task.dependsOn.length}</span>
				)}
			</div>
			<div className="flex items-center gap-1.5 shrink-0 ml-2">
				<button
					className="text-[11px] text-(--vscode-textLink-foreground) hover:underline"
					onClick={handleChatTask}
					title="Chat về task này"
					type="button">
					Chat
				</button>
				<button
					className="text-[11px] opacity-70 hover:opacity-100"
					onClick={handleWarRoom}
					title="Mở War room"
					type="button">
					War room
				</button>
				{task.status === "blocked" && onRequestDecision && (
					<button
						className="text-[11px] text-amber-400 hover:underline"
						onClick={handleEscalate}
						title="Escalate quyết định cho CEO"
						type="button">
						Escalate
					</button>
				)}
			</div>
		</div>
	)
}

export default HomeView
