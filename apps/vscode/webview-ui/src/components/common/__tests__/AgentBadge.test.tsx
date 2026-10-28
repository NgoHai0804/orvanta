import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AgentBadge, getAgentBadgeMeta } from "../AgentBadge"

describe("AgentBadge", () => {
	it("renders Lead / Coordinator visual identity with ⭐ icon", () => {
		render(<AgentBadge agentId="coordinator" displayName="Lead Bot" role="lead" />)

		const badge = screen.getByTestId("agent-badge")
		expect(badge).toBeInTheDocument()
		expect(badge).toHaveTextContent("⭐")
		expect(badge).toHaveTextContent("Lead")
		expect(badge).toHaveTextContent("Lead Bot")
		expect(badge).toHaveAttribute("data-agent-id", "coordinator")
		expect(badge).toHaveAttribute("data-role", "lead")
	})

	it("renders Implementer / Coder visual identity with 💻 icon and cyan style", () => {
		render(<AgentBadge agentId="implementer" displayName="Dave" role="implementer" />)

		const badge = screen.getByTestId("agent-badge")
		expect(badge).toHaveTextContent("💻")
		expect(badge).toHaveTextContent("Implementer")
		expect(badge).toHaveTextContent("Dave")
	})

	it("renders Reviewer visual identity with 🔍 icon", () => {
		render(<AgentBadge agentId="reviewer" displayName="Auditor" role="reviewer" />)

		const badge = screen.getByTestId("agent-badge")
		expect(badge).toHaveTextContent("🔍")
		expect(badge).toHaveTextContent("Reviewer")
	})

	it("renders Architect visual identity with 📐 icon", () => {
		render(<AgentBadge agentId="architect" displayName="System" role="architect" />)

		const badge = screen.getByTestId("agent-badge")
		expect(badge).toHaveTextContent("📐")
		expect(badge).toHaveTextContent("Architect")
	})

	it("renders Copywriter / Marketer visual identity with 📝 icon", () => {
		render(<AgentBadge agentId="marketer" displayName="Content Pro" role="marketer" />)

		const badge = screen.getByTestId("agent-badge")
		expect(badge).toHaveTextContent("📝")
		expect(badge).toHaveTextContent("Content")
	})

	it("renders Ephemeral / Guest visual identity with ⚡ icon", () => {
		render(<AgentBadge agentId="guest-1" displayName="Scout" role="ephemeral" />)

		const badge = screen.getByTestId("agent-badge")
		expect(badge).toHaveTextContent("⚡")
		expect(badge).toHaveTextContent("Guest")
	})

	it("omits role label when showRole is false", () => {
		render(<AgentBadge agentId="implementer" displayName="Dave" role="implementer" showRole={false} />)

		const badge = screen.getByTestId("agent-badge")
		expect(badge).toHaveTextContent("💻")
		expect(badge).toHaveTextContent("Dave")
		expect(badge).not.toHaveTextContent("Implementer")
	})

	it("getAgentBadgeMeta returns correct role meta for fallback roles", () => {
		const salesMeta = getAgentBadgeMeta("sales", "sales-rep")
		expect(salesMeta.icon).toBe("🎯")
		expect(salesMeta.label).toBe("Sales")

		const customMeta = getAgentBadgeMeta("custom_role", "bot-99")
		expect(customMeta.icon).toBe("🤖")
	})
})
