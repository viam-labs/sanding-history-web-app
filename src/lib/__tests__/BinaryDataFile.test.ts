import { describe, it, expect } from 'vitest'
import { BinaryDataFile } from '../BinaryDataFile'

const makeFile = (fileName: string): BinaryDataFile => {
  return new BinaryDataFile({
    metadata: { fileName } as any,
    binary: new Uint8Array(),
  } as any)
}

describe('BinaryDataFile.getFileTimestamp', () => {
  it('parses ISO timestamp from filename', () => {
    const file = makeFile('capture_2024-03-15_10-30-00_data.mp4')
    const ts = file.getFileTimestamp()
    expect(ts).not.toBeNull()
    expect(ts!.getUTCFullYear()).toBe(2024)
    expect(ts!.getUTCMonth()).toBe(2) // March = 2
    expect(ts!.getUTCDate()).toBe(15)
  })

  it('parses month-name timestamp from filename', () => {
    const file = makeFile('video_January_23_2026_11_06_46_rest.mp4')
    const ts = file.getFileTimestamp()
    expect(ts).not.toBeNull()
    expect(ts!.getFullYear()).toBe(2026)
    expect(ts!.getMonth()).toBe(0) // January
    expect(ts!.getDate()).toBe(23)
  })

  it('returns null for unrecognized filename', () => {
    const file = makeFile('no_timestamp_here.mp4')
    expect(file.getFileTimestamp()).toBeNull()
  })
})

describe('BinaryDataFile.isPartOfPass', () => {
  it('returns true when filename contains passId', () => {
    const file = makeFile('video_pass-xyz_step.mp4')
    expect(file.isPartOfPass('pass-xyz')).toBe(true)
  })

  it('returns false when filename does not contain passId', () => {
    const file = makeFile('video_pass-abc_step.mp4')
    expect(file.isPartOfPass('pass-xyz')).toBe(false)
  })
})
