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
import { useMemo, useState } from 'react'
import { getRobotConfigAtTime } from '../../lib/configUtils'
import {
  downloadRobotConfig,
  getPassConfigComparison,
} from '../../lib/configUtils'

interface RowProps {
  globalIndex: string
  pass: Pass
}

export const Row = ({ globalIndex, pass }: RowProps) => {
  const { viamClient, machineId } = useViamClients()
  const { partId } = usePass()
  const { currentPassSummaries } = usePagination()

  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [downloadingConfigs, setDownloadingConfigs] = useState<Set<string>>(
    new Set()
  )
  const [configMetadata, setConfigMetadata] = useState<
    Map<string, RobotConfigMetadata>
  >(new Map())
  const [loadingConfigMetadata, setLoadingConfigMetadata] = useState<
    Set<string>
  >(new Set())

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
                <StepsGrid pass={pass} />

                {/* Diagnosis and Notes Section - shows for all passes, diagnosis fields only for failed */}
                <Diagnosis pass={pass} />

                {/* Parent container for Files and Notes columns */}
                <div style={{ display: 'flex', margin: '0 12px' }}>
                  {/* Column 1: Files captured during this pass */}
                  <div style={{ flex: '2 1 0%', minWidth: 0 }}>
                    <PassFiles pass={pass} />
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
