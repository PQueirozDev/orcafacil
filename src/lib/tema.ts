import { useSyncExternalStore } from 'react'

/**
 * Tema claro/escuro. "sistema" segue o sistema operacional e reage quando ele muda.
 * A classe .dark é aplicada no <html> antes do React (script em index.html) para não piscar.
 */
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro'

const CHAVE = 'orcafacil:tema'
const midia = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const ouvintes = new Set<() => void>()

function ler(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'claro' || v === 'escuro' ? v : 'sistema'
  } catch {
    return 'sistema'
  }
}

let preferencia = ler()

const escuroEfetivo = () => preferencia === 'escuro' || (preferencia === 'sistema' && !!midia?.matches)

function aplicar() {
  const escuro = escuroEfetivo()
  document.documentElement.classList.toggle('dark', escuro)
  document.documentElement.style.colorScheme = escuro ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0b1020' : '#4f46e5')
  ouvintes.forEach((f) => f())
}

midia?.addEventListener('change', () => preferencia === 'sistema' && aplicar())

export function definirTema(p: PreferenciaTema) {
  preferencia = p
  try {
    if (p === 'sistema') localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, p)
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  aplicar()
}

let instantaneo = { preferencia, escuro: escuroEfetivo() }
export function useTema() {
  return useSyncExternalStore(
    (f) => {
      const g = () => {
        instantaneo = { preferencia, escuro: escuroEfetivo() }
        f()
      }
      ouvintes.add(g)
      return () => ouvintes.delete(g)
    },
    () => instantaneo,
  )
}

aplicar()
