import type { EmptyRequest } from "@shared/proto/cline/common"
import type { OrvantaWarRoomSnapshot } from "@shared/proto/cline/orvanta"
import { useEffect, useRef, useState } from "react"
import { OrvantaServiceClient } from "@/services/grpc-client"

const emptyRequest = {} as EmptyRequest

export type WarRoomFilter = "all" | "running" | "idle" | "failed"

export function useWarRoom(active: boolean) {
	const [snapshot, setSnapshot] = useState<OrvantaWarRoomSnapshot | null>(null)
	const [paused, setPaused] = useState(false)
	const [filter, setFilter] = useState<WarRoomFilter>("all")
	const bufferRef = useRef<OrvantaWarRoomSnapshot | null>(null)
	const pausedRef = useRef(paused)
	pausedRef.current = paused

	useEffect(() => {
		if (!active) return
		let cancelled = false

		const unsubscribe = OrvantaServiceClient.subscribeWarRoom(emptyRequest, {
			onResponse: (resp) => {
				if (cancelled) return
				if (pausedRef.current) {
					// Keep last snapshot in buffer so when we resume it's not blank
					bufferRef.current = resp
					return
				}
				setSnapshot(resp)
				bufferRef.current = null
			},
			onError: (err) => {
				console.error("useWarRoom subscribeWarRoom error", err)
			},
			onComplete: () => {
				// stream ended
			},
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [active])

	// When unpausing, flush the buffered snapshot immediately
	const handleResume = () => {
		if (bufferRef.current) {
			setSnapshot(bufferRef.current)
			bufferRef.current = null
		}
		setPaused(false)
	}

	return {
		snapshot,
		paused,
		filter,
		setPaused: (value: boolean) => {
			if (!value) {
				handleResume()
			} else {
				setPaused(true)
			}
		},
		setFilter,
	}
}
