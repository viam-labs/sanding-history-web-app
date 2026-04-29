import React, { useMemo, Suspense } from 'react'
import { Pass } from '../../lib/types'
import { DaySummaryHeader, DayAggregateData } from './DaySummaryHeader.tsx'
import { usePass } from '../../lib/contexts/PassContext'
import { usePagination } from '../../lib/contexts/PaginationContext'
import { lazy } from 'react'
import { SinglePassProvider } from '../../lib/contexts/SinglePassContext.tsx'
import { computePieceColors } from '../../lib/pieceColorUtils'
import { isInProgress } from '../../lib/passUtils'
const Row = lazy(() => import('./Row.tsx'))

const HistoryTable: React.FC = () => {
  const { passDiagnoses } = usePass()
  const { currentPassSummaries } = usePagination()

  const groupedPasses = useMemo(() => {
    return currentPassSummaries.reduce((acc: Record<string, Pass[]>, pass) => {
      // Use a consistent date key (YYYY-MM-DD)
      const dateKey = pass.start.toISOString().split('T')[0]
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(pass)
      return acc
    }, {})
  }, [currentPassSummaries])

  // Memoize day aggregates and incomplete pass IDs together.
  // "Incomplete" is determined globally: an in-progress pass is incomplete whenever
  // any later pass (of any status, on any day) exists. Only an in-progress pass with
  // the globally latest start time is treated as actively running.
  const { dayAggregates, incompletePassIds } = useMemo(() => {
    // Sort all visible passes ascending by start time so we can:
    // 1. Find the global latest start time
    // 2. Look up each pass's immediate successor across day boundaries
    const allSortedPasses = Object.values(groupedPasses)
      .flat()
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    const globalMaxStartTime =
      allSortedPasses.length > 0
        ? allSortedPasses[allSortedPasses.length - 1].start.getTime()
        : 0

    // Map each pass to its global successor's start time (used for incomplete end inference)
    const nextPassStartByPassId = new Map<string, Date>()
    for (let i = 0; i < allSortedPasses.length - 1; i++) {
      nextPassStartByPassId.set(
        allSortedPasses[i].pass_id,
        allSortedPasses[i + 1].start
      )
    }

    // An in-progress pass is incomplete if any pass (of any status) started after it
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
          // For in-progress passes the backend sends zeros for end time.
          // Infer a meaningful end: use the globally next pass's start for incomplete
          // passes (works across day boundaries), or current time for the active pass.
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

          // Count diagnoses for failed passes
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

        // Format the date for display using the dateKey (which is already YYYY-MM-DD)
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
  }, [groupedPasses, passDiagnoses])

  const pieceColors = useMemo(() => {
    return Object.fromEntries(
      Object.entries(groupedPasses).map(([dateKey, passes]) => [
        dateKey,
        computePieceColors(passes),
      ])
    )
  }, [groupedPasses])

  return (
    <div className="viam-table-container">
      <table className="viam-table">
        <thead>
          <tr>
            <th className="w-5"></th>
            <th>Day</th>
            <th>Pass ID</th>
            <th>Piece ID</th>
            <th>Status</th>
            <th>Start time</th>
            <th>End time</th>
            <th>Total duration</th>
            <th>Execution time</th>
            <th>Mode</th>
            <th>Steps</th>
            <th>Selected zones</th>
            <th>Selected rounds</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedPasses).map(([dateKey, passes], dayIndex) => {
            return (
              <React.Fragment key={dateKey}>
                <DaySummaryHeader data={dayAggregates[dateKey]} colSpan={14} />
                {passes.map((pass: Pass, passIndex: number) => {
                  const globalIndex = `${dayIndex}-${passIndex}`
                  return (
                    <React.Fragment key={globalIndex}>
                      <SinglePassProvider pass={pass} isIncomplete={incompletePassIds.has(pass.pass_id)}>
                        <Suspense
                          fallback={
                            <tr>
                              <td colSpan={14}>Loading...</td>
                            </tr>
                          }
                        >
                          <Row
                            globalIndex={globalIndex}
                            pieceColor={pieceColors[dateKey][passIndex]}
                          />
                        </Suspense>
                      </SinglePassProvider>
                    </React.Fragment>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default HistoryTable
