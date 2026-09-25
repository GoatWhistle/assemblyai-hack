import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { CONTROLS, type Control } from "./ratchet-controls"

const created: string[] = []

const PLANT_ROOTS: readonly string[] = ["src/features", "src", "app", "tests", "scripts"]

function removeEmptyPlantDirectories(file: string): void {
  let directory = dirname(file)
  while (!PLANT_ROOTS.includes(directory) && directory !== "." && existsSync(directory)) {
    if (readdirSync(directory).length > 0) {
      return
    }
    rmdirSync(directory)
    directory = dirname(directory)
  }
}

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

function plant(control: Control): void {
  mkdirSync(dirname(control.file), { recursive: true })
  for (const entry of [control, ...(control.siblings ?? [])]) {
    writeFileSync(entry.file, entry.content, "utf8")
    created.push(entry.file)
  }
}

function unplant(control: Control): void {
  while (created.length > 0) {
    const planted = created.pop()
    if (planted !== undefined && existsSync(planted)) {
      rmSync(planted)
    }
  }
  if (control.directory !== undefined && existsSync(control.directory)) {
    rmSync(control.directory, { recursive: true })
  }
  removeEmptyPlantDirectories(control.file)
}

function titleOf(control: Control): string {
  const variant = control.variant === undefined ? "" : ` (${control.variant})`
  return `fails the ${control.ratchet} ratchet on a deliberate violation${variant}`
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
    it(titleOf(control), { timeout: 60000 }, () => {
      const before = run(control)
      expect(
        before.ok,
        `${control.script} must pass on a clean tree before the control means anything: ${before.output}`,
      ).toBe(true)

      plant(control)
      const during = run(control)
      unplant(control)
      expect(
        existsSync(dirname(control.file)),
        `${dirname(control.file)} was left behind after the control, empty; a leftover directory is how src/features/__control__ survived an interrupted run`,
      ).toBe(false)

      expect(
        during.ok,
        `${control.script} passed while ${control.why}. The ratchet is decoration, not a check.`,
      ).toBe(false)

      const after = run(control)
      expect(
        after.ok,
        `${control.script} did not return to passing after the control file was removed, so it left the tree dirty: ${after.output}`,
      ).toBe(true)
    })
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
          "contrast",
          "keyterms-purity",
          "heldout-seal",
          "smoke",
          "latency-budget",
        ].includes(step),
    )
    expect(
      uncovered,
      `these ratchets have no positive control and could be passing vacuously: ${uncovered.join(", ")}. The exclusions are deliberate and each has a reason: lint, typecheck and test fail loudly by themselves; gate-mutation and gate-invariant carry their own adversarial proof; contrast, keyterms-purity, heldout-seal, smoke and latency-budget have their own dedicated test files, because none of them can be broken by planting one file — they read recorded data rather than the tree. Anything else appearing here is decoration.`,
    ).toEqual([])
  })
})
