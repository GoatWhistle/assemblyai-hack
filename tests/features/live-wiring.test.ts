import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const PRODUCT_ROOTS = ["src/**/*.ts", "src/**/*.tsx", "app/**/*.ts", "app/**/*.tsx"]

const TRANSIENT = /\/(?:__control__|invariant-probe|utils)\//

async function matching(pattern: string): Promise<readonly string[]> {
  const found: string[] = []
  try {
    for await (const entry of glob(pattern)) {
      const file = entry.replaceAll("\\", "/")
      if (!TRANSIENT.test(file)) {
        found.push(file)
      }
    }
  } catch {
    return found
  }
  return found
}

async function productSources(): Promise<readonly string[]> {
  const files: string[] = []
  for (const pattern of PRODUCT_ROOTS) {
    files.push(...(await matching(pattern)))
  }
  return files
}

function readIfPresent(file: string): string | null {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return null
  }
}

async function callersOf(symbol: string, defining: string): Promise<readonly string[]> {
  const files = await productSources()
  expect(files.length, "no product sources were scanned at all").toBeGreaterThan(50)
  const pattern = new RegExp(`\\b${symbol}\\b`)
  const callers: string[] = []
  for (const file of files) {
    if (file === defining) {
      continue
    }
    const source = readIfPresent(file)
    if (source === null) {
      continue
    }
    if (pattern.test(source)) {
      callers.push(file)
    }
  }
  return callers
}

describe("the function that names the product is reachable from the product", () => {
  it("has a caller outside its own module and outside the tests", async () => {
    const callers = await callersOf(
      "reduceReadBack",
      "src/features/read-back/read-back-machine.ts",
    )
    expect(
      callers,
      "reduceReadBack is covered by tests and called by nothing that ships; the product is named Readback and the read-back would be dead at runtime",
    ).not.toHaveLength(0)
  })

  it("reaches a rendered screen, not merely another module", async () => {
    const callers = await callersOf("useReadBack", "src/features/read-back/use-read-back.ts")
    expect(
      callers.some((file) => file.startsWith("app/")),
      "a hook nothing renders is the same defect one indirection further away",
    ).toBe(true)
  })

  it("does not pin the read-back state to a constant", async () => {
    const client = readFileSync("app/(pages)/intake-client.tsx", "utf8")
    expect(
      /state:\s*ReadBackState\.Idle/.test(client),
      "a read-back frozen at Idle renders an empty panel forever, which is how this went unnoticed",
    ).toBe(false)
  })
})

describe("the two socket controls have callers in the product, not only in tests", () => {
  it("calls forceEndpoint from something that ships", async () => {
    const callers = await callersOf("forceEndpoint", "src/realtime/stt-client.ts")
    expect(
      callers,
      "ForceEndpoint existed and ran nowhere for a week; a method with no product caller is a capability the demo cannot show",
    ).not.toHaveLength(0)
  })

  it("calls updateConfiguration from something that ships", async () => {
    const callers = await callersOf("updateConfiguration", "src/realtime/stt-client.ts")
    expect(
      callers,
      "the whole claim is that a nine-digit NPI and a one-word confirmation need different patience; unsent, the presets are a table nobody reads",
    ).not.toHaveLength(0)
  })

  it("reaches a rendered screen from the patience table, not merely another module", async () => {
    const callers = await callersOf("patienceFor", "src/realtime/patience.ts")
    expect(
      callers.some((file) => file.startsWith("src/features/")),
      "a preset table consumed only by its own tests is the same defect one indirection away",
    ).toBe(true)
  })

  it("hands the intake client a solicited field rather than a constant", async () => {
    const client = readFileSync("app/(pages)/intake-client.tsx", "utf8")
    expect(client).toContain("solicitedField")
    expect(
      /solicited:\s*NOTHING_SOLICITED/.test(client),
      "a solicited field pinned to nothing keeps the socket on one preset forever, which is how this looks wired and is not",
    ).toBe(false)
  })
})

describe("the live order screen renders what the server decided", () => {
  it("does not hold an empty candidate constant", async () => {
    const client = readFileSync("app/(pages)/intake-client.tsx", "utf8")
    expect(/NO_CANDIDATES/.test(client)).toBe(false)
  })

  it("sends every caller turn to the gate and reads the answer back", async () => {
    const client = readFileSync("app/(pages)/intake-client.tsx", "utf8")
    expect(client).toContain("recordTurn")
    expect(
      client,
      "the turn has to feed the read-back too, or a confirmation spoken aloud never reaches the machine",
    ).toContain("readBack.hear")
  })
})

describe("the public refusal counter and the waiting indicator ship, not merely exist", () => {
  it("tallies refusals from something that renders", async () => {
    const callers = await callersOf(
      "tallyRefusals",
      "src/features/gate-ledger/refusal-tally.ts",
    )
    expect(
      callers.some((file) => file.includes("intake-screen")),
      "a public refusal counter is the promised demo; a tally nothing renders shows a judge nothing",
    ).toBe(true)
  })

  it("feeds the counter the decision history rather than the latest decision alone", async () => {
    const client = readFileSync("app/(pages)/intake-client.tsx", "utf8")
    expect(
      client,
      "keying decisions by candidate loses every earlier refusal, so the counter would undercount the gate",
    ).toContain("decisionHistory")
  })

  it("derives who is waiting from something that renders", async () => {
    const callers = await callersOf("waitingOn", "src/features/waiting/waiting-state.ts")
    expect(
      callers.some((file) => file.startsWith("src/features/")),
      "a waiting state nobody renders leaves the caller unable to tell waiting from processing",
    ).toBe(true)
  })

  it("hands the indicator a real in-flight signal rather than a constant", async () => {
    const client = readFileSync("app/(pages)/intake-client.tsx", "utf8")
    expect(client).toContain("turnInFlight")
    expect(
      /turnInFlight=\{false\}/.test(client),
      "an in-flight flag pinned to false makes the system half of the indicator unreachable",
    ).toBe(false)
  })
})

describe("the rejected-values table and the automatic degradation ship, not merely exist", () => {
  it("derives its rows from something that renders", async () => {
    const callers = await callersOf("rejectedRows", "src/features/gate-ledger/rejected-rows.ts")
    expect(
      callers.some((file) => file.includes("rejected-table")),
      "a filter over rejected rows nobody renders shows a judge nothing",
    ).toBe(true)
  })

  it("reaches the live order screen, not only its own tests", async () => {
    const callers = await callersOf(
      "RejectedTable",
      "src/features/gate-ledger/rejected-table/index.tsx",
    )
    expect(
      callers.some((file) => file.includes("intake-screen")),
      "the table exists next to the refusal counter or it is dead weight one indirection away",
    ).toBe(true)
  })

  it("reaches the live order screen from AutoDegrade, not only its own tests", async () => {
    const callers = await callersOf("AutoDegrade", "src/features/intake/auto-degrade/index.tsx")
    expect(
      callers.some((file) => file.includes("intake-screen")),
      "a denied or absent microphone must not dead-end; a component nothing renders is the same dead end one indirection away",
    ).toBe(true)
  })
})
