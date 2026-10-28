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
		<div className="flex flex-col gap-5" data-testid="tab-panel-model">
			{/* Model Combobox */}
			<div className="flex flex-col gap-1.5 relative">
				<span className="text-xs font-bold uppercase tracking-wide opacity-70">Model LLM & Nhà cung cấp</span>
				<ModelPickerCombobox
					contextWindow={contextWindow}
					modelId={modelId}
					onSelectModel={handleSelectModel}
					providerId={providerId}
					setModelId={setModelId}
					setProviderId={setProviderId}
				/>
			</div>

			{/* Reasoning Effort Segmented Control */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wide opacity-70">
						Reasoning Effort (Suy Luận Đa Bước)
					</span>
					<span className="text-[11px] text-slate-400">Mức độ đào sâu tư duy trước khi đưa ra câu trả lời</span>
				</div>
				<div
					className="grid grid-cols-5 gap-1 bg-[#10162a] p-1 rounded-lg border border-border-panel"
					data-testid="reasoning-effort-segmented">
					{REASONING_LEVELS.map((lvl) => {
						const isActive = reasoningEffort === lvl.id
						return (
							<button
								className={`py-1.5 rounded-md text-xs font-medium transition-all text-center ${
									isActive
										? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-semibold ring-1 ring-indigo-400/50"
										: "text-slate-400 hover:text-slate-200 hover:bg-white/5"
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

			{/* Supports Images Toggle Switch */}
			<div className="rounded-lg border border-border-panel bg-[#10162a]/60 p-3">
				<label className="flex items-center justify-between cursor-pointer group">
					<div className="flex flex-col">
						<span className="text-xs font-medium text-slate-200">Đọc & Xử lý hình ảnh (Vision)</span>
						<span className="text-[11px] text-slate-400">
							Cho phép agent phân tích ảnh chụp màn hình, mockups UI và biểu đồ
						</span>
					</div>
					<button
						aria-checked={Boolean(supportsImages)}
						className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
							supportsImages ? "bg-indigo-600" : "bg-slate-700"
						}`}
						data-testid="supports-images-toggle"
						onClick={() => setSupportsImages(!supportsImages)}
						role="switch"
						type="button">
						<span
							className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
								supportsImages ? "translate-x-5" : "translate-x-0"
							}`}
						/>
					</button>
				</label>
			</div>

			{/* Context Window & Output Tokens */}
			<div className="grid grid-cols-2 gap-4">
				{/* Context Window */}
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Context Window (Tokens)</span>
					</div>
					<input
						className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
						data-testid="context-window-input"
						min={1000}
						onChange={(e) => setContextWindow(parseInt(e.target.value, 10) || 0)}
						type="number"
						value={contextWindow}
					/>
					<div className="flex items-center gap-1.5 pt-0.5">
						{[64000, 128000, 200000, 1000000].map((preset) => (
							<button
								className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
									contextWindow === preset
										? "bg-indigo-950 border-indigo-500 text-indigo-300 font-semibold"
										: "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
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
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wide opacity-70">Max Output Tokens</span>
					</div>
					<input
						className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
						data-testid="max-output-tokens-input"
						min={100}
						onChange={(e) => setMaxOutputTokens(parseInt(e.target.value, 10) || 0)}
						type="number"
						value={maxOutputTokens}
					/>
					<div className="flex items-center gap-1.5 pt-0.5">
						{[4096, 8192, 16384].map((preset) => (
							<button
								className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
									maxOutputTokens === preset
										? "bg-indigo-950 border-indigo-500 text-indigo-300 font-semibold"
										: "border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200"
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

			{/* Temperature Slider */}
			<div className="flex flex-col gap-2 rounded-lg border border-border-panel bg-[#10162a]/60 p-3">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wide opacity-70">Temperature</span>
					<div className="flex items-center gap-2">
						<span className="font-mono text-xs font-bold text-indigo-400" data-testid="temperature-display-value">
							{parseFloat(temperature || "0").toFixed(1)}
						</span>
						<span className="text-[11px] text-slate-400">
							({getTemperatureDescription(parseFloat(temperature || "0"))})
						</span>
					</div>
				</div>
				<input
					className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
					data-testid="temperature-slider"
					max="2.0"
					min="0.0"
					onChange={(e) => setTemperature(e.target.value)}
					step="0.1"
					type="range"
					value={temperature || "0.7"}
				/>
				<div className="flex justify-between text-[10px] text-slate-400 px-0.5">
					<span>0.0 (Chính xác)</span>
					<span>0.7 (Cân bằng)</span>
					<span>2.0 (Sáng tạo tối đa)</span>
				</div>
			</div>

			{/* Max Iterations */}
			<label className="flex flex-col gap-1">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold uppercase tracking-wide opacity-70">Max Iterations</span>
					<span className="text-[11px] text-slate-400">Giới hạn số vòng lặp tối đa của agent (1-200)</span>
				</div>
				<input
					className="rounded border border-border-panel bg-input-background px-2.5 py-1 text-xs"
					data-testid="max-iterations-input"
					max={200}
					min={1}
					onChange={(e) => setMaxIterations(parseInt(e.target.value, 10) || 40)}
					type="number"
					value={maxIterations}
				/>
			</label>
		</div>
	)
}
