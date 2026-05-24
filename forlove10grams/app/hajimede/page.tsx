import { redirect } from 'next/navigation'
import Image from 'next/image'
import { auth } from '@/auth'
import { HajimedeClient } from '@/components/hajimede-client'

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
    <main className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
      <div className="w-full max-w-sm px-6 flex flex-col gap-8">
        <div className="text-center flex flex-col items-center gap-4">
          <Image src="/logo.png" alt="For Love 10 Grams" width={72} height={72} />
          <h1 className="text-2xl font-semibold text-[#2C1810]">嗨，謝謝你來</h1>
        </div>

        <HajimedeClient
          defaultPlaceholder={session.user.nickname ?? (session.user.name ?? '')}
          callbackUrl={destination}
        />
      </div>
    </main>
  )
}
