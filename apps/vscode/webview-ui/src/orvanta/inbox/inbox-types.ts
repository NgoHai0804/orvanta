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
	change_role: {
		label: "Đổi vai trò",
		color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
	},
	change_purpose: {
		label: "Đổi Purpose",
		color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
	},
	change_scope: {
		label: "Đổi Scope",
		color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
	},
	merge: {
		label: "Duyệt Merge",
		color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
	},
	over_budget: {
		label: "Vượt ngân sách",
		color: "bg-red-500/20 text-red-400 border-red-500/30",
	},
	over_ephemeral: {
		label: "Vượt Ephemeral",
		color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
	},
	escalate_blocked: {
		label: "Báo bế tắc",
		color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
	},
	change_policy: {
		label: "Đổi chính sách",
		color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
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
