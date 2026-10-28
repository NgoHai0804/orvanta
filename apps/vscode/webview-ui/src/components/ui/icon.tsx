/**
 * AppIcon – Thin wrapper around @tabler/icons-react
 *
 * Enforces consistent stroke (1.5) and size scale across the UI.
 * Ref: specs/web/styles/icons.md
 *
 * Size scale:
 *   sm = 16px  (nav items, sidebar, inline text icons)
 *   md = 20px  (header action buttons)
 *   lg = 24px  (feature icons, illustrations)
 */
import type { Icon, IconProps } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export type IconSize = "sm" | "md" | "lg"

const SIZE_MAP: Record<IconSize, number> = {
	sm: 16,
	md: 20,
	lg: 24,
}

export interface AppIconProps extends Omit<IconProps, "size" | "stroke"> {
	/** Tabler icon component (e.g. IconHome) */
	icon: Icon
	/** Size preset or explicit pixel value */
	size?: IconSize | number
	className?: string
}

/**
 * Use this instead of raw Tabler icon components to keep stroke and size
 * consistent everywhere.
 *
 * @example
 * <AppIcon icon={IconHome} size="sm" />
 * <AppIcon icon={IconUsers} size={14} className="text-muted-foreground" />
 */
export const AppIcon = ({ icon: IconComponent, size = "sm", className, ...props }: AppIconProps) => {
	const resolvedSize = typeof size === "number" ? size : SIZE_MAP[size]
	return <IconComponent className={cn("shrink-0", className)} size={resolvedSize} stroke={1.5} {...props} />
}
