import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const dir = dirname(fileURLToPath(import.meta.url))
const nodeBarrelImport = /from ["']@cline\/shared["']/

describe("orvanta webview imports", () => {
	for (const file of ["HomeView.tsx", "AgentEditor.tsx", "OrvantaShell.tsx", "useOrvantaCompany.ts", "LibraryDialog.tsx"]) {
		it(`${file} does not import the Node barrel of @cline/shared`, () => {
			const src = readFileSync(join(dir, file), "utf8")
			expect(src).not.toMatch(nodeBarrelImport)
		})
	}
})
