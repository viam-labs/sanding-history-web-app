import React, { useState, useEffect } from 'react'
import * as VIAM from '@viamrobotics/sdk'

import { useViamClients } from '../lib/contexts/ViamClientContext'

interface ImageDisplayProps {
  binaryData: VIAM.dataApi.BinaryData
  className?: string
  alt?: string
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  binaryData,
  className,
  alt = 'Pass capture',
}) => {
  const { viamClient } = useViamClients()

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    let isMounted = true
    let currentObjectUrl: string | null = null

    const getImageUrl = async (
      binaryData: VIAM.dataApi.BinaryData
    ): Promise<void> => {
      try {
        let data = binaryData.binary
        const binaryId = binaryData.metadata?.binaryDataId

        if ((!data || data.length === 0) && binaryId) {
          const results = await viamClient.dataClient.binaryDataByIds([
            binaryId,
          ])
          if (
            results &&
            results.length > 0 &&
            results[0].binary &&
            results[0].binary.length > 0
          ) {
            data = results[0].binary
          } else {
            throw new Error(`Failed to retrieve binary data for ID ${binaryId}`)
          }
        }

        if (!data || data.length === 0) {
          const errMsg = `No binary data available for image ${binaryData.metadata?.fileName || binaryId}`
          throw new Error(errMsg)
        }

        let mimeType = 'image/jpeg'
        const fileName = binaryData.metadata?.fileName?.toLowerCase()
        const fileExt = binaryData.metadata?.fileExt?.toLowerCase()

        if (fileName?.endsWith('.png') || fileExt === 'png') {
          mimeType = 'image/png'
        } else if (
          fileName?.endsWith('.jpg') ||
          fileName?.endsWith('.jpeg') ||
          fileExt === 'jpg' ||
          fileExt === 'jpeg'
        ) {
          mimeType = 'image/jpeg'
        }

        if (data.length === 0) {
          throw new Error('Cannot create image from empty data')
        }

        const buffer = new ArrayBuffer(data.length)
        const view = new Uint8Array(buffer)
        view.set(data)

        const blob = new Blob([buffer], { type: mimeType })
        currentObjectUrl = URL.createObjectURL(blob)

        if (isMounted) {
          setImageUrl(currentObjectUrl)
          setIsLoading(false)
          setHasError(false)
          setErrorMessage('')
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error'
        if (isMounted) {
          setImageUrl(null)
          setIsLoading(false)
          setHasError(true)
          setErrorMessage(errorMsg)
        }
      }
    }

    getImageUrl(binaryData)

    return () => {
      isMounted = false
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
    }
  }, [binaryData, viamClient])

  if (isLoading) {
    return (
      <div
        className={`w-[300px] h-full bg-gray-100 rounded flex items-center justify-center text-gray-500 ${className || ''}`}
      >
        Loading...
      </div>
    )
  }

  if (hasError || !imageUrl) {
    return (
      <div
        className={`w-[300px] h-[225px] bg-gray-100 rounded flex flex-col items-center justify-center text-red-500 text-sm text-center p-5 ${className || ''}`}
      >
        <div>Failed to load image</div>
        {errorMessage && (
          <div className="text-xs mt-2 text-gray-400 max-w-[260px] overflow-hidden text-ellipsis">
            {errorMessage}
          </div>
        )}
        {binaryData.metadata?.fileName && (
          <div className="text-xs mt-2 text-gray-400">
            {binaryData.metadata.fileName.split('/').pop()}
          </div>
        )}
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={`w-full max-w-full max-h-[225px] rounded object-contain block ${className || ''}`}
      onError={() => {
        setHasError(true)
        setErrorMessage('Image failed to render after loading')
      }}
    />
  )
}

export default ImageDisplay
