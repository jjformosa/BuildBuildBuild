import Link from 'next/link'
import { LoginSection } from '@/components/login-section'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  const redirectTo = callbackUrl?.startsWith('/') ? callbackUrl : '/dashboard'

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 px-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            For Love 10 Grams
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            私人記憶書
          </p>
        </div>

        <LoginSection redirectTo={redirectTo} />

        <Link
          href="/privacy"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          隱私權政策
        </Link>
      </div>
    </main>
  )
}
