import type { EmptyRequest } from "@shared/proto/cline/common"
import type { OrvantaWarRoomSnapshot } from "@shared/proto/cline/orvanta"
import { useCallback, useEffect, useState } from "react"
import { OrvantaServiceClient } from "@/services/grpc-client"

const emptyRequest = {} as EmptyRequest

export type WarRoomFilter = "all" | "running" | "idle" | "failed"

export type WarRoomSyncStatus = "live" | "stale" | "reconnecting"

export function useWarRoom(active: boolean, ceoSessionId?: string) {
	const [snapshot, setSnapshot] = useState<OrvantaWarRoomSnapshot | null>(null)
	const [syncStatus, setSyncStatus] = useState<WarRoomSyncStatus>("stale")
	const [pauseStatus, setPauseStatus] = useState<"none" | "pause_requested" | "paused" | "partial">("none")
	const [needsAttention, setNeedsAttention] = useState<Array<{ agentId: string; reason: string }>>([])
	const [pauseError, setPauseError] = useState<string | undefined>()
	const [filter, setFilter] = useState<WarRoomFilter>("all")

	useEffect(() => {
		if (!active) return
		let cancelled = false
		setSyncStatus("reconnecting")

		const unsubscribe = OrvantaServiceClient.subscribeWarRoom(emptyRequest, {
			onResponse: (resp) => {
				if (cancelled) return
				setSnapshot(resp)
				const next = (resp.syncStatus as WarRoomSyncStatus | undefined) || "live"
				setSyncStatus(next === "stale" || next === "reconnecting" ? next : "live")
			},
			onError: (err) => {
				console.error("useWarRoom subscribeWarRoom error", err)
				if (!cancelled) setSyncStatus("stale")
			},
			onComplete: () => {
				if (!cancelled) setSyncStatus("stale")
			},
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [active])

	useEffect(() => {
		if (!active || !ceoSessionId?.trim()) {
			setPauseStatus("none")
			return
		}
		let cancelled = false
		OrvantaServiceClient.getCeoSessionPause({ sessionId: ceoSessionId })
			.then((resp) => {
				if (cancelled) return
				if (resp.success) {
					setPauseStatus((resp.status as typeof pauseStatus) || "none")
					try {
						const items = JSON.parse(resp.needsAttentionJson || "[]") as Array<{
							agentId: string
							reason: string
						}>
						setNeedsAttention(Array.isArray(items) ? items : [])
					} catch {
						setNeedsAttention([])
					}
				}
			})
			.catch(() => {
				if (!cancelled) {
					setPauseStatus("none")
					setNeedsAttention([])
				}
			})
		return () => {
			cancelled = true
		}
	}, [active, ceoSessionId])

	const requestRuntimePause = useCallback(async () => {
		if (!ceoSessionId?.trim()) {
			setPauseError("Chưa có CEO session để pause")
			return
		}
		setPauseError(undefined)
		const resp = await OrvantaServiceClient.pauseCeoSession({ sessionId: ceoSessionId })
		if (!resp.success) {
			setPauseError(resp.error || "Pause thất bại")
			return
		}
		setPauseStatus((resp.status as typeof pauseStatus) || "pause_requested")
	}, [ceoSessionId])

	const requestRuntimeResume = useCallback(async () => {
		if (!ceoSessionId?.trim()) {
			setPauseError("Chưa có CEO session để resume")
			return
		}
		setPauseError(undefined)
		const resp = await OrvantaServiceClient.resumeCeoSession({ sessionId: ceoSessionId })
		if (!resp.success) {
			setPauseError(resp.error || "Resume thất bại")
			return
		}
		setPauseStatus((resp.status as typeof pauseStatus) || "none")
	}, [ceoSessionId])

	return {
		snapshot,
		syncStatus,
		lastUpdatedAt: snapshot?.lastUpdatedAt,
		/** Durable CEO-session pause status — not a UI-only stream buffer. */
		pauseStatus,
		needsAttention,
		pauseError,
		canPauseRuntime: Boolean(ceoSessionId?.trim()),
		requestRuntimePause,
		requestRuntimeResume,
		filter,
		setFilter,
		/** @deprecated Use pauseStatus; kept for WarRoomView prop compatibility. */
		paused: pauseStatus === "paused" || pauseStatus === "pause_requested",
		setPaused: (_next: boolean) => {
			// No-op: UI-only pause buffer removed. Call requestRuntimePause instead.
		},
	}
}
