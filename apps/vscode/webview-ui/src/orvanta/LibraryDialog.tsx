import { slugify } from "@cline/shared/orvanta"
import { EmptyRequest, StringRequest } from "@shared/proto/cline/common"
import {
	type OrvantaCompanyResponse,
	type OrvantaLibraryEntry,
	OrvantaLoadLibraryRequest,
	OrvantaSaveLibraryRequest,
} from "@shared/proto/cline/orvanta"
import { useCallback, useEffect, useState } from "react"
import { OrvantaServiceClient } from "@/services/grpc-client"

const emptyRequest = {} as EmptyRequest

export type LibraryDialogMode = "save" | "load"

export interface LibraryDialogProps {
	mode: LibraryDialogMode
	onClose: () => void
	currentCompany?: OrvantaCompanyResponse
	onCompanyLoaded?: (company: OrvantaCompanyResponse) => void
}

const LibraryDialog = ({ mode: initialMode, onClose, currentCompany, onCompanyLoaded }: LibraryDialogProps) => {
	const [mode, setMode] = useState<LibraryDialogMode>(initialMode)
	const [entries, setEntries] = useState<OrvantaLibraryEntry[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | undefined>()

	// Save form state
	const [saveName, setSaveName] = useState(currentCompany?.name ?? "")
	const [saveSlug, setSaveSlug] = useState(currentCompany?.name ? slugify(currentCompany.name) : "")
	const [slugEdited, setSlugEdited] = useState(false)
	const [saving, setSaving] = useState(false)
	const [overwriteConfirmSlug, setOverwriteConfirmSlug] = useState<string | undefined>()

	// Load confirm state
	const [pendingReplaceSlug, setPendingReplaceSlug] = useState<string | undefined>()
	const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | undefined>()

	const canSave = currentCompany?.status === "ready"

	const fetchEntries = useCallback(async () => {
		setLoading(true)
		setError(undefined)
		try {
			const res = await OrvantaServiceClient.listLibrary(emptyRequest)
			setEntries(res.entries ?? [])
		} catch (err) {
			console.error("listLibrary error", err)
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		if (mode === "load") {
			void fetchEntries()
		}
	}, [mode, fetchEntries])

	const handleNameChange = (val: string) => {
		setSaveName(val)
		if (!slugEdited) {
			setSaveSlug(slugify(val))
		}
		setOverwriteConfirmSlug(undefined)
		setError(undefined)
	}

	const handleSlugChange = (val: string) => {
		setSaveSlug(val)
		setSlugEdited(true)
		setOverwriteConfirmSlug(undefined)
		setError(undefined)
	}

	const executeSave = async (overwrite: boolean) => {
		if (!saveName.trim()) {
			setError("Vui lòng nhập tên công ty")
			return
		}
		const slug = saveSlug.trim() ? slugify(saveSlug) : slugify(saveName)
		setSaving(true)
		setError(undefined)
		try {
			await OrvantaServiceClient.saveCompanyToLibrary(
				OrvantaSaveLibraryRequest.create({
					name: saveName.trim(),
					slug,
					overwrite,
				}),
			)
			setOverwriteConfirmSlug(undefined)
			setMode("load")
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			if (msg.includes("đã tồn tại")) {
				setOverwriteConfirmSlug(slug)
			} else {
				setError(msg)
			}
		} finally {
			setSaving(false)
		}
	}

	const executeLoad = async (slug: string, replace: boolean) => {
		setError(undefined)
		try {
			const resp = await OrvantaServiceClient.loadCompanyFromLibrary(
				OrvantaLoadLibraryRequest.create({
					slug,
					replace,
				}),
			)
			if (resp.status === "needs_replace" || resp.errors?.includes("needs_replace")) {
				setPendingReplaceSlug(slug)
				return
			}
			if (resp.status === "ready") {
				setPendingReplaceSlug(undefined)
				onCompanyLoaded?.(resp)
				onClose()
			} else {
				setError(resp.errors?.[0] || "Không tải được công ty")
			}
		} catch (err) {
			console.error("loadCompanyFromLibrary error", err)
			setError(err instanceof Error ? err.message : String(err))
		}
	}

	const executeDelete = async (slug: string) => {
		setError(undefined)
		try {
			const res = await OrvantaServiceClient.deleteLibraryCompany(StringRequest.create({ value: slug }))
			setEntries(res.entries ?? [])
			setDeleteConfirmSlug(undefined)
		} catch (err) {
			console.error("deleteLibraryCompany error", err)
			setError(err instanceof Error ? err.message : String(err))
		}
	}

	const agentCount = currentCompany?.agents?.length ?? 0

	const renderSaveForm = () => (
		<div className="flex flex-col gap-3 text-xs">
			<div className="rounded bg-white/5 p-2 text-[11px] opacity-80">
				Sẽ lưu {agentCount} agent vào thư viện user (<span className="font-mono">~/.orvanta/companies/</span>). Không lưu
				task, inbox, runs local.
			</div>

			<label className="flex flex-col gap-1">
				<span className="font-medium opacity-80">Tên hiển thị</span>
				<input
					className="rounded border border-border-panel bg-input-background px-2 py-1 text-xs"
					maxLength={64}
					onChange={(e) => handleNameChange(e.target.value)}
					placeholder="Tên công ty"
					value={saveName}
				/>
			</label>

			<label className="flex flex-col gap-1">
				<span className="font-medium opacity-80">Slug thư viện (tên thư mục)</span>
				<input
					className="rounded border border-border-panel bg-input-background px-2 py-1 font-mono text-xs"
					maxLength={48}
					onChange={(e) => handleSlugChange(e.target.value)}
					placeholder="slug"
					value={saveSlug}
				/>
				<span className="text-[10px] opacity-60">Thư mục: ~/.orvanta/companies/{saveSlug || "..."}/</span>
			</label>

			{overwriteConfirmSlug && (
				<div className="rounded border border-warning/40 bg-warning/10 p-2 text-xs">
					<p className="mb-2">Bản lưu "{overwriteConfirmSlug}" đã tồn tại. Ghi đè bản này?</p>
					<div className="flex gap-2">
						<button
							className="rounded bg-(--vscode-button-background) px-2.5 py-1 text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground)"
							disabled={saving}
							onClick={() => executeSave(true)}
							type="button">
							{saving ? "Đang ghi đè…" : "Ghi đè"}
						</button>
						<button
							className="rounded border border-border-panel px-2.5 py-1 hover:bg-white/5"
							onClick={() => setOverwriteConfirmSlug(undefined)}
							type="button">
							Hủy
						</button>
					</div>
				</div>
			)}

			{!overwriteConfirmSlug && (
				<div className="flex justify-end gap-2 pt-2">
					<button
						className="rounded border border-border-panel px-3 py-1 hover:bg-white/5"
						onClick={onClose}
						type="button">
						Hủy
					</button>
					<button
						className="rounded bg-(--vscode-button-background) px-3 py-1 text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) disabled:opacity-50"
						disabled={saving || !saveName.trim()}
						onClick={() => executeSave(false)}
						type="button">
						{saving ? "Đang lưu…" : "Lưu vào thư viện"}
					</button>
				</div>
			)}
		</div>
	)

	const renderLoadList = () => (
		<div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh] text-xs">
			{loading && <div className="p-4 text-center opacity-60">Đang quét thư viện…</div>}
			{!loading && entries.length === 0 && <div className="p-4 text-center opacity-60">Thư viện chưa có bản lưu nào.</div>}
			{!loading &&
				entries.map((item) => (
					<div
						className={`flex flex-col gap-1.5 rounded border p-2.5 ${
							item.isBroken ? "border-error/40 bg-error/5" : "border-border-panel bg-white/5"
						}`}
						key={item.slug}>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="font-semibold text-xs">{item.name}</span>
								<span className="font-mono text-[10px] opacity-60">@{item.slug}</span>
								{item.isBroken && (
									<span className="rounded bg-error/20 px-1.5 py-0.2 text-[10px] text-error font-semibold">
										Hỏng
									</span>
								)}
							</div>
							<span className="rounded bg-(--vscode-badge-background) px-1.5 py-0.5 text-[10px] text-(--vscode-badge-foreground)">
								{item.agentCount} agent
							</span>
						</div>

						{item.purposePreview && <p className="line-clamp-2 text-[11px] opacity-75">{item.purposePreview}</p>}

						{item.error && <p className="text-[10px] text-error">{item.error}</p>}

						<div className="flex items-center justify-between pt-1">
							<span className="text-[10px] opacity-50">{new Date(item.savedAt).toLocaleDateString()}</span>

							{deleteConfirmSlug === item.slug ? (
								<div className="flex items-center gap-1.5">
									<span className="text-[11px] text-error">Xác nhận xóa?</span>
									<button
										className="rounded bg-error/80 px-2 py-0.5 text-[10px] text-white hover:bg-error"
										onClick={() => executeDelete(item.slug)}
										type="button">
										Xóa
									</button>
									<button
										className="rounded border border-border-panel px-2 py-0.5 text-[10px] hover:bg-white/5"
										onClick={() => setDeleteConfirmSlug(undefined)}
										type="button">
										Hủy
									</button>
								</div>
							) : (
								<div className="flex items-center gap-1.5">
									<button
										className="text-[11px] opacity-50 hover:opacity-100 hover:text-error"
										onClick={() => setDeleteConfirmSlug(item.slug)}
										title="Xóa khỏi thư viện"
										type="button">
										Xóa
									</button>
									<button
										className="rounded bg-(--vscode-button-background) px-2.5 py-1 text-[11px] text-(--vscode-button-foreground) hover:bg-(--vscode-button-hoverBackground) disabled:opacity-30 disabled:cursor-not-allowed"
										disabled={Boolean(item.isBroken)}
										onClick={() => executeLoad(item.slug, false)}
										type="button">
										Tải
									</button>
								</div>
							)}
						</div>
					</div>
				))}
		</div>
	)

	return (
		<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
			<div className="flex max-h-[90vh] max-w-md w-full flex-col gap-3 rounded border border-border-panel bg-(--vscode-editor-background) p-4 shadow-xl">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-border-panel pb-2">
					<div className="flex items-center gap-2">
						<button
							className={`text-xs font-semibold pb-0.5 ${
								mode === "load"
									? "border-b-2 border-(--vscode-focusBorder) text-(--vscode-foreground)"
									: "opacity-60 hover:opacity-100"
							}`}
							onClick={() => {
								setMode("load")
								setError(undefined)
							}}
							type="button">
							Tải công ty
						</button>
						<button
							className={`text-xs font-semibold pb-0.5 ${
								mode === "save"
									? "border-b-2 border-(--vscode-focusBorder) text-(--vscode-foreground)"
									: "opacity-60 hover:opacity-100"
							} disabled:cursor-not-allowed disabled:opacity-30`}
							disabled={!canSave}
							onClick={() => {
								if (canSave) {
									setMode("save")
									setError(undefined)
								}
							}}
							title={canSave ? "Lưu công ty hiện tại vào thư viện" : "Lập hoặc tải công ty trước"}
							type="button">
							Lưu công ty
						</button>
					</div>
					<button className="text-xs opacity-60 hover:opacity-100" onClick={onClose} type="button">
						✕
					</button>
				</div>

				{/* Error banner */}
				{error && <div className="rounded bg-error/15 p-2 text-xs text-error">{error}</div>}

				{/* Save or Load Mode */}
				{mode === "save" ? renderSaveForm() : renderLoadList()}

				{/* Replace Confirmation Modal */}
				{pendingReplaceSlug && (
					<div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
						<div className="flex max-w-xs w-full flex-col gap-3 rounded border border-warning/50 bg-(--vscode-editor-background) p-4 shadow-2xl text-xs">
							<h4 className="font-semibold text-sm text-warning">Thay công ty hiện tại?</h4>
							<p className="opacity-80">
								Workspace đang có công ty. Nếu tải bản này, purpose, đội, inbox và task local hiện tại sẽ bị xóa
								sạch và thay thế.
							</p>
							<div className="flex justify-end gap-2 pt-1">
								<button
									className="rounded border border-border-panel px-3 py-1 hover:bg-white/5"
									onClick={() => setPendingReplaceSlug(undefined)}
									type="button">
									Hủy
								</button>
								<button
									className="rounded bg-error px-3 py-1 text-white hover:bg-error/80"
									onClick={() => executeLoad(pendingReplaceSlug, true)}
									type="button">
									Thay thế
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

export default LibraryDialog
