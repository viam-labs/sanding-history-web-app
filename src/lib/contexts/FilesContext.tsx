import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useRef,
} from 'react'
import { useViamClients } from './ViamClientContext'
import { Pass } from '../types'
import { FileQueryCallback, FileQueryManager } from '../FileQueryManager'
import { BinaryDataFile } from '../BinaryDataFile'

interface FilesContextType {
  fetchPassFiles: (pass: Pass, onQuery: FileQueryCallback) => Promise<void>
}

const FilesContext = createContext<FilesContextType | undefined>(undefined)

export function FilesProvider({ children }: { children: ReactNode }) {
  const { viamClient, machineId } = useViamClients()

  const queryManager = useRef<FileQueryManager>(new FileQueryManager())

  const fetchPassFiles = useCallback(
    async (
      pass: Pass,
      onQuery: (
        nextData: BinaryDataFile[],
        nextVideos: BinaryDataFile[],
        nextImages: BinaryDataFile[]
      ) => void
    ) => {
      const passId = pass.pass_id

      console.log(`Fetching files for pass ${passId}`)

      await queryManager.current.queryFiles({
        machineId,
        viamClient,
        passId,
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
        fetchPassFiles,
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
