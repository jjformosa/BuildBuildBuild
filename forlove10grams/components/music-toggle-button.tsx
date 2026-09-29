'use client'

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

export function MusicToggleButton({
  isPlaying,
  onClick,
  disabled = false,
  size = 'md',
  className = '',
}: {
  isPlaying: boolean
  onClick: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'
  const label = disabled ? '背景音樂準備中' : isPlaying ? '暫停背景音樂' : '播放背景音樂'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isPlaying}
      aria-label={label}
      title={label}
      className={`flex ${box} items-center justify-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
        isPlaying ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      } ${className}`}
    >
      <MusicIcon className={`${icon} ${isPlaying ? 'animate-heartbeat motion-reduce:animate-none' : ''}`} />
    </button>
  )
}
