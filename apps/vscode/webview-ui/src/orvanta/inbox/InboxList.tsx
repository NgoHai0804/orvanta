import { IconBookmark, IconCheck, IconHelpCircle, IconHistory } from "@tabler/icons-react"
import { type AnyDecisionItem, formatRelativeTime, type InboxSubTab, TYPE_LABELS, URGENCY_LABELS } from "./inbox-types"

interface InboxListProps {
	items: AnyDecisionItem[]
	selectedId: string | null
	activeSubTab: InboxSubTab
	onSelect: (id: string) => void
}

export function InboxList({ items, selectedId, activeSubTab, onSelect }: InboxListProps) {
	if (items.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
				{activeSubTab === "pending" && (
					<>
						<IconCheck className="text-emerald-400 mx-auto mb-2" size={32} stroke={1.5} />
						<div className="font-medium text-foreground mb-1">Hộp thư sạch sẽ!</div>
						<div className="text-[11px] opacity-80 max-w-[200px]">
							Toàn bộ công việc đang diễn ra tự động và trơn tru.
						</div>
					</>
				)}
				{activeSubTab === "deferred" && (
					<>
						<IconBookmark className="text-muted-foreground/50 mx-auto mb-2" size={32} stroke={1.5} />
						<div className="font-medium text-foreground mb-1">Không có quyết định để sau</div>
						<div className="text-[11px] opacity-80">Các quyết định tạm gác sẽ xuất hiện tại đây.</div>
					</>
				)}
				{activeSubTab === "history" && (
					<>
						<IconHistory className="text-muted-foreground/50 mx-auto mb-2" size={32} stroke={1.5} />
						<div className="font-medium text-foreground mb-1">Chưa có lịch sử quyết định</div>
						<div className="text-[11px] opacity-80">Các quyết định đã giải quyết sẽ được lưu trữ tại đây.</div>
					</>
				)}
			</div>
		)
	}

	return (
		<div className="scroller-y h-full min-h-0 w-full p-2 space-y-1.5">
			{items.map((item) => {
				const typeMeta = TYPE_LABELS[item.type]
				const TypeIcon = typeMeta?.icon || IconHelpCircle
				const urgencyMeta = URGENCY_LABELS[item.urgency]
				const isSelected = item.id === selectedId
				const relativeTime = formatRelativeTime(item.createdAt)

				return (
					<button
						className={`w-full text-left p-2.5 rounded-md border transition-colors cursor-pointer select-none flex flex-col gap-1.5 ${
							isSelected
								? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30 text-foreground"
								: "border-border-panel bg-(--vscode-sideBar-background) hover:bg-(--vscode-list-hoverBackground) text-foreground"
						}`}
						key={item.id}
						onClick={() => onSelect(item.id)}
						type="button">
						{/* Row 1: Type icon + label & Urgency badge */}
						<div className="flex items-center justify-between gap-1.5 w-full">
							<div className="flex items-center gap-1.5 min-w-0">
								<span
									className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${
										typeMeta?.color || "bg-surface-secondary text-foreground border-border-panel"
									}`}>
									<TypeIcon size={12} stroke={1.5} />
									<span className="truncate">{typeMeta?.label || item.type}</span>
								</span>
							</div>
							{urgencyMeta && (
								<span
									className={`inline-block rounded border px-1.5 py-0.2 text-[9px] font-medium shrink-0 ${urgencyMeta.color}`}>
									{urgencyMeta.label}
								</span>
							)}
						</div>

						{/* Row 2: Title */}
						<div className="font-medium text-xs text-foreground line-clamp-2 leading-snug">{item.title}</div>

						{/* Row 2.5: Summary Preview */}
						{item.summary && (
							<div className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">{item.summary}</div>
						)}

						{/* Row 3: Footer - Agent badge & Relative Time */}
						<div className="flex items-center justify-between gap-1 pt-1 border-t border-border-panel/40 text-[10px] text-muted-foreground">
							<span className="font-mono truncate max-w-[120px]">@{item.createdBy || "coordinator"}</span>
							{relativeTime && <span className="shrink-0">{relativeTime}</span>}
						</div>
					</button>
				)
			})}
		</div>
	)
}
