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
    <div style={{ margin: '1rem 12px 24px 12px' }}>
      <div
        className="step-card"
        style={{
          minWidth: '50%',
          backgroundColor: 'transparent',
        }}
      >
        <div className="step-name" style={{ textAlign: 'left' }}>
          {!pass.success ? 'Diagnosis' : 'Notes'}
        </div>

        {fetchingNotes ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '20px',
                height: '20px',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            ></span>
            <span
              style={{
                marginLeft: '10px',
                color: '#6b7280',
                fontSize: '14px',
              }}
            >
              Loading...
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Diagnosis dropdowns - only for failed passes, displayed in a row */}
            {!pass.success && (
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={`symptom-${passId}`}
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    Symptom
                  </label>
                  <select
                    id={`symptom-${passId}`}
                    value={diagnosisInput.symptom || ''}
                    onChange={(e) =>
                      handleDiagnosisChange('symptom', e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="">Select symptom...</option>
                    {SYMPTOM_OPTIONS.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label
                    htmlFor={`cause-${passId}`}
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#374151',
                      marginBottom: '6px',
                    }}
                  >
                    Cause
                  </label>
                  <select
                    id={`cause-${passId}`}
                    value={diagnosisInput.cause || ''}
                    onChange={(e) =>
                      handleDiagnosisChange('cause', e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
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
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  JIRA Ticket (e.g. https://viam.atlassian.net/browse/RSDK-1234)
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <input
                    id={`jira-${passId}`}
                    type="url"
                    value={diagnosisInput.jiraTicketUrl || ''}
                    onChange={(e) =>
                      handleDiagnosisChange('jiraTicketUrl', e.target.value)
                    }
                    placeholder="https://viam.atlassian.net/browse/RSDK-..."
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                    }}
                  />
                  {diagnosisInput.jiraTicketUrl && !jiraValidationError && (
                    <a
                      href={diagnosisInput.jiraTicketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: '#3b82f6',
                        textDecoration: 'none',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Open JIRA ticket"
                    >
                      🔗
                    </a>
                  )}
                </div>
                {jiraValidationError && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#dc2626',
                      marginTop: '4px',
                    }}
                  >
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
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Notes
                </label>
              )}
              <textarea
                id={`pass-notes-${passId}`}
                value={noteInput || ''}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Add a note for this pass..."
                style={{
                  width: '100%',
                  minHeight: '72px',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  outline: 'none',
                  lineHeight: '1.5',
                }}
                aria-label={`Notes for pass ${passId}`}
              />
            </div>

            {/* Save button - full width at bottom */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => savePassMetadata(passId, !pass.success)}
                disabled={(() => {
                  if (savingMetadata || metadataSuccess) return true
                  // Disable if there are JIRA validation errors
                  if (jiraValidationError) return true
                  const noteText = noteInput || ''
                  const existingNoteText =
                    passNotesData.length > 0 ? passNotesData[0].note_text : ''
                  const noteChanged =
                    noteText.trim() !== existingNoteText.trim()
                  if (!pass.success) {
                    const diagnosisChanged =
                      (passDiagnoses.get(passId)?.symptom || '') !==
                        (diagnosisInput.symptom || '') ||
                      (passDiagnoses.get(passId)?.cause || '') !==
                        (diagnosisInput.cause || '') ||
                      (passDiagnoses.get(passId)?.jira_ticket_url || '') !==
                        (diagnosisInput.jiraTicketUrl || '')
                    return !noteChanged && !diagnosisChanged
                  }
                  return !noteChanged
                })()}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  color: 'white',
                  backgroundColor: metadataSuccess
                    ? '#10b981'
                    : (() => {
                        if (savingMetadata) return '#9ca3af'
                        const noteText = noteInput || ''
                        const existingNoteText =
                          passNotesData.length > 0
                            ? passNotesData[0].note_text
                            : ''
                        const noteChanged =
                          noteText.trim() !== existingNoteText.trim()
                        if (!pass.success) {
                          const diagnosisChanged =
                            (passDiagnoses.get(passId)?.symptom || '') !==
                              (diagnosisInput.symptom || '') ||
                            (passDiagnoses.get(passId)?.cause || '') !==
                              (diagnosisInput.cause || '') ||
                            (passDiagnoses.get(passId)?.jira_ticket_url ||
                              '') !== (diagnosisInput.jiraTicketUrl || '')
                          return noteChanged || diagnosisChanged
                            ? '#3b82f6'
                            : '#9ca3af'
                        }
                        return noteChanged ? '#3b82f6' : '#9ca3af'
                      })(),
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (() => {
                    if (savingMetadata || metadataSuccess) return 'not-allowed'
                    const noteText = noteInput || ''
                    const existingNoteText =
                      passNotesData.length > 0 ? passNotesData[0].note_text : ''
                    const noteChanged =
                      noteText.trim() !== existingNoteText.trim()
                    if (!pass.success) {
                      const diagnosisChanged =
                        (passDiagnoses.get(passId)?.symptom || '') !==
                          (diagnosisInput.symptom || '') ||
                        (passDiagnoses.get(passId)?.cause || '') !==
                          (diagnosisInput.cause || '') ||
                        (passDiagnoses.get(passId)?.jira_ticket_url || '') !==
                          (diagnosisInput.jiraTicketUrl || '')
                      return noteChanged || diagnosisChanged
                        ? 'pointer'
                        : 'not-allowed'
                    }
                    return noteChanged ? 'pointer' : 'not-allowed'
                  })(),
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  const noteText = noteInput || ''
                  const existingNoteText =
                    passNotesData.length > 0 ? passNotesData[0].note_text : ''
                  const noteChanged =
                    noteText.trim() !== existingNoteText.trim()
                  let hasChanges = noteChanged
                  if (!pass.success) {
                    const diagnosisChanged =
                      (passDiagnoses.get(passId)?.symptom || '') !==
                        (diagnosisInput.symptom || '') ||
                      (passDiagnoses.get(passId)?.cause || '') !==
                        (diagnosisInput.cause || '') ||
                      (passDiagnoses.get(passId)?.jira_ticket_url || '') !==
                        (diagnosisInput.jiraTicketUrl || '')
                    hasChanges = noteChanged || diagnosisChanged
                  }
                  if (hasChanges && !savingMetadata && !metadataSuccess) {
                    e.currentTarget.style.backgroundColor = '#2563eb'
                  }
                }}
                onMouseLeave={(e) => {
                  const noteText = noteInput || ''
                  const existingNoteText =
                    passNotesData.length > 0 ? passNotesData[0].note_text : ''
                  const noteChanged =
                    noteText.trim() !== existingNoteText.trim()
                  let hasChanges = noteChanged
                  if (!pass.success) {
                    const diagnosisChanged =
                      (passDiagnoses.get(passId)?.symptom || '') !==
                        (diagnosisInput.symptom || '') ||
                      (passDiagnoses.get(passId)?.cause || '') !==
                        (diagnosisInput.cause || '') ||
                      (passDiagnoses.get(passId)?.jira_ticket_url || '') !==
                        (diagnosisInput.jiraTicketUrl || '')
                    hasChanges = noteChanged || diagnosisChanged
                  }
                  if (hasChanges && !savingMetadata && !metadataSuccess) {
                    e.currentTarget.style.backgroundColor = '#3b82f6'
                  }
                }}
              >
                {savingMetadata ? (
                  <>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid #ffffff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    Saving...
                  </>
                ) : metadataSuccess ? (
                  '✓ Saved'
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
