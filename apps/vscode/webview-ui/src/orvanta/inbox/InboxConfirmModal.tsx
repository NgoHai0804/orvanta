import { IconAlertTriangle, IconX } from "@tabler/icons-react"
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
	const isMergeReject = item.type === "merge" && action === "reject"
	const isRejectNoteValid = !isMergeReject || note.trim().length >= 8

	let title = `Từ chối quyết định '${item.title}'?`
	let description = "Bạn có thể nhập lý do từ chối để thông báo lại cho coordinator."

	if (isApprove) {
		if (item.type === "fire_agent") {
			title = `Xác nhận sa thải Agent '${parsedPayload.agentId}'?`
			description = "Hành động này sẽ gỡ bỏ agent khỏi roster và chuyển giao toàn bộ task tồn đọng về cho Coordinator."
		} else if (item.type === "change_purpose") {
			title = "Xác nhận đổi Purpose công ty?"
			description = "Purpose mới sẽ được ghi đè lên purpose.md và áp dụng để điều hướng lại toàn bộ agent trong công ty."
		} else if (item.type === "change_policy") {
			title = `Xác nhận đổi chính sách '${parsedPayload.key}'?`
			description = `Chính sách '${parsedPayload.key}' sẽ được cập nhật thành '${parsedPayload.to}'.`
		}
	} else if (isMergeReject) {
		title = `Từ chối Merge '${item.title}'?`
		description = "Bắt buộc nhập lý do từ chối (tối thiểu 8 ký tự). Lý do này sẽ được gửi tới mailbox của implementer."
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
			<div className="w-full max-w-md rounded-lg border border-border-panel bg-(--vscode-editor-background) p-4 shadow-xl text-foreground flex flex-col gap-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2">
						<IconAlertTriangle
							className={isApprove ? "text-amber-400 shrink-0" : "text-rose-400 shrink-0"}
							size={18}
							stroke={1.5}
						/>
						<h3 className="text-sm font-semibold text-foreground leading-snug">{title}</h3>
					</div>
					<button
						aria-label="Đóng modal"
						className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-(--vscode-list-hoverBackground) transition-colors cursor-pointer"
						onClick={onClose}
						type="button">
						<IconX size={14} stroke={1.5} />
					</button>
				</div>

				<p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

				<div>
					<label className="text-xs font-medium text-foreground block mb-1" htmlFor="inbox-action-note">
						{isMergeReject ? "Lý do từ chối (bắt buộc, ≥ 8 ký tự):" : "Ghi chú của CEO (tùy chọn):"}
					</label>
					<textarea
						className={`w-full rounded border p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${
							isMergeReject && !isRejectNoteValid
								? "border-rose-500/50 bg-rose-500/10"
								: "border-border-panel bg-(--vscode-input-background)"
						}`}
						id="inbox-action-note"
						onChange={(e) => setNote(e.target.value)}
						placeholder={
							isMergeReject
								? "Nhập lý do tại sao từ chối merge..."
								: "Nhập chỉ đạo hoặc ghi chú thêm cho đội ngũ..."
						}
						rows={3}
						value={note}
					/>
					{isMergeReject && !isRejectNoteValid && (
						<div className="mt-1 text-[11px] text-rose-400">
							Lý do cần tối thiểu 8 ký tự (hiện tại: {note.trim().length}/8)
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2 pt-2 border-t border-border-panel">
					<button
						className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border-panel hover:bg-(--vscode-list-hoverBackground) cursor-pointer transition-colors"
						disabled={resolving}
						onClick={onClose}
						type="button">
						Hủy
					</button>
					<button
						className={`rounded px-3 py-1.5 text-xs font-medium text-white transition-colors cursor-pointer ${
							isApprove ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
						} disabled:opacity-50 disabled:cursor-not-allowed`}
						disabled={resolving || !isRejectNoteValid}
						onClick={() => onConfirm(note)}
						type="button">
						{resolving ? "Đang xử lý..." : isApprove ? "Xác nhận duyệt" : "Xác nhận từ chối"}
					</button>
				</div>
			</div>
		</div>
	)
}
