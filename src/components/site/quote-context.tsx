import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

interface QuoteCtx {
  open: boolean
  serviceTitle: string | null
  returnFocusTo: HTMLElement | null
  openQuote: (trigger: HTMLElement | null, title?: string) => void
  closeQuote: () => void
}

const Ctx = createContext<QuoteCtx | null>(null)

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quote, setQuote] = useState<Pick<QuoteCtx, 'serviceTitle' | 'returnFocusTo'> | null>(null)

  const openQuote = useCallback((trigger: HTMLElement | null, title?: string) => {
    setQuote({ returnFocusTo: trigger, serviceTitle: title ?? null })
  }, [])

  const closeQuote = useCallback(() => {
    setQuote(null)
  }, [])

  return (
    <Ctx.Provider value={{
      open: quote !== null,
      serviceTitle: quote?.serviceTitle ?? null,
      returnFocusTo: quote?.returnFocusTo ?? null,
      openQuote,
      closeQuote,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useQuote(): QuoteCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useQuote must be used inside <QuoteProvider>')
  return ctx
}
