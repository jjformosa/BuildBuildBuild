'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface TagInputProps {
  tags: string[]
  onAdd: (tag: string) => Promise<void>
  onRemove?: (tag: string) => Promise<void>
  disabled?: boolean
}

export default function TagInput({ tags, onAdd, onRemove, disabled }: TagInputProps) {
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(q)}`)
      if (res.ok) setSuggestions(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    setShowDropdown(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val.trim()), 300)
  }

  const handleAdd = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || tags.includes(trimmed)) return
    setInput('')
    setSuggestions([])
    setShowDropdown(false)
    await onAdd(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd(input)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/8 px-2.5 py-1 text-xs text-foreground/70"
            >
              {tag}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(tag)}
                  className="ml-0.5 text-foreground/40 hover:text-red-400 transition-colors"
                  aria-label={`移除 ${tag}`}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onFocus={() => input && setShowDropdown(true)}
            disabled={disabled}
            placeholder="新增標籤…"
            className="w-full rounded-lg border border-foreground/15 bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-foreground/35 focus:outline-none disabled:opacity-50"
          />
          {showDropdown && (loading || suggestions.length > 0) && (
            <ul className="absolute z-[200] mt-1 w-full rounded-lg border border-foreground/10 bg-white shadow-md overflow-hidden">
              {loading && (
                <li className="px-3 py-2 text-xs text-foreground/40">搜尋中…</li>
              )}
              {suggestions.map((s) => {
                const alreadyAdded = tags.includes(s)
                return alreadyAdded ? (
                  <li key={s} className="flex items-center gap-1.5 px-3 py-2 text-sm text-foreground/30 select-none">
                    <span className="text-xs">✓</span>
                    {s}
                  </li>
                ) : (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleAdd(s)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-foreground/70 hover:bg-foreground/5 transition-colors"
                    >
                      {s}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleAdd(input)}
          disabled={disabled || !input.trim()}
          className="flex-none rounded-lg border border-foreground/15 bg-white px-2.5 py-1.5 text-sm text-foreground/50 hover:text-foreground hover:border-foreground/35 disabled:opacity-30 transition-colors"
          aria-label="新增標籤"
        >
          ＋
        </button>
      </div>
    </div>
  )
}
