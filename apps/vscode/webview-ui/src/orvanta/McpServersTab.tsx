import { IconCheck, IconChevronDown, IconChevronRight, IconPlug, IconServer, IconTools } from "@tabler/icons-react"
import { useMemo, useState } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"

export interface McpServersTabProps {
	agentMcpServers: string[]
	setAgentMcpServers: (servers: string[]) => void
}

export const McpServersTab = ({ agentMcpServers, setAgentMcpServers }: McpServersTabProps) => {
	const { mcpServers = [] } = useExtensionState()
	const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({})

	const toggleExpand = (name: string) => {
		setExpandedServers((prev) => ({ ...prev, [name]: !prev[name] }))
	}

	const handleToggleServer = (name: string) => {
		if (agentMcpServers.includes(name)) {
			setAgentMcpServers(agentMcpServers.filter((s) => s !== name))
		} else {
			setAgentMcpServers([...agentMcpServers, name])
		}
	}

	const handleSelectAll = () => setAgentMcpServers(mcpServers.map((s) => s.name))
	const handleDeselectAll = () => setAgentMcpServers([])
	const enabledCount = useMemo(() => agentMcpServers.length, [agentMcpServers])

	return (
		<div className="space-y-4 p-4 text-xs text-slate-200">
			<div className="flex items-start gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
				<IconServer className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
				<div>
					<div className="font-medium text-slate-100">Cấu hình MCP Servers riêng cho Agent</div>
					<div className="text-[11px] text-slate-400 mt-0.5">
						Chỉ định những MCP server mà Agent này được phép kết nối và gọi công cụ. Cấu hình được lưu riêng theo từng
						Agent.
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between border-b border-slate-800 pb-2">
				<div className="flex items-center gap-2">
					<span className="font-medium text-slate-300">MCP Servers</span>
					<span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
						{enabledCount}/{mcpServers.length} đang bật
					</span>
				</div>
				{mcpServers.length > 0 && (
					<div className="flex items-center gap-2">
						<button
							className="rounded px-2 py-1 text-[11px] text-indigo-400 hover:bg-indigo-500/10"
							onClick={handleSelectAll}
							type="button">
							Bật tất cả
						</button>
						<span className="text-slate-600">·</span>
						<button
							className="rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800"
							onClick={handleDeselectAll}
							type="button">
							Tắt tất cả
						</button>
					</div>
				)}
			</div>

			{mcpServers.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 py-10 text-center">
					<IconPlug className="h-8 w-8 text-slate-600 mb-2" />
					<div className="font-medium text-slate-300">Chưa có MCP Server nào trong hệ thống</div>
					<div className="mt-1 text-[11px] text-slate-500">
						Bạn có thể cấu hình thêm MCP Server trong cài đặt tiện ích.
					</div>
				</div>
			) : (
				<div className="space-y-2.5">
					{mcpServers.map((server) => {
						const isEnabled = agentMcpServers.includes(server.name)
						const isExpanded = expandedServers[server.name] ?? false
						const toolCount = server.tools?.length ?? 0
						const isConnected = server.status === "connected"

						return (
							<div
								className={`rounded-lg border transition-all ${
									isEnabled
										? "border-indigo-500/40 bg-slate-900/80"
										: "border-slate-800 bg-slate-900/40 opacity-75"
								}`}
								key={server.name}>
								<div className="flex items-center justify-between p-3">
									<div className="flex items-center gap-3 min-w-0">
										<button
											aria-checked={isEnabled}
											className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
												isEnabled
													? "border-indigo-500 bg-indigo-600 text-white"
													: "border-slate-700 bg-slate-800"
											}`}
											onClick={() => handleToggleServer(server.name)}
											role="checkbox"
											type="button">
											{isEnabled && <IconCheck className="h-3 w-3 stroke-[3]" />}
										</button>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium text-slate-200 truncate">{server.name}</span>
												<span
													className={`rounded-full px-1.5 py-0.2 text-[10px] ${
														isConnected
															? "bg-emerald-500/10 text-emerald-400"
															: "bg-slate-700/30 text-slate-400"
													}`}>
													{server.status || "disconnected"}
												</span>
											</div>
											<div className="text-[11px] text-slate-400 mt-0.5">{toolCount} công cụ</div>
										</div>
									</div>
									{toolCount > 0 && (
										<button
											className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800"
											onClick={() => toggleExpand(server.name)}
											type="button">
											<IconTools className="h-3.5 w-3.5" />
											{isExpanded ? (
												<IconChevronDown className="h-3.5 w-3.5" />
											) : (
												<IconChevronRight className="h-3.5 w-3.5" />
											)}
										</button>
									)}
								</div>
								{isExpanded && toolCount > 0 && (
									<div className="border-t border-slate-800 bg-slate-950/60 p-3 space-y-1.5 max-h-48 overflow-y-auto">
										{server.tools?.map((tool) => (
											<div
												className="rounded border border-slate-800/80 bg-slate-900/60 p-2 text-[11px]"
												key={tool.name}>
												<div className="font-mono font-medium text-indigo-300">{tool.name}</div>
												{tool.description && (
													<div className="mt-0.5 text-slate-400">{tool.description}</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
