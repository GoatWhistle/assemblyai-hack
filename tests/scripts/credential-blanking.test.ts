import { execSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { PAID_CREDENTIAL_VARS } from "../setup"

const PROBE_DIR = "tests/scripts/__credential_probe__"
const PROBE_FILE = `${PROBE_DIR}/leaked-key.test.ts`

const PROBE_SOURCE = `import { describe, expect, it } from "vitest"
const NAMES = ${JSON.stringify([...PAID_CREDENTIAL_VARS])}
describe("subprocess probe", () => {
  it("must never observe a real-looking credential from the parent shell", () => {
    for (const name of NAMES) {
      expect(process.env[name], name).toBeUndefined()
    }
  })
})
`

function runProbeWithLeakedCredentials(): { ok: boolean; output: string } {
  const leaked: Record<string, string> = {}
  for (const name of PAID_CREDENTIAL_VARS) {
    leaked[name] = `leaked-${name}-that-must-not-survive`
  }
  try {
    const output = execSync(`npx vitest run ${PROBE_FILE}`, {
      encoding: "utf8",
      stdio: "pipe",
      env: { ...process.env, ...leaked },
    })
    return { ok: true, output }
  } catch (error) {
    const shaped = error as { stdout?: string; stderr?: string }
    return { ok: false, output: `${shaped.stdout ?? ""}${shaped.stderr ?? ""}` }
  }
}

describe("tests/setup.ts blanks every paid credential before any test module runs", () => {
  it(
    "a subprocess that inherits real-looking credentials from the shell still sees every one of them as undefined inside the test",
    { timeout: 120000 },
    () => {
      mkdirSync(PROBE_DIR, { recursive: true })
      writeFileSync(PROBE_FILE, PROBE_SOURCE, "utf8")
      try {
        const result = runProbeWithLeakedCredentials()
        expect(
          result.ok,
          `a test module observed a paid credential inherited from the shell, which means tests/setup.ts is not blanking it before import: ${result.output}`,
        ).toBe(true)
      } finally {
        if (existsSync(PROBE_DIR)) {
          rmSync(PROBE_DIR, { recursive: true })
        }
      }
    },
  )

  it("covers the AssemblyAI key, which is the credential that bills per socket-second", () => {
    expect(
      PAID_CREDENTIAL_VARS,
      "the streaming and agent sockets are the expensive ones at 5.10 per hour combined, so this name must never be dropped from the list",
    ).toContain("ASSEMBLYAI_API_KEY")
  })

  it("covers the blob token too, because a test that reached real storage would spend egress and could overwrite a recorded session", () => {
    expect(
      PAID_CREDENTIAL_VARS,
      "blob storage is the other paid resource; leaving it readable from tests was the actual gap found by running a probe rather than by reading the setup file",
    ).toContain("BLOB_READ_WRITE_TOKEN")
  })

  it("blanks the name rather than setting it to an empty string, so a presence check cannot pass on a blank", () => {
    for (const name of PAID_CREDENTIAL_VARS) {
      expect(
        process.env[name],
        `${name} must be absent, not empty: code that branches on the variable being defined would take the live path with an empty value`,
      ).toBeUndefined()
    }
  })

  it("names the exact variables the blanking must cover, so a rename of the guard is visible in a diff", () => {
    const setupSource = readFileSync("tests/setup.ts", "utf8")
    for (const name of PAID_CREDENTIAL_VARS) {
      expect(
        setupSource,
        `tests/setup.ts must delete process.env.${name} before any beforeAll or test body runs`,
      ).toContain(name)
    }
  })

  it("deletes at module scope rather than inside a hook, which is what makes it run before test modules are imported", () => {
    const setupSource = readFileSync("tests/setup.ts", "utf8")
    const deleteIndex = setupSource.indexOf("delete process.env")
    const beforeAllIndex = setupSource.indexOf("beforeAll(")
    expect(deleteIndex, "the deletion must exist at all").toBeGreaterThan(-1)
    expect(
      deleteIndex,
      "a deletion placed inside beforeAll runs after the module graph is imported, so a module reading the key at import time would already have captured it",
    ).toBeLessThan(beforeAllIndex)
  })
})
