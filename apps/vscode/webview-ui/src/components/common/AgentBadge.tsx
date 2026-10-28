import React from "react"
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
	icon: string
	label: string
	colorClass: string
	ringClass: string
}

export function getAgentBadgeMeta(role?: string, id?: string): AgentBadgeMeta {
	const r = (role || "").toLowerCase()
	const i = (id || "").toLowerCase()

	if (r === "lead" || i === "coordinator") {
		return {
			icon: "⭐",
			label: "Lead",
			colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/30",
			ringClass: "ring-amber-500/50",
		}
	}
	if (r === "architect" || i.includes("architect")) {
		return {
			icon: "📐",
			label: "Architect",
			colorClass: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
			ringClass: "ring-indigo-500/50",
		}
	}
	if (r === "implementer" || r === "coder" || i.includes("implementer") || i.includes("coder")) {
		return {
			icon: "💻",
			label: "Implementer",
			colorClass: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
			ringClass: "ring-cyan-500/50",
		}
	}
	if (r === "reviewer" || r === "auditor" || i.includes("reviewer") || i.includes("auditor")) {
		return {
			icon: "🔍",
			label: "Reviewer",
			colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/30",
			ringClass: "ring-amber-500/50",
		}
	}
	if (
		r === "copywriter" ||
		r === "content" ||
		r === "marketer" ||
		r === "marketing" ||
		i.includes("writer") ||
		i.includes("marketer")
	) {
		return {
			icon: "📝",
			label: "Content",
			colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
			ringClass: "ring-emerald-500/50",
		}
	}
	if (r === "sales" || r === "outreach" || i.includes("sales")) {
		return {
			icon: "🎯",
			label: "Sales",
			colorClass: "text-rose-400 bg-rose-500/10 border-rose-500/30",
			ringClass: "ring-rose-500/50",
		}
	}
	if (r === "ephemeral" || r === "guest" || i.startsWith("guest-") || i.startsWith("ephemeral-")) {
		return {
			icon: "⚡",
			label: "Guest",
			colorClass: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30 border-dashed",
			ringClass: "ring-zinc-500/50",
		}
	}
	return {
		icon: "🤖",
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
			<span className="leading-none text-xs select-none">{meta.icon}</span>
			{showRole && <span className="font-semibold opacity-90">{meta.label}</span>}
			{showRole && <span className="opacity-40">·</span>}
			<span className="truncate max-w-28 font-mono">{name}</span>
		</span>
	)
}

export default AgentBadge
