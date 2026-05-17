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
              className="inline-flex items-center gap-1 rounded-full bg-[#2C1810]/8 px-2.5 py-1 text-xs text-[#2C1810]/70"
            >
              {tag}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(tag)}
                  className="ml-0.5 text-[#2C1810]/40 hover:text-red-400 transition-colors"
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
            className="w-full rounded-lg border border-[#2C1810]/15 bg-white px-3 py-1.5 text-sm text-[#2C1810] placeholder:text-[#2C1810]/30 focus:border-[#2C1810]/35 focus:outline-none disabled:opacity-50"
          />
          {showDropdown && (loading || suggestions.length > 0) && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-[#2C1810]/10 bg-white shadow-md overflow-hidden">
              {loading && (
                <li className="px-3 py-2 text-xs text-[#2C1810]/40">搜尋中…</li>
              )}
              {suggestions
                .filter((s) => !tags.includes(s))
                .map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleAdd(s)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-[#2C1810]/70 hover:bg-[#2C1810]/5 transition-colors"
                    >
                      {s}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleAdd(input)}
          disabled={disabled || !input.trim()}
          className="flex-none rounded-lg border border-[#2C1810]/15 bg-white px-2.5 py-1.5 text-sm text-[#2C1810]/50 hover:text-[#2C1810] hover:border-[#2C1810]/35 disabled:opacity-30 transition-colors"
          aria-label="新增標籤"
        >
          ＋
        </button>
      </div>
    </div>
  )
}
