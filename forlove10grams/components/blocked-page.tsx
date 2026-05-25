import Image from 'next/image'
import Link from 'next/link'
import logo from '@/public/logo.png'

export function BlockedPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <Image src={logo} alt="For Love 10 Grams" width={88} height={88} className="opacity-90" />
      <p className="text-sm text-foreground/55 text-center">{message}</p>
      <Link
        href="/"
        className="text-xs text-foreground/35 hover:text-foreground/60 transition-colors"
      >
        回首頁
      </Link>
    </main>
  )
}
