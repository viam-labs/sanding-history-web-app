import { useState, useEffect } from 'react'
import { PassNote, PassDiagnosis } from '../../lib/types'
import { CAUSE_OPTIONS, SYMPTOM_OPTIONS } from '../../lib/types'
import { usePass } from '../../lib/contexts/PassContext'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { getPassMetadataManager } from '../../lib/passMetadataManager'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'

export const Diagnosis: React.FC = () => {
  const { fetchingNotes } = usePass()
  const { passNotes, passDiagnoses, setPassNotes, setPassDiagnoses } = usePass()
  const { pass } = useSinglePass()
  const passNotesData = passNotes.get(pass.pass_id) || []
  const passId = pass.pass_id
  const { partId } = usePass()
  const { viamClient, machineId } = useViamClients()
  const [noteInput, setNoteInput] = useState<string>('')
  const [diagnosisInput, setDiagnosisInput] = useState<{
    symptom?: string
    cause?: string
    jiraTicketUrl?: string
  }>({})
  const [jiraValidationError, setJiraValidationError] = useState<string>('')
  const [metadataSuccess, setMetadataSuccess] = useState<boolean>(false)
  const [savingMetadata, setSavingMetadata] = useState<boolean>(false)

  // Initialize note inputs from existing notes
  useEffect(() => {
    const existingNoteText =
      passNotesData.length > 0 ? passNotesData[0].note_text : ''
    setNoteInput(existingNoteText)
  }, [passNotes])

  // Initialize diagnosis inputs from existing diagnoses
  useEffect(() => {
    const existingDiagnosis = passDiagnoses.get(passId)
    if (existingDiagnosis) {
      const initialDiagnosis = {
        symptom: existingDiagnosis.symptom,
        cause: existingDiagnosis.cause,
      }
      setDiagnosisInput(initialDiagnosis)
    }
  }, [passDiagnoses])

  const handleDiagnosisChange = (
    field: 'symptom' | 'cause' | 'jiraTicketUrl',
    value: string
  ) => {
    setDiagnosisInput((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Validate JIRA URL format
    if (field === 'jiraTicketUrl') {
      const trimmedValue = value.trim()
      if (trimmedValue === '') {
        // Empty is valid (field is optional)
        setJiraValidationError('')
      } else {
        // Validate URL format
        try {
          const url = new URL(trimmedValue)
          // Check if it's a Viam JIRA URL
          if (url.hostname !== 'viam.atlassian.net') {
            setJiraValidationError('JIRA URL must be from viam.atlassian.net')
          } else if (!url.pathname.startsWith('/browse/')) {
            setJiraValidationError(
              'JIRA URL must follow format: https://viam.atlassian.net/browse/PROJECT-123'
            )
          } else {
            // Valid JIRA URL
            setJiraValidationError('')
          }
        } catch {
          setJiraValidationError('Please enter a valid URL')
        }
      }
    }
  }

  const handleNoteChange = (value: string) => {
    setNoteInput(value)

    // Clear success state when editing
    setMetadataSuccess(false)
  }

  const savePassMetadata = async (passId: string, isFailedPass: boolean) => {
    if (!passId || !partId) return

    const noteText = noteInput.trim() || ''
    const diagnosisData = diagnosisInput || {}
    const { symptom, cause, jiraTicketUrl } = diagnosisData

    // Show saving indicator
    setSavingMetadata(true)

    try {
      const metadataManager = getPassMetadataManager(viamClient, machineId)

      // Save note
      await metadataManager.savePassNote(passId, noteText)

      // Save diagnosis only for failed passes
      if (isFailedPass) {
        await metadataManager.savePassDiagnosis(
          passId,
          symptom,
          cause,
          jiraTicketUrl
        )
      }

      // Update notes in state
      const newNote: PassNote = {
        pass_id: passId,
        note_text: noteText,
        created_at: new Date().toISOString(),
        created_by: 'summary-web-app',
      }
      setPassNotes((prevNotes) => {
        const newNotesMap = new Map(prevNotes)
        newNotesMap.set(passId, [newNote])
        return newNotesMap
      })

      // Update diagnoses in state (only for failed passes)
      if (isFailedPass) {
        setPassDiagnoses((prevDiagnoses) => {
          const newDiagnosesMap = new Map(prevDiagnoses)
          if (symptom || cause || jiraTicketUrl) {
            newDiagnosesMap.set(passId, {
              pass_id: passId,
              symptom: symptom as PassDiagnosis['symptom'],
              cause: cause as PassDiagnosis['cause'],
              jira_ticket_url: jiraTicketUrl,
              updated_at: new Date().toISOString(),
              updated_by: 'summary-web-app',
            })
          } else {
            newDiagnosesMap.delete(passId)
          }
          return newDiagnosesMap
        })
      }

      // Show success state
      setMetadataSuccess(true)

      // Clear success state after a delay
      setTimeout(() => {
        setMetadataSuccess(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to save pass metadata:', error)
    } finally {
      setSavingMetadata(false)
    }
  }

  return (
    <div className="m-4 mx-3 mb-6">
      <div className="step-card min-w-[50%] bg-transparent">
        <div className="step-name text-left">
          {!pass.success ? 'Diagnosis' : 'Notes'}
        </div>

        {fetchingNotes ? (
          <div className="flex items-center justify-center min-h-[80px]">
            <span className="inline-block w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></span>
            <span className="ml-2.5 text-gray-500 text-sm">
              Loading...
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Diagnosis dropdowns - only for failed passes, displayed in a row */}
            {!pass.success && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label
                    htmlFor={`symptom-${passId}`}
                    className="block text-[13px] font-medium text-gray-700 mb-1.5"
                  >
                    Symptom
                  </label>
                  <select
                    id={`symptom-${passId}`}
                    value={diagnosisInput.symptom || ''}
                    onChange={(e) =>
                      handleDiagnosisChange('symptom', e.target.value)
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white cursor-pointer outline-none"
                  >
                    <option value="">Select symptom...</option>
                    {SYMPTOM_OPTIONS.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label
                    htmlFor={`cause-${passId}`}
                    className="block text-[13px] font-medium text-gray-700 mb-1.5"
                  >
                    Cause
                  </label>
                  <select
                    id={`cause-${passId}`}
                    value={diagnosisInput.cause || ''}
                    onChange={(e) =>
                      handleDiagnosisChange('cause', e.target.value)
                    }
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white cursor-pointer outline-none"
                  >
                    <option value="">Select cause...</option>
                    {CAUSE_OPTIONS.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* JIRA Ticket URL - only for failed passes when cause is selected */}
            {!pass.success && diagnosisInput.cause && (
              <div>
                <label
                  htmlFor={`jira-${passId}`}
                  className="block text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  JIRA Ticket (e.g. https://viam.atlassian.net/browse/RSDK-1234)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`jira-${passId}`}
                    type="url"
                    value={diagnosisInput.jiraTicketUrl || ''}
                    onChange={(e) =>
                      handleDiagnosisChange('jiraTicketUrl', e.target.value)
                    }
                    placeholder="https://viam.atlassian.net/browse/RSDK-..."
                    className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-md bg-white outline-none"
                  />
                  {diagnosisInput.jiraTicketUrl && !jiraValidationError && (
                    <a
                      href={diagnosisInput.jiraTicketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 text-sm text-blue-500 no-underline border border-gray-300 rounded-md bg-white flex items-center"
                      title="Open JIRA ticket"
                    >
                      🔗
                    </a>
                  )}
                </div>
                {jiraValidationError && (
                  <div className="text-xs text-red-600 mt-1">
                    {jiraValidationError}
                  </div>
                )}
              </div>
            )}

            {/* Notes textarea - always shown */}
            <div>
              {/* Only show label when there are diagnosis fields above */}
              {!pass.success && (
                <label
                  htmlFor={`pass-notes-${passId}`}
                  className="block text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  Notes
                </label>
              )}
              <textarea
                id={`pass-notes-${passId}`}
                value={noteInput || ''}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Add a note for this pass..."
                className="w-full min-h-[72px] px-3 py-2.5 text-sm border border-gray-300 rounded-md resize-y font-inherit bg-white box-border outline-none leading-normal"
                aria-label={`Notes for pass ${passId}`}
              />
            </div>

            {/* Save button - full width at bottom */}
            <div className="flex justify-end">
              {(() => {
                const noteText = noteInput || ''
                const existingNoteText =
                  passNotesData.length > 0 ? passNotesData[0].note_text : ''
                const noteChanged = noteText.trim() !== existingNoteText.trim()
                const diagnosisChanged = !pass.success && (
                  (passDiagnoses.get(passId)?.symptom || '') !== (diagnosisInput.symptom || '') ||
                  (passDiagnoses.get(passId)?.cause || '') !== (diagnosisInput.cause || '') ||
                  (passDiagnoses.get(passId)?.jira_ticket_url || '') !== (diagnosisInput.jiraTicketUrl || '')
                )
                const hasChanges = noteChanged || diagnosisChanged
                const isDisabled = savingMetadata || metadataSuccess || jiraValidationError || !hasChanges

                return (
                  <button
                    type="button"
                    onClick={() => savePassMetadata(passId, !pass.success)}
                    disabled={isDisabled}
                    className={`px-2 py-1.5 text-xs text-white border-none rounded transition-colors duration-200 flex items-center gap-1.5 ${
                      metadataSuccess
                        ? 'bg-emerald-500 cursor-not-allowed'
                        : isDisabled
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
                    }`}
                  >
                    {savingMetadata ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : metadataSuccess ? (
                      '✓ Saved'
                    ) : (
                      'Save'
                    )}
                  </button>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
