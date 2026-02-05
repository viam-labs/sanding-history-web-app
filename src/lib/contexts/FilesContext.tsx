import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react'
import { useViamClients } from './ViamClientContext'
import { Pass } from '../types'
import { FileQueryManager, FileQueryCallback } from '../FileQueryManager'
import { BinaryDataFile } from '../BinaryDataFile'

interface FilesContextType {
  fetchImages: (
    pass: Pass,
    onQuery: FileQueryCallback,
    signal?: AbortSignal
  ) => Promise<void>

  fetchVideos: (
    pass: Pass,
    onQuery: FileQueryCallback,
    forceRefresh?: boolean
  ) => Promise<void>

  fetchAllPassFiles: (
    pass: Pass,
    onQuery: FileQueryCallback,
    signal?: AbortSignal
  ) => Promise<void>

  mostRecentSyncDelayMs: number | undefined
}

const FilesContext = createContext<FilesContextType | undefined>(undefined)

export function FilesProvider({ children }: { children: ReactNode }) {
  const { viamClient, organizationId, locationId, machineId, partId } =
    useViamClients()

  const queryManager = useRef<FileQueryManager>(new FileQueryManager())
  const [mostRecentSyncDelayMs, setMostRecentSyncDelayMs] = useState<
    number | undefined
  >(undefined)
  const mostRecentTimeReceived = useRef<Date | undefined>(undefined)

  const updateMostRecentSyncDelay = useCallback((files: BinaryDataFile[]) => {
    for (const file of files) {
      const timeReceived = file.timeReceived
      if (!timeReceived) continue

      // Only update if this is the most recent file we've seen
      if (
        !mostRecentTimeReceived.current ||
        timeReceived > mostRecentTimeReceived.current
      ) {
        mostRecentTimeReceived.current = timeReceived
        const syncDelay = file.getSyncDelayMs()
        if (syncDelay !== undefined) {
          setMostRecentSyncDelayMs(syncDelay)
        }
      }
    }
  }, [])

  const fetchImages = useCallback(
    async (pass: Pass, onQuery: FileQueryCallback, signal?: AbortSignal) => {
      console.log(`Fetching images for pass ${pass.pass_id}`)

      return await queryManager.current.queryImages({
        organizationId,
        locationId,
        machineId,
        partId,
        viamClient,
        passId: pass.pass_id,
        passStart: pass.start,
        passEnd: pass.end,
        onQuery: (files) => {
          updateMostRecentSyncDelay(files)
          onQuery(files)
        },
        signal,
      })
    },
    [
      organizationId,
      locationId,
      machineId,
      partId,
      viamClient,
      updateMostRecentSyncDelay,
    ]
  )

  const fetchVideos = useCallback(
    async (pass: Pass, onQuery: FileQueryCallback, forceRefresh?: boolean) => {
      console.log(
        `Fetching videos for pass ${pass.pass_id}${forceRefresh ? ' (force refresh)' : ''}`
      )

      return await queryManager.current.queryVideos({
        organizationId,
        locationId,
        machineId,
        partId,
        passId: pass.pass_id,
        viamClient,
        passStart: pass.start,
        passEnd: pass.end,
        onQuery: (files) => {
          updateMostRecentSyncDelay(files)
          onQuery(files)
        },
        forceRefresh,
      })
    },
    [
      organizationId,
      locationId,
      machineId,
      partId,
      viamClient,
      updateMostRecentSyncDelay,
    ]
  )

  const fetchAllPassFiles = useCallback(
    async (pass: Pass, onQuery: FileQueryCallback, signal?: AbortSignal) => {
      console.log(`Fetching all files for pass ${pass.pass_id}`)

      await queryManager.current.queryPassFiles({
        organizationId,
        locationId,
        machineId,
        partId,
        viamClient,
        passId: pass.pass_id,
        passStart: pass.start,
        passEnd: pass.end,
        onQuery: (files) => {
          updateMostRecentSyncDelay(files)
          onQuery(files)
        },
        signal,
      })
    },
    [
      organizationId,
      locationId,
      machineId,
      partId,
      viamClient,
      updateMostRecentSyncDelay,
    ]
  )

  return (
    <FilesContext.Provider
      value={{
        fetchImages,
        fetchVideos,
        fetchAllPassFiles,
        mostRecentSyncDelayMs,
      }}
    >
      {children}
    </FilesContext.Provider>
  )
}

export function useFiles() {
  const context = useContext(FilesContext)
  if (context === undefined) {
    throw new Error('useFiles must be used within an FilesProvider')
  }
  return context
}
