import { Pass, RobotConfigMetadata } from '../../lib/types'
import { CollapsedRow } from './CollapsedRow'
import RenderIf from '../RenderIf'
import { PassInfo } from './PassInfo'
import { StepsGrid } from './StepsGrid'
import { Diagnosis } from './Diagnosis'
import { PassFiles } from './PassFiles'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { usePass } from '../../lib/contexts/PassContext'
import { usePagination } from '../../lib/contexts/PaginationContext'
import { useModal } from '../../lib/contexts/ModalContext'
import { useEffect, useMemo, useState } from 'react'
import { getRobotConfigAtTime } from '../../lib/configUtils'
import {
  downloadRobotConfig,
  getPassConfigComparison,
} from '../../lib/configUtils'
import { ModalType } from '../../lib/contexts/ModalContext'
import * as VIAM from '@viamrobotics/sdk'
import { getPassMetadataManager } from '../../lib/passMetadataManager'
import { PassNote } from '../../lib/types'
import { PassDiagnosis } from '../../lib/types'
import { useFiles } from '../../lib/contexts/FilesContext'

interface RowProps {
  globalIndex: string
  pass: Pass
}

export const Row = ({ globalIndex, pass }: RowProps) => {
  const { viamClient, machineId } = useViamClients()
  const {
    partId,
    passNotes,
    passDiagnoses,
    setPassNotes,
    setPassDiagnoses,
    fetchingNotes,
  } = usePass()
  const { currentPassSummaries } = usePagination()
  const { openModal } = useModal()

  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})
  const [fileSearchInputs, setFileSearchInputs] = useState<
    Record<string, string>
  >({})
  const [downloadingConfigs, setDownloadingConfigs] = useState<Set<string>>(
    new Set()
  )
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [configMetadata, setConfigMetadata] = useState<
    Map<string, RobotConfigMetadata>
  >(new Map())
  const [loadingConfigMetadata, setLoadingConfigMetadata] = useState<
    Set<string>
  >(new Set())
  const [diagnosisInputs, setDiagnosisInputs] = useState<
    Record<string, { symptom?: string; cause?: string; jiraTicketUrl?: string }>
  >({})
  const [metadataSuccess, setMetadataSuccess] = useState<Set<string>>(new Set())
  const [savingMetadata, setSavingMetadata] = useState<Set<string>>(new Set())
  const [debouncedFileSearchInputs, setDebouncedFileSearchInputs] = useState<
    Record<string, string>
  >({})
  const [jiraValidationErrors, setJiraValidationErrors] = useState<
    Record<string, string>
  >({})
  const { binaryDataManager } = useFiles()

  // Debounce file search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFileSearchInputs(fileSearchInputs)
    }, 300) // 300ms delay

    return () => {
      clearTimeout(handler)
    }
  }, [fileSearchInputs])

  // Initialize note inputs from existing notes
  useEffect(() => {
    const initialInputs: Record<string, string> = {}
    passNotes.forEach((notes, passId) => {
      if (notes.length > 0) {
        initialInputs[passId] = notes[0].note_text
      }
    })
    setNoteInputs(initialInputs)
  }, [passNotes])

  // Initialize diagnosis inputs from existing diagnoses
  useEffect(() => {
    const initialDiagnoses: Record<
      string,
      { symptom?: string; cause?: string }
    > = {}
    passDiagnoses.forEach((diagnosis, passId) => {
      initialDiagnoses[passId] = {
        symptom: diagnosis.symptom,
        cause: diagnosis.cause,
      }
    })
    setDiagnosisInputs(initialDiagnoses)
  }, [passDiagnoses])

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

  const handleFileSearchChange = (passId: string, value: string) => {
    setFileSearchInputs((prev) => ({
      ...prev,
      [passId]: value,
    }))
  }

  const toggleFilesExpansion = (passId: string) => {
    const newExpandedFiles = new Set(expandedFiles)
    if (newExpandedFiles.has(passId)) {
      newExpandedFiles.delete(passId)
    } else {
      newExpandedFiles.add(passId)
    }
    setExpandedFiles(newExpandedFiles)
  }

  const handleDownloadConfig = async (pass: Pass) => {
    if (!partId) {
      alert('Unable to download config: missing required information')
      return
    }

    const passId = pass.pass_id

    // Add to downloading state
    setDownloadingConfigs((prev) => new Set(prev).add(passId))

    try {
      // Fetch the config that was active at the pass start time
      const result = await getRobotConfigAtTime(viamClient, partId, pass.start)

      if (!result) {
        alert('No configuration found for this time period')
        return
      }

      // Store metadata for display (if not already stored)
      if (!configMetadata.has(passId)) {
        setConfigMetadata((prev) => new Map(prev).set(passId, result.metadata))
      }

      // Download the config
      downloadRobotConfig(
        result.config,
        passId,
        result.metadata.configTimestamp,
        machineId
      )
    } catch (error) {
      console.error('Error downloading config:', error)
      alert('Failed to download configuration. Please try again.')
    } finally {
      // Remove from downloading state
      setDownloadingConfigs((prev) => {
        const newSet = new Set(prev)
        newSet.delete(passId)
        return newSet
      })
    }
  }

  const toggleRowExpansion = () => {
    if (!isExpanded) {
      setIsExpanded(true)

      // Fetch config metadata when expanding a row
      const [dayIndexStr, passIndexStr] = globalIndex.split('-')
      const dayIndex = parseInt(dayIndexStr)
      const passIndex = parseInt(passIndexStr)
      const dateKey = Object.keys(groupedPasses)[dayIndex]
      const pass = groupedPasses[dateKey]?.[passIndex]

      if (
        pass &&
        !configMetadata.has(pass.pass_id) &&
        !loadingConfigMetadata.has(pass.pass_id)
      ) {
        const flatPasses = Object.values(groupedPasses).flat()
        const { prevPass } = getPassConfigComparison(
          pass,
          flatPasses,
          configMetadata
        )
        fetchConfigMetadata(pass, prevPass)
      }
    } else {
      setIsExpanded(false)
    }
  }

  const fetchConfigMetadata = async (pass: Pass, prevPass: Pass | null) => {
    if (!partId) return

    const passId = pass.pass_id
    const prevPassId = prevPass?.pass_id

    const idsToLoad = [passId]
    if (prevPassId && !configMetadata.has(prevPassId)) {
      idsToLoad.push(prevPassId)
    }

    setLoadingConfigMetadata((prev) => new Set([...prev, ...idsToLoad]))

    try {
      const promises = [getRobotConfigAtTime(viamClient, partId, pass.start)]
      if (prevPass) {
        promises.push(getRobotConfigAtTime(viamClient, partId, prevPass.start))
      }

      const results = await Promise.all(promises)

      const newMetadatas = new Map<string, RobotConfigMetadata>()
      if (results[0]) {
        newMetadatas.set(passId, results[0].metadata)
      }
      if (prevPassId && results[1]) {
        newMetadatas.set(prevPassId, results[1].metadata)
      }

      if (newMetadatas.size > 0) {
        setConfigMetadata((prev) => new Map([...prev, ...newMetadatas]))
      }
    } catch (error) {
      console.error('Error fetching config metadata:', error)
    } finally {
      setLoadingConfigMetadata((prev) => {
        const newSet = new Set(prev)
        idsToLoad.forEach((id) => newSet.delete(id))
        return newSet
      })
    }
  }

  const openBeforeAfterModal = (
    beforeImage: VIAM.dataApi.BinaryData | null,
    afterImage: VIAM.dataApi.BinaryData | null
  ) => {
    openModal({ type: ModalType.BEFORE_AFTER, beforeImage, afterImage })
  }

  const handleNoteChange = (passId: string, value: string) => {
    setNoteInputs((prev) => ({
      ...prev,
      [passId]: value,
    }))

    // Clear success state when editing
    if (metadataSuccess.has(passId)) {
      const newSuccess = new Set(metadataSuccess)
      newSuccess.delete(passId)
      setMetadataSuccess(newSuccess)
    }
  }

  const savePassMetadata = async (passId: string, isFailedPass: boolean) => {
    if (!passId || !partId) return

    const noteText = noteInputs[passId]?.trim() || ''
    const diagnosisData = diagnosisInputs[passId] || {}
    const { symptom, cause, jiraTicketUrl } = diagnosisData

    // Show saving indicator
    setSavingMetadata((prev) => new Set(prev).add(passId))

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
      setMetadataSuccess((prev) => new Set(prev).add(passId))

      // Clear success state after a delay
      setTimeout(() => {
        setMetadataSuccess((prev) => {
          const newSuccess = new Set(prev)
          newSuccess.delete(passId)
          return newSuccess
        })
      }, 2000)
    } catch (error) {
      console.error('Failed to save pass metadata:', error)
    } finally {
      setSavingMetadata((prev) => {
        const newSaving = new Set(prev)
        newSaving.delete(passId)
        return newSaving
      })
    }
  }

  const handleDiagnosisChange = (
    passId: string,
    field: 'symptom' | 'cause' | 'jiraTicketUrl',
    value: string
  ) => {
    setDiagnosisInputs((prev) => ({
      ...prev,
      [passId]: {
        ...prev[passId],
        [field]: value || undefined,
      },
    }))

    // Validate JIRA URL format
    if (field === 'jiraTicketUrl') {
      const trimmedValue = value.trim()
      if (trimmedValue === '') {
        // Empty is valid (field is optional)
        setJiraValidationErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[passId]
          return newErrors
        })
      } else {
        // Validate URL format
        try {
          const url = new URL(trimmedValue)
          // Check if it's a Viam JIRA URL
          if (url.hostname !== 'viam.atlassian.net') {
            setJiraValidationErrors((prev) => ({
              ...prev,
              [passId]: 'JIRA URL must be from viam.atlassian.net',
            }))
          } else if (!url.pathname.startsWith('/browse/')) {
            setJiraValidationErrors((prev) => ({
              ...prev,
              [passId]:
                'JIRA URL must follow format: https://viam.atlassian.net/browse/PROJECT-123',
            }))
          } else {
            // Valid JIRA URL
            setJiraValidationErrors((prev) => {
              const newErrors = { ...prev }
              delete newErrors[passId]
              return newErrors
            })
          }
        } catch {
          setJiraValidationErrors((prev) => ({
            ...prev,
            [passId]: 'Please enter a valid URL',
          }))
        }
      }
    }

    // Clear success state when editing
    if (metadataSuccess.has(passId)) {
      const newSuccess = new Set(metadataSuccess)
      newSuccess.delete(passId)
      setMetadataSuccess(newSuccess)
    }
  }

  return (
    <>
      <CollapsedRow
        isExpanded={isExpanded}
        toggleRowExpansion={toggleRowExpansion}
        pass={pass}
      />
      {isExpanded && (
        <tr className="expanded-content">
          <td colSpan={13}>
            <div className="pass-details">
              {/* Build information section moved inside expanded row */}
              <RenderIf condition={pass.build_info !== undefined}>
                <PassInfo
                  pass={pass}
                  groupedPasses={groupedPasses}
                  loadingConfigMetadata={loadingConfigMetadata}
                  configMetadata={configMetadata}
                  fetchConfigMetadata={fetchConfigMetadata}
                  downloadingConfigs={downloadingConfigs}
                  handleDownloadConfig={handleDownloadConfig}
                />
              </RenderIf>

              <div className="passes-container">
                <StepsGrid
                  pass={pass}
                  binaryDataManager={binaryDataManager}
                  openBeforeAfterModal={openBeforeAfterModal}
                />

                {/* Diagnosis and Notes Section - shows for all passes, diagnosis fields only for failed */}
                <Diagnosis
                  pass={pass}
                  fetchingNotes={fetchingNotes}
                  handleDiagnosisChange={handleDiagnosisChange}
                  diagnosisInputs={diagnosisInputs}
                  savingMetadata={savingMetadata}
                  metadataSuccess={metadataSuccess}
                  savePassMetadata={savePassMetadata}
                  noteInputs={noteInputs}
                  jiraValidationErrors={jiraValidationErrors}
                  handleNoteChange={handleNoteChange}
                />

                {/* Parent container for Files and Notes columns */}
                <div style={{ display: 'flex', margin: '0 12px' }}>
                  {/* Column 1: Files captured during this pass */}
                  <div style={{ flex: '2 1 0%', minWidth: 0 }}>
                    <PassFiles
                      pass={pass}
                      binaryDataManager={binaryDataManager}
                      viamClient={viamClient}
                      expandedFiles={expandedFiles}
                      toggleFilesExpansion={toggleFilesExpansion}
                      fileSearchInputs={fileSearchInputs}
                      handleFileSearchChange={handleFileSearchChange}
                      debouncedFileSearchInputs={debouncedFileSearchInputs}
                    />
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
