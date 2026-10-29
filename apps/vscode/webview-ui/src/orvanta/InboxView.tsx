import { IconBookmark, IconClock, IconHistory, IconRefresh } from "@tabler/icons-react"
import { useEffect, useMemo, useState } from "react"
import type { OrvantaDecisionItem, OrvantaHistoryEntry } from "../../../src/shared/proto/cline/orvanta"
import { InboxConfirmModal } from "./inbox/InboxConfirmModal"
import { InboxDetail } from "./inbox/InboxDetail"
import { InboxList } from "./inbox/InboxList"
import type { AnyDecisionItem, InboxSubTab } from "./inbox/inbox-types"

export interface InboxViewProps {
	pending: OrvantaDecisionItem[]
	deferred: OrvantaDecisionItem[]
	history: OrvantaHistoryEntry[]
	loading?: boolean
	error?: string | null
	focusId?: string
	onResolve: (id: string, action: "approve" | "reject" | "defer" | "reopen", note?: string) => Promise<boolean>
	onRefresh: () => Promise<void>
}

export default function InboxView({ pending, deferred, history, loading, error, focusId, onResolve, onRefresh }: InboxViewProps) {
	const [activeSubTab, setActiveSubTab] = useState<InboxSubTab>("pending")
	const [typeFilter, setTypeFilter] = useState<string>("all")
	const [urgencyFilter, setUrgencyFilter] = useState<string>("all")
	const [selectedId, setSelectedId] = useState<string | null>(focusId || null)
	const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null)
	const [resolving, setResolving] = useState<boolean>(false)

	useEffect(() => {
		if (focusId) {
			setSelectedId(focusId)
			setActiveSubTab("pending")
		}
	}, [focusId])

	const currentList: AnyDecisionItem[] = useMemo(() => {
		if (activeSubTab === "pending") return pending
		if (activeSubTab === "deferred") return deferred
		return history
	}, [activeSubTab, pending, deferred, history])

	const filteredList = useMemo(() => {
		return currentList.filter((item) => {
			if (typeFilter !== "all" && item.type !== typeFilter) return false
			if (urgencyFilter !== "all" && item.urgency !== urgencyFilter) return false
			return true
		})
	}, [currentList, typeFilter, urgencyFilter])

	const effectiveSelectedId = selectedId || (filteredList.length > 0 ? filteredList[0].id : null)
	const selectedItem = useMemo(() => {
		return currentList.find((i) => i.id === effectiveSelectedId) || null
	}, [currentList, effectiveSelectedId])

	const handleAction = async (action: "approve" | "reject" | "defer" | "reopen") => {
		if (!selectedItem) return
		if (
			action === "approve" &&
			(selectedItem.type === "fire_agent" ||
				selectedItem.type === "change_purpose" ||
				selectedItem.type === "change_policy")
		) {
			setConfirmAction("approve")
			return
		}
		if (action === "reject") {
			setConfirmAction("reject")
			return
		}

		setResolving(true)
		try {
			await onResolve(selectedItem.id, action)
		} finally {
			setResolving(false)
		}
	}

	const handleConfirmSubmit = async (note: string) => {
		if (!selectedItem || !confirmAction) return
		setResolving(true)
		try {
			await onResolve(selectedItem.id, confirmAction, note)
			setConfirmAction(null)
		} finally {
			setResolving(false)
		}
	}

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
			{/* Sub-tabs header */}
			<div className="flex shrink-0 items-center justify-between border-b border-border-panel px-3 py-1.5 bg-(--vscode-sideBar-background)/50">
				<div className="flex items-center gap-1.5">
					<button
						className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none inline-flex items-center gap-1.5 ${
							activeSubTab === "pending"
								? "bg-(--vscode-button-background) text-(--vscode-button-foreground) shadow-xs"
								: "text-muted-foreground hover:text-foreground hover:bg-(--vscode-list-hoverBackground)"
						}`}
						onClick={() => setActiveSubTab("pending")}
						type="button">
						<IconClock size={13} stroke={1.5} />
						<span>Chờ duyệt ({pending.length})</span>
					</button>
					<button
						className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none inline-flex items-center gap-1.5 ${
							activeSubTab === "deferred"
								? "bg-(--vscode-button-background) text-(--vscode-button-foreground) shadow-xs"
								: "text-muted-foreground hover:text-foreground hover:bg-(--vscode-list-hoverBackground)"
						}`}
						onClick={() => setActiveSubTab("deferred")}
						type="button">
						<IconBookmark size={13} stroke={1.5} />
						<span>Để sau ({deferred.length})</span>
					</button>
					<button
						className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none inline-flex items-center gap-1.5 ${
							activeSubTab === "history"
								? "bg-(--vscode-button-background) text-(--vscode-button-foreground) shadow-xs"
								: "text-muted-foreground hover:text-foreground hover:bg-(--vscode-list-hoverBackground)"
						}`}
						onClick={() => setActiveSubTab("history")}
						type="button">
						<IconHistory size={13} stroke={1.5} />
						<span>Lịch sử ({history.length})</span>
					</button>
				</div>
				<button
					className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-(--vscode-list-hoverBackground) cursor-pointer transition-colors"
					disabled={loading}
					onClick={onRefresh}
					title="Làm mới"
					type="button">
					<IconRefresh className={loading ? "animate-spin" : ""} size={13} stroke={1.5} />
					<span>{loading ? "Đang tải..." : "Làm mới"}</span>
				</button>
			</div>
			{/* Filter bar */}
			<div className="flex shrink-0 gap-2 border-b border-border-panel bg-(--vscode-sideBar-background)/30 px-3 py-1.5 text-xs">
				<div className="flex items-center gap-1.5">
					<span className="text-muted-foreground text-[11px]">Loại:</span>
					<select
						aria-label="Lọc theo loại quyết định"
						className="rounded border border-border-panel bg-(--vscode-dropdown-background) px-1.5 py-0.5 text-xs text-(--vscode-dropdown-foreground) focus:outline-none focus:ring-1 focus:ring-ring"
						onChange={(e) => setTypeFilter(e.target.value)}
						value={typeFilter}>
						<option value="all">Tất cả loại</option>
						<option value="hire_agent">Tuyển Agent</option>
						<option value="fire_agent">Sa thải Agent</option>
						<option value="change_role">Đổi Role</option>
						<option value="change_purpose">Đổi Purpose</option>
						<option value="change_scope">Đổi Scope</option>
						<option value="merge">Duyệt Merge</option>
						<option value="over_budget">Vượt Budget</option>
						<option value="over_ephemeral">Vượt Ephemeral</option>
						<option value="escalate_blocked">Báo bế tắc</option>
						<option value="change_policy">Đổi chính sách</option>
					</select>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-muted-foreground text-[11px]">Mức độ:</span>
					<select
						aria-label="Lọc theo mức độ khẩn cấp"
						className="rounded border border-border-panel bg-(--vscode-dropdown-background) px-1.5 py-0.5 text-xs text-(--vscode-dropdown-foreground) focus:outline-none focus:ring-1 focus:ring-ring"
						onChange={(e) => setUrgencyFilter(e.target.value)}
						value={urgencyFilter}>
						<option value="all">Tất cả mức độ</option>
						<option value="critical">Khẩn cấp (critical)</option>
						<option value="high">Cao (high)</option>
						<option value="normal">Bình thường (normal)</option>
						<option value="low">Thấp (low)</option>
					</select>
				</div>
			</div>

			{error && <div className="border-b border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400">{error}</div>}

			{/* Master-Detail Split Layout */}
			<div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden scroller-x">
				<div className="flex w-2/5 min-w-[140px] max-w-[360px] flex-col border-r border-border-panel min-h-0 h-full overflow-hidden bg-(--vscode-sideBar-background)/20 shrink-0">
					<InboxList
						activeSubTab={activeSubTab}
						items={filteredList}
						onSelect={(id) => setSelectedId(id)}
						selectedId={effectiveSelectedId}
					/>
				</div>
				<div className="flex flex-1 min-w-[160px] min-h-0 flex-col overflow-hidden bg-(--vscode-editor-background)">
					<InboxDetail activeSubTab={activeSubTab} item={selectedItem} onAction={handleAction} resolving={resolving} />
				</div>
			</div>

			{/* Confirmation / Note Modal */}
			{confirmAction && selectedItem && (
				<InboxConfirmModal
					action={confirmAction}
					item={selectedItem}
					onClose={() => setConfirmAction(null)}
					onConfirm={handleConfirmSubmit}
					resolving={resolving}
				/>
			)}
		</div>
	)
}
