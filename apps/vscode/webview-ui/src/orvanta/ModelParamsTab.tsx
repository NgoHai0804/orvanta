import { ModelPickerCombobox } from "./ModelPickerCombobox"
import { type CuratedModel, getTemperatureDescription, REASONING_LEVELS } from "./model-catalog-data"

export interface ModelParamsTabProps {
	modelId: string
	setModelId: (val: string) => void
	providerId: string
	setProviderId: (val: string) => void
	reasoningEffort: string
	setReasoningEffort: (val: string) => void
	supportsImages: boolean
	setSupportsImages: (val: boolean) => void
	contextWindow: number
	setContextWindow: (val: number) => void
	maxOutputTokens: number
	setMaxOutputTokens: (val: number) => void
	temperature: string
	setTemperature: (val: string) => void
	maxIterations: number
	setMaxIterations: (val: number) => void
}

export const ModelParamsTab = ({
	modelId,
	setModelId,
	providerId,
	setProviderId,
	reasoningEffort,
	setReasoningEffort,
	supportsImages,
	setSupportsImages,
	contextWindow,
	setContextWindow,
	maxOutputTokens,
	setMaxOutputTokens,
	temperature,
	setTemperature,
	maxIterations,
	setMaxIterations,
}: ModelParamsTabProps) => {
	const handleSelectModel = (m: CuratedModel) => {
		setModelId(m.id)
		setProviderId(m.provider)
		setContextWindow(m.contextWindow)
		setMaxOutputTokens(m.maxTokens)
		setSupportsImages(m.supportsVision)
		if (m.supportsReasoning && (reasoningEffort === "none" || !reasoningEffort)) {
			setReasoningEffort("medium")
		}
	}

	return (
		<div className="flex flex-col gap-4 text-(--vscode-foreground)" data-testid="tab-panel-model">
			{/* Card 1: Model LLM & Provider */}
			<div className="rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3.5 flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-(--vscode-foreground)">Model AI & Nhà cung cấp</span>
					<span className="text-[11px] text-(--vscode-descriptionForeground)">
						Chọn model chuyên biệt hoặc kế thừa từ hệ thống
					</span>
				</div>
				<ModelPickerCombobox
					contextWindow={contextWindow}
					modelId={modelId}
					onSelectModel={handleSelectModel}
					providerId={providerId}
					setModelId={setModelId}
					setProviderId={setProviderId}
				/>
			</div>

			{/* Card 2: Capabilities (Reasoning & Vision) */}
			<div className="rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3.5 flex flex-col gap-3.5">
				{/* Reasoning Effort */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-(--vscode-foreground)">Reasoning Effort (Độ sâu suy luận)</span>
						<span className="text-[11px] text-(--vscode-descriptionForeground)">
							Mức độ đào sâu tư duy trước khi đưa ra câu trả lời
						</span>
					</div>
					<div
						className="grid grid-cols-5 gap-1 bg-(--vscode-editor-background)/80 p-1 rounded-lg border border-border-panel"
						data-testid="reasoning-effort-segmented">
						{REASONING_LEVELS.map((lvl) => {
							const isActive = reasoningEffort === lvl.id
							return (
								<button
									className={`py-1.5 rounded-md text-xs font-medium transition-all text-center cursor-pointer ${
										isActive
											? "bg-(--vscode-button-background) text-(--vscode-button-foreground) font-semibold shadow-xs"
											: "text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) hover:bg-white/5"
									}`}
									data-testid={`reasoning-effort-${lvl.id}`}
									key={lvl.id}
									onClick={() => setReasoningEffort(lvl.id)}
									type="button">
									{lvl.label}
								</button>
							)
						})}
					</div>
				</div>

				{/* Vision Switch */}
				<div className="pt-2 border-t border-border-panel/60">
					<label className="flex items-center justify-between cursor-pointer group">
						<div className="flex flex-col">
							<span className="text-xs font-medium text-(--vscode-foreground)">Đọc & Xử lý hình ảnh (Vision)</span>
							<span className="text-[11px] text-(--vscode-descriptionForeground)">
								Cho phép agent phân tích ảnh chụp màn hình, mockups UI và sơ đồ
							</span>
						</div>
						<button
							aria-checked={Boolean(supportsImages)}
							className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
								supportsImages ? "bg-(--vscode-button-background)" : "bg-slate-700"
							}`}
							data-testid="supports-images-toggle"
							onClick={() => setSupportsImages(!supportsImages)}
							role="switch"
							type="button">
							<span
								className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
									supportsImages ? "translate-x-4" : "translate-x-0"
								}`}
							/>
						</button>
					</label>
				</div>
			</div>

			{/* Card 3: Context Window & Output Tokens */}
			<div className="rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3.5 flex flex-col gap-3">
				<span className="text-xs font-semibold text-(--vscode-foreground)">Giới hạn Ngữ cảnh (Tokens)</span>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
					{/* Context Window */}
					<div className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-(--vscode-foreground)">Context Window</span>
						<input
							className="rounded border border-border-panel bg-input-background px-2.5 py-1.5 text-xs text-(--vscode-foreground)"
							data-testid="context-window-input"
							min={1000}
							onChange={(e) => setContextWindow(parseInt(e.target.value, 10) || 0)}
							type="number"
							value={contextWindow}
						/>
						<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
							{[64000, 128000, 200000, 1000000].map((preset) => (
								<button
									className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
										contextWindow === preset
											? "bg-(--vscode-button-background) border-transparent text-(--vscode-button-foreground) font-semibold"
											: "border-border-panel bg-input-background text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground)"
									}`}
									data-testid={`preset-context-${preset}`}
									key={preset}
									onClick={() => setContextWindow(preset)}
									type="button">
									{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}K`}
								</button>
							))}
						</div>
					</div>

					{/* Max Output Tokens */}
					<div className="flex flex-col gap-1.5">
						<span className="text-xs font-medium text-(--vscode-foreground)">Max Output Tokens</span>
						<input
							className="rounded border border-border-panel bg-input-background px-2.5 py-1.5 text-xs text-(--vscode-foreground)"
							data-testid="max-output-tokens-input"
							min={100}
							onChange={(e) => setMaxOutputTokens(parseInt(e.target.value, 10) || 0)}
							type="number"
							value={maxOutputTokens}
						/>
						<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
							{[4096, 8192, 16384].map((preset) => (
								<button
									className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
										maxOutputTokens === preset
											? "bg-(--vscode-button-background) border-transparent text-(--vscode-button-foreground) font-semibold"
											: "border-border-panel bg-input-background text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground)"
									}`}
									data-testid={`preset-output-${preset}`}
									key={preset}
									onClick={() => setMaxOutputTokens(preset)}
									type="button">
									{preset}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Card 4: Execution Control (Temperature & Max Iterations) */}
			<div className="rounded-lg border border-border-panel bg-(--vscode-sideBar-background)/40 p-3.5 flex flex-col gap-3">
				<span className="text-xs font-semibold text-(--vscode-foreground)">Điều khiển Thực thi & Nhiệt độ</span>

				{/* Temperature Slider */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-(--vscode-foreground)">Temperature</span>
						<div className="flex items-center gap-2">
							<span className="font-mono text-xs font-bold text-indigo-400" data-testid="temperature-display-value">
								{parseFloat(temperature || "0").toFixed(1)}
							</span>
							<span className="text-[11px] text-(--vscode-descriptionForeground)">
								({getTemperatureDescription(parseFloat(temperature || "0"))})
							</span>
						</div>
					</div>
					<input
						className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-input-background rounded-lg"
						data-testid="temperature-slider"
						max="2.0"
						min="0.0"
						onChange={(e) => setTemperature(e.target.value)}
						step="0.1"
						type="range"
						value={temperature || "0.7"}
					/>
					<div className="flex justify-between text-[10px] text-(--vscode-descriptionForeground) px-0.5">
						<span>0.0 (Chính xác)</span>
						<span>0.7 (Cân bằng)</span>
						<span>2.0 (Sáng tạo)</span>
					</div>
				</div>

				{/* Max Iterations */}
				<div className="flex flex-col gap-1.5 pt-2 border-t border-border-panel/60">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-(--vscode-foreground)">Max Iterations</span>
						<span className="text-[11px] text-(--vscode-descriptionForeground)">
							Giới hạn số vòng lặp tối đa của agent (1-200)
						</span>
					</div>
					<input
						className="rounded border border-border-panel bg-input-background px-2.5 py-1.5 text-xs text-(--vscode-foreground)"
						data-testid="max-iterations-input"
						max={200}
						min={1}
						onChange={(e) => setMaxIterations(parseInt(e.target.value, 10) || 40)}
						type="number"
						value={maxIterations}
					/>
				</div>
			</div>
		</div>
	)
}
