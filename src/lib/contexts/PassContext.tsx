import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react'
import { Pass, PassNote, PassDiagnosis } from '../types'
import { JsonValue } from '@viamrobotics/sdk'
import { useViamClients } from './ViamClientContext'
import { getPassMetadataManager } from '../passMetadataManager'

const sandingSummaryName = 'sanding-summary'
const sandingSummaryComponentType = 'rdk:component:sensor'

/**
 * Transforms raw tabular data from MQL query into Pass objects
 */
function processTabularDataToPasses(tabularData: any[]): Pass[] {
  const mapped = tabularData.map((item: any) => {
    const pass = item.data!.readings!
    const buildInfo = pass.build_info ? pass.build_info : {}

    return {
      start: new Date(pass.start),
      end: new Date(pass.end),
      steps: pass.steps
        ? pass.steps.map((x: any) => ({
            name: x.name!,
            start: new Date(x.start),
            end: new Date(x.end),
            pass_id: pass.pass_id,
          }))
        : [],
      success: pass.success ?? true,
      pass_id: pass.pass_id,
      err_string: pass.err_string || null,
      build_info: buildInfo,
      pass_mode:
        pass.pass_mode != null
          ? String(pass.pass_mode)
          : undefined,
      sanding_distance_mm:
        pass.sanding_distance_mm != null
          ? Number(pass.sanding_distance_mm)
          : undefined,
      selected_zones:
        pass.selected_zones != null
          ? pass.selected_zones
          : undefined,
      selected_num_rounds:
        pass.selected_num_rounds != null
          ? Number(pass.selected_num_rounds)
          : undefined,
      piece_id:
        pass.piece_id != null
          ? String(pass.piece_id)
          : undefined,
      version:
        pass.version != null
          ? Number(pass.version)
          : undefined,
    }
  })
  return mapped
}

// TODO: decompose this more into a notes and diagnoses context and a pass summaries context which use this data
interface PassContextType {
  passSummaries: Pass[]
  passSummariesByDay: Record<string, Pass[]>
  partId: string
  passNotes: Map<string, PassNote[]>
  setPassNotes: React.Dispatch<React.SetStateAction<Map<string, PassNote[]>>>
  passDiagnoses: Map<string, PassDiagnosis>
  setPassDiagnoses: React.Dispatch<
    React.SetStateAction<Map<string, PassDiagnosis>>
  >
  fetchingNotes: boolean
}

const PassContext = createContext<PassContextType | undefined>(undefined)

export function PassProvider({ children }: { children: ReactNode }) {
  const { locationId, machineId, organizationId, viamClient } = useViamClients()

  const [passSummaries, setPassSummaries] = useState<Pass[]>([])
  const [passSummariesByDay, setPassSummariesByDay] = useState<
    Record<string, Pass[]>
  >({})
  const [partId, setPartId] = useState<string>('')
  const [passNotes, setPassNotes] = useState<Map<string, PassNote[]>>(new Map())
  const [passDiagnoses, setPassDiagnoses] = useState<
    Map<string, PassDiagnosis>
  >(new Map())
  const [fetchingNotes, setFetchingNotes] = useState<boolean>(false)

  const fetchPassMetadata = async (passes: Pass[], extractedPartId: string) => {
    if (passes.length === 0 || !extractedPartId) return

    const passIds = passes.map((pass) => pass.pass_id).filter(Boolean)

    setFetchingNotes(true)

    const metadataManager = getPassMetadataManager(viamClient, machineId)
    const [fetchedNotes, fetchedDiagnoses] = await Promise.all([
      metadataManager.fetchNotesForPasses(passIds),
      metadataManager.fetchDiagnosesForPasses(passIds),
    ])

    setPassNotes(fetchedNotes)
    setPassDiagnoses(fetchedDiagnoses)
    setFetchingNotes(false)
  }

  const initialPassQuery = async () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const hdsQuery: any[] = [
      {
        $match: {
          organization_id: organizationId,
          location_id: locationId,
          component_name: sandingSummaryName,
          robot_id: machineId,
          component_type: sandingSummaryComponentType,
          time_received: {
            $gte: oneWeekAgo,
          },
        },
      },
      // Sort by version descending so $first in $group picks the highest-version record per pass
      { $sort: { 'data.readings.version': -1 } },
      { $group: { _id: '$data.readings.pass_id', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { time_received: -1 } },
    ]

    const hotDataStoreResults = await viamClient.dataClient.tabularDataByMQL(
      organizationId,
      hdsQuery,
      true
    )

    console.log('Hot Data Store Results length:', hotDataStoreResults.length)

    let extractedPartId = ''
    if (hotDataStoreResults && hotDataStoreResults.length > 0) {
      extractedPartId = (hotDataStoreResults[0] as any).part_id || ''
      setPartId(extractedPartId)
    }

    const processedPasses = processTabularDataToPasses(hotDataStoreResults)
    setPassSummaries(processedPasses)

    await fetchPassMetadata(processedPasses, extractedPartId)
  }

  const fetchPasses = async () => {
    // Server-side deduplication: group by pass_id and keep only the highest-version
    // record per pass. This avoids the O(N) client-side dedup that would grow with
    // the number of incremental snapshots published per pass.
    const mqlQuery: Record<string, JsonValue>[] = [
      {
        $match: {
          organization_id: organizationId,
          location_id: locationId,
          component_name: sandingSummaryName,
          robot_id: machineId,
          component_type: sandingSummaryComponentType,
        },
      },
      // Sort by version descending so $first in $group picks the highest-version record per pass
      { $sort: { 'data.readings.version': -1 } },
      { $group: { _id: '$data.readings.pass_id', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { time_received: -1 } },
    ]

    console.log('Fetching pass summaries')
    const tabularData = await viamClient.dataClient.tabularDataByMQL(
      organizationId,
      mqlQuery
    )
    console.log(`Received ${tabularData.length} pass records`)

    let extractedPartId = ''
    if (tabularData.length > 0) {
      extractedPartId = (tabularData[0] as any).part_id || ''
      setPartId(extractedPartId)
    }

    const processedPasses = processTabularDataToPasses(tabularData)
    setPassSummaries(processedPasses)

    await fetchPassMetadata(processedPasses, extractedPartId)
  }

  useEffect(() => {
    initialPassQuery().then(() => {
      fetchPasses()
    })
  }, [locationId, machineId, organizationId, viamClient])

  useEffect(() => {
    const groupedByDay = passSummaries.reduce(
      (acc: Record<string, Pass[]>, pass) => {
        // Use a consistent date key (YYYY-MM-DD)
        const dateKey = pass.start.toISOString().split('T')[0]
        if (!acc[dateKey]) {
          acc[dateKey] = []
        }
        acc[dateKey].push(pass)
        return acc
      },
      {}
    )

    setPassSummariesByDay(groupedByDay)
  }, [passSummaries])

  return (
    <PassContext.Provider
      value={{
        passSummaries,
        passSummariesByDay,
        partId,
        passNotes,
        setPassNotes,
        passDiagnoses,
        setPassDiagnoses,
        fetchingNotes,
      }}
    >
      {children}
    </PassContext.Provider>
  )
}

export function usePass() {
  const context = useContext(PassContext)
  if (context === undefined) {
    throw new Error('usePass must be used within a PassProvider')
  }
  return context
}
