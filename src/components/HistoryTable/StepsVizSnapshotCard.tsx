import { ModalType, useModal } from '../../lib/contexts/ModalContext'
import { SnapshotProto } from '@viamrobotics/motion-tools/lib'
import { BinaryDataFile } from '../../lib/BinaryDataFile'
import { SNAPSHOT_FILE_NAME_PREFIX } from '../../lib/constants'
import { useViamClients } from '../../lib/contexts/ViamClientContext'

interface StepsVizSnapshotCardProps {
  snapshotFiles: BinaryDataFile[]
}

export const StepsVizSnapshotCard = ({
  snapshotFiles,
}: StepsVizSnapshotCardProps) => {
  const { openModal } = useModal()
  const { viamClient } = useViamClients()

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
              onClick={async (e) => {
                e.preventDefault()
                console.log(snapshotFile.binaryData.toBinary())
                console.log(snapshotFile.binaryData.toJsonString())
                const data = await viamClient.dataClient.binaryDataByIds([
                  snapshotFile.binaryData.metadata!.binaryDataId,
                ])
                console.log(data[0].toBinary())
                console.log(data[0].toJsonString())
                const json = data[0].toJson() as any
                // json.binary is a base64-encoded string; decode it to a Uint8Array buffer
                const binaryStr = json.binary
                const binary = Uint8Array.from(atob(binaryStr), (c) =>
                  c.charCodeAt(0)
                )
                console.log(binary)
                const decompressor = new DecompressionStream('gzip')
                console.log(decompressor)
                const blob = new Blob([binary])
                console.log(blob)
                const stream = blob.stream().pipeThrough(decompressor)
                console.log(stream)
                const response = await new Response(stream).blob()
                console.log(response)
                const buffer = await response.arrayBuffer()
                console.log(buffer)
                const snapshot = SnapshotProto.fromBinary(
                  new Uint8Array(buffer)
                )
                console.log(snapshot)
                openModal({
                  type: ModalType.SNAPSHOT,
                  snapshot: snapshot,
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
