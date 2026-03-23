import { Pass, RobotConfigMetadata } from '../../lib/types'
import { CollapsedRow } from './CollapsedRow'
import RenderIf from '../RenderIf'
import { PassInfo } from './PassInfo'
import { Diagnosis } from './Diagnosis'
import { PassFiles } from './PassFiles'
import { usePass } from '../../lib/contexts/PassContext'
import { usePagination } from '../../lib/contexts/PaginationContext'
import { useState } from 'react'
import { getRobotConfigAtTime } from '../../lib/configUtils'
import { getPassConfigComparison } from '../../lib/configUtils'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'
import { StepsGrid } from './StepsGrid'
import { PieceColor } from '../../lib/pieceColorUtils.ts'

interface RowProps {
  globalIndex: string
  pieceColor?: PieceColor
}

const Row = ({ globalIndex, pieceColor }: RowProps) => {
  const { partId } = usePass()
  const { viamClient } = useViamClients()
  const { groupedPasses } = usePagination()
  const { pass, fetchStepFiles, fetchAllPassFiles, cancelFetch } =
    useSinglePass()

  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [configMetadata, setConfigMetadata] = useState<
    Map<string, RobotConfigMetadata>
  >(new Map())
  const [loadingConfigMetadata, setLoadingConfigMetadata] = useState<
    Set<string>
  >(new Set())

  const toggleRowExpansion = () => {
    const newExpandedState = !isExpanded
    setIsExpanded(newExpandedState)

    if (!newExpandedState) {
      cancelFetch()
      window.history.replaceState(null, '', '#/')
      return
    }

    window.history.replaceState(null, '', `#/passes/${pass.pass_id}`)

    const [dayIndexStr, passIndexStr] = globalIndex.split('-')
    const dayIndex = parseInt(dayIndexStr)
    const passIndex = parseInt(passIndexStr)
    const dateKey = Object.keys(groupedPasses)[dayIndex]
    const currentPass = groupedPasses[dateKey]?.[passIndex]

    fetchStepFiles()
    fetchAllPassFiles()

    if (!currentPass) return
    if (configMetadata.has(currentPass.pass_id)) return
    if (loadingConfigMetadata.has(currentPass.pass_id)) return
    const flatPasses = Object.values(groupedPasses).flat()
    const { prevPass } = getPassConfigComparison(
      currentPass,
      flatPasses,
      configMetadata
    )

    fetchConfigMetadata(currentPass, prevPass)
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
        pieceColor={pieceColor}
      />
      {isExpanded && (
        <tr className="expanded-content">
          <td colSpan={14}>
            <div className="pass-details">
              {/* Build information section moved inside expanded row */}
              <RenderIf condition={pass.build_info !== undefined}>
                <PassInfo
                  configMetadata={configMetadata}
                  loadingConfigMetadata={loadingConfigMetadata.has(
                    pass.pass_id
                  )}
                  setConfigMetadata={setConfigMetadata}
                  fetchConfigMetadata={fetchConfigMetadata}
                />
              </RenderIf>

              <div className="passes-container">
                <StepsGrid />

                {/* Diagnosis and Notes Section - shows for all passes, diagnosis fields only for failed */}
                <Diagnosis />

                {/* Parent container for Files and Notes columns */}
                <div className="flex mx-3">
                  {/* Column 1: Files captured during this pass */}
                  <div className="flex-[2_1_0%] min-w-0">
                    <PassFiles />
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

export default Row
