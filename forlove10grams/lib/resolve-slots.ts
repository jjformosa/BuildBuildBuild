export function resolveSlots(
  content: string,
  nickname: string | null,
  myNickname: string | null
): string {
  const effectiveMyNickname = myNickname || nickname || '你'
  const effectiveNickname = nickname || '你'

  return content
    .replaceAll('${MyNickname}', effectiveMyNickname)
    .replaceAll('${Nickname}', effectiveNickname)
}
