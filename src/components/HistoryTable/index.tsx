import React, { useMemo, Suspense } from 'react'
import { Pass } from '../../lib/types'
import { DaySummaryHeader, DayAggregateData } from './DaySummaryHeader.tsx'
import { usePass } from '../../lib/contexts/PassContext'
import { usePagination } from '../../lib/contexts/PaginationContext'
import {lazy} from 'react'
import { SinglePassProvider } from '../../lib/contexts/SinglePassContext.tsx'
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

  // Memoize day aggregates calculation - calculate both execution percentage AND total time
  const dayAggregates = useMemo(() => {
    return Object.entries(groupedPasses).reduce(
      (acc: Record<string, DayAggregateData>, [dateKey, passes]) => {
        let totalFactoryTime = 0
        let totalExecutionTime = 0
        let totalOtherStepsTime = 0
        let totalBluePoints = 0
        const symptomCounts = new Map<string, number>()
        const causeCounts = new Map<string, number>()

        // Calculate both time and execution metrics
        passes.forEach((pass) => {
          // Add pass duration to total time
          const passDuration = pass.end.getTime() - pass.start.getTime()
          totalFactoryTime += passDuration

          // Calculate execution time for percentage
          if (pass.steps && Array.isArray(pass.steps)) {
            pass.steps.forEach((step) => {
              const stepDuration = step.end.getTime() - step.start.getTime()

              // Look for the specific "executing" step (exact match or case-insensitive)
              if (step.name.toLowerCase() === 'executing') {
                totalExecutionTime += stepDuration
              } else {
                totalOtherStepsTime += stepDuration
              }
            })
          }

          // Sum up blue points
          if (pass.blue_point_count !== undefined) {
            totalBluePoints += pass.blue_point_count
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
          totalBluePoints,
          symptomCounts,
          causeCounts,
        }

        return acc
      },
      {}
    )
  }, [groupedPasses, passDiagnoses])

  return (
    <div className="viam-table-container">
      <table className="viam-table">
        <thead>
          <tr>
            <th className="w-5"></th>
            <th>Day</th>
            <th>Pass ID</th>
            <th>Status</th>
            <th>Start time</th>
            <th>End time</th>
            <th>Total duration</th>
            <th>Execution time</th>
            <th>Blue points</th>
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
                <DaySummaryHeader data={dayAggregates[dateKey]} colSpan={13} />
                {passes.map((pass: Pass, passIndex: number) => {
                  const globalIndex = `${dayIndex}-${passIndex}`

                  return (
                    <React.Fragment key={globalIndex}>
                      <SinglePassProvider pass={pass}>
                        <Suspense fallback={<tr><td colSpan={13}>Loading...</td></tr>}>
                          <Row globalIndex={globalIndex} />
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
