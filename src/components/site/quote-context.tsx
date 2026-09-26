import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

interface QuoteCtx {
  open: boolean
  serviceTitle: string | null
  openQuote: (title?: string) => void
  closeQuote: () => void
}

const Ctx = createContext<QuoteCtx | null>(null)

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [serviceTitle, setServiceTitle] = useState<string | null>(null)

  const openQuote = useCallback((title?: string) => {
    setServiceTitle(title ?? null)
    setOpen(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeQuote = useCallback(() => {
    setOpen(false)
    document.body.style.overflow = ''
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeQuote()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeQuote])

  useEffect(() => () => { document.body.style.overflow = '' }, [])

  return (
    <Ctx.Provider value={{ open, serviceTitle, openQuote, closeQuote }}>
      {children}
    </Ctx.Provider>
  )
}

export function useQuote(): QuoteCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useQuote must be used inside <QuoteProvider>')
  return ctx
}
