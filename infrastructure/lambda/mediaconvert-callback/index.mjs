const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL?.replace(/\/$/, '')
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
const WEBHOOK_SECRET = process.env.MEDIACONVERT_WEBHOOK_SECRET

export const handler = async (event) => {
  const detail = event.detail
  const status = detail.status // 'COMPLETE' or 'ERROR'
  const { bookId, pageId } = detail.userMetadata ?? {}

  if (!bookId || !pageId) {
    console.error('Missing bookId/pageId in userMetadata', detail.userMetadata)
    return
  }

  const transcodingStatus = status === 'COMPLETE' ? 'ready' : 'error'
  const hlsUrl = status === 'COMPLETE'
    ? `${CLOUDFRONT_URL}/books/${bookId}/pages/${pageId}/hls/video-raw.m3u8`
    : null

  console.log(`Job ${status} for book=${bookId} page=${pageId}`)

  const res = await fetch(`${APP_URL}/api/webhooks/mediaconvert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({ bookId, pageId, transcodingStatus, hlsUrl }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Webhook failed ${res.status}: ${text}`)
  }
  console.log('Webhook delivered successfully')
}
