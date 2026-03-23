import { describe, it, expect } from 'vitest'
import { getPieceColor } from '../pieceColorUtils'

describe('getPieceColor', () => {
  it('returns the same color for the same piece_id', () => {
    const color1 = getPieceColor('abc123')
    const color2 = getPieceColor('abc123')
    expect(color1).toEqual(color2)
  })

  it('returns different colors for different piece_ids', () => {
    // 'abc123' and 'xyz789' are verified to hash to different buckets across 51 colors
    const color1 = getPieceColor('abc123')
    const color2 = getPieceColor('xyz789')
    expect(color1).not.toEqual(color2)
  })

  it('returns an object with bg, text, and hoverBg properties', () => {
    const color = getPieceColor('test-piece')
    expect(color).toHaveProperty('bg')
    expect(color).toHaveProperty('text')
    expect(color).toHaveProperty('hoverBg')
    expect(color.bg).toMatch(/^bg-\w+-(50|100|200|300|400|500)$/)
    expect(color.text).toMatch(/^text-\w+-(50|600|700|800|900|950)$/)
    expect(color.hoverBg).toMatch(/^hover:bg-\w+-(100|200|300|400|500|600)$/)
  })

  it('handles empty string', () => {
    const color = getPieceColor('')
    expect(color).toHaveProperty('bg')
    expect(color).toHaveProperty('text')
    expect(color).toHaveProperty('hoverBg')
  })

  it('handles long strings', () => {
    const longId = 'a'.repeat(1000)
    const color = getPieceColor(longId)
    expect(color).toHaveProperty('bg')
  })

  it('is deterministic across multiple calls', () => {
    const ids = ['piece-a', 'piece-b', 'piece-c', 'piece-d']
    const firstRun = ids.map((id) => getPieceColor(id))
    const secondRun = ids.map((id) => getPieceColor(id))
    expect(firstRun).toEqual(secondRun)
  })

  it('returns a different color when avoid matches the hashed color', () => {
    const baseId = 'test-piece'
    const baseColor = getPieceColor(baseId)
    // Passing the same color as avoid must shift to an adjacent bucket
    const shifted = getPieceColor(baseId, baseColor)
    expect(shifted.bg).not.toEqual(baseColor.bg)
  })

  it('returns the natural color when avoid does not match', () => {
    const id = 'abc123'
    const natural = getPieceColor(id)
    const otherColor = getPieceColor('xyz789')
    if (natural.bg !== otherColor.bg) {
      expect(getPieceColor(id, otherColor)).toEqual(natural)
    }
  })
})
