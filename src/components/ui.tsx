import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import type { StatusOrcamento } from '../db'

export function Marca({ para = '/', claro = false }: { para?: string; claro?: boolean }) {
  return (
    <Link to={para} className="group flex items-center gap-2.5">
      <img
        src="/favicon.svg"
        alt=""
        className="h-9 w-9 drop-shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
      />
      <span className={`text-lg font-extrabold tracking-tight ${claro ? 'text-white' : 'text-slate-900'}`}>
        Orça<span className="text-marca-600">fácil</span>
      </span>
    </Link>
  )
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { rotulo: string; dica?: string }

export function Campo({ rotulo, dica, className = '', ...props }: CampoProps) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{rotulo}</span>
      <input className="campo" {...props} />
      {dica && <span className="mt-1 block text-xs text-slate-500">{dica}</span>}
    </label>
  )
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { rotulo: string }

export function AreaTexto({ rotulo, className = '', ...props }: AreaProps) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{rotulo}</span>
      <textarea className="campo min-h-20 resize-y" {...props} />
    </label>
  )
}

export const STATUS: Record<StatusOrcamento, { rotulo: string; classe: string; ponto: string }> = {
  rascunho: { rotulo: 'Rascunho', classe: 'bg-slate-100 text-slate-700 ring-slate-200', ponto: 'bg-slate-400' },
  enviado: { rotulo: 'Enviado', classe: 'bg-sky-50 text-sky-700 ring-sky-200', ponto: 'bg-sky-500' },
  aprovado: { rotulo: 'Aprovado', classe: 'bg-emerald-50 text-emerald-700 ring-emerald-200', ponto: 'bg-emerald-500' },
  recusado: { rotulo: 'Recusado', classe: 'bg-rose-50 text-rose-700 ring-rose-200', ponto: 'bg-rose-500' },
}

export function SeloStatus({ status }: { status: StatusOrcamento }) {
  const s = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${s.classe}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.ponto}`} />
      {s.rotulo}
    </span>
  )
}

export function Titulo({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}

/** Placeholder animado enquanto os dados do navegador carregam. */
export function Carregando() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only">Carregando…</span>
      <div className="h-9 w-56 animate-pulse rounded-xl bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/60" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-slate-200/50" />
    </div>
  )
}

const CAMINHOS: Record<string, ReactNode> = {
  documento: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  painel: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  clientes: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  config: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  cartao: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19M6 15h4" />
    </>
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  lixo: <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />,
  foto: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  imprimir: (
    <>
      <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" />
    </>
  ),
  olho: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  copiar: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  voltar: <path d="M19 12H5M11 18l-6-6 6-6" />,
  check: <path d="m5 12 5 5L20 7" />,
  sair: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  busca: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  cadeado: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  raio: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  whatsapp: <path d="M21 12a9 9 0 0 1-13.2 8L3 21l1-4.6A9 9 0 1 1 21 12zM8.5 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.2 2 1-.4 1.6c-3.8.4-8.5-4.3-8.1-8.1l1.6-.4 1 2z" />,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  baixar: <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />,
  subir: <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />,
}

/** Símbolo do Pix (losangos), nas cores oficiais. */
export function SimboloPix({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="#32BCAD">
        <path d="M18.1 17.6a2.7 2.7 0 0 1-1.9-.8l-2.8-2.8a.5.5 0 0 0-.7 0l-2.8 2.8a2.7 2.7 0 0 1-1.9.8h-.6l3.6 3.6a2.9 2.9 0 0 0 4 0l3.6-3.6z" />
        <path d="M7.9 6.4a2.7 2.7 0 0 1 1.9.8l2.8 2.8a.5.5 0 0 0 .7 0l2.8-2.8a2.7 2.7 0 0 1 1.9-.8h.4L14.8 2.8a2.9 2.9 0 0 0-4 0L7.3 6.4z" />
        <path d="m21.2 10-2.2-2.2h-.9a1.8 1.8 0 0 0-1.3.5l-2.8 2.8a1.3 1.3 0 0 1-1.8 0L9.4 8.3a1.8 1.8 0 0 0-1.3-.5H7L4.8 10a2.9 2.9 0 0 0 0 4L7 16.2h1.1a1.8 1.8 0 0 0 1.3-.5l2.8-2.8a1.3 1.3 0 0 1 1.8 0l2.8 2.8a1.8 1.8 0 0 0 1.3.5h.9l2.2-2.2a2.9 2.9 0 0 0 0-4z" />
      </g>
    </svg>
  )
}

/** Desenho de um cartão de crédito colorido. */
export function SimboloCartao({ className = 'h-5 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 20" className={className} aria-hidden="true">
      <rect x="0.5" y="0.5" width="27" height="19" rx="3" fill="#4f46e5" />
      <rect x="0.5" y="4.5" width="27" height="3.5" fill="#1e1b4b" />
      <rect x="4" y="11" width="6" height="4.5" rx="1" fill="#facc15" />
      <circle cx="19.5" cy="14" r="2.6" fill="#f97316" opacity=".9" />
      <circle cx="22.5" cy="14" r="2.6" fill="#fde047" opacity=".9" />
    </svg>
  )
}

export function Icone({ nome, className = 'h-4 w-4' }: { nome: keyof typeof CAMINHOS | string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {CAMINHOS[nome]}
    </svg>
  )
}
