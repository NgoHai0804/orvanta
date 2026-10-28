import { IconCheck } from "@tabler/icons-react"
import { type AnyDecisionItem, type InboxSubTab, TYPE_LABELS, URGENCY_LABELS } from "./inbox-types"

interface InboxListProps {
	items: AnyDecisionItem[]
	selectedId: string | null
	activeSubTab: InboxSubTab
	onSelect: (id: string) => void
}

export function InboxList({ items, selectedId, activeSubTab, onSelect }: InboxListProps) {
	if (items.length === 0) {
		return (
			<div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
				{activeSubTab === "pending" && (
					<>
						<IconCheck className="text-emerald-400" size={14} stroke={2} />
						<span>Đội không cần bạn lúc này.</span>
					</>
				)}
				{activeSubTab === "deferred" && <span>Không có quyết định nào để sau.</span>}
				{activeSubTab === "history" && <span>Chưa có quyết định nào trong lịch sử.</span>}
			</div>
		)
	}

	return (
		<div className="flex flex-col">
			{items.map((item) => {
				const typeMeta = TYPE_LABELS[item.type] || {
					label: item.type,
					color: "bg-surface-secondary text-foreground",
				}
				const urgencyMeta = URGENCY_LABELS[item.urgency] || {
					label: item.urgency,
					color: "",
				}
				const isSelected = item.id === selectedId
				return (
					<button
						className={`border-b border-border-panel p-2.5 text-left transition-colors ${
							isSelected
								? "bg-(--vscode-list-activeSelectionBackground) text-(--vscode-list-activeSelectionForeground)"
								: "hover:bg-surface-secondary/60"
						}`}
						key={item.id}
						onClick={() => onSelect(item.id)}
						type="button">
						<div className="flex items-center justify-between gap-1 mb-1">
							<span
								className={`inline-block rounded border px-1.5 py-0.2 text-[10px] font-medium ${typeMeta.color}`}>
								{typeMeta.label}
							</span>
							{item.urgency === "high" && (
								<span
									className={`inline-block rounded border px-1 py-0.2 text-[9px] font-medium ${urgencyMeta.color}`}>
									{urgencyMeta.label}
								</span>
							)}
						</div>
						<div className="font-medium text-xs truncate mb-1">{item.title}</div>
						<div className="text-[11px] opacity-70 truncate">{item.summary}</div>
						<div className="mt-1 text-[10px] opacity-50">Bởi: {item.createdBy || "coordinator"}</div>
					</button>
				)
			})}
		</div>
	)
}
