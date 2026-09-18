import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

const ROOT = process.cwd()
const SCRIPT = "scripts/checks/gate-invariant.sh"
const PROBE_DIR = join(ROOT, "src", "features", "invariant-probe")

function runCheck(): { code: number; output: string } {
  try {
    const output = execFileSync("bash", [SCRIPT], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
    return { code: 0, output }
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string }
    return {
      code: failure.status ?? 1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    }
  }
}

const BRAND = "ConfirmedValue"

function plantProbe(source: string): void {
  mkdirSync(PROBE_DIR, { recursive: true })
  writeFileSync(join(PROBE_DIR, "probe.ts"), source, "utf8")
}

afterEach(() => {
  rmSync(PROBE_DIR, { recursive: true, force: true })
})

describe("the gate invariant check cannot be walked past", () => {
  it("passes on the tree as it stands", () => {
    const { code, output } = runCheck()
    expect(output).toContain("constructed once, inside the gate")
    expect(code).toBe(0)
  })

  it("catches the documented forgery, an as-cast outside the gate", () => {
    plantProbe(
      `import type { ${BRAND} } from "@/domain"\nexport const forged = {} as ${BRAND}\n`,
    )
    const { code, output } = runCheck()
    expect(code).not.toBe(0)
    expect(output).toContain("constructed outside the gate")
  })

  it("catches an angle-bracket cast, which the first version of this check did not", () => {
    plantProbe(`import type { ${BRAND} } from "@/domain"\nexport const forged = <${BRAND}>{}\n`)
    const { code, output } = runCheck()
    expect(code).not.toBe(0)
    expect(output).toContain("constructed outside the gate")
  })

  it("catches a type-checker suppression in product code", () => {
    plantProbe("// @ts-expect-error\nexport const forged: number = 'not a number'\n")
    const { code, output } = runCheck()
    expect(code).not.toBe(0)
    expect(output).toContain("suppression")
  })

  it("catches setField called from anywhere but the domain and the intake store", () => {
    plantProbe(
      'import { emptyOrder, setField } from "@/domain"\n' +
        "export const written = (value: never) =>\n" +
        '  setField(emptyOrder({ orderId: "o", sessionId: "s" }), value)\n',
    )
    const { code, output } = runCheck()
    expect(code).not.toBe(0)
    expect(output).toContain("setField")
  })

  it("catches a double assertion in product code", () => {
    plantProbe("export const forged = ({} as unknown as number) + 1\n")
    const { code, output } = runCheck()
    expect(code).not.toBe(0)
    expect(output).toContain("double assertion")
  })
})
