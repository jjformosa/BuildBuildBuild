export function parseYouTubePlaylistId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const list = parsed.searchParams.get('list')
  if (!list || !/^[\w-]+$/.test(list)) return null
  return list
}
