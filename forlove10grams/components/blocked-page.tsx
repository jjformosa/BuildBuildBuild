import Image from 'next/image'
import Link from 'next/link'

export function BlockedPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#FAF7F2] px-6">
      <Image src="/logo.png" alt="For Love 10 Grams" width={88} height={88} className="opacity-90" />
      <p className="text-sm text-[#2C1810]/55 text-center">{message}</p>
      <Link
        href="/"
        className="text-xs text-[#2C1810]/35 hover:text-[#2C1810]/60 transition-colors"
      >
        回首頁
      </Link>
    </main>
  )
}
