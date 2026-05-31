'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import '@uiw/react-md-editor/markdown-editor.css'
import { MediaUploader } from '@/components/media-uploader'
import TagManagerModal from '@/components/tag-manager-modal'

import { getCommands, getExtraCommands } from '@uiw/react-md-editor'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

export type PageData = {
  _id: string
  type: 'carousel' | 'video'
  content?: string
  mediaUrls: string[]
}

function SortablePageItem({
  page,
  index,
  isSelected,
  onSelect,
  onDelete,
}: {
  page: PageData
  index: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page._id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`relative group ${isSelected ? 'bg-foreground/8 border-l-2 border-foreground/40' : ''}`}
    >
      <div className="flex items-center px-2 py-3 gap-1">
        <span
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab flex-none text-foreground/20 hover:text-foreground/45 select-none px-1 text-xs"
          title="拖曳排序"
        >
          ⠿
        </span>
        <button onClick={onSelect} className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-foreground/35">{index + 1}</span>
            <span className="rounded bg-foreground/8 px-1.5 py-0.5 text-xs text-foreground/55">
              {page.type === 'carousel' ? '輪播' : '影片'}
            </span>
          </div>
          {page.content && (
            <p className="mt-1 line-clamp-2 text-xs text-foreground/45 pr-2">{page.content}</p>
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="flex-none opacity-100 md:opacity-0 md:group-hover:opacity-100 text-foreground/25 hover:text-red-400 transition-opacity text-xs px-2 py-1"
          title="刪除頁面"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

export function BookEditorClient({
  bookId,
  initialPages,
  initialTags,
}: {
  bookId: string
  initialPages: PageData[]
  initialTags: string[]
}) {
  const [pages, setPages] = useState<PageData[]>(initialPages)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPages.length > 0 ? initialPages[0]._id : null
  )
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [addingType, setAddingType] = useState<'carousel' | 'video' | null>(null)
  const [showTagModal, setShowTagModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedPage = pages.find((p) => p._id === selectedId) ?? null

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Warn on page unload when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === 'unsaved') e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveState])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = pages.findIndex((p) => p._id === active.id)
    const newIndex = pages.findIndex((p) => p._id === over.id)
    const reordered = arrayMove(pages, oldIndex, newIndex)
    setPages(reordered)
    fetch(`/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageOrder: reordered.map((p) => p._id) }),
    })
  }

  function flushPendingSave() {
    if (!saveTimerRef.current) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
    const page = pages.find((p) => p._id === selectedId)
    if (page && selectedId) {
      fetch(`/api/books/${bookId}/pages/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: page.content }),
      })
    }
    setSaveState('saved')
  }

  function selectPage(pageId: string) {
    flushPendingSave()
    setSelectedId(pageId)
  }

  function handleContentChange(value: string | undefined) {
    const content = value ?? ''
    const currentId = selectedId
    if (!currentId) return
    setPages((prev) => prev.map((p) => (p._id === currentId ? { ...p, content } : p)))
    setSaveState('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveState('saving')
      const res = await fetch(`/api/books/${bookId}/pages/${currentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setSaveState(res.ok ? 'saved' : 'unsaved')
      saveTimerRef.current = null
    }, 800)
  }

  async function handleDeletePage(pageId: string) {
    await fetch(`/api/books/${bookId}/pages/${pageId}`, { method: 'DELETE' })
    const remaining = pages.filter((p) => p._id !== pageId)
    setPages(remaining)
    if (selectedId === pageId) {
      setSelectedId(remaining.length > 0 ? remaining[0]._id : null)
    }
  }

  const PAGE_LIMIT = 30

  async function handleAddPage(type: 'carousel' | 'video') {
    if (pages.length >= PAGE_LIMIT) return
    setAddingType(type)
    try {
      const res = await fetch(`/api/books/${bookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (res.ok) {
        const raw = await res.json()
        const newPage: PageData = {
          _id: raw._id,
          type: raw.type,
          content: raw.content,
          mediaUrls: raw.mediaUrls ?? [],
        }
        setPages((prev) => [...prev, newPage])
        setSelectedId(newPage._id)
      }
    } finally {
      setAddingType(null)
    }
  }

  function handleMediaUrlsChange(urls: string[]) {
    if (!selectedId) return
    setPages((prev) => prev.map((p) => (p._id === selectedId ? { ...p, mediaUrls: urls } : p)))
  }

  async function handleAddTag(tag: string) {
    const res = await fetch(`/api/books/${bookId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tag }),
    })
    if (res.ok) {
      const data = await res.json()
      setTags(data.tags)
    }
  }

  async function handleRemoveTag(tag: string) {
    const res = await fetch(`/api/books/${bookId}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      const data = await res.json()
      setTags(data.tags)
    }
  }

  return (
    <div className="flex flex-1 min-w-0 md:overflow-hidden">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-52 flex-none flex-col overflow-y-auto border-r border-foreground/10">
        <div className="flex-none border-b border-foreground/10 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
            頁面 {pages.length > 0 && `(${pages.length})`}
          </span>
        </div>

        {pages.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-foreground/35">尚無頁面</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pages.map((p) => p._id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y divide-foreground/5">
                {pages.map((page, i) => (
                  <SortablePageItem
                    key={page._id}
                    page={page}
                    index={i}
                    isSelected={selectedId === page._id}
                    onSelect={() => selectPage(page._id)}
                    onDelete={() => handleDeletePage(page._id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <div className="mt-auto border-t border-foreground/10 p-3">
          {pages.length >= PAGE_LIMIT ? (
            <p className="text-center text-xs text-foreground/50 py-1">
              已達頁數上限（{PAGE_LIMIT} 頁）
            </p>
          ) : (
            <div className="flex gap-2">
              {(['carousel', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddPage(type)}
                  disabled={addingType !== null}
                  className="flex-1 rounded-md border border-foreground/20 py-1.5 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-40 transition-colors"
                >
                  {addingType === type ? '新增中…' : type === 'carousel' ? '+ 輪播' : '+ 影片'}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 border-t border-foreground/8 pt-3">
            <button
              type="button"
              onClick={() => setShowTagModal(true)}
              className="w-full rounded-md border border-foreground/20 py-1.5 text-xs text-foreground hover:bg-foreground/5 transition-colors"
            >
              標籤{tags.length > 0 ? ` (${tags.length})` : ''}
            </button>
          </div>
          {showTagModal && (
            <TagManagerModal
              tags={tags}
              onAdd={handleAddTag}
              onRemove={handleRemoveTag}
              onClose={() => setShowTagModal(false)}
            />
          )}
        </div>
      </aside>

      {/* Editor area */}
      <section className="flex flex-1 flex-col w-full min-w-0 md:overflow-hidden">
        {/* Mobile page selector — horizontal scrollable strip, hidden on desktop */}
        <div className="flex md:hidden flex-none items-center border-b border-foreground/10">
          {/* Scrollable page tabs */}
          <div className="flex flex-1 overflow-x-auto gap-1 px-2 py-0.5">
            {pages.map((page, i) => (
              <button
                key={page._id}
                onClick={() => selectPage(page._id)}
                className={`flex-none rounded px-2.5 text-xs whitespace-nowrap transition-colors min-h-[44px] ${
                  selectedId === page._id
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-foreground/50 hover:bg-foreground/5'
                }`}
              >
                {i + 1}. {page.type === 'carousel' ? '輪播' : '影片'}
              </button>
            ))}
          </div>
          {/* Add-page buttons — always visible on the right */}
          <div className="flex flex-none gap-1 border-l border-foreground/10 px-2 py-0.5">
            {pages.length >= PAGE_LIMIT ? (
              <span className="text-xs text-foreground/40 px-2 py-1">已達上限</span>
            ) : (
              (['carousel', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleAddPage(type)}
                  disabled={addingType !== null}
                  className="btn-outline-xs flex-none min-h-[44px]"
                >
                  {addingType === type ? '…' : type === 'carousel' ? '+ 輪播' : '+ 影片'}
                </button>
              ))
            )}
          </div>
        </div>

        {selectedPage ? (
          <>
            <div className="flex-none border-b border-foreground/10 px-6 py-3 flex items-center justify-between">
              <span className="rounded bg-foreground/8 px-2 py-0.5 text-xs text-foreground/60">
                {selectedPage.type === 'carousel' ? '輪播頁' : '影片頁'}
              </span>
              <span className="text-xs text-foreground/35">
                {saveState === 'saving' ? '儲存中…' : saveState === 'unsaved' ? '未儲存' : '已儲存'}
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
              <div data-color-mode="light" suppressHydrationWarning>
                <MDEditor
                  value={selectedPage.content ?? ''}
                  onChange={handleContentChange}
                  height={300}
                  preview={isMobile ? 'edit' : 'live'}
                  commands={getCommands().filter((cmd) => cmd.name !== 'image')}
                  extraCommands={getExtraCommands()}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-foreground/50">
                  {selectedPage.type === 'carousel' ? '圖片（可多張）' : '影片'}
                </p>
                <MediaUploader
                  bookId={bookId}
                  pageId={selectedPage._id}
                  fileType={selectedPage.type}
                  mediaUrls={selectedPage.mediaUrls}
                  onUrlsChange={handleMediaUrlsChange}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-foreground/30">請選擇或新增頁面以開始編輯</p>
          </div>
        )}
      </section>
    </div>
  )
}
