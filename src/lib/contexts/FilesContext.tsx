import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from 'react'
import { useViamClients } from './ViamClientContext'
import { Pass } from '../types'
import { FileQueryManager, FileQueryCallback } from '../FileQueryManager'

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

  fetchMostRecentFile: (
    mostRecentPass: Pass,
    onQuery: FileQueryCallback,
    signal?: AbortSignal
  ) => Promise<void>
}

const FilesContext = createContext<FilesContextType | undefined>(undefined)

export function FilesProvider({ children }: { children: ReactNode }) {
  const { viamClient, organizationId, locationId, machineId, partId } =
    useViamClients()

  const queryManager = useRef<FileQueryManager>(new FileQueryManager())

  const fetchMostRecentFile = useCallback(
    async (mostRecentPass: Pass, onQuery: FileQueryCallback, signal?: AbortSignal) => {
      return await queryManager.current.queryMostRecentFile({
        organizationId,
        locationId,
        machineId,
        partId,
        viamClient,
        passId: mostRecentPass.pass_id,
        passStart: mostRecentPass.start,
        passEnd: mostRecentPass.end,
        onQuery: (files) => {
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
      viamClient
    ]
  )

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
      viamClient
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
      viamClient
    ]
  )

  const fetchAllPassFiles = useCallback(
    async (pass: Pass, onQuery: FileQueryCallback, signal?: AbortSignal) => {
      console.log(`Fetching all files for pass ${pass.pass_id}`)

      const sharedParams = {
        organizationId,
        locationId,
        machineId,
        partId,
        viamClient,
        passId: pass.pass_id,
        passStart: pass.start,
        passEnd: pass.end,
        onQuery: (files: Parameters<FileQueryCallback>[0]) => {
          onQuery(files)
        },
        signal,
      }

      // TODO: Remove time-based queryPassFiles call on March 20 2026
      await Promise.all([
        queryManager.current.queryPassFiles(sharedParams),
        queryManager.current.queryPassFiles({ ...sharedParams, tags: [pass.pass_id] }),
      ])
    },
    [
      organizationId,
      locationId,
      machineId,
      partId,
      viamClient
    ]
  )

  return (
    <FilesContext.Provider
      value={{
        fetchImages,
        fetchVideos,
        fetchAllPassFiles,
        fetchMostRecentFile,
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
