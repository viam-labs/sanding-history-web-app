import React from 'react'

interface LoadingModalProps {
  loadingText?: string
}

const LoadingModal: React.FC<LoadingModalProps> = ({
  loadingText = 'Loading...',
}) => {
  return (
    <div className="fixed inset-0 w-screen h-screen bg-black/50 z-1000 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-12 shadow-[0_2px_24px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          <div className="text-lg text-gray-700">{loadingText}</div>
        </div>
      </div>
    </div>
  )
}

export default LoadingModal
