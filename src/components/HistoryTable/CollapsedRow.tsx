import { formatDurationToMinutesSeconds } from '../../lib/videoUtils'
import {
  formatSelectedZones,
  getExecutionTimeMs,
  isInProgress,
} from '../../lib/passUtils'
import { StatusBadge } from '../StatusBadge'
import { useMemo, useState } from 'react'
import { usePass } from '../../lib/contexts/PassContext'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'
import { PieceColor } from '../../lib/pieceColorUtils.ts'

interface CollapsedRowProps {
  isExpanded: boolean
  toggleRowExpansion: () => void
  pieceColor?: PieceColor
}

export const CollapsedRow = ({
  isExpanded,
  toggleRowExpansion,
  pieceColor,
}: CollapsedRowProps) => {
  const { passNotes, passDiagnoses } = usePass()
  const { pass, isIncomplete } = useSinglePass()
  const [errorsExpanded, setErrorsExpanded] = useState<boolean>(false)
  const passNotesData = passNotes.get(pass.pass_id) || []
  const execMs = useMemo(() => {
    return getExecutionTimeMs(pass)
  }, [pass])

  return (
    <tr
      className="expandable-row"
      onClick={() => toggleRowExpansion()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleRowExpansion()
        }
      }}
      aria-expanded={isExpanded}
      aria-label={`${
        isExpanded ? 'Collapse' : 'Expand'
      } details for pass from ${pass.start.toLocaleTimeString()}`}
    >
      <td>
        <span
          className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
          aria-hidden="true"
        >
          ▶
        </span>
      </td>
      <td className="text-zinc-700">{pass.start.toLocaleDateString()}</td>
      <td className="text-zinc-700 text-xs">
        {pass.pass_id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                navigator.clipboard.writeText(pass.pass_id)
                // Show copied feedback
                const btn = e.currentTarget
                const svg = btn.querySelector('svg')
                const textSpan = btn.querySelector('span')
                // Change to green success state
                btn.classList.remove('bg-gray-100', 'hover:bg-blue-100')
                btn.classList.add('bg-green-100')
                if (svg) {
                  svg.innerHTML =
                    '<path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />'
                  svg.classList.remove('fill-gray-400')
                  svg.classList.add('fill-green-700')
                }
                if (textSpan) {
                  textSpan.classList.remove('text-zinc-600')
                  textSpan.classList.add('text-green-700')
                }
                setTimeout(() => {
                  btn.classList.remove('bg-green-100')
                  btn.classList.add('bg-gray-100', 'hover:bg-blue-100')
                  if (svg) {
                    svg.innerHTML =
                      '<path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />'
                    svg.classList.remove('fill-green-700')
                    svg.classList.add('fill-gray-400')
                  }
                  if (textSpan) {
                    textSpan.classList.remove('text-green-700')
                    textSpan.classList.add('text-zinc-600')
                  }
                }, 1500)
              }}
              className="inline-flex items-center justify-center py-1 rounded text-xs font-medium cursor-pointer bg-gray-100 hover:bg-blue-100 border-none gap-1.5 px-2.5 transition-colors duration-150 group"
              title={`Copy pass ID: ${pass.pass_id}`}
            >
              <span className="font-mono text-zinc-600 text-[11px] group-hover:text-blue-600">
                {pass.pass_id.substring(0, 8)}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-3 h-3 fill-gray-400 transition-colors duration-150 group-hover:fill-blue-600"
              >
                <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
              </svg>
            </button>
            {(() => {
              const hasNotes =
                passNotesData.length > 0 && passNotesData[0].note_text.trim()
              const diagnosisData = passDiagnoses.get(pass.pass_id)
              const hasDiagnosis =
                diagnosisData && (diagnosisData.symptom || diagnosisData.cause)

              if (hasNotes || hasDiagnosis) {
                const titleParts: string[] = []

                if (hasNotes) {
                  const noteTexts = passNotesData
                    .filter((n) => n.note_text.trim())
                    .map((n) => n.note_text.trim())
                  titleParts.push(
                    noteTexts.length === 1
                      ? `Note: ${noteTexts[0]}`
                      : `Notes:\n${noteTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
                  )
                }

                if (hasDiagnosis) {
                  const diagParts: string[] = ['Diagnosis:']
                  if (diagnosisData.symptom)
                    diagParts.push(`  Symptom: ${diagnosisData.symptom}`)
                  if (diagnosisData.cause)
                    diagParts.push(`  Cause: ${diagnosisData.cause}`)
                  titleParts.push(diagParts.join('\n'))
                }

                return (
                  <span
                    className="text-lg flex items-center"
                    title={titleParts.join('\n\n')}
                  >
                    📝
                  </span>
                )
              }
              return null
            })()}
          </div>
        ) : (
          '—'
        )}
      </td>
      <td className="text-zinc-700 text-xs">
        {pass.piece_id || pass.piece_type || pass.piece_model || pass.piece_serial ? (
          <div className="flex flex-col gap-1 items-start leading-tight">
            {(pass.piece_type || pass.piece_model) && (
              <span className="text-zinc-800">
                {[pass.piece_type, pass.piece_model].filter(Boolean).join(' ')}
              </span>
            )}
            {pass.piece_serial && (
              <span className="font-mono text-[11px] text-zinc-500">
                SN {pass.piece_serial}
              </span>
            )}
            {pass.piece_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(pass.piece_id!)
                  const btn = e.currentTarget
                  const svg = btn.querySelector('svg')
                  const textSpan = btn.querySelector('span')
                  btn.classList.add('bg-green-100')
                  if (svg) {
                    svg.innerHTML =
                      '<path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />'
                    svg.classList.remove('fill-gray-400')
                    svg.classList.add('fill-green-700')
                  }
                  if (textSpan) {
                    textSpan.classList.add('text-green-700')
                  }
                  setTimeout(() => {
                    btn.classList.remove('bg-green-100')
                    if (svg) {
                      svg.innerHTML =
                        '<path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />'
                      svg.classList.remove('fill-green-700')
                      svg.classList.add('fill-gray-400')
                    }
                    if (textSpan) {
                      textSpan.classList.remove('text-green-700')
                    }
                  }, 1500)
                }}
                className={`inline-flex items-center justify-center py-1 rounded text-xs font-medium cursor-pointer border-none gap-1.5 px-2.5 transition-colors duration-150 group ${pieceColor?.bg ?? 'bg-gray-100'} ${pieceColor?.hoverBg ?? 'hover:bg-gray-200'}`}
                title={`Copy piece ID: ${pass.piece_id}`}
              >
                <span
                  className={`font-mono text-[11px] ${pieceColor?.text ?? 'text-zinc-600 hover:text-zinc-700 '}`}
                >
                  {pass.piece_id.substring(0, 8)}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-3 h-3 fill-gray-400 transition-colors duration-150"
                >
                  <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          '—'
        )}
      </td>
      <td>
        <StatusBadge pass={pass} isIncomplete={isIncomplete} />
      </td>
      <td className="text-zinc-700">{pass.start.toLocaleTimeString()}</td>
      <td className="text-zinc-700">
        {isInProgress(pass) ? '—' : pass.end.toLocaleTimeString()}
      </td>
      <td className="text-zinc-700">
        {isInProgress(pass) ? '—' : formatDurationToMinutesSeconds(pass.start, pass.end)}
      </td>
      <td className="text-zinc-700">
        {isInProgress(pass) ? '—' : formatDurationToMinutesSeconds(new Date(0), new Date(execMs))}
      </td>
      <td className="text-zinc-700">
        {pass.pass_mode ? (
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-zinc-700 rounded-full border border-gray-200">
            {pass.pass_mode}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="text-zinc-700">
        {pass.steps ? `${pass.steps.length} steps` : '—'}
      </td>
      <td className="text-zinc-700">{formatSelectedZones(pass.selected_zones)}</td>
      <td className="text-zinc-700">
        {pass.selected_num_rounds !== undefined
          ? pass.selected_num_rounds
          : '—'}
      </td>
      <td className="text-zinc-700">
        {pass.err_string ? (
          <div className="flex flex-col items-start gap-1">
            <span
              className="text-red-600 text-xxs font-mono error-text block max-w-full break-words whitespace-pre-wrap"
              title={pass.err_string}
            >
              {errorsExpanded
                ? pass.err_string
                : pass.err_string.length > 200
                  ? `${pass.err_string.substring(0, 200)}...`
                  : pass.err_string}
            </span>
            {pass.err_string.length > 200 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setErrorsExpanded(!errorsExpanded)
                }}
                className="px-2 py-0.5 text-[11px] bg-gray-200 text-red-500 border-none rounded cursor-pointer transition-colors duration-200 font-bold hover:bg-red-500 hover:text-white"
              >
                {errorsExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
    </tr>
  )
}
