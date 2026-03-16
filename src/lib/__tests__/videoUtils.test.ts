import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  formatTimeDifference,
  formatDurationToMinutesSeconds,
  extractCameraName,
} from '../videoUtils'

describe('formatDuration', () => {
  it('formats milliseconds to M:SS', () => {
    expect(formatDuration(90000)).toBe('1:30')
    expect(formatDuration(3661000)).toBe('61:01')
    expect(formatDuration(0)).toBe('0:00')
  })

  it('returns 0:00 when no args', () => {
    expect(formatDuration()).toBe('0:00')
  })

  it('calculates duration from start/end strings', () => {
    expect(
      formatDuration(undefined, '2024-01-01T00:00:00Z', '2024-01-01T00:01:30Z')
    ).toBe('1:30')
  })
})

describe('formatTimeDifference', () => {
  it('formats sub-minute difference as seconds', () => {
    expect(formatTimeDifference(0, 30000)).toBe('30s')
  })

  it('formats multi-minute difference as minutes', () => {
    expect(formatTimeDifference(0, 5 * 60000)).toBe('5m')
  })

  it('uses absolute value', () => {
    expect(formatTimeDifference(30000, 0)).toBe('30s')
  })
})

describe('formatDurationToMinutesSeconds', () => {
  it('formats seconds only', () => {
    const start = new Date('2024-01-01T00:00:00Z')
    const end = new Date('2024-01-01T00:00:45Z')
    expect(formatDurationToMinutesSeconds(start, end)).toBe('0m 45s')
  })

  it('formats minutes and seconds', () => {
    const start = new Date('2024-01-01T00:00:00Z')
    const end = new Date('2024-01-01T00:02:30Z')
    expect(formatDurationToMinutesSeconds(start, end)).toBe('2m 30s')
  })

  it('formats hours', () => {
    const start = new Date('2024-01-01T00:00:00Z')
    const end = new Date('2024-01-01T01:05:10Z')
    expect(formatDurationToMinutesSeconds(start, end)).toBe('1h 5m 10s')
  })
})

describe('extractCameraName', () => {
  it('extracts camera name from filename', () => {
    expect(extractCameraName('video_front-camera/something.mp4')).toBe(
      'front-camera'
    )
  })

  it('returns Unknown Camera when no match', () => {
    expect(extractCameraName('no_match_here.mp4')).toBe('Unknown Camera')
  })
})
