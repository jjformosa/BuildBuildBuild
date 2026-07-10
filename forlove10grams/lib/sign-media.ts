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

// Rejects mediaUrls that don't point at this book+page's own S3 prefix, regardless
// of host. Without this, a stored mediaUrl (settable via PATCH) could be used to make
// the server fetch an attacker-chosen path — either another book's private media
// (cross-tenant) or, if CLOUDFRONT_* env vars are unset and signImageUrl falls back to
// returning the raw URL unchanged, an arbitrary internal/external host (SSRF).
export function assertOwnMediaUrl(url: string, bookId: string, pageId: string): void {
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
}
