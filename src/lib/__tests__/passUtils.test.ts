import { describe, it, expect } from 'vitest'
import { deduplicatePassesByVersion, getExecutionTimeMs, getStepVideos } from '../passUtils'
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

describe('deduplicatePassesByVersion', () => {
  it('preserves passes with no version field (legacy records)', () => {
    const passes = [makePass([]), { ...makePass([]), pass_id: 'pass-2' }]
    expect(deduplicatePassesByVersion(passes)).toHaveLength(2)
  })

  it('keeps the highest version for a duplicated pass_id', () => {
    const v1 = { ...makePass([]), version: 1 }
    const v3 = { ...makePass([]), version: 3 }
    const v2 = { ...makePass([]), version: 2 }
    const result = deduplicatePassesByVersion([v3, v1, v2])
    expect(result).toHaveLength(1)
    expect(result[0].version).toBe(3)
  })

  it('treats missing version as 0, keeping versioned record over unversioned', () => {
    const noVersion = { ...makePass([]) }
    const v1 = { ...makePass([]), version: 1 }
    const result = deduplicatePassesByVersion([noVersion, v1])
    expect(result).toHaveLength(1)
    expect(result[0].version).toBe(1)
  })

  it('preserves input order after dedup', () => {
    const a2 = { ...makePass([]), pass_id: 'a', version: 2 }
    const b = { ...makePass([]), pass_id: 'b', version: 1 }
    const a1 = { ...makePass([]), pass_id: 'a', version: 1 }
    // input sorted newest-first: a2 comes before a1
    const result = deduplicatePassesByVersion([a2, b, a1])
    expect(result.map((p) => p.pass_id)).toEqual(['a', 'b'])
  })

  it('returns empty array for empty input', () => {
    expect(deduplicatePassesByVersion([])).toEqual([])
  })
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
