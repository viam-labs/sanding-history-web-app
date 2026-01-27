import React, { useState, useEffect } from 'react'

import { useViamClients } from '../lib/contexts/ViamClientContext'
import { BinaryDataFile } from '../lib/BinaryDataFile'

// Signed URL expiration time in minutes
const SIGNED_URL_EXPIRATION_MINUTES = 60

interface ImageDisplayProps {
  binaryData: BinaryDataFile
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

    const getSignedUrl = async (binaryData: BinaryDataFile): Promise<void> => {
      try {
        const binaryId = binaryData.binaryDataId

        if (!binaryId) {
          throw new Error('No binary data ID available for image')
        }

        // Use signed URL API for better performance (matching sanding module approach)
        const signedUrl = await viamClient.dataClient.createBinaryDataSignedURL(
          binaryId,
          SIGNED_URL_EXPIRATION_MINUTES
        )

        if (isMounted) {
          setImageUrl(signedUrl)
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

    getSignedUrl(binaryData)

    return () => {
      isMounted = false
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
        {binaryData.fileName && (
          <div className="text-xs mt-2 text-gray-400">
            {binaryData.fileName.split('/').pop()}
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
