import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Building2,
  ChartColumn,
  Check,
  CircleUser,
  Clock,
  Cloud,
  CloudOff,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  GripVertical,
  ImagePlus,
  LayoutGrid,
  Link2,
  ListFilter,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Plus,
  Printer,
  Redo2,
  RefreshCw,
  Search,
  Send,
  Sun,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { ROTULO_STATUS, type StatusExibido } from '../lib/status'

/** Símbolo: um carimbo de "aprovado" (quadrado de tinta com o visto em amarelo marca-texto). */
export function Simbolo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="3" className="fill-slate-900" />
      <rect x="4" y="4" width="24" height="24" rx="1.5" fill="none" className="stroke-slate-50" strokeWidth="1.2" strokeDasharray="2.4 1.6" />
      <path d="M9.5 16.5l4.2 4.2L22.5 11" fill="none" stroke="#ffd60a" strokeWidth="3.2" strokeLinecap="square" />
    </svg>
  )
}

export function Marca({ para = '/' }: { para?: string }) {
  return (
    <Link to={para} className="flex shrink-0 items-center gap-2" aria-label="OrçaFácil, página inicial">
      <Simbolo />
      <span className="font-display text-[19px] font-bold tracking-tight text-slate-900">OrçaFácil</span>
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

export const STATUS: Record<StatusExibido, { rotulo: string; classe: string; ponto: string }> = {
  rascunho: { rotulo: ROTULO_STATUS.rascunho, classe: 'bg-slate-100 text-slate-700 ring-slate-200', ponto: 'bg-slate-400' },
  pendente: { rotulo: ROTULO_STATUS.pendente, classe: 'bg-amber-50 text-amber-800 ring-amber-200', ponto: 'bg-amber-500' },
  visualizado: { rotulo: ROTULO_STATUS.visualizado, classe: 'bg-sky-50 text-sky-800 ring-sky-200', ponto: 'bg-sky-700' },
  aprovado: { rotulo: ROTULO_STATUS.aprovado, classe: 'bg-emerald-50 text-emerald-700 ring-emerald-200', ponto: 'bg-emerald-500' },
  recusado: { rotulo: ROTULO_STATUS.recusado, classe: 'bg-rose-50 text-rose-700 ring-rose-200', ponto: 'bg-rose-500' },
  expirado: { rotulo: ROTULO_STATUS.expirado, classe: 'bg-slate-100 text-slate-600 ring-slate-300', ponto: 'bg-slate-500' },
  cancelado: { rotulo: ROTULO_STATUS.cancelado, classe: 'bg-slate-100 text-slate-500 ring-slate-200 line-through decoration-slate-400/60', ponto: 'bg-slate-300' },
}

export function SeloStatus({ status }: { status: StatusExibido }) {
  const s = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${s.classe}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.ponto}`} />
      {s.rotulo}
    </span>
  )
}

export function Titulo({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
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
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200/60" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-slate-200/50" />
    </div>
  )
}

/** Ícones (Lucide): traço fino e consistente em todo o app. */
const ICONES: Record<string, LucideIcon> = {
  documento: FileText,
  painel: LayoutGrid,
  clientes: Users,
  config: Building2,
  cartao: CreditCard,
  mais: Plus,
  lixo: Trash2,
  foto: ImagePlus,
  imprimir: Printer,
  olho: Eye,
  copiar: Copy,
  voltar: ArrowLeft,
  check: Check,
  sair: LogOut,
  busca: Search,
  cadeado: Lock,
  raio: Zap,
  whatsapp: MessageCircle,
  seta: ArrowRight,
  menu: Menu,
  x: X,
  baixar: ArrowDown,
  subir: ArrowUp,
  download: Download,
  upload: Upload,
  link: Link2,
  sino: Bell,
  sol: Sun,
  lua: Moon,
  monitor: Monitor,
  nuvem: Cloud,
  nuvemOff: CloudOff,
  atualizar: RefreshCw,
  desfazer: Undo2,
  refazer: Redo2,
  email: Mail,
  relogio: Clock,
  filtro: ListFilter,
  editar: Pencil,
  usuario: CircleUser,
  alerta: TriangleAlert,
  arrastar: GripVertical,
  modelos: Palette,
  grafico: ChartColumn,
  enviar: Send,
}

export function Icone({ nome, className = 'h-4 w-4' }: { nome: string; className?: string }) {
  const C = ICONES[nome] ?? FileText
  return <C className={className} strokeWidth={1.75} aria-hidden="true" />
}
