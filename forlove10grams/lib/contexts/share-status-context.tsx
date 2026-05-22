'use client'

import { createContext, useCallback, useContext, useState } from 'react'

type ShareStatusContextValue = {
  isLoaded: boolean
  setLoaded: () => void
  refresh: (() => void) | null
  registerRefresh: (fn: () => void) => void
}

const ShareStatusContext = createContext<ShareStatusContextValue | null>(null)

export function ShareStatusProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [refreshFn, setRefreshFn] = useState<(() => void) | null>(null)
  const setLoaded = useCallback(() => setIsLoaded(true), [])
  const registerRefresh = useCallback((fn: () => void) => setRefreshFn(() => fn), [])
  return (
    <ShareStatusContext.Provider value={{ isLoaded, setLoaded, refresh: refreshFn, registerRefresh }}>
      {children}
    </ShareStatusContext.Provider>
  )
}

export function useShareStatus() {
  const ctx = useContext(ShareStatusContext)
  if (ctx === null) throw new Error('useShareStatus must be used inside ShareStatusProvider')
  return ctx
}
