import { ModalType, useModal } from '../../lib/contexts/ModalContext'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import { SNAPSHOT_FILE_NAME_PREFIX } from '../../lib/constants'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { useToast } from '../../lib/contexts/ToastContext.tsx'
import { getSnapshotFromGzipBinaryData } from '../../lib/snapshotUtils'
import { useState } from 'react'
import RenderIf from '../RenderIf.tsx'
import { LoadingIndicator } from '../LoadingIndicator.tsx'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'
import Spinner from '../Spinner.tsx'

export const StepsVizSnapshotCard = () => {
  const { openModal } = useModal()
  const { viamClient } = useViamClients()
  const { snapshots, isFetchingSnapshots } = useSinglePass()
  const { addMessage } = useToast()
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)

  const cleanSnapshotFileName = (fileName: string) => {
    const base = fileName.split('/').pop() || ''
    const idx = base.indexOf(SNAPSHOT_FILE_NAME_PREFIX)
    if (idx < 0) return base

    const noPrefix = base.slice(idx + SNAPSHOT_FILE_NAME_PREFIX.length)
    const extension = base.slice(base.indexOf('.'))
    const noExtension = noPrefix.slice(0, -extension.length)
    return noExtension
  }

  const handleViewSnapshotClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    snapshotFile: BinaryDataFile
  ) => {
    e.preventDefault()
    setLoadingSnapshot(true)
    const fileBinaryData = await snapshotFile.getFileBinaryData(viamClient)
    if (!fileBinaryData) {
      console.error('Failed to get file binary data')
      addMessage({
        message: 'Failed to get file binary data',
        type: 'error',
      })
      return
    }
    const snapshot = await getSnapshotFromGzipBinaryData(fileBinaryData)
    setLoadingSnapshot(false)
    openModal({
      type: ModalType.SNAPSHOT,
      snapshot: snapshot,
    })
  }

  return (
    <div className="step-card">
      <div className="step-name">View Snapshot</div>
      <p>Load and display a 3D scene from a snapshot file.</p>
      <RenderIf condition={isFetchingSnapshots}>
        <div className="flex flex-col items-center justify-center py-2">
          <Spinner size="24px" />
          <p className="text-gray-500 text-sm">Loading snapshots...</p>
        </div>
      </RenderIf>
      <RenderIf condition={loadingSnapshot}>
        <LoadingIndicator loadingText="Loading snapshot..." />
      </RenderIf>
      <RenderIf condition={!loadingSnapshot}>
        <div className="flex flex-col items-center gap-1 w-full">
          {snapshots.map((snapshotFile) => {
            const snapshotName = cleanSnapshotFileName(snapshotFile.fileName)
            return (
              <div
                key={snapshotFile.fileName}
                className="relative group max-w-full"
              >
                <a
                  href="#"
                  onClick={(e) => handleViewSnapshotClick(e, snapshotFile)}
                  className="underline text-blue-600 cursor-pointer hover:text-blue-800 truncate max-w-full text-center block"
                >
                  View {snapshotName}
                </a>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  {snapshotName}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900" />
                </div>
              </div>
            )
          })}
        </div>
      </RenderIf>
    </div>
  )
}
