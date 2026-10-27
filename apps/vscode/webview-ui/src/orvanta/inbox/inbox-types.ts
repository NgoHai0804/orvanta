import type { OrvantaDecisionItem, OrvantaHistoryEntry } from "../../../../src/shared/proto/cline/orvanta"

export type InboxSubTab = "pending" | "deferred" | "history"

export interface TypeMeta {
	label: string
	color: string
}

export const TYPE_LABELS: Record<string, TypeMeta> = {
	hire_agent: {
		label: "Tuyển Agent",
		color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
	},
	fire_agent: {
		label: "Sa thải Agent",
		color: "bg-rose-500/20 text-rose-400 border-rose-500/30",
	},
	change_purpose: {
		label: "Đổi Purpose",
		color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
	},
}

export const URGENCY_LABELS: Record<string, TypeMeta> = {
	high: {
		label: "Gấp",
		color: "bg-red-500/20 text-red-400 border-red-500/30",
	},
	normal: {
		label: "Bình thường",
		color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
	},
	low: {
		label: "Thấp",
		color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
	},
}

export type AnyDecisionItem = OrvantaDecisionItem | OrvantaHistoryEntry
