import { useEffect, useRef, useSyncExternalStore } from 'react'
import { Icone } from './ui'

/**
 * Avisos (toasts) e diálogos de confirmação próprios, no lugar de alert()/confirm() do navegador.
 * Uso: avisar('Salvo!')  ·  if (await confirmar({ titulo: 'Excluir?', perigo: true })) …
 */

type TipoAviso = 'sucesso' | 'erro' | 'info'
interface Aviso {
  id: number
  texto: string
  tipo: TipoAviso
}
interface Confirmacao {
  titulo: string
  mensagem?: string
  botao?: string
  perigo?: boolean
  responder: (ok: boolean) => void
}

let avisos: Aviso[] = []
let confirmacao: Confirmacao | null = null
let estado: { avisos: Aviso[]; confirmacao: Confirmacao | null } = { avisos, confirmacao }
const ouvintes = new Set<() => void>()
let proximoId = 1

function emitir() {
  estado = { avisos, confirmacao }
  ouvintes.forEach((f) => f())
}

export function avisar(texto: string, tipo: TipoAviso = 'sucesso') {
  const id = proximoId++
  avisos = [...avisos, { id, texto, tipo }].slice(-4)
  emitir()
  setTimeout(() => fecharAviso(id), tipo === 'erro' ? 5000 : 3000)
}

function fecharAviso(id: number) {
  avisos = avisos.filter((a) => a.id !== id)
  emitir()
}

export function confirmar(opcoes: Omit<Confirmacao, 'responder'>): Promise<boolean> {
  return new Promise((resolve) => {
    confirmacao?.responder(false)
    confirmacao = {
      ...opcoes,
      responder: (ok) => {
        confirmacao = null
        emitir()
        resolve(ok)
      },
    }
    emitir()
  })
}

const ESTILO: Record<TipoAviso, { classe: string; icone: string }> = {
  sucesso: { classe: 'bg-emerald-500', icone: 'check' },
  erro: { classe: 'bg-red-500', icone: 'x' },
  info: { classe: 'bg-marca-500', icone: 'raio' },
}

export function Avisos() {
  const { avisos: lista, confirmacao: c } = useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => estado,
  )
  const botaoOk = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!c) return
    botaoOk.current?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && c.responder(false)
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [c])

  return (
    <div className="nao-imprimir">
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
        {lista.map((a) => (
          <div
            key={a.id}
            role="status"
            className="pointer-events-auto flex animate-escala items-center gap-3 rounded-2xl bg-slate-900/95 py-2.5 pl-2.5 pr-4 text-sm text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${ESTILO[a.tipo].classe}`}>
              <Icone nome={ESTILO[a.tipo].icone} className="h-4 w-4" />
            </span>
            {a.texto}
          </div>
        ))}
      </div>

      {c && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacao">
          <div className="absolute inset-0 animate-surgir bg-slate-900/50 backdrop-blur-sm" onClick={() => c.responder(false)} />
          <div className="relative w-full max-w-sm animate-escala rounded-3xl bg-white p-6 shadow-2xl">
            <div className={`grid h-12 w-12 place-items-center rounded-2xl ${c.perigo ? 'bg-red-50 text-red-600' : 'bg-marca-50 text-marca-600'}`}>
              <Icone nome={c.perigo ? 'lixo' : 'documento'} className="h-6 w-6" />
            </div>
            <h2 id="titulo-confirmacao" className="mt-4 text-lg font-bold text-slate-900">
              {c.titulo}
            </h2>
            {c.mensagem && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{c.mensagem}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button className="btn-secundario" onClick={() => c.responder(false)}>
                Cancelar
              </button>
              <button
                ref={botaoOk}
                className={c.perigo ? 'btn bg-red-600 text-white shadow-md shadow-red-600/25 hover:bg-red-700' : 'btn-primario'}
                onClick={() => c.responder(true)}
              >
                {c.botao ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
