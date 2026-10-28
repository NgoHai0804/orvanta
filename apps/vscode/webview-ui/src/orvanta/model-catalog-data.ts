export interface CuratedModel {
	id: string
	name: string
	provider: string
	contextWindow: number
	maxTokens: number
	supportsVision: boolean
	supportsReasoning: boolean
}

export const CURATED_MODELS: CuratedModel[] = [
	{
		id: "claude-3-7-sonnet-20250219",
		name: "Claude 3.7 Sonnet",
		provider: "Anthropic",
		contextWindow: 200000,
		maxTokens: 8192,
		supportsVision: true,
		supportsReasoning: true,
	},
	{
		id: "claude-3-5-sonnet-20241022",
		name: "Claude 3.5 Sonnet",
		provider: "Anthropic",
		contextWindow: 200000,
		maxTokens: 8192,
		supportsVision: true,
		supportsReasoning: false,
	},
	{
		id: "claude-3-5-haiku-20241022",
		name: "Claude 3.5 Haiku",
		provider: "Anthropic",
		contextWindow: 200000,
		maxTokens: 8192,
		supportsVision: true,
		supportsReasoning: false,
	},
	{
		id: "gpt-4o",
		name: "GPT-4o",
		provider: "OpenAI",
		contextWindow: 128000,
		maxTokens: 16384,
		supportsVision: true,
		supportsReasoning: false,
	},
	{
		id: "gpt-4o-mini",
		name: "GPT-4o mini",
		provider: "OpenAI",
		contextWindow: 128000,
		maxTokens: 16384,
		supportsVision: true,
		supportsReasoning: false,
	},
	{
		id: "o3-mini",
		name: "o3-mini",
		provider: "OpenAI",
		contextWindow: 200000,
		maxTokens: 100000,
		supportsVision: false,
		supportsReasoning: true,
	},
	{
		id: "o1",
		name: "o1",
		provider: "OpenAI",
		contextWindow: 200000,
		maxTokens: 100000,
		supportsVision: true,
		supportsReasoning: true,
	},
	{
		id: "deepseek-reasoner",
		name: "DeepSeek R1",
		provider: "DeepSeek",
		contextWindow: 64000,
		maxTokens: 8192,
		supportsVision: false,
		supportsReasoning: true,
	},
	{
		id: "deepseek-chat",
		name: "DeepSeek V3",
		provider: "DeepSeek",
		contextWindow: 64000,
		maxTokens: 8192,
		supportsVision: false,
		supportsReasoning: false,
	},
	{
		id: "gemini-2.0-flash",
		name: "Gemini 2.0 Flash",
		provider: "Google Gemini",
		contextWindow: 1000000,
		maxTokens: 8192,
		supportsVision: true,
		supportsReasoning: false,
	},
	{
		id: "gemini-2.0-pro-exp",
		name: "Gemini 2.0 Pro",
		provider: "Google Gemini",
		contextWindow: 2000000,
		maxTokens: 8192,
		supportsVision: true,
		supportsReasoning: true,
	},
	{
		id: "anthropic/claude-3.7-sonnet",
		name: "Claude 3.7 Sonnet (OpenRouter)",
		provider: "OpenRouter",
		contextWindow: 200000,
		maxTokens: 8192,
		supportsVision: true,
		supportsReasoning: true,
	},
	{
		id: "deepseek/deepseek-r1",
		name: "DeepSeek R1 (OpenRouter)",
		provider: "OpenRouter",
		contextWindow: 64000,
		maxTokens: 8192,
		supportsVision: false,
		supportsReasoning: true,
	},
	{
		id: "meta-llama/llama-3.3-70b-instruct",
		name: "Llama 3.3 70B (OpenRouter)",
		provider: "OpenRouter",
		contextWindow: 128000,
		maxTokens: 8192,
		supportsVision: false,
		supportsReasoning: false,
	},
]

export const REASONING_LEVELS: { id: "none" | "low" | "medium" | "high" | "max"; label: string }[] = [
	{ id: "none", label: "None" },
	{ id: "low", label: "Low" },
	{ id: "medium", label: "Medium" },
	{ id: "high", label: "High" },
	{ id: "max", label: "Max" },
]

export function getTemperatureDescription(val: number): string {
	if (val <= 0.2) return "Chính xác, tất định"
	if (val <= 0.5) return "Chính xác cao, ít sáng tạo"
	if (val <= 0.8) return "Cân bằng, tự nhiên"
	if (val <= 1.2) return "Sáng tạo vừa phải"
	return "Rất sáng tạo, ngẫu nhiên"
}
