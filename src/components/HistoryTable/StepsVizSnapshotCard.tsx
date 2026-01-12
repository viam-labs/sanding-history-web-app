import { ModalType, useModal } from '../../lib/contexts/ModalContext'
import { SnapshotProto } from '@viamrobotics/motion-tools/lib'
import { BinaryDataFile } from '../../lib/BinaryDataFile'

interface StepsVizSnapshotCardProps {
  snapshotFiles: BinaryDataFile[]
}
export const StepsVizSnapshotCard = ({
  snapshotFiles,
}: StepsVizSnapshotCardProps) => {
  const { openModal } = useModal()

  return (
    <div className="step-card">
      <div className="step-name">View Snapshot</div>
      <p>Load and display a 3D scene from a snapshot file.</p>
      <div className="flex flex-col items-center gap-1 w-full overflow-hidden">
        {snapshotFiles.map((snapshotFile) => (
          <a
            key={snapshotFile.fileName}
            href={`#${snapshotFile.fileName}`}
            onClick={(e) => {
              e.preventDefault()
              openModal({
                type: ModalType.SNAPSHOT,
                snapshot: SnapshotProto.fromBinary(
                  snapshotFile.binaryData.binary
                ),
              })
            }}
            className="underline text-blue-600 cursor-pointer hover:text-blue-800 truncate max-w-full text-center"
          >
            View {snapshotFile.fileName}
          </a>
        ))}
      </div>
    </div>
  )
}
