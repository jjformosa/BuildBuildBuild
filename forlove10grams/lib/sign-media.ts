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

// Validates that a stored mediaUrl's path belongs to this book+page, then rebuilds
// the URL from our own trusted media origin — never the host in the stored value.
// A stored mediaUrl is attacker-influenceable via PATCH, so trusting either its host
// or its path alone is unsafe: trusting the host allows SSRF to an arbitrary origin
// (especially when CLOUDFRONT_* env vars are unset and signImageUrl's fallback would
// otherwise fetch the raw URL as-is); trusting the path alone still lets that
// attacker-chosen host serve the response. Discarding the host and only keeping the
// path (rooted at our own origin) closes both.
export function ownMediaUrl(url: string, bookId: string, pageId: string): string {
  const expectedPrefix = `/books/${bookId}/pages/${pageId}/`
  let pathname: string
  try {
    pathname = new URL(url).pathname
  } catch {
    throw new Error('Invalid media URL')
  }
  if (!pathname.startsWith(expectedPrefix)) {
    throw new Error('Media URL does not belong to this page')
  }
  if (!MEDIA_URL) {
    throw new Error('Media origin not configured')
  }
  return `${MEDIA_URL}${pathname}`
}
