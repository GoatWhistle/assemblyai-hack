import { type PaidRun, type RunRecord, ratePerHourFor } from "@/domain"

const SECONDS_TOLERANCE = 0.001

const USD_TOLERANCE = 0.0001

export type RegistryReconciliation = {
  readonly registryRuns: number
  readonly matched: number
  readonly missingFromLedger: readonly string[]
  readonly disagreements: readonly string[]
}

function ledgerEntryFor(record: RunRecord, ledger: readonly PaidRun[]): PaidRun | undefined {
  return ledger.find((run) => run.command === record.command && run.at === record.recordedAt)
}

function ledgerCost(run: PaidRun): number {
  return Math.round((run.openSeconds / 3600) * ratePerHourFor(run.sockets) * 10000) / 10000
}

export function reconcileRegistry(
  records: readonly RunRecord[],
  ledger: readonly PaidRun[],
): RegistryReconciliation {
  const missingFromLedger: string[] = []
  const disagreements: string[] = []
  for (const record of records) {
    const entry = ledgerEntryFor(record, ledger)
    if (entry === undefined) {
      missingFromLedger.push(record.runId)
      continue
    }
    if (Math.abs(entry.openSeconds - record.socketSeconds) > SECONDS_TOLERANCE) {
      disagreements.push(
        `${record.runId}: the registry records ${record.socketSeconds} s of socket time and the ledger ${entry.openSeconds} s`,
      )
    }
    if (Math.abs(ledgerCost(entry) - record.costUsd) > USD_TOLERANCE) {
      disagreements.push(
        `${record.runId}: the registry prices it at USD ${record.costUsd} and the ledger at USD ${ledgerCost(entry)}`,
      )
    }
  }
  return {
    registryRuns: records.length,
    matched: records.length - missingFromLedger.length,
    missingFromLedger,
    disagreements,
  }
}

export function renderReconciliation(result: RegistryReconciliation): string {
  const lines = [
    `live run registry: ${result.registryRuns} runs, ${result.matched} found in the ledger`,
    ...result.missingFromLedger.map(
      (runId) =>
        `  missing from the ledger: ${runId}; the spend above leaves out a run that happened`,
    ),
    ...result.disagreements.map((line) => `  disagreement: ${line}`),
  ]
  return `${lines.join("\n")}\n`
}

export function reconciles(result: RegistryReconciliation): boolean {
  return result.missingFromLedger.length === 0 && result.disagreements.length === 0
}
