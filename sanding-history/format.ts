import { Pass } from '../src/lib/types'
import { DayAggregateData } from '../src/lib/dayAggregates'
import {
  formatSelectedZones,
  getExecutionTimeMs,
  getPassStatusLabel,
  isInProgress,
} from '../src/lib/passUtils'
import {
  formatDurationMsText,
  formatDurationToMinutesSeconds,
} from '../src/lib/videoUtils'

const RULE = '─'.repeat(72)
const DASH = '—'

function formatCounts(counts: Map<string, number>): string {
  if (counts.size === 0) return DASH
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `${label}: ${count}`)
    .join(', ')
}

function renderDayHeader(data: DayAggregateData): string {
  return [
    RULE,
    ` ${data.formattedDate}`,
    `   Total Passes: ${data.totalPassCount}   Total Time: ${formatDurationMsText(
      data.totalFactoryTime
    )}   Executing Time: ${formatDurationMsText(
      data.totalExecutionTime
    )}   Other Steps Time: ${formatDurationMsText(
      data.totalOtherStepsTime
    )}   Execution %: ${data.executionPercentage.toFixed(1)}%`,
    `   Symptoms: ${formatCounts(data.symptomCounts)}`,
    `   Causes: ${formatCounts(data.causeCounts)}`,
    RULE,
  ].join('\n')
}

function renderPass(pass: Pass, isIncomplete: boolean): string {
  const inProgress = isInProgress(pass)
  const end = inProgress ? DASH : pass.end.toLocaleTimeString()
  const total = inProgress
    ? DASH
    : formatDurationToMinutesSeconds(pass.start, pass.end)
  const executing = inProgress
    ? DASH
    : formatDurationToMinutesSeconds(new Date(0), new Date(getExecutionTimeMs(pass)))

  const lines = [
    ` ${pass.pass_id || DASH}`,
    `   Status: ${getPassStatusLabel(pass, isIncomplete)}   Start: ${pass.start.toLocaleTimeString()}   End: ${end}   Total: ${total}   Executing: ${executing}`,
    `   Piece: ${pass.piece_id ?? DASH}   Mode: ${pass.pass_mode ?? DASH}   Steps: ${
      pass.steps ? `${pass.steps.length}` : DASH
    }   Zones: ${formatSelectedZones(pass.selected_zones)}   Rounds: ${
      pass.selected_num_rounds ?? DASH
    }`,
  ]

  if (pass.err_string) {
    lines.push(`   Error: ${pass.err_string}`)
  }

  return lines.join('\n')
}

/**
 * Renders the history list as scannable plain text: a day separator with the
 * same aggregate summary the web table shows, followed by one block per pass
 * (newest first), each led by its full pass id.
 */
export function renderLog(
  groupedPasses: Record<string, Pass[]>,
  dayAggregates: Record<string, DayAggregateData>,
  incompletePassIds: Set<string>
): string {
  const days = Object.entries(groupedPasses)
  if (days.length === 0) {
    return 'No sanding runs found.'
  }

  const blocks: string[] = []
  for (const [dateKey, passes] of days) {
    blocks.push(renderDayHeader(dayAggregates[dateKey]))
    for (const pass of passes) {
      blocks.push(renderPass(pass, incompletePassIds.has(pass.pass_id)))
    }
  }

  return blocks.join('\n\n')
}
