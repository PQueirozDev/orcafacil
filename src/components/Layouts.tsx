import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { sair, useAuth } from '../auth'
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
        className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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
      className="flex h-10 items-center gap-2 rounded-xl px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
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
        className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
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
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-superficie focus:px-4 focus:py-2 focus:shadow-lg">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-fundo/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Marca />
          <nav aria-label="Principal" className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="/#recursos" className="hover:text-slate-900">Recursos</a>
            <a href="/#modelos" className="hover:text-slate-900">Modelos</a>
            <a href="/#como-funciona" className="hover:text-slate-900">Como funciona</a>
            <Link to="/planos" className="hover:text-slate-900">Planos</Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <AlternarTema compacto />
            {usuario ? (
              <Link to="/app" className="btn-primario">Abrir o app</Link>
            ) : (
              <>
                {nuvemDisponivel && (
                  <>
                    <Link to="/entrar" className="btn-fantasma px-3">Entrar</Link>
                    <Link to="/entrar?modo=cadastrar" className="btn-primario">Criar conta</Link>
                  </>
                )}
                {!nuvemDisponivel && <Link to="/app" className="btn-primario">Criar orçamento</Link>}
              </>
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
    <footer className="border-t border-slate-200">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Marca />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Orçamentos profissionais com fotos, sua marca e aprovação online. Grátis, sem cartão.
          </p>
        </div>
        <nav aria-label="Produto" className="text-sm">
          <h2 className="font-semibold text-slate-900">Produto</h2>
          <ul className="mt-3 space-y-2 text-slate-500">
            <li><a href="/#recursos" className="hover:text-slate-900">Recursos</a></li>
            <li><a href="/#modelos" className="hover:text-slate-900">Modelos</a></li>
            <li><Link to="/planos" className="hover:text-slate-900">Planos</Link></li>
            <li><Link to="/entrar?modo=cadastrar" className="hover:text-slate-900">Criar conta</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal" className="text-sm">
          <h2 className="font-semibold text-slate-900">Legal</h2>
          <ul className="mt-3 space-y-2 text-slate-500">
            <li><Link to="/termos" className="hover:text-slate-900">Termos de uso</Link></li>
            <li><Link to="/privacidade" className="hover:text-slate-900">Política de privacidade</Link></li>
            <li>
              <a href="https://github.com/PQueirozDev/orcafacil" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900">
                Código aberto (MIT)
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} OrçaFácil</p>
          <p>
            Desenvolvido por{' '}
            <a href="https://www.pqueirozdev.com.br/" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-700 hover:text-marca-600">
              Pedro Queiroz
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

// ------------------------------------------------------------------------------------------
// Aplicativo (funciona sem conta: modo visitante)
// ------------------------------------------------------------------------------------------
const LINKS_APP = [
  { para: '/app', rotulo: 'Painel', icone: 'painel', fim: true },
  { para: '/app/modelo', rotulo: 'Modelos', icone: 'modelos' },
  { para: '/app/clientes', rotulo: 'Clientes', icone: 'clientes' },
  { para: '/app/configuracoes', rotulo: 'Empresa', icone: 'config' },
  { para: '/app/conta', rotulo: 'Conta', icone: 'usuario' },
]

export function LayoutApp() {
  const { usuario, carregando, versaoBanco } = useAuth()
  const local = useLocation()
  const navegar = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)

  // (Re)inicia a sincronização quando a conta muda
  useEffect(() => {
    if (!carregando) iniciarSincronizacao()
  }, [carregando, usuario?.id])

  useEffect(() => setMenuAberto(false), [local.pathname])

  if (carregando) {
    return <div className="grid min-h-screen place-items-center bg-fundo text-sm text-slate-500">Carregando…</div>
  }
  if (nuvemDisponivel && !usuario) {
    return <Navigate to={`/entrar?voltar=${encodeURIComponent(local.pathname + local.search)}`} replace />
  }

  const nav = (
    <nav aria-label="Aplicativo" className="flex flex-col gap-1">
      {LINKS_APP.map((l) => (
        <NavLink
          key={l.para}
          to={l.para}
          end={l.fim}
          className={({ isActive }) =>
            `group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icone nome={l.icone} className={`h-[18px] w-[18px] ${isActive ? 'text-marca-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {l.rotulo}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  const cartaoConta = usuario ? (
    <div className="flex items-center gap-3 px-1">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca-100 text-xs font-semibold text-marca-800">
        {(usuario.nome || usuario.email).slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">{usuario.nome || 'Minha conta'}</div>
        <div className="truncate text-xs text-slate-500">{usuario.email}</div>
      </div>
      <button
        title="Sair"
        aria-label="Sair da conta"
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        onClick={async () => {
          await sincronizar()
          await sair()
          navegar('/')
        }}
      >
        <Icone nome="sair" />
      </button>
    </div>
  ) : (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
      <div className="text-sm font-semibold text-slate-900">Modo visitante</div>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
        Seus orçamentos ficam só neste navegador.
        {nuvemDisponivel && ' Crie uma conta grátis para salvar na nuvem, usar em outros aparelhos e receber aprovações.'}
      </p>
      {nuvemDisponivel && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <Link to="/entrar?modo=cadastrar&voltar=/app/conta" className="btn-primario px-2 py-1.5 text-xs">
            Criar conta
          </Link>
          <Link to="/entrar?voltar=/app" className="btn-secundario px-2 py-1.5 text-xs">
            Entrar
          </Link>
        </div>
      )}
    </div>
  )

  const rodapeMenu = (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      {cartaoConta}
      <p className="px-1 text-[11px] text-slate-400">
        <Link to="/termos" className="hover:text-slate-600">Termos</Link> · <Link to="/privacidade" className="hover:text-slate-600">Privacidade</Link>
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-fundo lg:pl-68 print:bg-white print:pl-0">
      <a href="#conteudo-app" className="nao-imprimir sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-superficie focus:px-4 focus:py-2 focus:shadow-lg">
        Pular para o conteúdo
      </a>

      {/* Barra lateral (desktop) */}
      <aside className="nao-imprimir fixed inset-y-0 left-0 hidden w-68 flex-col border-r border-slate-200/80 bg-superficie p-4 lg:flex">
        <div className="mb-6 px-1.5 pt-1">
          <Marca para="/app" />
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {rodapeMenu}
      </aside>

      {/* Barra superior */}
      <header className="nao-imprimir sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-slate-200/80 bg-superficie/85 px-4 backdrop-blur sm:px-6">
        <div className="lg:hidden">
          <Marca para="/app" />
        </div>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-1">
          <IndicadorSync />
          <CentralNotificacoes />
          <AlternarTema compacto />
          <button
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            aria-controls="menu-celular"
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 lg:hidden"
            onClick={() => setMenuAberto(true)}
          >
            <Icone nome="menu" className="h-5 w-5" />
          </button>
        </div>
      </header>

      {menuAberto && (
        <div id="menu-celular" className="nao-imprimir fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-surgir bg-slate-900/40 backdrop-blur-sm" onClick={() => setMenuAberto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] animate-[deslizar_0.3s_cubic-bezier(0.22,1,0.36,1)] flex-col bg-superficie p-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <Marca para="/app" />
              <button aria-label="Fechar menu" autoFocus className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={() => setMenuAberto(false)}>
                <Icone nome="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {rodapeMenu}
          </div>
        </div>
      )}

      <main id="conteudo-app" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0">
        {/* key: remonta a tela ao trocar de rota (animação) ou de banco (entrar/sair da conta) */}
        <div key={`${versaoBanco}:${local.pathname}`} className="animate-entrada print:animate-none">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
