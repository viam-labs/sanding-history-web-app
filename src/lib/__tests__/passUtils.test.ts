import { describe, it, expect } from 'vitest'
import {
  formatSelectedZones,
  getExecutionTimeMs,
  getPassStatusLabel,
  getStepVideos,
  localDayKey,
} from '../passUtils'
import type { Pass, Step } from '../types'

const makeStep = (
  name: string,
  startMs: number,
  endMs: number,
  pass_id = 'pass-1'
): Step => ({
  name,
  start: new Date(startMs),
  end: new Date(endMs),
  pass_id,
})

const makePass = (steps: Step[]): Pass => ({
  pass_id: 'pass-1',
  start: new Date(0),
  end: new Date(10000),
  success: true,
  steps,
})

describe('getExecutionTimeMs', () => {
  it('sums executing step durations', () => {
    const steps = [
      makeStep('executing', 0, 5000),
      makeStep('executing', 10000, 13000),
      makeStep('planning', 5000, 10000),
    ]
    expect(getExecutionTimeMs(makePass(steps))).toBe(8000)
  })

  it('returns 0 for no steps', () => {
    expect(getExecutionTimeMs(makePass([]))).toBe(0)
  })
})

describe('formatSelectedZones', () => {
  it('strips the zone_ prefix and sorts numerically', () => {
    // String sort would give "1, 10, 2"; numeric sort is the contract.
    expect(formatSelectedZones(['zone_10', 'zone_2', 'zone_1'])).toBe('1, 2, 10')
  })

  it('accepts a single non-array value', () => {
    expect(formatSelectedZones('zone_3')).toBe('3')
  })

  it('returns dash when undefined, empty, or non-numeric', () => {
    expect(formatSelectedZones(undefined)).toBe('—')
    expect(formatSelectedZones([])).toBe('—')
    expect(formatSelectedZones(['zone_x', 'nope'])).toBe('—')
  })
})

describe('getPassStatusLabel', () => {
  const withState = (current_state?: string, success = true): Pass => ({
    ...makePass([]),
    success,
    current_state,
  })

  it('maps terminal current_state values to labels', () => {
    expect(getPassStatusLabel(withState('Succeeded'), false)).toBe('Success')
    expect(getPassStatusLabel(withState('Failed'), false)).toBe('Failed')
    expect(getPassStatusLabel(withState('Cancelled'), false)).toBe('Cancelled')
  })

  it('distinguishes incomplete from actively running for non-terminal states', () => {
    expect(getPassStatusLabel(withState('Executing'), true)).toBe('Incomplete')
    expect(getPassStatusLabel(withState('Executing'), false)).toBe('In Progress')
  })

  it('falls back to success flag when current_state is absent', () => {
    expect(getPassStatusLabel(withState(undefined, true), false)).toBe('Success')
    expect(getPassStatusLabel(withState(undefined, false), false)).toBe('Failed')
  })
})

describe('localDayKey', () => {
  it('returns the local Y-M-D, not UTC', () => {
    const d = new Date(2026, 6, 12, 22, 0, 0)
    expect(localDayKey(d)).toBe('2026-07-12')
  })

  it('zero-pads month and day', () => {
    const d = new Date(2026, 0, 3, 0, 0, 0)
    expect(localDayKey(d)).toBe('2026-01-03')
  })
})

describe('getStepVideos', () => {
  it('returns empty arrays when no video files', () => {
    const step = makeStep('executing', 0, 1000)
    expect(getStepVideos(step, [])).toEqual({
      fullVideos: [],
      last30sVideos: [],
    })
  })

  it('matches video by pass_id and step name in filename', () => {
    const step = makeStep('executing', 0, 1000, 'pass-abc')
    const mockFile = {
      fileName: 'path/pass-abc_executing_2024-01-01.mp4',
      getFileTimestamp: () => null,
    } as any

    const { fullVideos, last30sVideos } = getStepVideos(step, [mockFile])
    expect(fullVideos).toHaveLength(1)
    expect(last30sVideos).toHaveLength(0)
  })

  it('routes last30s videos to correct bucket', () => {
    const step = makeStep('executing', 0, 1000, 'pass-abc')
    const mockFile = {
      fileName: 'path/pass-abc_last30s_executing.mp4',
      getFileTimestamp: () => null,
    } as any

    const { fullVideos, last30sVideos } = getStepVideos(step, [mockFile])
    expect(fullVideos).toHaveLength(0)
    expect(last30sVideos).toHaveLength(1)
  })
})
