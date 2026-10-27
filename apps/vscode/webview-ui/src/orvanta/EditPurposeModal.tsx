import { useState } from "react"

interface EditPurposeModalProps {
	currentPurpose: string
	submitting?: boolean
	onClose: () => void
	onSubmit: (newPurpose: string, reason: string) => Promise<void>
}

export default function EditPurposeModal({ currentPurpose, submitting, onClose, onSubmit }: EditPurposeModalProps) {
	const [newPurpose, setNewPurpose] = useState<string>(currentPurpose)
	const [reason, setReason] = useState<string>("")
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		const trimmed = newPurpose.trim()
		if (trimmed.length < 20) {
			setError("Purpose phải có ít nhất 20 ký tự.")
			return
		}
		if (trimmed === currentPurpose.trim()) {
			setError("Purpose mới phải khác purpose hiện tại.")
			return
		}
		setError(null)
		await onSubmit(trimmed, reason.trim() || "Cập nhật purpose công ty")
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
			<form
				className="w-full max-w-lg rounded-lg border border-border-panel bg-background p-4 shadow-xl space-y-3"
				onSubmit={handleSubmit}>
				<div className="flex items-center justify-between border-b border-border-panel pb-2">
					<h3 className="text-sm font-semibold">Đề xuất đổi Purpose công ty</h3>
					<button className="text-xs text-muted-foreground hover:text-foreground" onClick={onClose} type="button">
						✕
					</button>
				</div>

				<div className="rounded bg-amber-500/10 border border-amber-500/20 p-2 text-xs text-amber-300">
					ℹ️ Khi gửi đề xuất, một quyết định sẽ được tạo trong <strong>Inbox</strong> để CEO phê duyệt. File purpose.md
					trên đĩa chưa đổi cho tới khi duyệt.
				</div>

				{error && (
					<div className="rounded bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-400">{error}</div>
				)}

				<div>
					<label className="text-xs font-medium text-muted-foreground" htmlFor="edit-new-purpose">
						Purpose mới (tối thiểu 20 ký tự):
					</label>
					<textarea
						className="mt-1 w-full rounded border border-border-panel bg-surface-secondary/40 p-2 text-xs text-foreground focus:outline-none"
						id="edit-new-purpose"
						onChange={(e) => setNewPurpose(e.target.value)}
						placeholder="Nhập purpose mới cho công ty..."
						rows={5}
						value={newPurpose}
					/>
				</div>

				<div>
					<label className="text-xs font-medium text-muted-foreground" htmlFor="edit-purpose-reason">
						Lý do thay đổi (tùy chọn):
					</label>
					<input
						className="mt-1 w-full rounded border border-border-panel bg-surface-secondary/40 px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
						id="edit-purpose-reason"
						onChange={(e) => setReason(e.target.value)}
						placeholder="Ví dụ: Mở rộng mục tiêu quý này..."
						type="text"
						value={reason}
					/>
				</div>

				<div className="flex justify-end gap-2 pt-2 border-t border-border-panel">
					<button
						className="rounded px-3 py-1 text-xs text-muted-foreground hover:bg-surface-secondary"
						disabled={submitting}
						onClick={onClose}
						type="button">
						Hủy
					</button>
					<button
						className="rounded bg-(--vscode-button-background) px-3 py-1 text-xs font-medium text-(--vscode-button-foreground) hover:opacity-90 disabled:opacity-50"
						disabled={submitting}
						type="submit">
						{submitting ? "Đang gửi..." : "Gửi đề xuất vào Inbox"}
					</button>
				</div>
			</form>
		</div>
	)
}
