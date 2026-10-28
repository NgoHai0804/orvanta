import { useMemo, useState } from "react"
import { CURATED_MODELS, type CuratedModel } from "./model-catalog-data"

export interface ModelPickerComboboxProps {
	modelId: string
	setModelId: (id: string) => void
	providerId: string
	setProviderId: (provider: string) => void
	contextWindow: number
	onSelectModel: (model: CuratedModel) => void
}

export const ModelPickerCombobox = ({
	modelId,
	setModelId,
	providerId,
	setProviderId,
	contextWindow,
	onSelectModel,
}: ModelPickerComboboxProps) => {
	const [isOpen, setIsOpen] = useState(false)
	const [search, setSearch] = useState("")
	const [isCustomMode, setIsCustomMode] = useState(false)

	const selectedModel = useMemo(() => {
		return CURATED_MODELS.find((m) => m.id === modelId)
	}, [modelId])

	const filteredModels = useMemo(() => {
		const q = search.trim().toLowerCase()
		if (!q) return CURATED_MODELS
		return CURATED_MODELS.filter(
			(m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q),
		)
	}, [search])

	const grouped = useMemo(() => {
		const res: Record<string, CuratedModel[]> = {}
		for (const m of filteredModels) {
			if (!res[m.provider]) res[m.provider] = []
			res[m.provider].push(m)
		}
		return res
	}, [filteredModels])

	if (isCustomMode) {
		return (
			<div className="flex items-center gap-2">
				<input
					className="flex-1 rounded border border-border-panel bg-input-background px-2.5 py-1.5 font-mono text-xs"
					data-testid="custom-model-id-input"
					onChange={(e) => setModelId(e.target.value)}
					placeholder="ví dụ: custom-org/my-fine-tuned-model"
					type="text"
					value={modelId}
				/>
				<button
					className="rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300"
					onClick={() => setIsCustomMode(false)}
					type="button">
					Chọn từ danh mục
				</button>
			</div>
		)
	}

	return (
		<div className="relative">
			<button
				className="w-full flex items-center justify-between rounded border border-border-panel bg-input-background px-3 py-2 text-xs text-left hover:border-indigo-500 transition-colors"
				data-testid="model-combobox-trigger"
				onClick={() => setIsOpen(!isOpen)}
				type="button">
				<div className="flex items-center gap-2 truncate">
					<span className="text-base">🧠</span>
					<div className="flex flex-col truncate">
						<span className="font-semibold text-slate-100">
							{selectedModel ? selectedModel.name : modelId || "Kế thừa từ hệ thống (để trống)"}
						</span>
						{modelId && (
							<span className="font-mono text-[11px] text-slate-400 truncate">
								{modelId} • {providerId || selectedModel?.provider || "Custom"}
							</span>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{modelId && (
						<span className="rounded bg-indigo-950/60 border border-indigo-700/50 text-[10px] text-indigo-300 px-1.5 py-0.5">
							{contextWindow >= 1000000 ? `${contextWindow / 1000000}M` : `${Math.round(contextWindow / 1000)}K`}
						</span>
					)}
					<span className="text-slate-400 text-[10px]">▼</span>
				</div>
			</button>

			{isOpen && (
				<div
					className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-slate-700 bg-[#12182b] shadow-2xl p-2 max-h-80 flex flex-col gap-2"
					data-testid="model-combobox-popover">
					<input
						autoFocus
						className="rounded border border-border-panel bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-hidden focus:border-indigo-500"
						data-testid="model-search-input"
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Tìm kiếm model theo tên, ID, hoặc provider..."
						type="text"
						value={search}
					/>
					<div className="overflow-y-auto flex-1 flex flex-col gap-3 pr-1">
						<button
							className={`w-full flex items-center justify-between p-2 rounded text-xs text-left transition-colors ${
								!modelId
									? "bg-indigo-600/30 border border-indigo-500 text-white"
									: "hover:bg-white/5 text-slate-300"
							}`}
							data-testid="model-option-inherit"
							onClick={() => {
								setModelId("")
								setProviderId("")
								setIsOpen(false)
							}}
							type="button">
							<div className="flex flex-col">
								<span className="font-semibold">Kế thừa từ hệ thống (Mặc định)</span>
								<span className="text-[11px] text-slate-400">Sử dụng model chính của workspace</span>
							</div>
							{!modelId && <span className="text-indigo-400 font-bold">✓</span>}
						</button>

						{Object.entries(grouped).map(([providerName, mList]) => (
							<div className="flex flex-col gap-1" key={providerName}>
								<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
									{providerName}
								</span>
								{mList.map((m) => {
									const isSelected = modelId === m.id
									return (
										<button
											className={`w-full flex items-center justify-between p-2 rounded text-xs text-left transition-colors ${
												isSelected
													? "bg-indigo-600/30 border border-indigo-500 text-white"
													: "hover:bg-white/5 text-slate-300"
											}`}
											data-testid={`model-option-${m.id}`}
											key={m.id}
											onClick={() => {
												onSelectModel(m)
												setIsOpen(false)
											}}
											type="button">
											<div className="flex flex-col">
												<span className="font-semibold text-slate-100">{m.name}</span>
												<span className="font-mono text-[10px] text-slate-400">{m.id}</span>
											</div>
											<div className="flex items-center gap-1.5 shrink-0">
												<span className="rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 px-1.5 py-0.5">
													{m.contextWindow >= 1000000
														? `${m.contextWindow / 1000000}M`
														: `${m.contextWindow / 1000}K`}
												</span>
												{m.supportsVision && (
													<span className="rounded bg-blue-950/60 border border-blue-800 text-[10px] text-blue-300 px-1.5 py-0.5">
														Vision
													</span>
												)}
												{m.supportsReasoning && (
													<span className="rounded bg-purple-950/60 border border-purple-800 text-[10px] text-purple-300 px-1.5 py-0.5">
														Reasoning
													</span>
												)}
												{isSelected && <span className="text-indigo-400 font-bold ml-1">✓</span>}
											</div>
										</button>
									)
								})}
							</div>
						))}
					</div>
					<div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-xs">
						<button
							className="text-indigo-400 hover:text-indigo-300 text-[11px] underline"
							data-testid="enter-custom-model-id"
							onClick={() => {
								setIsCustomMode(true)
								setIsOpen(false)
							}}
							type="button">
							✏️ Nhập Model ID thủ công
						</button>
						<button
							className="text-slate-400 hover:text-slate-200 text-[11px]"
							onClick={() => setIsOpen(false)}
							type="button">
							Đóng
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
