import { describe, it, expect } from 'vitest'
import { BinaryDataFile } from '../BinaryDataFile'

const makeFile = (fileName: string): BinaryDataFile => {
  return new BinaryDataFile({
    metadata: { fileName } as any,
    binary: new Uint8Array(),
  } as any)
}

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
