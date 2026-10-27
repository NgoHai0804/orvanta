import { useMemo, useState } from "react"
import type { AnyDecisionItem } from "./inbox-types"

interface InboxConfirmModalProps {
	item: AnyDecisionItem
	action: "approve" | "reject"
	resolving: boolean
	onClose: () => void
	onConfirm: (note: string) => Promise<void>
}

export function InboxConfirmModal({ item, action, resolving, onClose, onConfirm }: InboxConfirmModalProps) {
	const [note, setNote] = useState<string>("")

	const parsedPayload = useMemo(() => {
		if (!item.payloadJson) return {}
		try {
			return JSON.parse(item.payloadJson)
		} catch {
			return {}
		}
	}, [item])

	const isApprove = action === "approve"
	const title = isApprove
		? item.type === "fire_agent"
			? `Xác nhận sa thải Agent '${parsedPayload.agentId}'?`
			: "Xác nhận đổi Purpose công ty?"
		: `Từ chối quyết định '${item.title}'?`

	const description = isApprove
		? item.type === "fire_agent"
			? "Hành động này sẽ gỡ bỏ agent khỏi roster và dừng các tiến trình liên quan."
			: "Purpose mới sẽ được ghi đè lên purpose.md và áp dụng cho toàn bộ agent."
		: "Bạn có thể nhập lý do từ chối để thông báo lại cho coordinator."

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
			<div className="w-full max-w-md rounded-lg border border-border-panel bg-background p-4 shadow-xl">
				<h3 className="text-sm font-semibold mb-2">{title}</h3>
				<p className="text-xs text-muted-foreground mb-3">{description}</p>
				<div className="mb-3">
					<label className="text-xs font-medium text-muted-foreground" htmlFor="inbox-action-note">
						Ghi chú (tùy chọn):
					</label>
					<textarea
						className="mt-1 w-full rounded border border-border-panel bg-surface-secondary/40 p-2 text-xs text-foreground focus:outline-none"
						id="inbox-action-note"
						onChange={(e) => setNote(e.target.value)}
						placeholder="Nhập ghi chú hoặc lý do..."
						rows={2}
						value={note}
					/>
				</div>
				<div className="flex justify-end gap-2">
					<button
						className="rounded px-3 py-1 text-xs text-muted-foreground hover:bg-surface-secondary"
						disabled={resolving}
						onClick={onClose}
						type="button">
						Hủy
					</button>
					<button
						className={`rounded px-3 py-1 text-xs font-medium text-white ${
							isApprove ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
						}`}
						disabled={resolving}
						onClick={() => onConfirm(note)}
						type="button">
						{resolving ? "Đang xử lý..." : isApprove ? "Xác nhận duyệt" : "Xác nhận từ chối"}
					</button>
				</div>
			</div>
		</div>
	)
}
