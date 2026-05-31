import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { HajimedeAnimator } from '@/components/hajimede-animator'

export default async function HajimePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { callbackUrl } = await searchParams
  const destination =
    callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//')
      ? callbackUrl
      : '/dashboard'

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <HajimedeAnimator
        defaultPlaceholder={session.user.nickname ?? (session.user.name ?? '')}
        callbackUrl={destination}
      />
    </main>
  )
}
