import type { EmptyRequest } from "@shared/proto/cline/common"
import { StringRequest } from "@shared/proto/cline/common"
import type { OrvantaAgentProfile, OrvantaCompanyResponse } from "@shared/proto/cline/orvanta"
import { useEffect, useState } from "react"
import { OrvantaServiceClient } from "@/services/grpc-client"

const emptyRequest = {} as EmptyRequest

const emptyCompany: OrvantaCompanyResponse = {
	status: "missing",
	errors: [],
	id: "",
	name: "",
	purpose: "",
	teamName: "",
	agents: [],
}

export function useOrvantaCompany() {
	const [company, setCompany] = useState<OrvantaCompanyResponse>(emptyCompany)
	const [loading, setLoading] = useState(true)
	const [creating, setCreating] = useState(false)
	const [createError, setCreateError] = useState<string | undefined>()

	useEffect(() => {
		let cancelled = false

		OrvantaServiceClient.getCompany(emptyRequest)
			.then((resp) => {
				if (!cancelled && resp) {
					setCompany(resp)
					setLoading(false)
				}
			})
			.catch((err) => {
				console.error("orvanta.getCompany", err)
				if (!cancelled) {
					const message = err instanceof Error ? err.message : String(err)
					setCompany({
						...emptyCompany,
						status: "broken",
						errors: [message || "Không tải được công ty"],
					})
					setLoading(false)
				}
			})

		const unsubscribe = OrvantaServiceClient.subscribeCompany(emptyRequest, {
			onResponse: (response) => {
				if (!cancelled) {
					setCompany(response)
					setLoading(false)
				}
			},
			onError: (error) => {
				console.error("orvanta.subscribeCompany", error)
				if (!cancelled) {
					setLoading(false)
				}
			},
			onComplete: () => {
				if (!cancelled) {
					setLoading(false)
				}
			},
		})

		return () => {
			cancelled = true
			unsubscribe()
		}
	}, [])
	// Fallback poll (1s) when any agent is running to ensure UI never gets stuck
	useEffect(() => {
		const hasRunning = (company.agents ?? []).some((a) => a.status === "running")
		if (!hasRunning) return
		const interval = setInterval(() => {
			void refresh()
		}, 1000)
		return () => clearInterval(interval)
	}, [company.agents])

	const createCompany = async (name: string, purpose: string) => {
		setCreating(true)
		setCreateError(undefined)
		try {
			const response = await OrvantaServiceClient.createCompany({
				name: name.trim(),
				purpose: purpose.trim(),
			})
			if (response.status === "ready") {
				setCompany(response)
			} else {
				setCreateError(response.errors[0] ?? "Không lập được công ty")
			}
			return response
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			setCreateError(message)
			return undefined
		} finally {
			setCreating(false)
		}
	}

	const refresh = async () => {
		try {
			const resp = await OrvantaServiceClient.getCompany(emptyRequest)
			if (resp) {
				setCompany(resp)
			}
		} catch (err) {
			console.error("orvanta.refresh", err)
		}
	}

	const saveAgentProfile = async (profile: OrvantaAgentProfile): Promise<boolean> => {
		try {
			await OrvantaServiceClient.upsertAgentProfile(profile)
			await refresh()
			return true
		} catch (err) {
			console.error("orvanta.saveAgentProfile error", err)
			return false
		}
	}

	const deleteAgentProfile = async (agentId: string): Promise<boolean> => {
		try {
			await OrvantaServiceClient.deleteAgentProfile(StringRequest.create({ value: agentId }))
			await refresh()
			return true
		} catch (err) {
			console.error("orvanta.deleteAgentProfile error", err)
			return false
		}
	}

	return {
		company,
		loading,
		creating,
		createError,
		createCompany,
		refresh,
		saveAgentProfile,
		deleteAgentProfile,
	}
}
