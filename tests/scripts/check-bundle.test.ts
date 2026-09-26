import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const SCRIPT = "scripts/checks/check-bundle.sh"

function run(dir: string, env: Record<string, string> = {}): { ok: boolean; output: string } {
  try {
    const output = execFileSync("bash", [SCRIPT, dir], {
      encoding: "utf8",
      stdio: "pipe",
      env: { ...process.env, ...env },
    })
    return { ok: true, output }
  } catch (error) {
    const shaped = error as { stdout?: string; stderr?: string }
    return { ok: false, output: `${shaped.stdout ?? ""}${shaped.stderr ?? ""}` }
  }
}

function bundle(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "readback-bundle-"))
  mkdirSync(join(dir, "chunks"), { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, "chunks", name), content, "utf8")
  }
  return dir
}

describe("H11: the client bundle is grepped for secrets and server-only markers", () => {
  it("passes a clean bundle and says how many files it scanned", () => {
    const result = run(bundle({ "a.js": "console.log('hello')" }))
    expect(result.ok, result.output).toBe(true)
    expect(result.output).toContain("1 files scanned")
  })

  it("fails when the bundle directory is absent, because a check over nothing proves nothing", () => {
    expect(run(join(tmpdir(), "readback-no-such-bundle")).ok).toBe(false)
  })

  it("fails a bundle holding no JavaScript at all", () => {
    const dir = mkdtempSync(join(tmpdir(), "readback-empty-bundle-"))
    expect(run(dir).ok).toBe(false)
  })

  for (const marker of [
    "process.env.ASSEMBLYAI_API_KEY",
    "readback:intake:",
    "the agent creation response carried no agent id",
  ]) {
    it(`fails on ${marker}`, () => {
      expect(run(bundle({ "leak.js": `const x = "${marker}"` })).ok).toBe(false)
    })
  }

  it("fails on the literal value of a configured key and never prints the value", () => {
    const value = "planted-key-value-0123456789"
    const result = run(bundle({ "leak.js": `const k = "${value}"` }), {
      ASSEMBLYAI_API_KEY: value,
    })
    expect(result.ok).toBe(false)
    expect(result.output).toContain("the value of ASSEMBLYAI_API_KEY")
    expect(result.output).not.toContain(value)
  })
})
