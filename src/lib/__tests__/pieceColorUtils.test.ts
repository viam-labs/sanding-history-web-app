import { describe, it, expect } from 'vitest'
import { getPieceColor } from '../pieceColorUtils'

describe('getPieceColor', () => {
  it('returns the same color for the same piece_id', () => {
    const color1 = getPieceColor('abc123')
    const color2 = getPieceColor('abc123')
    expect(color1).toEqual(color2)
  })

  it('returns different colors for different piece_ids', () => {
    const color1 = getPieceColor('piece-1')
    const color2 = getPieceColor('piece-2')
    // While collisions are possible, these two simple strings should differ
    expect(color1).not.toEqual(color2)
  })

  it('returns an object with bg, text, and hoverBg properties', () => {
    const color = getPieceColor('test-piece')
    expect(color).toHaveProperty('bg')
    expect(color).toHaveProperty('text')
    expect(color).toHaveProperty('hoverBg')
    expect(color.bg).toMatch(/^bg-\w+-100$/)
    expect(color.text).toMatch(/^text-\w+-700$/)
    expect(color.hoverBg).toMatch(/^hover:bg-\w+-200$/)
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
    const firstRun = ids.map(getPieceColor)
    const secondRun = ids.map(getPieceColor)
    expect(firstRun).toEqual(secondRun)
  })
})
