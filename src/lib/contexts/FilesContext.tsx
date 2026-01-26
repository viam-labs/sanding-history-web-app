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
import { BinaryDataFile } from '../BinaryDataFile'

interface FilesContextType {
  fetchImages: (
    pass: Pass,
    onQuery: FileQueryCallback
  ) => Promise<BinaryDataFile[]>
  fetchVideos: (
    pass: Pass,
    onQuery: FileQueryCallback,
    forceRefresh?: boolean
  ) => Promise<BinaryDataFile[]>
  fetchAllPassFiles: (pass: Pass, onQuery: FileQueryCallback) => Promise<void>
}

const FilesContext = createContext<FilesContextType | undefined>(undefined)

export function FilesProvider({ children }: { children: ReactNode }) {
  const { viamClient, machineId } = useViamClients()

  const queryManager = useRef<FileQueryManager>(new FileQueryManager())

  const fetchImages = useCallback(
    async (pass: Pass, onQuery: FileQueryCallback) => {
      console.log(`Fetching images for pass ${pass.pass_id}`)

      return await queryManager.current.queryImages({
        machineId,
        viamClient,
        passId: pass.pass_id,
        start: pass.start,
        end: pass.end,
        onQuery,
      })
    },
    [machineId, viamClient]
  )

  const fetchVideos = useCallback(
    async (pass: Pass, onQuery: FileQueryCallback, forceRefresh?: boolean) => {
      console.log(
        `Fetching videos for pass ${pass.pass_id}${forceRefresh ? ' (force refresh)' : ''}`
      )

      return await queryManager.current.queryVideos({
        machineId,
        viamClient,
        passId: pass.pass_id,
        start: pass.start,
        end: pass.end,
        onQuery,
        forceRefresh,
      })
    },
    [machineId, viamClient]
  )

  const fetchAllPassFiles = useCallback(
    async (pass: Pass, onQuery: FileQueryCallback) => {
      console.log(`Fetching all files for pass ${pass.pass_id}`)

      await queryManager.current.queryPassFiles({
        machineId,
        viamClient,
        passId: pass.pass_id,
        start: pass.start,
        end: pass.end,
        onQuery,
      })
    },
    [machineId, viamClient]
  )

  return (
    <FilesContext.Provider
      value={{
        fetchImages,
        fetchVideos,
        fetchAllPassFiles,
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
