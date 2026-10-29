/** Shared chat-timeline header/icon tokens. Lucide must get `size` so SVG is not 24×24. */
export const CHAT_ROW_ICON_PX = 12
export const CHAT_ROW_ICON_STROKE = 1.75
export const CHAT_ROW_LUCIDE = { size: CHAT_ROW_ICON_PX, strokeWidth: CHAT_ROW_ICON_STROKE } as const

export const CHAT_HEADER_ROW = "flex items-center gap-1.5 mb-2 min-w-0"
export const CHAT_HEADER_TITLE = "text-[13px] font-medium leading-snug text-foreground"
export const CHAT_HEADER_TITLE_MUTED = "text-[13px] font-medium leading-snug text-description"
export const CHAT_HEADER_META = "text-[11px] font-normal leading-snug text-muted-foreground"
