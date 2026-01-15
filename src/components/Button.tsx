import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  disabled?: boolean
  children?: React.ReactNode
  className?: string
  // For mouse enter/leave styling
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>
}

/**
 * Generic Button component with loading state and in-component spinner.
 * Accepts any native button props.
 * Used for step video generate button, can be reused elsewhere.
 */
const Button: React.FC<ButtonProps> = ({
  loading = false,
  loadingText = 'Loading...',
  disabled = false,
  children,
  className = '',
  onMouseEnter,
  onMouseLeave,
  ...rest
}) => {
  const isDisabled = disabled || loading

  return (
    <button
      className={`generate-video-button px-2 py-1.5 text-xs text-white border-none rounded cursor-pointer transition-colors duration-200 flex items-center gap-1.5 ${
        isDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
      } ${className}`}
      disabled={isDisabled}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...rest}
    >
      {loading ? (
        <>
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export default Button
