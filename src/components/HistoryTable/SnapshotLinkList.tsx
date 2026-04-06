import { BinaryDataFile } from '../../lib/BinaryDataFile'

const cleanSnapshotFileName = (
  fileName: string,
  prefix: string
): string => {
  const base = fileName.split('/').pop() || ''
  const idx = base.indexOf(prefix)
  if (idx < 0) return base

  const noPrefix = base.slice(idx + prefix.length)
  const extension = base.slice(base.indexOf('.'))
  return noPrefix.slice(0, -extension.length)
}

interface SnapshotLinkListProps {
  files: BinaryDataFile[]
  prefix: string
  onSnapshotClick: (
    e: React.MouseEvent<HTMLAnchorElement>,
    file: BinaryDataFile
  ) => void
}

export const SnapshotLinkList = ({
  files,
  prefix,
  onSnapshotClick,
}: SnapshotLinkListProps) => (
  <div className="flex flex-col items-center gap-1 w-full">
    {files.map((snapshotFile) => {
      const snapshotName = cleanSnapshotFileName(snapshotFile.fileName, prefix)
      return (
        <div
          key={snapshotFile.fileName}
          className="relative group max-w-full"
        >
          <a
            href="#"
            onClick={(e) => onSnapshotClick(e, snapshotFile)}
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
)
