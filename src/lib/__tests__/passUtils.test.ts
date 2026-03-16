import { describe, it, expect } from 'vitest'
import { getExecutionTimeMs, getStepVideos } from '../passUtils'
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

  it('is case-insensitive for step name', () => {
    const steps = [makeStep('Executing', 0, 2000)]
    expect(getExecutionTimeMs(makePass(steps))).toBe(2000)
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
