import { useMemo } from "react"
import type { OrvantaHistoryEntry } from "../../../../src/shared/proto/cline/orvanta"
import { type AnyDecisionItem, type InboxSubTab, TYPE_LABELS, URGENCY_LABELS } from "./inbox-types"

interface InboxDetailProps {
	item: AnyDecisionItem | null
	activeSubTab: InboxSubTab
	resolving: boolean
	onAction: (action: "approve" | "reject" | "defer" | "reopen") => void
}

export function InboxDetail({ item, activeSubTab, resolving, onAction }: InboxDetailProps) {
	const parsedPayload = useMemo(() => {
		if (!item?.payloadJson) return {}
		try {
			return JSON.parse(item.payloadJson)
		} catch {
			return {}
		}
	}, [item])

	if (!item) {
		return (
			<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
				Chọn một quyết định để xem chi tiết
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="border-b border-border-panel pb-3">
				<div className="flex flex-wrap items-center gap-1.5 mb-1.5">
					<span
						className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${
							TYPE_LABELS[item.type]?.color || ""
						}`}>
						{TYPE_LABELS[item.type]?.label || item.type}
					</span>
					<span
						className={`inline-block rounded border px-1.5 py-0.5 text-[11px] ${
							URGENCY_LABELS[item.urgency]?.color || ""
						}`}>
						Mức độ: {URGENCY_LABELS[item.urgency]?.label || item.urgency}
					</span>
					{item.status && (
						<span className="rounded bg-surface-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
							Trạng thái: {item.status}
						</span>
					)}
				</div>
				<h2 className="text-sm font-semibold">{item.title}</h2>
				<div className="mt-1 text-xs text-muted-foreground">
					Được yêu cầu bởi <span className="font-mono text-foreground">{item.createdBy}</span>
				</div>
			</div>

			{/* Summary */}
			<div>
				<div className="text-xs font-semibold text-muted-foreground mb-1">Mô tả lý do:</div>
				<div className="rounded bg-surface-secondary/40 p-2.5 text-xs">{item.summary}</div>
			</div>

			{/* Type-specific Payload */}
			{item.type === "hire_agent" && (
				<div className="space-y-2.5 rounded border border-border-panel bg-surface-secondary/20 p-3">
					<div className="text-xs font-semibold text-emerald-400">Thông tin Agent đề xuất</div>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div>
							<span className="text-muted-foreground">Mã Agent (ID):</span>
							<div className="font-mono font-medium">{parsedPayload.agentId}</div>
						</div>
						<div>
							<span className="text-muted-foreground">Tên hiển thị:</span>
							<div className="font-medium">{parsedPayload.displayName || parsedPayload.agentId}</div>
						</div>
						{parsedPayload.modelId && (
							<div>
								<span className="text-muted-foreground">Model:</span>
								<div className="font-mono">{parsedPayload.modelId}</div>
							</div>
						)}
						{parsedPayload.maxIterations && (
							<div>
								<span className="text-muted-foreground">Số turn tối đa:</span>
								<div>{parsedPayload.maxIterations}</div>
							</div>
						)}
					</div>
					{(parsedPayload.rolePromptPreview || parsedPayload.instructions) && (
						<div className="mt-2">
							<span className="text-xs text-muted-foreground">Chỉ thị vai trò (Prompt/Instructions):</span>
							<pre className="mt-1 max-h-36 overflow-y-auto whitespace-pre-wrap rounded bg-background p-2 text-[11px] font-mono border border-border-panel">
								{parsedPayload.rolePromptPreview || parsedPayload.instructions}
							</pre>
						</div>
					)}
				</div>
			)}
			{item.type === "fire_agent" && (
				<div className="space-y-2 rounded border border-rose-500/30 bg-rose-500/10 p-3">
					<div className="text-xs font-semibold text-rose-400">Đề xuất sa thải Agent</div>
					<div className="text-xs">
						<span className="text-muted-foreground">Agent ID:</span>{" "}
						<span className="font-mono font-bold text-rose-300">{parsedPayload.agentId}</span>
					</div>
					<div className="text-xs">
						<span className="text-muted-foreground">Lý do sa thải:</span>
						<div className="mt-1 rounded bg-background/60 p-2 text-xs">{parsedPayload.reason}</div>
					</div>
					{parsedPayload.reassignTasks && (
						<div className="text-xs text-muted-foreground">
							✓ Các nhiệm vụ đang dở sẽ được coordinator phân bổ lại.
						</div>
					)}
				</div>
			)}

			{item.type === "change_purpose" && (
				<div className="space-y-3 rounded border border-amber-500/30 bg-amber-500/10 p-3">
					<div className="text-xs font-semibold text-amber-400">Đề xuất thay đổi Purpose công ty</div>
					<div className="space-y-2 text-xs">
						<div>
							<span className="text-muted-foreground font-medium">Hiện tại (from):</span>
							<div className="mt-1 rounded border border-rose-500/20 bg-rose-500/5 p-2 font-mono text-[11px] line-through opacity-80">
								{parsedPayload.from || "(Trống)"}
							</div>
						</div>
						<div>
							<span className="text-emerald-400 font-medium">Đề xuất mới (to):</span>
							<div className="mt-1 rounded border border-emerald-500/20 bg-emerald-500/10 p-2 font-mono text-[11px] text-foreground">
								{parsedPayload.to}
							</div>
						</div>
					</div>
					<div className="rounded bg-amber-500/20 p-2 text-[11px] text-amber-300">
						⚠️ <strong>Lưu ý:</strong> Sửa Purpose sẽ steer lại các agent đang hoạt động trong toàn bộ công ty.
					</div>
				</div>
			)}

			{activeSubTab === "history" && "resolvedAt" in item && (
				<div className="rounded border border-border-panel bg-surface-secondary/40 p-3 text-xs">
					<div className="font-medium text-muted-foreground mb-1">Kết quả giải quyết:</div>
					<div>
						Được <strong>{item.status === "approved" ? "chấp thuận" : "từ chối"}</strong> bởi{" "}
						<span className="font-mono">{(item as OrvantaHistoryEntry).resolvedBy}</span> vào{" "}
						{new Date((item as OrvantaHistoryEntry).resolvedAt).toLocaleString("vi-VN")}
					</div>
					{(item as OrvantaHistoryEntry).note && (
						<div className="mt-1 text-muted-foreground">
							Ghi chú: &ldquo;{(item as OrvantaHistoryEntry).note}&rdquo;
						</div>
					)}
				</div>
			)}

			{activeSubTab === "pending" && (
				<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-panel">
					<button
						className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
						disabled={resolving}
						onClick={() => onAction("approve")}
						type="button">
						{item.type === "fire_agent" || item.type === "change_purpose" ? "Duyệt..." : "Duyệt (Approve)"}
					</button>
					<button
						className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
						disabled={resolving}
						onClick={() => onAction("reject")}
						type="button">
						Từ chối (Reject)
					</button>
					<button
						className="rounded bg-surface-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-secondary/80 disabled:opacity-50"
						disabled={resolving}
						onClick={() => onAction("defer")}
						type="button">
						Để sau (Defer)
					</button>
				</div>
			)}

			{activeSubTab === "deferred" && (
				<div className="flex items-center gap-2 pt-2 border-t border-border-panel">
					<button
						className="rounded bg-(--vscode-button-background) px-3 py-1.5 text-xs font-medium text-(--vscode-button-foreground) hover:opacity-90 disabled:opacity-50"
						disabled={resolving}
						onClick={() => onAction("reopen")}
						type="button">
						Mở lại (Chuyển về Chờ duyệt)
					</button>
					<button
						className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
						disabled={resolving}
						onClick={() => onAction("reject")}
						type="button">
						Từ chối (Reject)
					</button>
				</div>
			)}
		</div>
	)
}
