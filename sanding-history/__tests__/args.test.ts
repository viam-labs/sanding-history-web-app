import { describe, it, expect } from 'vitest'
import {
  parseArgs,
  parseLocationId,
  parseSince,
  resolveConfig,
  resolveLogOptions,
} from '../args'

describe('parseArgs', () => {
  it('accepts the run id in any position relative to flags', () => {
    const idFirst = parseArgs(['detail', 'run-123', '--host', 'h'])
    const idLast = parseArgs(['detail', '--host', 'h', 'run-123'])
    const flagsAround = parseArgs(['--host', 'h', 'detail', 'run-123'])

    for (const parsed of [idFirst, idLast, flagsAround]) {
      expect(parsed.positionals).toEqual(['detail', 'run-123'])
      expect(parsed.flags.host).toBe('h')
    }
  })

  it('supports --flag=value and --flag value forms', () => {
    expect(parseArgs(['--since=24h']).flags.since).toBe('24h')
    expect(parseArgs(['--since', '24h']).flags.since).toBe('24h')
  })

  it('parses boolean flags without consuming the next token', () => {
    const parsed = parseArgs(['log', '--all', '--no-pager'])
    expect(parsed.flags.all).toBe(true)
    expect(parsed.flags['no-pager']).toBe(true)
    expect(parsed.positionals).toEqual(['log'])
  })

  it('rejects unknown flags, missing values, and values on boolean flags', () => {
    expect(() => parseArgs(['--bogus'])).toThrow(/Unknown flag/)
    expect(() => parseArgs(['--host'])).toThrow(/requires a value/)
    expect(() => parseArgs(['--all=1'])).toThrow(/does not take a value/)
  })
})

describe('parseLocationId', () => {
  it('returns the segment before viam.cloud', () => {
    expect(parseLocationId('robot.loc-abc.viam.cloud')).toBe('loc-abc')
    // The machine name itself may contain dots/hyphens.
    expect(parseLocationId('my-machine-main.loc-abc.viam.cloud')).toBe('loc-abc')
  })

  it('rejects hosts that are not the full name.LOCATION.viam.cloud form', () => {
    expect(() => parseLocationId('loc.viam.cloud')).toThrow(/Invalid --host/)
    expect(() => parseLocationId('robot.loc.viam.com')).toThrow(/Invalid --host/)
    expect(() => parseLocationId('viam.cloud')).toThrow(/Invalid --host/)
    expect(() => parseLocationId('.loc.viam.cloud')).toThrow(/Invalid --host/)
  })
})

describe('parseSince', () => {
  const now = new Date('2026-05-28T12:00:00.000Z')

  it('interprets relative durations back from now', () => {
    expect(parseSince('1d', now).toISOString()).toBe('2026-05-27T12:00:00.000Z')
    expect(parseSince('2h', now).toISOString()).toBe('2026-05-28T10:00:00.000Z')
    expect(parseSince('30m', now).toISOString()).toBe('2026-05-28T11:30:00.000Z')
  })

  it('accepts an absolute date', () => {
    expect(parseSince('2026-01-01T00:00:00Z', now).toISOString()).toBe(
      '2026-01-01T00:00:00.000Z'
    )
  })

  it('throws on unparseable values', () => {
    expect(() => parseSince('soon', now)).toThrow(/Invalid --since/)
  })
})

describe('resolveConfig', () => {
  const env = {
    VIAM_HOST: 'r.loc.viam.cloud',
    VIAM_API_KEY_ID: 'env-id',
    VIAM_API_KEY: 'env-key',
    VIAM_ROBOT_ID: 'env-robot',
    VIAM_ORG_ID: 'env-org',
  }

  it('lets flags override environment and derives the location', () => {
    const config = resolveConfig({ 'api-key-id': 'flag-id' }, env)
    expect(config.apiKeyId).toBe('flag-id')
    expect(config.apiKey).toBe('env-key')
    expect(config.locationId).toBe('loc')
    expect(config.orgId).toBe('env-org')
  })

  it('treats org-id as optional', () => {
    const { VIAM_ORG_ID, ...rest } = env
    void VIAM_ORG_ID
    expect(resolveConfig({}, rest).orgId).toBeUndefined()
  })

  it('reports every missing required value at once', () => {
    expect(() => resolveConfig({}, {})).toThrow(
      /--host.*--api-key-id.*--api-key.*--robot-id/
    )
  })
})

describe('resolveLogOptions', () => {
  const now = new Date('2026-05-28T12:00:00.000Z')

  it('defaults the window to 7 days back', () => {
    expect(resolveLogOptions({}, now).since?.toISOString()).toBe(
      '2026-05-21T12:00:00.000Z'
    )
  })

  it('disables the window with --all', () => {
    expect(resolveLogOptions({ all: true }, now).since).toBeUndefined()
  })

  it('parses --limit and rejects non-positive integers', () => {
    expect(resolveLogOptions({ limit: '5' }, now).limit).toBe(5)
    expect(() => resolveLogOptions({ limit: '0' }, now)).toThrow(/positive integer/)
    expect(() => resolveLogOptions({ limit: 'abc' }, now)).toThrow(/positive integer/)
  })

  it('enables the pager unless --no-pager is given', () => {
    expect(resolveLogOptions({}, now).pager).toBe(true)
    expect(resolveLogOptions({ 'no-pager': true }, now).pager).toBe(false)
  })
})
