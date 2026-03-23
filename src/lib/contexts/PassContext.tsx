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
const BATCH_SIZE = 1000

/**
 * Transforms raw tabular data from MQL query into Pass objects
 */
function processTabularDataToPasses(tabularData: any[]): Pass[] {
  return tabularData.map((item: any) => {
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
    }
  })
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
      {
        $sort: {
          time_received: -1,
        },
      },
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
    // batched fetching of pass summaries
    let allTabularData: any[] = []
    let hasMoreData = true
    let oldestTimeReceived: string | null = null

    while (hasMoreData) {
      const baseQuery: Record<string, JsonValue>[] = [
        {
          $match: {
            organization_id: organizationId,
            location_id: locationId,
            component_name: sandingSummaryName,
            robot_id: machineId,
            component_type: sandingSummaryComponentType,
          },
        },
        {
          $sort: {
            time_received: -1,
          },
        },
      ]

      // Add time filter for pagination if we have a previous batch
      if (oldestTimeReceived) {
        ;(baseQuery[0].$match as Record<string, JsonValue>).time_received = {
          $lt: oldestTimeReceived,
        }
      }

      // Add limit
      const mqlQuery = [
        ...baseQuery,
        {
          $limit: BATCH_SIZE,
        },
      ]

      console.log(
        `Fetching batch of sanding summaries${oldestTimeReceived ? ' older than ' + new Date(oldestTimeReceived).toISOString() : ''}`
      )
      const batchData = await viamClient.dataClient.tabularDataByMQL(
        organizationId,
        mqlQuery
      )
      console.log(`Received ${batchData.length} records in batch`)

      // If we have data, process it
      if (batchData.length > 0) {
        // Get the oldest time_received from this batch for next query
        const lastItem = batchData[batchData.length - 1]

        if ('time_received' in lastItem) {
          oldestTimeReceived = lastItem.time_received as string
        } else {
          console.error(
            "Cannot find 'time_received' field for pagination in tabular data response:",
            lastItem
          )
          hasMoreData = false
        }

        allTabularData = [...allTabularData, ...batchData]

        // If we have fewer records than the batch size, we're done
        if (batchData.length < BATCH_SIZE) {
          hasMoreData = false
        }
      } else {
        // No more data
        hasMoreData = false
      }
    }

    console.log(`Total tabular data records fetched: ${allTabularData.length}`)

    let extractedPartId = ''
    if (allTabularData && allTabularData.length > 0) {
      extractedPartId = (allTabularData[0] as any).part_id || ''
      setPartId(extractedPartId)
    }

    const processedPasses = processTabularDataToPasses(allTabularData)
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
