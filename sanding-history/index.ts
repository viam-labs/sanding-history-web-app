import { spawnSync } from 'node:child_process'
import { parseArgs, resolveConfig, resolveLogOptions } from './args'
import { renderLog } from './format'
import {
  connect,
  fetchDiagnosesForPasses,
  fetchNotesForPasses,
  fetchPassById,
  fetchPasses,
  resolveOrgId,
} from './viam'
import {
  computeDayAggregates,
  groupPassesByDay,
} from '../src/lib/dayAggregates'

const HELP = `sanding-history — inspect sanding-run history for one machine.

Usage:
  sanding-history log [options]              List run history, newest first (plain text, paged).
  sanding-history detail <run-id> [options]  Print all metadata for one run as JSON.

Auth/config (flags override environment):
  --host         machine host name.LOCATION.viam.cloud   [$VIAM_HOST]
  --api-key-id   Viam API key id                          [$VIAM_API_KEY_ID]
  --api-key      Viam API key secret                      [$VIAM_API_KEY]
  --org-id       organization id (default: first org)     [$VIAM_ORG_ID]
  --machine-id   machine id to query                      [$VIAM_MACHINE_ID]

log options:
  --since <dur>  time window, e.g. 7d/24h/30m or a date (default 7d)
  --all          ignore --since and list all history
  --limit <n>    show at most n runs
  --no-pager     print plain instead of paging through $PAGER

  --help         show this help
`

/** Pages text through $PAGER (default less, LESS=FRX) when on a TTY. */
function output(text: string, usePager: boolean): void {
  if (!usePager || !process.stdout.isTTY) {
    process.stdout.write(text + '\n')
    return
  }

  const pager = process.env.PAGER || 'less'
  const env = { ...process.env }
  if (pager === 'less' && env.LESS === undefined) {
    env.LESS = 'FRX'
  }

  const result = spawnSync(pager, { input: text + '\n', stdio: ['pipe', 'inherit', 'inherit'], env, shell: true })
  if (result.error) {
    process.stdout.write(text + '\n')
  }
}

async function runLog(flags: ReturnType<typeof parseArgs>['flags']): Promise<void> {
  const config = resolveConfig(flags, process.env)
  const options = resolveLogOptions(flags)

  const client = await connect(config)
  const orgId = await resolveOrgId(client, config)

  const passes = await fetchPasses(client, config, orgId, {
    since: options.since,
    limit: options.limit,
  })

  const diagnoses = await fetchDiagnosesForPasses(
    client,
    config.machineId,
    passes.map((p) => p.pass_id).filter(Boolean)
  )

  const grouped = groupPassesByDay(passes)
  const { dayAggregates, incompletePassIds } = computeDayAggregates(
    grouped,
    diagnoses
  )

  output(renderLog(grouped, dayAggregates, incompletePassIds), options.pager)
}

async function runDetail(
  runId: string,
  flags: ReturnType<typeof parseArgs>['flags']
): Promise<void> {
  const config = resolveConfig(flags, process.env)
  const client = await connect(config)
  const orgId = await resolveOrgId(client, config)

  const pass = await fetchPassById(client, config, orgId, runId)
  if (!pass) {
    throw new Error(`Run not found: ${runId}`)
  }

  const [diagnoses, notes] = await Promise.all([
    fetchDiagnosesForPasses(client, config.machineId, [runId]),
    fetchNotesForPasses(client, config.machineId, [runId]),
  ])

  const record = {
    ...pass,
    diagnosis: diagnoses.get(runId) ?? null,
    notes: notes.get(runId) ?? [],
  }

  process.stdout.write(JSON.stringify(record, null, 2) + '\n')
}

async function main(): Promise<void> {
  const { positionals, flags } = parseArgs(process.argv.slice(2))
  const command = positionals[0]

  if (flags['help'] || command === undefined || command === 'help') {
    process.stdout.write(HELP)
    return
  }

  switch (command) {
    case 'log':
      await runLog(flags)
      break
    case 'detail': {
      const runId = positionals[1]
      if (!runId) {
        throw new Error('detail requires a run id: sanding-history detail <run-id>')
      }
      await runDetail(runId, flags)
      break
    }
    default:
      throw new Error(`Unknown command: ${command}. Try "sanding-history --help".`)
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
