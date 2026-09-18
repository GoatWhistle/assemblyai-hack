import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

type Sibling = {
  readonly file: string
  readonly content: string
}

type Control = {
  readonly ratchet: string
  readonly script: string
  readonly runner: "bash" | "node"
  readonly file: string
  readonly content: string
  readonly sibling?: Sibling
  readonly directory?: string
  readonly why: string
}

const CYRILLIC_WORD = String.fromCharCode(1087, 1088, 1080, 1074, 1077, 1090)

const CONTROLS: readonly Control[] = [
  {
    ratchet: "tokens",
    script: "scripts/checks/tokens.mjs",
    runner: "node",
    file: "src/features/__control__/styles.module.css",
    content: ".control {\n  color: #ff00ff;\n}\n",
    why: "a raw hex literal outside the token files must fail",
  },
  {
    ratchet: "server-only",
    script: "scripts/checks/server-only.mjs",
    runner: "node",
    file: "src/features/__control__/leak.ts",
    content: 'import { loadCatalog } from "@/catalog"\n\nexport const control = loadCatalog\n',
    why: "a client file importing a value from a server-only package must fail",
  },
  {
    ratchet: "ascii",
    script: "scripts/checks/ascii.sh",
    runner: "bash",
    file: "src/features/__control__/language.ts",
    content: `export const control = "${CYRILLIC_WORD}"\n`,
    why: "non-Latin text in code must fail, and this check once caught exactly this in a test of our own",
  },
  {
    ratchet: "package-subject",
    script: "scripts/checks/package-subject.sh",
    runner: "bash",
    file: "src/features/utils/anything.ts",
    content: "export const control = 1\n",
    directory: "src/features/utils",
    why: "a directory named utils must fail, because shared code is cut by subject and never by the fact of reuse",
  },
  {
    ratchet: "file-length",
    script: "scripts/checks/file-length.sh",
    runner: "bash",
    file: "src/features/__control__/long.ts",
    content: "export const filler = 1\n".repeat(300),
    why: "a file past the 250-line limit must fail rather than quietly raise the baseline",
  },
  {
    ratchet: "token-refs",
    script: "scripts/checks/token-refs.mjs",
    runner: "node",
    file: "src/features/__control__/styles.module.css",
    content: ".control {\n  color: var(--token-that-does-not-exist);\n}\n",
    why: "a var() resolving to nothing renders as an unstyled element, which reads as a design choice",
  },
  {
    ratchet: "colocation",
    script: "scripts/checks/colocation.mjs",
    runner: "node",
    file: "src/features/__control__/orphan.module.css",
    content: ".control {\n  display: block;\n}\n",
    why: "a stylesheet with no component beside it must fail",
  },
  {
    ratchet: "css-dead",
    script: "scripts/checks/css-dead.mjs",
    runner: "node",
    file: "src/features/__control__/styles.module.css",
    content: ".neverRead {\n  display: block;\n}\n",
    sibling: {
      file: "src/features/__control__/index.tsx",
      content:
        "export function Control() {\n  return <p>this component reads no class</p>\n}\n",
    },
    directory: "src/features/__control__",
    why: "a class nobody reads is either a rename nobody finished or a feature nobody wired",
  },
  {
    ratchet: "confidence-language",
    script: "scripts/checks/confidence-language.mjs",
    runner: "node",
    file: "src/features/__control__/index.tsx",
    content: "export function Control() {\n  return <p>Confidence score: 92% quality</p>\n}\n",
    why: "confidence rendered as a quality score invites exactly the trust this product exists to withhold",
  },
  {
    ratchet: "touch-targets",
    script: "scripts/checks/touch-targets.mjs",
    runner: "node",
    file: "src/features/__control__/styles.module.css",
    content: ".control {\n  cursor: pointer;\n  min-height: 1rem;\n}\n",
    why: "a control too small to hit with a finger must fail, and this rule survived two audits unenforced",
  },
  {
    ratchet: "secrets",
    script: "scripts/checks/secrets.sh",
    runner: "bash",
    file: "src/features/__control__/leak-key.ts",
    content: "export const control = process.env.ASSEMBLYAI_API_KEY\n",
    why: "the key outside app/api must fail, and this check once passed a file under any directory named api at any depth",
  },
]

const created: string[] = []

function run(control: Control): { ok: boolean; output: string } {
  const command = control.runner === "bash" ? "bash" : "node"
  try {
    const output = execFileSync(command, [control.script], { encoding: "utf8", stdio: "pipe" })
    return { ok: true, output }
  } catch (error) {
    const shaped = error as { stdout?: string; stderr?: string }
    return { ok: false, output: `${shaped.stdout ?? ""}${shaped.stderr ?? ""}` }
  }
}

afterEach(() => {
  while (created.length > 0) {
    const path = created.pop()
    if (path !== undefined && existsSync(path)) {
      rmSync(path)
    }
  }
})

describe("a guard never seen failing is indistinguishable from no guard", () => {
  for (const control of CONTROLS) {
    it(
      `fails the ${control.ratchet} ratchet on a deliberate violation`,
      { timeout: 60000 },
      () => {
        const before = run(control)
        expect(
          before.ok,
          `${control.script} must pass on a clean tree before the control means anything: ${before.output}`,
        ).toBe(true)

        mkdirSync(dirname(control.file), { recursive: true })
        writeFileSync(control.file, control.content, "utf8")
        created.push(control.file)
        if (control.sibling !== undefined) {
          writeFileSync(control.sibling.file, control.sibling.content, "utf8")
          created.push(control.sibling.file)
        }

        const during = run(control)
        while (created.length > 0) {
          const planted = created.pop()
          if (planted !== undefined && existsSync(planted)) {
            rmSync(planted)
          }
        }
        if (control.directory !== undefined && existsSync(control.directory)) {
          rmSync(control.directory, { recursive: true })
        }

        expect(
          during.ok,
          `${control.script} passed while ${control.why}. The ratchet is decoration, not a check.`,
        ).toBe(false)

        const after = run(control)
        expect(
          after.ok,
          `${control.script} did not return to passing after the control file was removed, so it left the tree dirty: ${after.output}`,
        ).toBe(true)
      },
    )
  }

  it("names every ratchet in the Makefile that has no positive control here", () => {
    const makefile = readFileSync("Makefile", "utf8")
    const steps = /^VERIFY_STEPS := ([\s\S]*?)\n\n/m.exec(makefile)
    expect(steps).not.toBeNull()
    const declared = (steps?.[1] ?? "")
      .replace(/\\/g, " ")
      .split(/\s+/)
      .filter((step) => step.length > 0)
    const covered = new Set(CONTROLS.map((control) => control.ratchet))
    const uncovered = declared.filter(
      (step) =>
        !covered.has(step) &&
        ![
          "lint",
          "typecheck",
          "test",
          "gate-mutation",
          "gate-invariant",
          "package-size",
          "import-cycles",
          "contrast",
          "keyterms-purity",
          "heldout-seal",
          "smoke",
          "latency-budget",
        ].includes(step),
    )
    expect(
      uncovered,
      `these ratchets have no positive control and could be passing vacuously: ${uncovered.join(", ")}. The exclusions are deliberate and each has a reason: lint, typecheck and test fail loudly by themselves; gate-mutation and gate-invariant carry their own adversarial proof; package-size and import-cycles cannot be violated by a single planted file; contrast, keyterms-purity, heldout-seal, smoke and latency-budget have their own dedicated test files, because none of them can be broken by planting one file — they read recorded data rather than the tree. Anything else appearing here is decoration.`,
    ).toEqual([])
  })
})
