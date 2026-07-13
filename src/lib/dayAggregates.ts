import { Pass, PassDiagnosis } from './types'
import { isInProgress, localDayKey } from './passUtils'

export interface DayAggregateData {
  totalFactoryTime: number
  totalExecutionTime: number
  totalOtherStepsTime: number
  totalPassCount: number
  executionPercentage: number
  formattedDate: string
  symptomCounts: Map<string, number>
  causeCounts: Map<string, number>
}

/**
 * Groups passes by local calendar day, keyed YYYY-MM-DD from each pass's start.
 * Local (not UTC) so headers align with the local times shown in each row.
 * Insertion order follows the input order, so a newest-first input yields
 * newest-first days.
 */
export function groupPassesByDay(passes: Pass[]): Record<string, Pass[]> {
  return passes.reduce((acc: Record<string, Pass[]>, pass) => {
    const dateKey = localDayKey(pass.start)
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(pass)
    return acc
  }, {})
}

/**
 * Computes per-day aggregates and the set of incomplete passes.
 *
 * "Incomplete" is determined globally: an in-progress pass is incomplete
 * whenever any later pass (of any status, on any day) exists. Only an
 * in-progress pass with the globally latest start time is treated as actively
 * running. For in-progress passes the backend reports zeroed end/step times, so
 * an end is inferred from the next pass's start (or now, for the active pass).
 */
export function computeDayAggregates(
  groupedPasses: Record<string, Pass[]>,
  passDiagnoses: Map<string, PassDiagnosis>
): {
  dayAggregates: Record<string, DayAggregateData>
  incompletePassIds: Set<string>
} {
  const allSortedPasses = Object.values(groupedPasses)
    .flat()
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const globalMaxStartTime =
    allSortedPasses.length > 0
      ? allSortedPasses[allSortedPasses.length - 1].start.getTime()
      : 0

  const nextPassStartByPassId = new Map<string, Date>()
  for (let i = 0; i < allSortedPasses.length - 1; i++) {
    nextPassStartByPassId.set(
      allSortedPasses[i].pass_id,
      allSortedPasses[i + 1].start
    )
  }

  const incompletePassIds = new Set<string>()
  for (const pass of allSortedPasses) {
    if (isInProgress(pass) && pass.start.getTime() < globalMaxStartTime) {
      incompletePassIds.add(pass.pass_id)
    }
  }

  const dayAggregates = Object.entries(groupedPasses).reduce(
    (acc: Record<string, DayAggregateData>, [dateKey, passes]) => {
      let totalFactoryTime = 0
      let totalExecutionTime = 0
      let totalOtherStepsTime = 0
      const symptomCounts = new Map<string, number>()
      const causeCounts = new Map<string, number>()

      passes.forEach((pass) => {
        let inferredEnd: Date
        if (!isInProgress(pass)) {
          inferredEnd = pass.end
        } else if (incompletePassIds.has(pass.pass_id)) {
          inferredEnd = nextPassStartByPassId.get(pass.pass_id) ?? new Date()
        } else {
          inferredEnd = new Date()
        }

        totalFactoryTime += inferredEnd.getTime() - pass.start.getTime()

        // Only count step times for completed passes — in-progress step end
        // times are also unreliable (zeros from the backend).
        if (!isInProgress(pass) && pass.steps && Array.isArray(pass.steps)) {
          pass.steps.forEach((step) => {
            const stepDuration = step.end.getTime() - step.start.getTime()
            if (step.name.toLowerCase() === 'executing') {
              totalExecutionTime += stepDuration
            } else {
              totalOtherStepsTime += stepDuration
            }
          })
        }

        if (!pass.success) {
          const diagnosis = passDiagnoses.get(pass.pass_id)
          if (diagnosis) {
            if (diagnosis.symptom) {
              symptomCounts.set(
                diagnosis.symptom,
                (symptomCounts.get(diagnosis.symptom) || 0) + 1
              )
            }
            if (diagnosis.cause) {
              causeCounts.set(
                diagnosis.cause,
                (causeCounts.get(diagnosis.cause) || 0) + 1
              )
            }
          }
        }
      })

      const totalStepsTime = totalExecutionTime + totalOtherStepsTime
      const executionPercentage =
        totalStepsTime > 0 ? (totalExecutionTime / totalStepsTime) * 100 : 0

      const [year, month, day] = dateKey.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      const formattedDate = date.toLocaleDateString([], {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      acc[dateKey] = {
        totalFactoryTime,
        totalExecutionTime,
        totalOtherStepsTime,
        totalPassCount: passes.length,
        executionPercentage,
        formattedDate,
        symptomCounts,
        causeCounts,
      }

      return acc
    },
    {}
  )

  return { dayAggregates, incompletePassIds }
}
