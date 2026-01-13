import { ModalType, useModal } from '../../lib/contexts/ModalContext'
import { SnapshotProto } from '@viamrobotics/motion-tools/lib'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import { SNAPSHOT_FILE_NAME_PREFIX } from '../../lib/constants'

interface StepsVizSnapshotCardProps {
  snapshotFiles: BinaryDataFile[]
}

export const StepsVizSnapshotCard = ({
  snapshotFiles,
}: StepsVizSnapshotCardProps) => {
  const { openModal } = useModal()

  const cleanSnapshotFileName = (fileName: string) => {
    const base = fileName.split('/').pop() || ''
    const idx = base.indexOf(SNAPSHOT_FILE_NAME_PREFIX)
    return idx >= 0 ? base.slice(idx) : base
  }

  return (
    <div className="step-card">
      <div className="step-name">View Snapshot</div>
      <p>Load and display a 3D scene from a snapshot file.</p>
      <div className="flex flex-col items-center gap-1 w-full">
        {snapshotFiles.map((snapshotFile) => (
          <div
            key={cleanSnapshotFileName(snapshotFile.fileName)}
            className="relative group max-w-full"
          >
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                openModal({
                  type: ModalType.SNAPSHOT,
                  snapshot: SnapshotProto.fromBinary(
                    snapshotFile.binaryData.binary
                  ),
                })
              }}
              className="underline text-blue-600 cursor-pointer hover:text-blue-800 truncate max-w-full text-center block"
            >
              View {cleanSnapshotFileName(snapshotFile.fileName)}
            </a>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              {cleanSnapshotFileName(snapshotFile.fileName)}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
