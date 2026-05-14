import { auth } from '@/auth'
import { signOut } from '@/auth'

export default async function DashboardPage() {
  const session = await auth()

  return (
    <main className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between border-b border-[#2C1810]/10 px-6 py-4">
        <h1 className="text-lg font-semibold text-[#2C1810]">For Love 10 Grams</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[#2C1810]/60">{session?.user?.email}</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-[#2C1810]/20 px-3 py-1.5 text-sm text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors"
            >
              登出
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-2xl font-semibold text-[#2C1810]">我的記憶書</p>
        <p className="mt-2 text-sm text-[#2C1810]/50">Dashboard 將在 task 2.2 實作</p>
      </div>
    </main>
  )
}
