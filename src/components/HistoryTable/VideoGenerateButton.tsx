import React from 'react'

interface VideoGenerateButtonProps {
  isPolling: boolean
  onGenerate: () => void
  disabled?: boolean
}

export const VideoGenerateButton: React.FC<VideoGenerateButtonProps> = ({
  isPolling,
  onGenerate,
  disabled = false,
}) => {
  return (
    <>
      <button
        type="button"
        className={`px-2 py-1.5 text-xs text-white border-none rounded transition-colors duration-200 flex items-center justify-center gap-1.5 ${
          isPolling || disabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
        }`}
        onClick={onGenerate}
        disabled={isPolling || disabled}
      >
        {isPolling ? 'Generating...' : 'Generate'}
      </button>
      {isPolling && (
        <div className="text-[9px] text-gray-500 text-center">
          This can take a few minutes
        </div>
      )}
    </>
  )
}
