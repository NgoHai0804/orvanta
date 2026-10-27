import { useCallback, useEffect, useState } from "react"
import { EmptyRequest } from "../../../src/shared/proto/cline/common"
import {
	type OrvantaDecisionItem,
	type OrvantaHistoryEntry,
	OrvantaRequestDecisionRequest,
	OrvantaResolveDecisionRequest,
} from "../../../src/shared/proto/cline/orvanta"
import { OrvantaServiceClient } from "../services/grpc-client"

export function useOrvantaInbox(companyStatus?: string) {
	const [pending, setPending] = useState<OrvantaDecisionItem[]>([])
	const [deferred, setDeferred] = useState<OrvantaDecisionItem[]>([])
	const [history, setHistory] = useState<OrvantaHistoryEntry[]>([])
	const [pendingCount, setPendingCount] = useState<number>(0)
	const [loading, setLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)

	const refresh = useCallback(async () => {
		if (companyStatus && companyStatus !== "ready") {
			setPending([])
			setDeferred([])
			setHistory([])
			setPendingCount(0)
			return
		}
		setLoading(true)
		setError(null)
		try {
			const res = await OrvantaServiceClient.listInbox(EmptyRequest.create({}))
			setPending(res.pending || [])
			setDeferred(res.deferred || [])
			setHistory(res.history || [])
			setPendingCount(res.pendingCount || (res.pending ? res.pending.length : 0))
		} catch (err: unknown) {
			console.error("useOrvantaInbox.refresh error", err)
			const message = err instanceof Error ? err.message : String(err)
			setError(message || "Failed to load inbox")
		} finally {
			setLoading(false)
		}
	}, [companyStatus])

	const resolve = useCallback(
		async (id: string, action: "approve" | "reject" | "defer" | "reopen", note?: string): Promise<boolean> => {
			try {
				const res = await OrvantaServiceClient.resolveDecision(
					OrvantaResolveDecisionRequest.create({
						id,
						action,
						note: note || "",
					}),
				)
				if (res.success) {
					await refresh()
					return true
				}
				setError(res.error || "Failed to resolve decision")
				return false
			} catch (err: unknown) {
				console.error("useOrvantaInbox.resolve error", err)
				const message = err instanceof Error ? err.message : String(err)
				setError(message || "Failed to resolve decision")
				return false
			}
		},
		[refresh],
	)

	const request = useCallback(
		async (
			type: string,
			title: string,
			summary: string,
			payload: Record<string, unknown>,
			urgency?: string,
		): Promise<OrvantaDecisionItem | null> => {
			try {
				const item = await OrvantaServiceClient.requestDecision(
					OrvantaRequestDecisionRequest.create({
						type,
						title,
						summary,
						payloadJson: JSON.stringify(payload),
						urgency,
					}),
				)
				await refresh()
				return item
			} catch (err: unknown) {
				console.error("useOrvantaInbox.request error", err)
				const message = err instanceof Error ? err.message : String(err)
				setError(message || "Failed to request decision")
				return null
			}
		},
		[refresh],
	)

	useEffect(() => {
		void refresh()
	}, [refresh])

	return {
		pending,
		deferred,
		history,
		pendingCount,
		loading,
		error,
		refresh,
		resolveDecision: resolve,
		requestDecision: request,
	}
}
