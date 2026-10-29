import {
	IconAdjustments,
	IconAlertTriangle,
	IconCoin,
	IconGitMerge,
	type IconProps,
	IconShieldCheck,
	IconTarget,
	IconUserCheck,
	IconUserMinus,
	IconUserPlus,
	IconUsersGroup,
} from "@tabler/icons-react"
import type { ComponentType } from "react"
import type { OrvantaDecisionItem, OrvantaHistoryEntry } from "../../../../src/shared/proto/cline/orvanta"

export type InboxSubTab = "pending" | "deferred" | "history"

export interface TypeMeta {
	label: string
	color: string
	icon: ComponentType<IconProps>
}

export const TYPE_LABELS: Record<string, TypeMeta> = {
	hire_agent: {
		label: "Tuyển Agent",
		color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
		icon: IconUserPlus,
	},
	fire_agent: {
		label: "Sa thải Agent",
		color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
		icon: IconUserMinus,
	},
	change_role: {
		label: "Đổi vai trò",
		color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
		icon: IconUserCheck,
	},
	change_purpose: {
		label: "Đổi Purpose",
		color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
		icon: IconTarget,
	},
	change_scope: {
		label: "Đổi Scope",
		color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
		icon: IconAdjustments,
	},
	merge: {
		label: "Duyệt Merge",
		color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
		icon: IconGitMerge,
	},
	over_budget: {
		label: "Vượt ngân sách",
		color: "bg-red-500/10 text-red-400 border-red-500/30",
		icon: IconCoin,
	},
	over_ephemeral: {
		label: "Vượt Ephemeral",
		color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
		icon: IconUsersGroup,
	},
	escalate_blocked: {
		label: "Báo bế tắc",
		color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
		icon: IconAlertTriangle,
	},
	change_policy: {
		label: "Đổi chính sách",
		color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
		icon: IconShieldCheck,
	},
}

export interface UrgencyMeta {
	label: string
	color: string
}

export const URGENCY_LABELS: Record<string, UrgencyMeta> = {
	critical: {
		label: "Khẩn cấp",
		color: "bg-red-500/10 text-red-400 border-red-500/30",
	},
	high: {
		label: "Gấp",
		color: "bg-orange-500/10 text-orange-400 border-orange-500/30",
	},
	normal: {
		label: "Bình thường",
		color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
	},
	low: {
		label: "Thấp",
		color: "bg-slate-500/10 text-slate-400 border-slate-500/30",
	},
}

export type AnyDecisionItem = OrvantaDecisionItem | OrvantaHistoryEntry

export function formatRelativeTime(isoDate?: string): string {
	if (!isoDate) return ""
	try {
		const parsed = new Date(isoDate).getTime()
		if (Number.isNaN(parsed)) return ""
		const diffSec = Math.floor((Date.now() - parsed) / 1000)
		if (diffSec < 60) return "vừa xong"
		if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m trước`
		if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h trước`
		if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d trước`
		return new Date(isoDate).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" })
	} catch {
		return ""
	}
}
