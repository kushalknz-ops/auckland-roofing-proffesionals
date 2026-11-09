import { useEffect } from 'react'

/**
 * Reveal-on-scroll for static markup. Observes every `.reveal` in the
 * document once `deps` settle and adds `.visible` when it enters the
 * viewport (mirrors the vanilla IntersectionObserver in app.js).
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px -24px 0px' },
    )
    const observed = new WeakSet<Element>()
    const observeContent = () => {
      document.querySelectorAll('.reveal').forEach((el) => {
        if (motion.matches) {
          el.classList.add('visible')
          io.unobserve(el)
        } else if (!observed.has(el) && !el.classList.contains('visible')) {
          observed.add(el)
          io.observe(el)
        }
      })
    }
    observeContent()
    // Lazy routes can mount after this effect; observe their content as well.
    const mutations = new MutationObserver((records) => {
      // Count-up text and other text-only updates do not add reveal targets.
      if (records.some((record) => Array.from(record.addedNodes).some((node) =>
        node instanceof Element && (node.matches('.reveal') || node.querySelector('.reveal')),
      ))) observeContent()
    })
    mutations.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true })
    motion.addEventListener('change', observeContent)
    return () => {
      io.disconnect()
      mutations.disconnect()
      motion.removeEventListener('change', observeContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
