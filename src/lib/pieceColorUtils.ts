/**
 * Deterministic color assignment for piece IDs.
 * Each unique piece_id gets a consistent color based on a hash of the string.
 */

const PIECE_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', hoverBg: 'hover:bg-blue-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', hoverBg: 'hover:bg-purple-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', hoverBg: 'hover:bg-amber-200' },
  { bg: 'bg-teal-100', text: 'text-teal-700', hoverBg: 'hover:bg-teal-200' },
  { bg: 'bg-pink-100', text: 'text-pink-700', hoverBg: 'hover:bg-pink-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', hoverBg: 'hover:bg-indigo-200' },
  { bg: 'bg-orange-100', text: 'text-orange-700', hoverBg: 'hover:bg-orange-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', hoverBg: 'hover:bg-cyan-200' },
  { bg: 'bg-lime-100', text: 'text-lime-700', hoverBg: 'hover:bg-lime-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', hoverBg: 'hover:bg-rose-200' },
] as const

export type PieceColor = (typeof PIECE_COLORS)[number]

/**
 * Simple string hash function (djb2) to produce a deterministic index.
 */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}

/**
 * Returns a consistent color for a given piece_id based on its hash.
 */
export function getPieceColor(pieceId: string): PieceColor {
  const index = hashString(pieceId) % PIECE_COLORS.length
  return PIECE_COLORS[index]
}
