import {
	IconBolt,
	IconCode,
	IconCompass,
	IconPencil,
	type IconProps,
	IconRobot,
	IconRuler,
	IconSearch,
	IconShieldExclamation as IconShieldAlert,
	IconStar,
	IconTarget,
} from "@tabler/icons-react"
import React, { type ComponentType } from "react"
import { cn } from "@/lib/utils"

export interface AgentBadgeProps {
	agentId?: string
	displayName?: string
	role?: string
	className?: string
	showRole?: boolean
	size?: "sm" | "md"
}

export interface AgentBadgeMeta {
	icon: ComponentType<IconProps>
	label: string
	colorClass: string
	ringClass: string
}

export function getAgentBadgeMeta(role?: string, id?: string): AgentBadgeMeta {
	const r = (role || "").toLowerCase()
	const i = (id || "").toLowerCase()

	if (r === "lead" || i === "coordinator") {
		return {
			icon: IconStar,
			label: "Lead",
			colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/30",
			ringClass: "ring-amber-500/50",
		}
	}
	if (r === "architect" || i.includes("architect")) {
		return {
			icon: IconRuler,
			label: "Architect",
			colorClass: "text-sky-400 bg-sky-500/10 border-sky-500/30",
			ringClass: "ring-sky-500/50",
		}
	}
	if (r === "implementer" || r === "coder" || i.includes("implementer") || i.includes("coder")) {
		return {
			icon: IconCode,
			label: "Implementer",
			colorClass: "text-violet-400 bg-violet-500/10 border-violet-500/30",
			ringClass: "ring-violet-500/50",
		}
	}
	if (r === "reviewer" || r === "auditor" || i.includes("reviewer") || i.includes("auditor")) {
		return {
			icon: IconSearch,
			label: "Reviewer",
			colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
			ringClass: "ring-indigo-500/50",
		}
	}
	if (r === "researcher" || i.includes("research")) {
		return {
			icon: IconCompass,
			label: "Researcher",
			colorClass: "text-teal-400 bg-teal-500/10 border-teal-500/30",
			ringClass: "ring-teal-500/50",
		}
	}
	if (r === "skeptic" || r === "guard" || r === "critic" || i.includes("skeptic")) {
		return {
			icon: IconShieldAlert,
			label: "Skeptic",
			colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/30",
			ringClass: "ring-rose-500/50",
		}
	}
	if (
		r === "copywriter" ||
		r === "content" ||
		r === "marketer" ||
		r === "marketing" ||
		r === "writer" ||
		i.includes("writer") ||
		i.includes("marketer")
	) {
		return {
			icon: IconPencil,
			label: "Content",
			colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
			ringClass: "ring-emerald-500/50",
		}
	}
	if (r === "sales" || r === "outreach" || i.includes("sales")) {
		return {
			icon: IconTarget,
			label: "Sales",
			colorClass: "text-orange-400 bg-orange-500/10 border-orange-500/30",
			ringClass: "ring-orange-500/50",
		}
	}
	if (r === "ephemeral" || r === "guest" || i.startsWith("guest-") || i.startsWith("ephemeral-")) {
		return {
			icon: IconBolt,
			label: "Guest",
			colorClass: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30 border-dashed",
			ringClass: "ring-zinc-500/50",
		}
	}
	return {
		icon: IconRobot,
		label: role ? role.charAt(0).toUpperCase() + role.slice(1) : "Teammate",
		colorClass: "text-violet-400 bg-violet-500/10 border-violet-500/30",
		ringClass: "ring-violet-500/50",
	}
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({
	agentId,
	displayName,
	role,
	className,
	showRole = true,
	size = "sm",
}) => {
	const meta = getAgentBadgeMeta(role, agentId)
	const name = displayName || (agentId ? `@${agentId}` : "Agent")
	const Icon = meta.icon

	return (
		<span
			aria-label={`Tác nhân: ${meta.label} · ${name}`}
			className={cn(
				"inline-flex items-center gap-1 font-medium rounded-full border px-2 py-0.5 select-none shrink-0 transition-colors",
				size === "sm" ? "text-[11px] leading-tight" : "text-xs py-1 px-2.5",
				meta.colorClass,
				className,
			)}
			data-agent-id={agentId}
			data-role={role}
			data-testid="agent-badge">
			<Icon className="shrink-0" data-testid="agent-badge-icon" size={size === "sm" ? 12 : 14} stroke={1.5} />
			{showRole && <span className="font-semibold opacity-90">{meta.label}</span>}
			{showRole && <span className="opacity-40">·</span>}
			<span className="truncate max-w-28 font-mono">{name}</span>
		</span>
	)
}

export default AgentBadge
