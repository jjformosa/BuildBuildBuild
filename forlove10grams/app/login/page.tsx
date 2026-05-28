import Link from 'next/link'
import Image from 'next/image'
import logo from '@/public/logo.png'
import { LoginSection } from '@/components/login-section'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  const redirectTo = callbackUrl?.startsWith('/') ? callbackUrl : '/dashboard'

  return (
    <main className="relative min-h-dvh flex items-center justify-center bg-background overflow-hidden px-6 py-16">

      {/* Background decoration — soft blobs, hidden from screen readers */}
      <div className="pointer-events-none select-none" aria-hidden>
        {/* Top-right teal blob */}
        <div className="fixed -top-24 -right-24 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
        {/* Bottom-left rose blob */}
        <div className="fixed -bottom-16 -left-16 h-56 w-56 rounded-full bg-rose/8 blur-3xl" />
        {/* Center subtle warm glow */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/4 blur-[80px]" />
      </div>

      {/* Content card */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="motion-safe:animate-fade-up flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-card p-4 shadow-[0_2px_16px_rgba(44,94,119,0.10)] border border-border/50">
            <Image src={logo} alt="愛10克 親手烘焙" width={72} height={72} priority />
          </div>
        </div>

        {/* Brand text */}
        <div
          className="motion-safe:animate-fade-up [animation-delay:90ms] text-center flex flex-col gap-1.5"
        >
          <h1 className="text-2xl font-semibold text-foreground tracking-tight leading-snug">
            愛10克 親手烘焙
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">私人記憶書 · For Love 10 Grams</p>
          <p className="mt-1 text-xs text-muted-foreground/70 italic leading-relaxed">
            把愛揉進每一頁，讓回憶不被遺忘
          </p>
        </div>

        {/* Divider */}
        <div
          className="motion-safe:animate-fade-up [animation-delay:180ms] w-full"
          aria-hidden
        >
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border/60" />
            <span className="text-xs text-muted-foreground/60">登入繼續</span>
            <span className="h-px flex-1 bg-border/60" />
          </div>
        </div>

        {/* Login buttons */}
        <div className="motion-safe:animate-fade-up [animation-delay:260ms] w-full">
          <LoginSection redirectTo={redirectTo} />
        </div>

        {/* Footer */}
        <div className="motion-safe:animate-fade-up [animation-delay:340ms]">
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            隱私權政策
          </Link>
        </div>

      </div>
    </main>
  )
}
