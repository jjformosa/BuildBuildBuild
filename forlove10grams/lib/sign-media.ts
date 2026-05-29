import { getSignedUrl } from '@aws-sdk/cloudfront-signer'

const MEDIA_URL = process.env.CLOUDFRONT_MEDIA_URL?.replace(/\/$/, '') ?? ''
const PRIVATE_KEY = process.env.CLOUDFRONT_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? ''
const KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID ?? ''

function stableExpiry(): string {
  // Round up to next UTC midnight so the signed URL is stable for up to 24h
  // This keeps next/image's cache effective (same URL = cache hit)
  const nowSec = Math.floor(Date.now() / 1000)
  const secondsUntilMidnight = 86400 - (nowSec % 86400)
  return new Date((nowSec + secondsUntilMidnight) * 1000).toISOString()
}

export function signImageUrl(url: string): string {
  if (!PRIVATE_KEY || !KEY_PAIR_ID || !MEDIA_URL) return url
  try {
    const { pathname } = new URL(url)
    return getSignedUrl({
      url: `${MEDIA_URL}${pathname}`,
      keyPairId: KEY_PAIR_ID,
      privateKey: PRIVATE_KEY,
      dateLessThan: stableExpiry(),
    })
  } catch {
    return url
  }
}
