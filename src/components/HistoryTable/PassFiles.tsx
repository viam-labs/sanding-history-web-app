import React, { useMemo, useState, useEffect } from 'react'
import * as VIAM from '@viamrobotics/sdk'
import { useViamClients } from '../../lib/contexts/ViamClientContext'
import { usePass } from '../../lib/contexts/PassContext'
import { useFiles } from '../../lib/contexts/FilesContext'
import { useSinglePass } from '../../lib/contexts/SinglePassContext.tsx'

export const PassFiles: React.FC = () => {
  const { pass, passFiles } = useSinglePass()
  const { machineId, organizationId } = useViamClients()
  const { partId } = usePass()
  const { fetchTimestamp } = useFiles()
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [fileSearchInput, setFileSearchInput] = useState<string>('')
  const [debouncedFileSearchInput, setDebouncedFileSearchInput] =
    useState<string>('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFileSearchInput(fileSearchInput)
    }, 300) // 300ms delay

    return () => {
      clearTimeout(handler)
    }
  }, [fileSearchInput])

  const handleDownload = (file: VIAM.dataApi.BinaryData) => {
    try {
      if (file.metadata?.uri) {
        const a = document.createElement('a')
        a.href = file.metadata.uri
        a.download = file.metadata?.fileName?.split('/').pop() || 'download'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Failed to download file')
    }
  }

  const filteredPassFiles = useMemo(() => {
    const searchTerm = debouncedFileSearchInput.toLowerCase()
    if (!searchTerm) return passFiles

    return passFiles.filter((file) => {
      const fileName = file.fileName.split('/').pop()?.toLowerCase() || ''
      const fullPath = file.fileName.toLowerCase() || ''
      return fileName.includes(searchTerm) || fullPath.includes(searchTerm)
    })
  }, [passFiles, debouncedFileSearchInput])

  const filesCountDisplay = useMemo(() => {
    const searchTerm = debouncedFileSearchInput.toLowerCase()
    if (searchTerm) {
      return `(showing ${filteredPassFiles.length} of ${passFiles.length})`
    }
    return `(${passFiles.length})`
  }, [passFiles.length, filteredPassFiles.length, debouncedFileSearchInput])

  const isLoading = fetchTimestamp && fetchTimestamp > pass.start

  if (isLoading && passFiles.length === 0) {
    return (
      <div className="pass-files-section">
        <span className="inline-block w-7 h-7 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></span>
        <p className="mt-3 text-gray-500 text-sm">
          Loading files...
        </p>
      </div>
    )
  }

  return (
    <div className="pass-files-section">
      <h4
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer flex items-center gap-1.5 select-none pl-0.5"
      >
        <span
          className={`inline-block transition-transform duration-200 text-[10px] ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
        >
          ▶
        </span>
        Files captured during this pass {filesCountDisplay}
      </h4>

      {isExpanded && passFiles.length > 0 && (
        <>
          <div className="mt-2 ml-3 mb-2">
            <input
              type="text"
              placeholder="Search files by filename..."
              value={fileSearchInput}
              onChange={(e) => setFileSearchInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-fit min-w-[250px] max-w-[400px] px-2.5 py-1.5 text-[13px] border border-gray-200 rounded box-border bg-white"
            />
          </div>
          <div className="flex flex-col gap-0 overflow-y-auto max-h-[33dvh] overflow-auto border-t border-gray-200 ml-2">
            {filteredPassFiles.map((file, fileIndex, filteredFiles) => {
              const fileName = file.fileName.split('/').pop() || 'Unknown file'

              return (
                <div
                  key={fileIndex}
                  className={`flex items-center justify-between px-1.5 py-1 bg-gray-50 hover:bg-gray-100 text-[13px] min-w-[280px] box-border transition-colors duration-200 ${
                    fileIndex < filteredFiles.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                    <span
                      className="text-gray-700 text-ellipsis overflow-hidden whitespace-nowrap flex-1"
                      title={file.fileName || fileName}
                    >
                      {fileName}
                    </span>
                    <span className="text-gray-400 text-xs whitespace-nowrap shrink-0">
                      {file.timeRequested?.toLocaleTimeString() || ''}
                    </span>
                  </div>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDownload(file.binaryData)
                    }}
                    className="ml-3 px-2 py-1.5 bg-blue-500 text-white rounded no-underline text-xs whitespace-nowrap shrink-0 cursor-pointer inline-block border-none hover:bg-blue-600"
                  >
                    Download
                  </a>
                  <a
                    href={
                      `https://storage.cloud.google.com/viam-data-${organizationId}/` +
                      `${organizationId}/${machineId}/${partId}/files/` +
                      `${file.binaryDataId.split('/').pop()}` +
                      `${file.fileName}.gz`
                    }
                    rel="noreferrer"
                    target="_blank"
                    className="ml-3 px-2 py-1.5 bg-blue-700 text-white rounded text-xs border-none no-underline hover:bg-blue-800"
                  >
                    Download from GCS
                  </a>
                </div>
              )
            })}
            {filteredPassFiles.length === 0 && fileSearchInput && (
              <div className="p-3 text-gray-500 text-[13px]">
                No files match &ldquo;{fileSearchInput}&rdquo;
              </div>
            )}
          </div>
        </>
      )}

      {passFiles.length === 0 && !isLoading && (
        <p className="text-[13px] text-gray-500 mt-2 pl-8">
          No files found for this pass.
        </p>
      )}
    </div>
  )
}
