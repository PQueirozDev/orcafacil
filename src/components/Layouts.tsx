import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { db } from '../db'
import { formatarDataHora } from '../lib/formato'
import { useNotificacoes } from '../lib/notificacoes'
import { nuvemDisponivel } from '../lib/supabase'
import { iniciarSincronizacao, sincronizar, useSync } from '../lib/sync'
import { definirTema, useTema, type PreferenciaTema } from '../lib/tema'
import { avisar } from './Avisos'
import { Icone, Marca } from './ui'

// ------------------------------------------------------------------------------------------
// Peças compartilhadas
// ------------------------------------------------------------------------------------------
export function AlternarTema({ compacto = false }: { compacto?: boolean }) {
  const { preferencia } = useTema()
  const opcoes: [PreferenciaTema, string, string][] = [
    ['claro', 'sol', 'Tema claro'],
    ['escuro', 'lua', 'Tema escuro'],
    ['sistema', 'monitor', 'Seguir o sistema'],
  ]
  if (compacto) {
    const i = opcoes.findIndex((o) => o[0] === preferencia)
    const atual = opcoes[i]
    const proxima = opcoes[(i + 1) % opcoes.length]
    return (
      <button
        className="grid h-9 w-9 place-items-center rounded-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        onClick={() => definirTema(proxima[0])}
        aria-label={`${atual[2]}. Mudar para: ${proxima[2]}`}
        title={atual[2]}
      >
        <Icone nome={atual[1]} className="h-[18px] w-[18px]" />
      </button>
    )
  }
  return (
    <div role="radiogroup" aria-label="Tema" className="inline-flex rounded-xl bg-slate-100 p-1">
      {opcoes.map(([v, icone, rotulo]) => (
        <button
          key={v}
          role="radio"
          aria-checked={preferencia === v}
          aria-label={rotulo}
          title={rotulo}
          onClick={() => definirTema(v)}
          className={`grid h-8 w-9 place-items-center rounded-lg transition ${
            preferencia === v ? 'bg-superficie text-marca-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icone nome={icone} className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

function IndicadorSync() {
  const { usuario } = useAuth()
  const { situacao, ultima, erro } = useSync()
  if (!usuario) return null
  const mapa = {
    visitante: ['nuvemOff', 'text-slate-400', 'Sem conta'],
    sincronizando: ['atualizar', 'text-marca-600 animate-spin', 'Sincronizando…'],
    pendente: ['nuvem', 'text-amber-600', 'Alterações a enviar'],
    sincronizado: ['nuvem', 'text-emerald-600', 'Tudo salvo na nuvem'],
    offline: ['nuvemOff', 'text-amber-600', 'Sem conexão: salvo neste aparelho'],
    erro: ['alerta', 'text-red-600', 'Falha ao sincronizar'],
  } as const
  const [icone, cor, texto] = mapa[situacao]
  const detalhe = situacao === 'erro' ? 'Toque para tentar de novo.' : ultima ? `Última sincronização: ${formatarDataHora(ultima)}` : ''
  return (
    <button
      onClick={() => {
        void sincronizar().then(() => erro && avisar('Sincronização tentada novamente.', 'info'))
      }}
      className="flex h-9 items-center gap-2 rounded-sm px-2 font-mono text-[11px] text-slate-600 transition-colors hover:bg-slate-100"
      title={detalhe}
      aria-label={`${texto}. ${detalhe}`}
    >
      <Icone nome={icone} className={`h-[18px] w-[18px] ${cor}`} />
      <span className="hidden xl:inline">{texto}</span>
    </button>
  )
}

function CentralNotificacoes() {
  const { usuario } = useAuth()
  const { notificacoes, naoLidas, marcarLida, marcarTodas } = useNotificacoes()
  const [aberta, setAberta] = useState(false)
  const navegar = useNavigate()
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberta) return
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberta(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberta(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberta])

  const icones = { aprovacao: ['check', 'bg-emerald-500'], recusa: ['x', 'bg-rose-500'], vencendo: ['relogio', 'bg-amber-500'], expirada: ['alerta', 'bg-slate-400'] } as const

  return (
    <div className="relative" ref={caixa}>
      <button
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
        aria-haspopup="dialog"
        aria-label={naoLidas ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
        className="relative grid h-9 w-9 place-items-center rounded-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <Icone nome="sino" className="h-[18px] w-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 animate-escala place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-superficie">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>
      {aberta && (
        <div
          role="dialog"
          aria-label="Central de notificações"
          className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] animate-escala overflow-hidden rounded-xl border border-slate-200 bg-superficie shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">Notificações</h2>
            {naoLidas > 0 && (
              <button className="text-xs font-semibold text-marca-600 hover:text-marca-700" onClick={() => void marcarTodas()}>
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
            {notificacoes.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-slate-500">
                {usuario ? 'Nenhuma notificação por enquanto.' : 'Entre na sua conta para receber aprovações e recusas dos clientes.'}
              </li>
            )}
            {notificacoes.map((n) => (
              <li key={n.id}>
                <button
                  className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${n.lida ? 'opacity-70' : ''}`}
                  onClick={async () => {
                    void marcarLida(n)
                    setAberta(false)
                    if (n.orcamentoUid) {
                      const o = await db.orcamentos.where('uid').equals(n.orcamentoUid).first()
                      if (o) navegar(`/app/orcamentos/${o.id}/visualizar`)
                    }
                  }}
                >
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${icones[n.tipo][1]}`}>
                    <Icone nome={icones[n.tipo][0]} className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {n.titulo}
                      {!n.lida && <span className="h-2 w-2 shrink-0 rounded-full bg-marca-500" aria-label="não lida" />}
                    </span>
                    {n.corpo && <span className="mt-0.5 block truncate text-xs text-slate-500">{n.corpo}</span>}
                    <span className="mt-0.5 block text-[11px] text-slate-400">{formatarDataHora(n.criadoEm)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------------------------------
// Site público
// ------------------------------------------------------------------------------------------
export function LayoutPublico() {
  const { usuario } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-fundo">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:bg-superficie focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-900 bg-fundo">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
          <Marca />
          <nav aria-label="Principal" className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            <a href="/#como-funciona" className="hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4">Como funciona</a>
            <a href="/#modelos" className="hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4">Modelos</a>
            <a href="/#recursos" className="hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4">Recursos</a>
            <Link to="/planos" className="hover:text-slate-900 hover:underline hover:decoration-2 hover:underline-offset-4">Planos</Link>
          </nav>
          <div className="flex items-center gap-1.5">
            <AlternarTema compacto />
            {usuario ? (
              <Link to="/app" className="btn-primario">Abrir o app</Link>
            ) : nuvemDisponivel ? (
              <>
                <Link to="/entrar" className="btn-fantasma hidden px-3 sm:inline-flex">Entrar</Link>
                <Link to="/entrar?modo=cadastrar" className="btn-destaque">Criar conta</Link>
              </>
            ) : (
              <Link to="/app" className="btn-primario">Abrir o app</Link>
            )}
          </div>
        </div>
      </header>
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Rodape />
    </div>
  )
}

function Rodape() {
  return (
    <footer className="border-t border-slate-900 bg-fundo">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Marca />
          <p className="mt-3 max-w-xs text-sm text-slate-600">Orçamento com fotos, sua marca e aprovação pelo celular. Grátis, sem cartão.</p>
        </div>
        <nav aria-label="Produto" className="text-sm">
          <h2 className="etiqueta">Produto</h2>
          <ul className="mt-3 space-y-2 text-slate-700">
            <li><a href="/#como-funciona" className="hover:underline">Como funciona</a></li>
            <li><a href="/#modelos" className="hover:underline">Modelos</a></li>
            <li><Link to="/planos" className="hover:underline">Planos</Link></li>
            <li><Link to="/entrar?modo=cadastrar" className="hover:underline">Criar conta</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal" className="text-sm">
          <h2 className="etiqueta">Legal</h2>
          <ul className="mt-3 space-y-2 text-slate-700">
            <li><Link to="/termos" className="hover:underline">Termos de uso</Link></li>
            <li><Link to="/privacidade" className="hover:underline">Privacidade</Link></li>
            <li>
              <a href="https://github.com/PQueirozDev/orcafacil" target="_blank" rel="noopener noreferrer" className="hover:underline">
                Código aberto (MIT)
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 py-4 font-mono text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} OrçaFácil</p>
          <p>
            Feito por{' '}
            <a href="https://www.pqueirozdev.com.br/" target="_blank" rel="noopener noreferrer" className="text-slate-800 underline underline-offset-2">
              Pedro Queiroz
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

// ------------------------------------------------------------------------------------------
// Aplicativo
// ------------------------------------------------------------------------------------------
const LINKS_APP = [
  { para: '/app', rotulo: 'Orçamentos', icone: 'documento', fim: true },
  { para: '/app/clientes', rotulo: 'Clientes', icone: 'clientes' },
  { para: '/app/modelo', rotulo: 'Modelos', icone: 'modelos' },
  { para: '/app/configuracoes', rotulo: 'Empresa', icone: 'config' },
  { para: '/app/plano', rotulo: 'Plano', icone: 'cartao' },
]

export function LayoutApp() {
  const { usuario, carregando, versaoBanco } = useAuth()
  const local = useLocation()

  useEffect(() => {
    if (!carregando) iniciarSincronizacao()
  }, [carregando, usuario?.id])

  if (carregando) {
    return <div className="grid min-h-screen place-items-center bg-fundo font-mono text-sm text-slate-500">carregando…</div>
  }
  if (nuvemDisponivel && !usuario) {
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(local.pathname + local.search)}`} replace />
  }

  return (
    <div className="min-h-screen bg-fundo pb-16 md:pb-0 print:bg-white print:pb-0">
      <a href="#conteudo-app" className="nao-imprimir sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:bg-superficie focus:px-4 focus:py-2">
        Pular para o conteúdo
      </a>

      {/* Barra superior */}
      <header className="nao-imprimir sticky top-0 z-30 border-b border-slate-900 bg-fundo">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Marca para="/app" />
          <nav aria-label="Aplicativo" className="hidden h-full items-stretch gap-1 md:flex">
            {LINKS_APP.map((l) => (
              <NavLink
                key={l.para}
                to={l.para}
                end={l.fim}
                className={({ isActive }) =>
                  `flex items-center border-b-2 px-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`
                }
              >
                {l.rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-0.5">
            <IndicadorSync />
            <CentralNotificacoes />
            <AlternarTema compacto />
            {usuario && (
              <Link
                to="/app/conta"
                title={usuario.email}
                aria-label="Minha conta"
                className="ml-1 grid h-8 w-8 place-items-center rounded-full bg-slate-900 font-mono text-xs font-semibold text-slate-50"
              >
                {(usuario.nome || usuario.email).slice(0, 1).toUpperCase()}
              </Link>
            )}
          </div>
        </div>
      </header>

      {!usuario && (
        <div className="nao-imprimir border-b border-slate-300 bg-destaque-200 px-4 py-2 text-center text-xs text-[#161512]">
          Modo local (sem nuvem configurada): os dados ficam só neste navegador.
        </div>
      )}

      <main id="conteudo-app" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8 print:max-w-none print:p-0">
        <div key={`${versaoBanco}:${local.pathname}`} className="animate-entrada print:animate-none">
          <Outlet />
        </div>
      </main>

      <footer className="nao-imprimir mx-auto hidden max-w-7xl justify-between px-6 pb-8 font-mono text-[11px] text-slate-400 md:flex">
        <span>OrçaFácil</span>
        <span>
          <Link to="/termos" className="hover:text-slate-700">termos</Link> · <Link to="/privacidade" className="hover:text-slate-700">privacidade</Link>
        </span>
      </footer>

      {/* Navegação inferior (celular) */}
      <nav aria-label="Aplicativo" className="nao-imprimir fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-900 bg-fundo md:hidden">
        {LINKS_APP.map((l) => (
          <NavLink
            key={l.para}
            to={l.para}
            end={l.fim}
            className={({ isActive }) =>
              `mx-1 my-1 flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium ${isActive ? 'bg-destaque-300 text-[#161512]' : 'text-slate-500'}`
            }
          >
            <Icone nome={l.icone} className="h-5 w-5" />
            {l.rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
