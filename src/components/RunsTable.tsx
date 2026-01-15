import React from 'react'

interface RunStep {
  name: string
  start: string
  end: string
  duration_ms: number
}

interface RunData {
  success: boolean
  err_string?: string
  start: string
  end: string
  duration_ms: number
  runs: RunStep[][]
}

interface RunsTableProps {
  runData: RunData
}

const RunsTable: React.FC<RunsTableProps> = ({ runData }) => {
  // Flatten the runs data for the table
  const tableData = runData.runs.flat().map((step, index) => ({
    id: index,
    name: step.name,
    start: new Date(step.start).toLocaleString(),
    end: new Date(step.end).toLocaleString(),
    duration: `${(step.duration_ms / 1000).toFixed(2)}s`,
    duration_ms: step.duration_ms,
  }))

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (ms: number) => {
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="runs-table-container">
      <h2>Run Details</h2>

      {/* Summary Information */}
      <div className="run-summary">
        <div className={`status ${runData.success ? 'success' : 'error'}`}>
          <strong>Status:</strong> {runData.success ? 'Success' : 'Failed'}
        </div>
        {runData.err_string && (
          <div className="error-message">
            <strong>Error:</strong> {runData.err_string}
          </div>
        )}
        <div className="timing-info">
          <span>
            <strong>Start:</strong> {formatDate(runData.start)}
          </span>
          <span>
            <strong>End:</strong> {formatDate(runData.end)}
          </span>
          <span>
            <strong>Total Duration:</strong>{' '}
            {formatDuration(runData.duration_ms)}
          </span>
        </div>
      </div>

      {/* Steps Table */}
      <div className="table-container mt-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left border-b-2 border-gray-300">
                Step Name
              </th>
              <th className="p-3 text-left border-b-2 border-gray-300">
                Start Time
              </th>
              <th className="p-3 text-left border-b-2 border-gray-300">
                End Time
              </th>
              <th className="p-3 text-left border-b-2 border-gray-300">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.id} className="border-b border-gray-200">
                <td className="p-2.5">{row.name}</td>
                <td className="p-2.5">{row.start}</td>
                <td className="p-2.5">{row.end}</td>
                <td className="p-2.5">{row.duration}</td>
              </tr>
            ))}
            {tableData.length === 0 && (
              <tr>
                <td colSpan={4} className="p-5 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RunsTable
