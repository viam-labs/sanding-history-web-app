import { createContext, useContext, ReactNode, useMemo } from 'react'
import { Pass } from '../types'
import { BinaryDataFile } from '../BinaryDataFile'
import { useFiles } from './FilesContext'
interface SinglePassContextType {
  pass: Pass
  passFiles: BinaryDataFile[]
}

const SinglePassContext = createContext<SinglePassContextType | undefined>(
  undefined
)

export function SinglePassProvider({
  pass,
  children,
}: {
  pass: Pass
  children: ReactNode
}) {
  const { binaryDataManager } = useFiles()

  const passFiles = useMemo(() => {
    const passStart = new Date(pass.start)
    const passEnd = new Date(pass.end)
    return binaryDataManager.getPassFiles(pass.pass_id, passStart, passEnd)
  }, [pass.pass_id, pass.start, pass.end, binaryDataManager])

  return (
    <SinglePassContext.Provider value={{ pass, passFiles }}>
      {children}
    </SinglePassContext.Provider>
  )
}

export function useSinglePass() {
  const context = useContext(SinglePassContext)
  if (context === undefined) {
    throw new Error('useSinglePass must be used within an SinglePassProvider')
  }
  return context
}
