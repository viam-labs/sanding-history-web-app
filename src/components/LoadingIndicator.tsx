interface LoadingIndicatorProps {
  loadingText: string
}

export const LoadingIndicator = ({ loadingText }: LoadingIndicatorProps) => {
  return (
    <div className="loading-state flex flex-col items-center justify-center p-5 text-gray-500">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-2" />
      <div className="text-sm">{loadingText}</div>
    </div>
  )
}
