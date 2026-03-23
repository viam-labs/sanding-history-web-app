/**
 * Deterministic color assignment for piece IDs.
 * Each unique piece_id gets a consistent color based on a hash of the string.
 *
 * 17 chromatic Tailwind families x 3 shade tiers = 51 colors.
 * Families are ordered to maximize visual distance between adjacent indices
 * (warm/cool interleaved). Tiers cycle through the families before repeating,
 * so index N and N+17 are the same family but different shades.
 *
 * Similar-looking families (amber/yellow, teal/cyan, green/emerald, pink/rose,
 * violet/purple, indigo/blue, red/orange, fuchsia/pink, sky/cyan, lime/green)
 * use offset shade tiers so they remain distinguishable even at the same tier:
 *
 * Group A: bg 50/200/400   text 600/800/950   hover 100/300/500
 * Group B: bg 100/300/500  text 700/900/50    hover 200/400/600
 */

type ShadeGroup = 'A' | 'B'

const COLOR_FAMILIES: ReadonlyArray<{ name: string; group: ShadeGroup }> = [
  { name: 'blue', group: 'A' },
  { name: 'orange', group: 'A' },
  { name: 'emerald', group: 'A' },
  { name: 'rose', group: 'A' },
  { name: 'violet', group: 'B' },
  { name: 'amber', group: 'B' },
  { name: 'cyan', group: 'A' },
  { name: 'pink', group: 'B' },
  { name: 'green', group: 'B' },
  { name: 'indigo', group: 'B' },
  { name: 'yellow', group: 'A' },
  { name: 'teal', group: 'B' },
  { name: 'fuchsia', group: 'A' },
  { name: 'lime', group: 'A' },
  { name: 'sky', group: 'B' },
  { name: 'red', group: 'B' },
  { name: 'purple', group: 'A' },
]

const SHADE_TIERS: Record<
  ShadeGroup,
  ReadonlyArray<{ bg: string; text: string; hover: string }>
> = {
  A: [
    { bg: '50', text: '600', hover: '100' },
    { bg: '200', text: '800', hover: '300' },
    { bg: '400', text: '950', hover: '500' },
  ],
  B: [
    { bg: '100', text: '700', hover: '200' },
    { bg: '300', text: '900', hover: '400' },
    { bg: '500', text: '50', hover: '600' },
  ],
}

// Build tiers-first: all 17 families at tier 0, then tier 1, then tier 2.
// Each family uses the shade tiers for its group, so similar families
// (e.g. amber-B vs yellow-A) land on different shade levels at every tier.
const PIECE_COLORS: ReadonlyArray<{
  bg: string
  text: string
  hoverBg: string
}> = [0, 1, 2].flatMap((tierIndex) =>
  COLOR_FAMILIES.map((family) => {
    const tier = SHADE_TIERS[family.group][tierIndex]
    return {
      bg: `bg-${family.name}-${tier.bg}`,
      text: `text-${family.name}-${tier.text}`,
      hoverBg: `hover:bg-${family.name}-${tier.hover}`,
    }
  })
)

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
 *
 * Pass `avoid` (the color of the previous row's piece) to guarantee the
 * returned color is visually distinct from its immediate neighbor, preventing
 * adjacent rows from sharing the same badge color.
 */
export function getPieceColor(pieceId: string, avoid?: PieceColor): PieceColor {
  const index = hashString(pieceId) % PIECE_COLORS.length
  const color = PIECE_COLORS[index]
  if (avoid && color.bg === avoid.bg) {
    return PIECE_COLORS[(index + 1) % PIECE_COLORS.length]
  }
  return color
}
