import React, { useMemo, Suspense } from 'react'
import { Pass } from '../../lib/types'
import { DaySummaryHeader } from './DaySummaryHeader.tsx'
import { usePass } from '../../lib/contexts/PassContext'
import { usePagination } from '../../lib/contexts/PaginationContext'
import { lazy } from 'react'
import { SinglePassProvider } from '../../lib/contexts/SinglePassContext.tsx'
import { computePieceColors } from '../../lib/pieceColorUtils'
import { computeDayAggregates, groupPassesByDay } from '../../lib/dayAggregates'
const Row = lazy(() => import('./Row.tsx'))

const HistoryTable: React.FC = () => {
  const { passDiagnoses } = usePass()
  const { currentPassSummaries } = usePagination()

  const groupedPasses = useMemo(() => {
    return groupPassesByDay(currentPassSummaries)
  }, [currentPassSummaries])

  const { dayAggregates, incompletePassIds } = useMemo(() => {
    return computeDayAggregates(groupedPasses, passDiagnoses)
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
