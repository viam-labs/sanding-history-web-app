import { describe, it, expect } from 'vitest'
import { getPieceColor, computeDisplayedColors } from '../pieceColorUtils'

describe('getPieceColor', () => {
  it('returns the same color for the same piece_id', () => {
    const color1 = getPieceColor('abc123')
    const color2 = getPieceColor('abc123')
    expect(color1).toEqual(color2)
  })

  it('returns different colors for different piece_ids', () => {
    const color1 = getPieceColor('test-id-0')
    const color2 = getPieceColor('test-id-1')
    expect(color1).not.toEqual(color2)
  })

  it('returns an object with bg, text, and hoverBg properties', () => {
    const color = getPieceColor('test-piece')
    expect(color).toHaveProperty('bg')
    expect(color).toHaveProperty('text')
    expect(color).toHaveProperty('hoverBg')
    expect(color.bg).toMatch(/^bg-\w+-(50|100)$/)
    expect(color.text).toMatch(/^text-\w+-(600|700)$/)
    expect(color.hoverBg).toMatch(/^hover:bg-\w+-(100|200)$/)
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
    const shifted = getPieceColor(baseId, baseColor)
    expect(shifted.bg).not.toEqual(baseColor.bg)
  })

  it('skips visually similar families when avoiding', () => {
    const yellowColor = getPieceColor('piece-1')
    const amberColor = getPieceColor('piece-24')
    expect(yellowColor.bg).toBe('bg-yellow-50')
    expect(amberColor.bg).toBe('bg-amber-100')

    const result = getPieceColor('piece-24', yellowColor)
    expect(result.bg).not.toBe('bg-amber-100')
    expect(result.bg).not.toBe('bg-yellow-50')
  })

  it('returns the natural color when avoid family is not similar', () => {
    const yellowColor = getPieceColor('piece-1')
    const cyanColor = getPieceColor('piece-5')
    expect(yellowColor.bg).toBe('bg-yellow-50')
    expect(cyanColor.bg).toBe('bg-cyan-50')
    expect(getPieceColor('piece-1', cyanColor)).toEqual(yellowColor)
  })
})

describe('computeDisplayedColors', () => {
  it('returns the natural color for each pass when there are no conflicts', () => {
    const passes = [{ piece_id: 'piece-12' }, { piece_id: 'piece-25' }]
    const colors = computeDisplayedColors(passes)
    expect(colors[0]?.bg).toBe('bg-orange-50')
    expect(colors[1]?.bg).toBe('bg-violet-100')
  })

  it('returns undefined for passes without a piece_id', () => {
    const passes = [{ piece_id: undefined }, { piece_id: 'piece-1' }]
    const colors = computeDisplayedColors(passes)
    expect(colors[0]).toBeUndefined()
    expect(colors[1]?.bg).toBe('bg-yellow-50')
  })

  it('keeps the same color for consecutive rows with the same piece_id', () => {
    const passes = [
      { piece_id: 'piece-7' },
      { piece_id: 'piece-7' },
      { piece_id: 'piece-7' },
    ]
    const colors = computeDisplayedColors(passes)
    expect(colors[0]?.bg).toBe('bg-green-100')
    expect(colors[1]?.bg).toBe('bg-green-100')
    expect(colors[2]?.bg).toBe('bg-green-100')
  })

  it('resumes normal avoidance after a same-piece run ends', () => {
    const passes = [
      { piece_id: 'piece-7' }, // green
      { piece_id: 'piece-7' }, // green (same, no avoid)
      { piece_id: 'piece-0' }, // teal (natural) - avoid = green
    ]
    const colors = computeDisplayedColors(passes)
    expect(colors[0]?.bg).toBe('bg-green-100')
    expect(colors[1]?.bg).toBe('bg-green-100')
    expect(colors[2]?.bg).toBe('bg-teal-100')
  })

  it('handles an empty array', () => {
    expect(computeDisplayedColors([])).toEqual([])
  })

  it('handles a single pass', () => {
    const colors = computeDisplayedColors([{ piece_id: 'piece-1' }])
    expect(colors).toHaveLength(1)
    expect(colors[0]?.bg).toBe('bg-yellow-50')
  })
})
