import { StringRequest } from "@shared/proto/cline/common"
import type { OrvantaMemoryProposal } from "@shared/proto/cline/orvanta"
import { IconAlertCircle, IconCheck, IconDeviceFloppy, IconTrash } from "@tabler/icons-react"
import { useCallback, useEffect, useState } from "react"
import { OrvantaServiceClient } from "@/services/grpc-client"

export interface MemoryTabProps {
	agentId: string
	disabled?: boolean
}

export function MemoryTab({ agentId, disabled }: MemoryTabProps) {
	const [content, setContent] = useState("")
	const [status, setStatus] = useState<"empty" | "ready" | "missing" | "corrupt" | "loading">("loading")
	const [error, setError] = useState<string | undefined>()
	const [saving, setSaving] = useState(false)
	const [dirty, setDirty] = useState(false)
	const [proposals, setProposals] = useState<OrvantaMemoryProposal[]>([])
	const [notice, setNotice] = useState<string | undefined>()

	const load = useCallback(async () => {
		if (!agentId.trim()) {
			setStatus("empty")
			setContent("")
			setProposals([])
			return
		}
		setStatus("loading")
		setError(undefined)
		try {
			const [memory, proposalList] = await Promise.all([
				OrvantaServiceClient.getAgentMemory(StringRequest.create({ value: agentId })),
				OrvantaServiceClient.listMemoryProposals(StringRequest.create({ value: agentId })),
			])
			if (!memory.success) {
				setStatus((memory.status as "corrupt" | "missing" | "empty") || "empty")
				setError(memory.error || "Không đọc được memory")
				setContent("")
			} else {
				setContent(memory.content || "")
				setStatus((memory.status as "ready" | "missing") || "missing")
				setDirty(false)
			}
			if (proposalList.success) {
				setProposals(proposalList.proposals ?? [])
			} else if (proposalList.error) {
				setError((prev) => prev || proposalList.error)
			}
		} catch (err) {
			setStatus("empty")
			setError(err instanceof Error ? err.message : String(err))
		}
	}, [agentId])

	useEffect(() => {
		void load()
	}, [load])

	const handleSave = async () => {
		if (!agentId.trim() || disabled) return
		setSaving(true)
		setError(undefined)
		setNotice(undefined)
		try {
			const resp = await OrvantaServiceClient.saveAgentMemory({ agentId, content })
			if (!resp.success) {
				setError(resp.error || "Lưu memory thất bại")
				return
			}
			setStatus((resp.status as "ready" | "missing") || "ready")
			setDirty(false)
			setNotice("Đã lưu memory đã chấp nhận")
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async () => {
		if (!agentId.trim() || disabled) return
		setSaving(true)
		setError(undefined)
		setNotice(undefined)
		try {
			const resp = await OrvantaServiceClient.deleteAgentMemory(StringRequest.create({ value: agentId }))
			if (!resp.success) {
				setError(resp.error || "Xóa memory thất bại")
				return
			}
			setContent("")
			setStatus("missing")
			setDirty(false)
			setNotice("Đã xóa memory đã chấp nhận")
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
		}
	}

	const handleApprove = async (proposalId: string) => {
		setSaving(true)
		setError(undefined)
		setNotice(undefined)
		try {
			const resp = await OrvantaServiceClient.approveMemoryProposal({ agentId, proposalId })
			if (!resp.success) {
				setError(resp.error || "Duyệt proposal thất bại")
				return
			}
			setContent(resp.content || "")
			setStatus((resp.status as "ready" | "missing") || "ready")
			setDirty(false)
			setNotice(`Đã duyệt proposal ${proposalId}`)
			await load()
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
		}
	}

	const handleReject = async (proposalId: string) => {
		setSaving(true)
		setError(undefined)
		setNotice(undefined)
		try {
			const resp = await OrvantaServiceClient.rejectMemoryProposal({ agentId, proposalId })
			if (!resp.success) {
				setError(resp.error || "Từ chối proposal thất bại")
				return
			}
			setProposals(resp.proposals ?? [])
			setNotice(`Đã từ chối proposal ${proposalId}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setSaving(false)
		}
	}

	if (!agentId.trim()) {
		return (
			<div className="text-xs text-(--vscode-descriptionForeground)" data-testid="memory-tab-empty-agent">
				Lưu agent trước khi quản lý memory.
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4" data-testid="tab-panel-memory">
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<div>
						<h3 className="text-sm font-semibold text-(--vscode-foreground)">Memory đã chấp nhận</h3>
						<p className="text-[11px] text-(--vscode-descriptionForeground)">
							Chỉ lưu trong project (`.orvanta/local/memory`). Không đi theo template user library.
						</p>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							className="flex items-center gap-1.5 rounded border border-error/50 px-2.5 py-1 text-xs text-error hover:bg-error/10 disabled:opacity-40"
							data-testid="memory-delete-button"
							disabled={disabled || saving || status === "missing" || status === "loading"}
							onClick={() => void handleDelete()}
							type="button">
							<IconTrash size={13} stroke={1.5} />
							<span>Xóa</span>
						</button>
						<button
							className="flex items-center gap-1.5 rounded bg-(--vscode-button-background) px-3 py-1 text-xs font-semibold text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) disabled:opacity-40"
							data-testid="memory-save-button"
							disabled={disabled || saving || !dirty}
							onClick={() => void handleSave()}
							type="button">
							{saving ? (
								<span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							) : (
								<IconDeviceFloppy size={13} stroke={1.5} />
							)}
							<span>Lưu</span>
						</button>
					</div>
				</div>

				{status === "corrupt" && (
					<div
						className="flex items-center gap-2 rounded border border-error/50 bg-error/10 p-2.5 text-xs text-error"
						data-testid="memory-corrupt-error">
						<IconAlertCircle size={14} stroke={1.5} />
						<span>{error || "File memory bị hỏng — không hiện empty giả."}</span>
					</div>
				)}

				{error && status !== "corrupt" && (
					<div className="flex items-center gap-2 rounded border border-error/50 bg-error/10 p-2.5 text-xs text-error">
						<IconAlertCircle size={14} stroke={1.5} />
						<span>{error}</span>
					</div>
				)}

				{notice && (
					<div className="flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
						<IconCheck size={14} stroke={1.5} />
						<span>{notice}</span>
					</div>
				)}

				{status === "loading" ? (
					<p className="text-xs text-(--vscode-descriptionForeground)">Đang tải memory…</p>
				) : status === "corrupt" ? null : (
					<textarea
						className="min-h-40 w-full rounded border border-border-panel bg-input-background p-2.5 font-mono text-xs text-(--vscode-input-foreground) focus:outline-none focus:border-(--vscode-focusBorder)"
						data-testid="memory-editor"
						disabled={disabled || saving}
						onChange={(e) => {
							setContent(e.target.value)
							setDirty(true)
						}}
						placeholder={status === "missing" ? "Chưa có memory đã chấp nhận cho agent này." : ""}
						value={content}
					/>
				)}
			</div>

			<div className="flex flex-col gap-2 border-t border-border-panel pt-3">
				<h3 className="text-sm font-semibold text-(--vscode-foreground)">Proposals chờ duyệt</h3>
				{proposals.length === 0 ? (
					<p className="text-xs text-(--vscode-descriptionForeground)" data-testid="memory-proposals-empty">
						Không có proposal nào.
					</p>
				) : (
					<ul className="flex flex-col gap-2" data-testid="memory-proposals-list">
						{proposals.map((proposal) => (
							<li
								className="rounded border border-border-panel bg-(--vscode-sideBar-background)/40 p-2.5"
								key={proposal.id}>
								<div className="mb-1.5 flex items-center justify-between gap-2">
									<span className="font-mono text-[11px] text-(--vscode-descriptionForeground)">
										{proposal.id}
									</span>
									<div className="flex gap-1.5">
										<button
											className="rounded bg-(--vscode-button-background) px-2 py-0.5 text-[11px] font-medium text-(--vscode-button-foreground) disabled:opacity-40"
											data-testid={`memory-approve-${proposal.id}`}
											disabled={disabled || saving}
											onClick={() => void handleApprove(proposal.id)}
											type="button">
											Duyệt
										</button>
										<button
											className="rounded border border-border-panel px-2 py-0.5 text-[11px] disabled:opacity-40"
											data-testid={`memory-reject-${proposal.id}`}
											disabled={disabled || saving}
											onClick={() => void handleReject(proposal.id)}
											type="button">
											Từ chối
										</button>
									</div>
								</div>
								<pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-(--vscode-foreground)">
									{proposal.content}
								</pre>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}
