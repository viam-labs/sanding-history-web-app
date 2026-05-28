// Pure argument / configuration parsing for the sanding-history CLI.
// Kept free of SDK and I/O so it can be unit tested directly.

export const VALUE_FLAGS = [
  'host',
  'api-key-id',
  'api-key',
  'org-id',
  'robot-id',
  'since',
  'limit',
] as const

export const BOOLEAN_FLAGS = ['all', 'no-pager', 'help'] as const

export type ValueFlag = (typeof VALUE_FLAGS)[number]
export type BooleanFlag = (typeof BOOLEAN_FLAGS)[number]

export interface ParsedArgs {
  /** Non-flag tokens, in order. positionals[0] is the command. */
  positionals: string[]
  flags: Partial<Record<ValueFlag, string>> & Partial<Record<BooleanFlag, true>>
}

/**
 * Parses argv (without the node/script prefix) into positionals and flags.
 *
 * Flags may appear in any position relative to positionals, so `detail <id>`
 * and `detail --host h <id>` and `--host h detail <id>` all parse the same way.
 * Supports `--flag value` and `--flag=value`. Unknown flags throw.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags: ParsedArgs['flags'] = {}

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }

    const body = token.slice(2)
    const eq = body.indexOf('=')
    const name = eq === -1 ? body : body.slice(0, eq)
    const inlineValue = eq === -1 ? undefined : body.slice(eq + 1)

    if ((BOOLEAN_FLAGS as readonly string[]).includes(name)) {
      if (inlineValue !== undefined) {
        throw new Error(`Flag --${name} does not take a value`)
      }
      flags[name as BooleanFlag] = true
      continue
    }

    if ((VALUE_FLAGS as readonly string[]).includes(name)) {
      let value = inlineValue
      if (value === undefined) {
        value = argv[++i]
        if (value === undefined) {
          throw new Error(`Flag --${name} requires a value`)
        }
      }
      flags[name as ValueFlag] = value
      continue
    }

    throw new Error(`Unknown flag: --${name}`)
  }

  return { positionals, flags }
}

export interface ViamConfig {
  host: string
  apiKeyId: string
  apiKey: string
  locationId: string
  robotId: string
  orgId?: string
}

type Env = Record<string, string | undefined>

/**
 * Resolves connection config from flags (highest precedence) then environment.
 * Throws with a clear message listing every missing required value.
 */
export function resolveConfig(
  flags: ParsedArgs['flags'],
  env: Env
): ViamConfig {
  const host = flags['host'] ?? env.VIAM_HOST
  const apiKeyId = flags['api-key-id'] ?? env.VIAM_API_KEY_ID
  const apiKey = flags['api-key'] ?? env.VIAM_API_KEY
  const robotId = flags['robot-id'] ?? env.VIAM_ROBOT_ID
  const orgId = flags['org-id'] ?? env.VIAM_ORG_ID

  const missing: string[] = []
  if (!host) missing.push('--host / $VIAM_HOST')
  if (!apiKeyId) missing.push('--api-key-id / $VIAM_API_KEY_ID')
  if (!apiKey) missing.push('--api-key / $VIAM_API_KEY')
  if (!robotId) missing.push('--robot-id / $VIAM_ROBOT_ID')

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`)
  }

  return {
    host: host!,
    apiKeyId: apiKeyId!,
    apiKey: apiKey!,
    robotId: robotId!,
    orgId: orgId || undefined,
    locationId: parseLocationId(host!),
  }
}

/**
 * Extracts the location id from a machine host of the form
 * `name.LOCATION.viam.cloud` — the segment immediately before `viam.cloud`.
 * Throws if the host is not the full `name.LOCATION.viam.cloud` form.
 */
export function parseLocationId(host: string): string {
  const parts = host.split('.')
  const n = parts.length

  const wellFormed =
    n >= 4 &&
    parts[n - 2] === 'viam' &&
    parts[n - 1] === 'cloud' &&
    parts[n - 3].length > 0 &&
    // everything before the location (the `name`) must be non-empty
    parts.slice(0, n - 3).every((p) => p.length > 0) &&
    n - 3 >= 1

  if (!wellFormed) {
    throw new Error(
      `Invalid --host "${host}". Expected the full form name.LOCATION.viam.cloud`
    )
  }

  return parts[n - 3]
}

export interface LogOptions {
  /** Lower bound on time_received. undefined means no window (all history). */
  since?: Date
  /** Maximum number of passes to display. */
  limit?: number
  pager: boolean
}

/**
 * Resolves `log`-specific options. `--all` disables the time window; otherwise
 * `--since` (default 7d) sets it. `now` is injectable for testing.
 */
export function resolveLogOptions(
  flags: ParsedArgs['flags'],
  now: Date = new Date()
): LogOptions {
  const since = flags['all'] ? undefined : parseSince(flags['since'] ?? '7d', now)

  let limit: number | undefined
  if (flags['limit'] !== undefined) {
    limit = Number(flags['limit'])
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error(`--limit must be a positive integer, got "${flags['limit']}"`)
    }
  }

  return { since, limit, pager: !flags['no-pager'] }
}

const DURATION_RE = /^(\d+)([dhm])$/
const DURATION_MS: Record<string, number> = {
  d: 24 * 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  m: 60 * 1000,
}

/**
 * Parses a `--since` value into a cutoff Date. Accepts a relative duration
 * (`7d`, `24h`, `30m`) measured back from `now`, or any Date-parseable string.
 */
export function parseSince(value: string, now: Date = new Date()): Date {
  const match = value.match(DURATION_RE)
  if (match) {
    const amount = Number(match[1])
    return new Date(now.getTime() - amount * DURATION_MS[match[2]])
  }

  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid --since "${value}". Use a duration like 7d/24h/30m or a date.`
    )
  }
  return parsed
}
