import { spawnSync } from "node:child_process"
import { mkdirSync } from "node:fs"
import { resolve } from "node:path"
import { BREAK, CALLER_LINES, type CallerLineId, lineFile } from "./lines"

function quoted(text: string): string {
  return `'${text.replace(/'/g, "''")}'`
}

function promptFor(text: string): string {
  return text
    .split(BREAK)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `$p.AppendText(${quoted(part)})`)
    .join("; $p.AppendBreak([TimeSpan]::FromMilliseconds(700)); ")
}

export function sapiScript(id: CallerLineId): string {
  return [
    "Add-Type -AssemblyName System.Speech",
    "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
    "$f = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)",
    `$s.SetOutputToWaveFile(${quoted(resolve(lineFile(id)))}, $f)`,
    "$p = New-Object System.Speech.Synthesis.PromptBuilder",
    promptFor(CALLER_LINES[id]),
    "$s.Speak($p)",
    "$s.Dispose()",
  ].join("; ")
}

function main(): void {
  mkdirSync(resolve("tests/live/lines"), { recursive: true })
  for (const id of Object.keys(CALLER_LINES) as CallerLineId[]) {
    const run = spawnSync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", sapiScript(id)],
      {
        encoding: "utf8",
      },
    )
    if (run.status !== 0) {
      process.stderr.write(`${id}: ${run.stderr}
`)
      process.exit(1)
    }
    process.stdout.write(`written ${lineFile(id)}
`)
  }
}

if (process.argv[1]?.includes("generate-lines")) {
  main()
}
