export type Sibling = {
  readonly file: string
  readonly content: string
}

export type Control = {
  readonly ratchet: string
  readonly script: string
  readonly runner: "bash" | "node"
  readonly file: string
  readonly content: string
  readonly variant?: string
  readonly siblings?: readonly Sibling[]
  readonly directory?: string
  readonly why: string
}

const CYRILLIC_WORD = String.fromCharCode(1087, 1088, 1080, 1074, 1077, 1090)

export const CONTROLS: readonly Control[] = [
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
    siblings: [
      {
        file: "src/features/__control__/index.tsx",
        content:
          "export function Control() {\n  return <p>this component reads no class</p>\n}\n",
      },
    ],
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
  {
    ratchet: "file-length",
    variant: "mjs",
    script: "scripts/checks/file-length.sh",
    runner: "bash",
    file: "src/features/__control__/long.mjs",
    content: "export const filler = 1\n".repeat(300),
    why: "a script module past the limit must fail; touch-targets.mjs grew to 256 lines while only ts, tsx and css were counted",
  },
  {
    ratchet: "import-cycles",
    script: "scripts/checks/import-cycles.sh",
    runner: "bash",
    file: "tests/__control__/cycle-a.ts",
    content: 'import { b } from "./cycle-b"\n\nexport const a = b\n',
    siblings: [
      {
        file: "tests/__control__/cycle-b.ts",
        content: 'import { a } from "./cycle-a"\n\nexport const b = a\n',
      },
    ],
    directory: "tests/__control__",
    why: "a cycle through test files over relative imports must fail; the first version walked tests and then skipped every file outside src",
  },
  {
    ratchet: "package-size",
    script: "scripts/checks/package-size.sh",
    runner: "bash",
    file: "scripts/__control__/control-0.ts",
    content: "export const control = 0\n",
    siblings: Array.from({ length: 20 }, (_, index) => ({
      file: `scripts/__control__/control-${index + 1}.ts`,
      content: `export const control = ${index + 1}\n`,
    })),
    directory: "scripts/__control__",
    why: "a scripts directory past twenty sources must fail; scripts/measure reached 21 while scripts were not counted",
  },
]
