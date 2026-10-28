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
			{item.type === "change_scope" && (
				<div className="space-y-3 rounded border border-indigo-500/30 bg-indigo-500/10 p-3">
					<div className="text-xs font-semibold text-indigo-400">Đề xuất thay đổi Scope nhiệm vụ</div>
					<div className="space-y-2 text-xs">
						<div>
							<span className="text-muted-foreground font-medium">Task ID:</span>
							<div className="font-mono text-[11px] font-semibold">{parsedPayload.taskId}</div>
						</div>
						{parsedPayload.title && (
							<div>
								<span className="text-muted-foreground font-medium">Tiêu đề:</span>
								<div>{parsedPayload.title}</div>
							</div>
						)}
						<div>
							<span className="text-rose-400 font-medium">Lý do ngoài purpose:</span>
							<div className="mt-1 rounded bg-background/60 p-2 text-[11px] text-foreground">
								{parsedPayload.whyOutsidePurpose}
							</div>
						</div>
						{parsedPayload.proposedScope && (
							<div>
								<span className="text-indigo-300 font-medium">Scope đề xuất bổ sung:</span>
								<div className="mt-1 rounded bg-background/60 p-2 text-[11px] font-mono text-foreground">
									{parsedPayload.proposedScope}
								</div>
							</div>
						)}
					</div>
					<div className="rounded bg-indigo-500/20 p-2 text-[11px] text-indigo-300">
						💡 <strong>Quyết định:</strong> Duyệt (Approve) sẽ mở khóa task; Từ chối (Reject) sẽ hủy task.
					</div>
				</div>
			)}

			{item.type === "merge" && (
				<div className="space-y-3 rounded border border-purple-500/30 bg-purple-500/10 p-3">
					<div className="text-xs font-semibold text-purple-400">Yêu cầu duyệt Merge Outcome</div>
					<div className="space-y-2 text-xs">
						{parsedPayload.outcomeId && (
							<div>
								<span className="text-muted-foreground font-medium">Outcome ID:</span>
								<div className="font-mono text-[11px] font-semibold">{parsedPayload.outcomeId}</div>
							</div>
						)}
						{parsedPayload.authorAgentId && (
							<div>
								<span className="text-muted-foreground font-medium">Tác giả đề xuất:</span>
								<div className="font-mono text-[11px]">{parsedPayload.authorAgentId}</div>
							</div>
						)}
						{parsedPayload.diffSummary && (
							<div>
								<span className="text-muted-foreground font-medium">Tóm tắt thay đổi:</span>
								<div className="mt-1 rounded bg-background/60 p-2 text-[11px] text-foreground whitespace-pre-wrap">
									{parsedPayload.diffSummary}
								</div>
							</div>
						)}
						{Array.isArray(parsedPayload.files) && parsedPayload.files.length > 0 && (
							<div>
								<span className="text-muted-foreground font-medium">
									Các file thay đổi ({parsedPayload.files.length}):
								</span>
								<div className="mt-1 max-h-32 overflow-y-auto rounded bg-background/60 p-2 font-mono text-[11px]">
									{parsedPayload.files.map((f: string) => (
										<div className="truncate text-purple-300" key={f}>
											• {f}
										</div>
									))}
								</div>
							</div>
						)}
						{parsedPayload.risk && (
							<div>
								<span className="text-amber-400 font-medium">Đánh giá rủi ro:</span>
								<div className="mt-1 rounded bg-amber-500/10 p-2 text-[11px] text-amber-300 border border-amber-500/20">
									{parsedPayload.risk}
								</div>
							</div>
						)}
					</div>
					<div className="rounded bg-purple-500/20 p-2 text-[11px] text-purple-300">
						⚠️ <strong>Từ chối Merge:</strong> Bắt buộc có lý do (tối thiểu 8 ký tự). Lý do sẽ gửi thẳng vào mailbox
						của tác giả để sửa chữa.
					</div>
				</div>
			)}

			{item.type === "change_role" && (
				<div className="space-y-3 rounded border border-cyan-500/30 bg-cyan-500/10 p-3">
					<div className="text-xs font-semibold text-cyan-400">Đề xuất thay đổi vai trò Agent</div>
					<div className="space-y-2 text-xs">
						<div>
							<span className="text-muted-foreground font-medium">Agent ID:</span>
							<div className="font-mono text-[11px] font-semibold">{parsedPayload.agentId}</div>
						</div>
						{parsedPayload.tools && (
							<div>
								<span className="text-muted-foreground font-medium">Cấu hình Tools mới:</span>
								<pre className="mt-1 rounded bg-background/60 p-2 text-[11px] font-mono">
									{JSON.stringify(parsedPayload.tools, null, 2)}
								</pre>
							</div>
						)}
					</div>
				</div>
			)}

			{item.type === "over_budget" && (
				<div className="space-y-3 rounded border border-red-500/30 bg-red-500/10 p-3">
					<div className="text-xs font-semibold text-red-400">Cảnh báo: Vượt hạn mức chi phí (Budget)</div>
					<div className="grid grid-cols-3 gap-2 text-xs">
						<div className="rounded bg-background/60 p-2">
							<span className="text-muted-foreground text-[11px]">Đã tiêu:</span>
							<div className="font-mono text-sm font-bold text-red-400">${parsedPayload.spentUsd}</div>
						</div>
						<div className="rounded bg-background/60 p-2">
							<span className="text-muted-foreground text-[11px]">Hạn mức:</span>
							<div className="font-mono text-sm font-bold text-foreground">${parsedPayload.limitUsd}</div>
						</div>
						<div className="rounded bg-background/60 p-2">
							<span className="text-muted-foreground text-[11px]">Khung:</span>
							<div className="font-medium">{parsedPayload.window || "Session"}</div>
						</div>
					</div>
				</div>
			)}

			{item.type === "over_ephemeral" && (
				<div className="space-y-3 rounded border border-orange-500/30 bg-orange-500/10 p-3">
					<div className="text-xs font-semibold text-orange-400">Cảnh báo: Vượt số lượng guest ephemeral</div>
					<div className="text-xs space-y-1">
						<div>
							Số lượng guest hiện tại: <strong className="font-mono text-orange-300">{parsedPayload.count}</strong>{" "}
							/ tối đa <span className="font-mono">{parsedPayload.limit || 3}</span>.
						</div>
						<div className="text-muted-foreground text-[11px]">
							Lead chỉ được spawn tối đa 3 agent tạm thời mỗi session để tránh lạm dụng bỏ qua Inbox.
						</div>
					</div>
				</div>
			)}

			{item.type === "escalate_blocked" && (
				<div className="space-y-3 rounded border border-yellow-500/30 bg-yellow-500/10 p-3">
					<div className="text-xs font-semibold text-yellow-400">Báo cáo bế tắc (Blocker Escalation)</div>
					<div className="space-y-2 text-xs">
						<div>
							<span className="text-muted-foreground font-medium">Task ID:</span>
							<div className="font-mono text-[11px] font-semibold">{parsedPayload.taskId}</div>
						</div>
						<div>
							<span className="text-muted-foreground font-medium">Chi tiết bế tắc:</span>
							<div className="mt-1 rounded bg-background/60 p-2 text-foreground">{parsedPayload.blocker}</div>
						</div>
					</div>
				</div>
			)}

			{item.type === "change_policy" && (
				<div className="space-y-3 rounded border border-blue-500/30 bg-blue-500/10 p-3">
					<div className="text-xs font-semibold text-blue-400">Đề xuất thay đổi chính sách công ty</div>
					<div className="space-y-2 text-xs">
						<div>
							<span className="text-muted-foreground font-medium">Chính sách (Policy Key):</span>
							<div className="font-mono text-[11px] font-semibold text-blue-300">{parsedPayload.key}</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<span className="text-muted-foreground">Từ (from):</span>
								<div className="mt-1 rounded bg-background/60 p-1.5 font-mono text-[11px]">
									{parsedPayload.from || "chưa đặt"}
								</div>
							</div>
							<div>
								<span className="text-emerald-400">Thành (to):</span>
								<div className="mt-1 rounded bg-background/60 p-1.5 font-mono text-[11px] font-bold text-emerald-400">
									{parsedPayload.to}
								</div>
							</div>
						</div>
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
						{item.type === "fire_agent" || item.type === "change_purpose" || item.type === "change_policy"
							? "Duyệt..."
							: "Duyệt (Approve)"}
					</button>
					<button
						className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
						disabled={resolving}
						onClick={() => onAction("reject")}
						type="button">
						{item.type === "merge" ? "Từ chối (Cần lý do)..." : "Từ chối (Reject)"}
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
