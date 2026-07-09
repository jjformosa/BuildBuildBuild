export const QUICK_CAPTURE_MODES = ['photo', 'video', 'text', 'audio'] as const

export type QuickCaptureMode = (typeof QUICK_CAPTURE_MODES)[number]
export type QuickCapturePageType = 'carousel' | 'video' | 'audio'

export function isQuickCaptureMode(value: unknown): value is QuickCaptureMode {
  return (
    typeof value === 'string' &&
    (QUICK_CAPTURE_MODES as readonly string[]).includes(value)
  )
}

export function pageTypeForQuickCaptureMode(
  mode: QuickCaptureMode,
): QuickCapturePageType {
  if (mode === 'video') return 'video'
  if (mode === 'audio') return 'audio'
  return 'carousel'
}

export function formatQuickCaptureTitle(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  })

  const parts = new Map(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  )

  const year = parts.get('year')
  const month = parts.get('month')
  const day = parts.get('day')
  const hour = parts.get('hour')
  const minute = parts.get('minute')

  return `快速記錄 ${year}/${month}/${day} ${hour}:${minute}`
}
