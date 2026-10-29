import { IconBrain, IconCheck, IconChevronDown, IconPencil, IconSearch, IconSparkles } from "@tabler/icons-react"
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
	const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>("all")
	const [isCustomMode, setIsCustomMode] = useState(false)

	const selectedModel = useMemo(() => {
		return CURATED_MODELS.find((m) => m.id === modelId)
	}, [modelId])

	const providersList = useMemo(() => {
		const set = new Set<string>()
		for (const m of CURATED_MODELS) {
			set.add(m.provider)
		}
		return Array.from(set)
	}, [])

	const filteredModels = useMemo(() => {
		const q = search.trim().toLowerCase()
		return CURATED_MODELS.filter((m) => {
			const matchesProvider = selectedProviderFilter === "all" || m.provider === selectedProviderFilter
			if (!matchesProvider) return false
			if (!q) return true
			return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
		})
	}, [search, selectedProviderFilter])

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
					className="flex-1 rounded border border-border-panel bg-input-background px-3 py-1.5 font-mono text-xs text-(--vscode-foreground)"
					data-testid="custom-model-id-input"
					onChange={(e) => setModelId(e.target.value)}
					placeholder="ví dụ: claude-3-7-sonnet-20250219 hoặc custom/my-model"
					type="text"
					value={modelId}
				/>
				<button
					className="rounded border border-border-panel bg-input-background hover:bg-white/5 px-3 py-1.5 text-xs text-(--vscode-foreground) cursor-pointer"
					onClick={() => setIsCustomMode(false)}
					type="button">
					Chọn từ danh mục
				</button>
			</div>
		)
	}

	return (
		<div className="relative w-full">
			<button
				className="w-full flex items-center justify-between rounded-md border border-border-panel bg-input-background px-3 py-2 text-xs text-left hover:border-(--vscode-focusBorder) transition-colors cursor-pointer"
				data-testid="model-combobox-trigger"
				onClick={() => setIsOpen(!isOpen)}
				type="button">
				<div className="flex items-center gap-2.5 min-w-0 pr-2">
					<IconBrain className="text-indigo-400 shrink-0" size={16} stroke={1.5} />
					<div className="flex flex-col min-w-0">
						<span className="font-medium text-xs text-(--vscode-foreground) truncate">
							{selectedModel ? selectedModel.name : modelId || "Kế thừa từ hệ thống (mặc định)"}
						</span>
						{modelId && (
							<span className="font-mono text-[11px] text-(--vscode-descriptionForeground) truncate">
								{modelId} • {providerId || selectedModel?.provider || "Custom"}
							</span>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{modelId && (
						<span className="rounded bg-(--vscode-badge-background) text-[10px] text-(--vscode-badge-foreground) font-mono px-1.5 py-0.5">
							{contextWindow >= 1000000 ? `${contextWindow / 1000000}M` : `${Math.round(contextWindow / 1000)}K`}
						</span>
					)}
					<IconChevronDown
						className={`text-(--vscode-descriptionForeground) shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
						size={14}
						stroke={1.5}
					/>
				</div>
			</button>

			{isOpen && (
				<div
					className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg border border-border-panel bg-(--vscode-sideBar-background) shadow-2xl p-2.5 max-h-72 flex flex-col gap-2 overflow-hidden"
					data-testid="model-combobox-popover">
					{/* Search input */}
					<div className="relative">
						<IconSearch
							className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--vscode-descriptionForeground)"
							size={13}
							stroke={1.5}
						/>
						<input
							autoFocus
							className="w-full rounded border border-border-panel bg-input-background pl-8 pr-3 py-1.5 text-xs text-(--vscode-foreground) focus:outline-hidden focus:border-(--vscode-focusBorder)"
							data-testid="model-search-input"
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Tìm kiếm model hoặc nhà cung cấp..."
							type="text"
							value={search}
						/>
					</div>

					{/* Provider filter chips */}
					<div className="flex items-center gap-1 overflow-x-auto scroller-x pb-0.5">
						<button
							className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer shrink-0 ${
								selectedProviderFilter === "all"
									? "bg-(--vscode-button-background) text-(--vscode-button-foreground)"
									: "bg-input-background text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground)"
							}`}
							onClick={() => setSelectedProviderFilter("all")}
							type="button">
							Tất cả
						</button>
						{providersList.map((p) => (
							<button
								className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer shrink-0 ${
									selectedProviderFilter === p
										? "bg-(--vscode-button-background) text-(--vscode-button-foreground)"
										: "bg-input-background text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground)"
								}`}
								key={p}
								onClick={() => setSelectedProviderFilter(p)}
								type="button">
								{p}
							</button>
						))}
					</div>

					<div className="overflow-y-auto flex-1 min-h-0 flex flex-col gap-2 pr-1 scroller-y max-h-48">
						{/* Default Inherit Option */}
						<button
							className={`w-full flex items-center justify-between p-2 rounded text-xs text-left transition-colors cursor-pointer ${
								!modelId
									? "bg-(--vscode-list-activeSelectionBackground) text-(--vscode-list-activeSelectionForeground)"
									: "hover:bg-white/5 text-(--vscode-foreground)"
							}`}
							data-testid="model-option-inherit"
							onClick={() => {
								setModelId("")
								setProviderId("")
								setIsOpen(false)
							}}
							type="button">
							<div className="flex items-center gap-2">
								<IconSparkles className="text-amber-400 shrink-0" size={14} stroke={1.5} />
								<div className="flex flex-col">
									<span className="font-semibold text-xs">Kế thừa từ hệ thống (Mặc định)</span>
									<span className="text-[11px] text-(--vscode-descriptionForeground)">
										Sử dụng model mặc định của workspace/extension
									</span>
								</div>
							</div>
							{!modelId && <IconCheck className="text-emerald-400 shrink-0" size={14} stroke={2} />}
						</button>

						{Object.entries(grouped).map(([providerName, mList]) => (
							<div className="flex flex-col gap-1" key={providerName}>
								<span className="text-[10px] font-bold uppercase tracking-wider text-(--vscode-descriptionForeground) px-1 pt-1">
									{providerName}
								</span>
								{mList.map((m) => {
									const isSelected = modelId === m.id
									return (
										<button
											className={`w-full flex items-center justify-between p-2 rounded text-xs text-left transition-colors cursor-pointer ${
												isSelected
													? "bg-(--vscode-list-activeSelectionBackground) text-(--vscode-list-activeSelectionForeground)"
													: "hover:bg-white/5 text-(--vscode-foreground)"
											}`}
											data-testid={`model-option-${m.id}`}
											key={m.id}
											onClick={() => {
												onSelectModel(m)
												setIsOpen(false)
											}}
											type="button">
											<div className="flex flex-col min-w-0 pr-2">
												<span className="font-medium text-xs truncate">{m.name}</span>
												<span className="font-mono text-[10px] text-(--vscode-descriptionForeground) truncate">
													{m.id}
												</span>
											</div>
											<div className="flex items-center gap-1.5 shrink-0">
												<span className="rounded bg-(--vscode-badge-background) text-[10px] text-(--vscode-badge-foreground) px-1.5 py-0.5 font-mono">
													{m.contextWindow >= 1000000
														? `${m.contextWindow / 1000000}M`
														: `${m.contextWindow / 1000}K`}
												</span>
												{m.supportsVision && (
													<span className="rounded bg-sky-500/10 border border-sky-500/20 text-[10px] text-sky-400 px-1 py-0.2">
														Vision
													</span>
												)}
												{m.supportsReasoning && (
													<span className="rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 px-1 py-0.2">
														Reasoning
													</span>
												)}
												{isSelected && (
													<IconCheck className="text-emerald-400 shrink-0 ml-1" size={14} stroke={2} />
												)}
											</div>
										</button>
									)
								})}
							</div>
						))}
					</div>

					<div className="border-t border-border-panel pt-2 flex items-center justify-between text-xs">
						<button
							className="text-(--vscode-textLink-foreground) hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
							data-testid="enter-custom-model-id"
							onClick={() => {
								setIsCustomMode(true)
								setIsOpen(false)
							}}
							type="button">
							<IconPencil size={12} stroke={1.5} />
							<span>Nhập Model ID thủ công</span>
						</button>
						<button
							className="text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) text-[11px] cursor-pointer"
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
