import { InviteEditorButton } from '@/components/invite-editor-button'

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  return (
    <main className="min-h-screen bg-[#FAF7F2]">
      <header className="flex items-center justify-between border-b border-[#2C1810]/10 px-6 py-4">
        <h1 className="text-lg font-semibold text-[#2C1810]">編輯記憶書</h1>
        <InviteEditorButton bookId={bookId} />
      </header>
      {/* 編輯器主體將在 task 2.5 實作 */}
    </main>
  )
}
