/**
 * Deterministic color assignment for piece IDs.
 * Each unique piece_id gets a consistent color based on a hash of the string.
 *
 * The avoid check (used for adjacent rows) also skips visually similar
 * families (e.g. avoiding yellow also avoids amber).
 */

const PIECE_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-600', hoverBg: 'hover:bg-blue-100' },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    hoverBg: 'hover:bg-orange-100',
  },
  {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    hoverBg: 'hover:bg-emerald-100',
  },
  { bg: 'bg-rose-50', text: 'text-rose-600', hoverBg: 'hover:bg-rose-100' },
  {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    hoverBg: 'hover:bg-violet-200',
  },
  { bg: 'bg-amber-100', text: 'text-amber-700', hoverBg: 'hover:bg-amber-200' },
  { bg: 'bg-cyan-50', text: 'text-cyan-600', hoverBg: 'hover:bg-cyan-100' },
  { bg: 'bg-pink-100', text: 'text-pink-700', hoverBg: 'hover:bg-pink-200' },
  { bg: 'bg-green-100', text: 'text-green-700', hoverBg: 'hover:bg-green-200' },
  {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    hoverBg: 'hover:bg-indigo-200',
  },
  {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    hoverBg: 'hover:bg-yellow-100',
  },
  { bg: 'bg-teal-100', text: 'text-teal-700', hoverBg: 'hover:bg-teal-200' },
  {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-600',
    hoverBg: 'hover:bg-fuchsia-100',
  },
  { bg: 'bg-lime-50', text: 'text-lime-600', hoverBg: 'hover:bg-lime-100' },
  { bg: 'bg-sky-100', text: 'text-sky-700', hoverBg: 'hover:bg-sky-200' },
  { bg: 'bg-red-100', text: 'text-red-700', hoverBg: 'hover:bg-red-200' },
  {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    hoverBg: 'hover:bg-purple-100',
  },
] as const

export type PieceColor = (typeof PIECE_COLORS)[number]

/**
 * Families that look visually similar to each other.
 * When avoiding a color, we also avoid its similar siblings.
 */
const SIMILAR_FAMILIES: Record<string, string[]> = {
  yellow: ['amber'],
  amber: ['yellow'],
  teal: ['cyan', 'sky'],
  cyan: ['teal', 'sky'],
  sky: ['cyan', 'teal'],
  green: ['emerald', 'lime'],
  emerald: ['green'],
  lime: ['green'],
  pink: ['rose', 'fuchsia'],
  rose: ['pink'],
  fuchsia: ['pink'],
  violet: ['purple'],
  purple: ['violet'],
  indigo: ['blue'],
  blue: ['indigo'],
  red: ['orange'],
  orange: ['red'],
}

function extractFamily(bgClass: string): string {
  const match = bgClass.match(/^bg-(\w+)-\d+$/)
  return match?.[1] ?? ''
}

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
 * Computes the sequentially-adjusted piece colors for a list of passes.
 * Each color avoids the previous row's piece color (and visually similar
 * families). If adjacent passes share the same piece_id, avoidance is skipped
 * so the same ID always renders the same color when it repeats consecutively.
 */
export function computePieceColors(
  passes: ReadonlyArray<{ piece_id?: string }>
): (PieceColor | undefined)[] {
  const colors: (PieceColor | undefined)[] = []
  for (let i = 0; i < passes.length; i++) {
    const pieceId = passes[i].piece_id
    if (!pieceId) {
      colors.push(undefined)
      continue
    }
    const samePieceAsPrev = i > 0 && passes[i - 1].piece_id === pieceId
    const avoidColor = samePieceAsPrev ? undefined : colors[i - 1]
    colors.push(getPieceColor(pieceId, avoidColor))
  }
  return colors
}

/**
 * Returns a consistent color for a given piece_id based on its hash.
 *
 * Pass `avoid` (the color of the previous row's piece) to guarantee the
 * returned color is visually distinct from its immediate neighbor. This also
 * skips colors that are visually similar to the avoided color (e.g. avoiding
 * yellow also skips amber).
 */
export function getPieceColor(pieceId: string, avoid?: PieceColor): PieceColor {
  const index = hashString(pieceId) % PIECE_COLORS.length
  const color = PIECE_COLORS[index]
  if (!avoid) return color

  const avoidFamily = extractFamily(avoid.bg)
  const avoidSet = new Set([
    avoidFamily,
    ...(SIMILAR_FAMILIES[avoidFamily] ?? []),
  ])
  const colorFamily = extractFamily(color.bg)

  if (avoidSet.has(colorFamily)) {
    for (let offset = 1; offset < PIECE_COLORS.length; offset++) {
      const candidate = PIECE_COLORS[(index + offset) % PIECE_COLORS.length]
      if (!avoidSet.has(extractFamily(candidate.bg))) return candidate
    }
  }
  return color
}
