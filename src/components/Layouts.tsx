import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { obterPlano, sair, useAuth } from '../auth'
import { Icone, Marca } from './ui'

export function LayoutPublico() {
  const { sessao, assinatura } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Marca />
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="/#recursos" className="hover:text-slate-900">
              Recursos
            </a>
            <a href="/#como-funciona" className="hover:text-slate-900">
              Como funciona
            </a>
            <Link to="/precos" className="hover:text-slate-900">
              Preços
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {sessao && assinatura ? (
              <Link to="/app" className="btn-primario">
                Abrir o app
              </Link>
            ) : (
              <>
                {!sessao && (
                  <Link to="/entrar" className="btn-fantasma px-3">
                    Entrar
                  </Link>
                )}
                <Link to="/precos" className="btn-primario">
                  Assinar agora
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Marca />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
              Orçamentos profissionais com fotos, sua marca e PDF pronto para enviar. Protótipo em modo de testes: nenhum
              pagamento é cobrado.
            </p>
          </div>
          <nav aria-label="Produto" className="text-sm">
            <h2 className="font-semibold text-slate-900">Produto</h2>
            <ul className="mt-3 space-y-2 text-slate-500">
              <li><a href="/#recursos" className="hover:text-slate-900">Recursos</a></li>
              <li><Link to="/precos" className="hover:text-slate-900">Preços</Link></li>
              <li><Link to="/app" className="hover:text-slate-900">Abrir o app</Link></li>
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
            <p>© {new Date().getFullYear()} Orçafácil. Todos os direitos reservados.</p>
            <p>
              Desenvolvido por{' '}
              <a href="https://www.pqueirozdev.com.br/" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-700 hover:text-marca-600">
                Pedro Queiroz
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const LINKS_APP = [
  { para: '/app', rotulo: 'Orçamentos', icone: 'painel', fim: true },
  { para: '/app/modelo', rotulo: 'Modelo do orçamento', icone: 'documento' },
  { para: '/app/clientes', rotulo: 'Clientes', icone: 'clientes' },
  { para: '/app/configuracoes', rotulo: 'Minha empresa', icone: 'config' },
  { para: '/app/assinatura', rotulo: 'Assinatura', icone: 'cartao' },
]

export function LayoutApp() {
  const { sessao, assinatura } = useAuth()
  const local = useLocation()
  const navegar = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)

  if (!sessao) return <Navigate to={`/entrar?voltar=${encodeURIComponent(local.pathname)}`} replace />
  if (!assinatura) return <Navigate to="/precos?motivo=assinatura" replace />

  const plano = obterPlano(assinatura.plano)

  const nav = (
    <nav className="flex flex-col gap-1">
      {LINKS_APP.map((l) => (
        <NavLink
          key={l.para}
          to={l.para}
          end={l.fim}
          onClick={() => setMenuAberto(false)}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-marca-50 to-white text-marca-700 shadow-xs ring-1 ring-marca-100'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-marca-600 transition-all duration-300 ${
                  isActive ? 'opacity-100' : 'h-0 opacity-0'
                }`}
              />
              <span
                className={`grid h-8 w-8 place-items-center rounded-lg transition duration-200 ${
                  isActive ? 'bg-marca-600 text-white shadow-md shadow-marca-600/30' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700'
                }`}
              >
                <Icone nome={l.icone} className="h-4 w-4" />
              </span>
              {l.rotulo}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )

  const rodape = (
    <div className="border-t border-slate-200 pt-4">
      <div className="relative mb-3 overflow-hidden rounded-xl bg-gradient-to-br from-marca-600 to-violeta-600 px-3.5 py-3 text-xs text-white shadow-md shadow-marca-600/20">
        <div className="absolute -right-4 -top-6 h-16 w-16 rounded-full bg-white/10" />
        <div className="font-semibold">Plano {plano?.nome}</div>
        <div className="text-white/75">Modo de testes · sem cobrança</div>
      </div>
      <div className="flex items-center gap-3 px-1">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-700 ring-2 ring-white">
          {sessao.nome.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-slate-900">{sessao.nome}</div>
          <div className="truncate text-xs text-slate-500">{sessao.email}</div>
        </div>
        <button
          title="Sair"
          aria-label="Sair da conta"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          onClick={() => {
            sair()
            navegar('/')
          }}
        >
          <Icone nome="sair" />
        </button>
      </div>
      <p className="mt-3 px-1 text-[11px] text-slate-400">
        <Link to="/termos" className="hover:text-slate-600">Termos</Link> ·{' '}
        <Link to="/privacidade" className="hover:text-slate-600">Privacidade</Link> · por{' '}
        <a href="https://www.pqueirozdev.com.br/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">Pedro Queiroz</a>
      </p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f6f7fb] lg:pl-68 print:bg-white print:pl-0">
      {/* Barra lateral (desktop) */}
      <aside className="nao-imprimir fixed inset-y-0 left-0 hidden w-68 flex-col border-r border-slate-200/80 bg-white/90 p-4 backdrop-blur lg:flex">
        <div className="mb-7 px-1 pt-1">
          <Marca para="/app" />
        </div>
        <div className="flex-1">{nav}</div>
        {rodape}
      </aside>

      {/* Topo (celular) */}
      <header className="nao-imprimir sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur lg:hidden">
        <Marca para="/app" />
        <button
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          aria-controls="menu-celular"
          className="grid h-11 w-11 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100"
          onClick={() => setMenuAberto(true)}
        >
          <Icone nome="menu" className="h-5 w-5" />
        </button>
      </header>
      {menuAberto && (
        <div id="menu-celular" className="nao-imprimir fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-surgir bg-slate-900/40 backdrop-blur-sm" onClick={() => setMenuAberto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] animate-[deslizar_0.3s_cubic-bezier(0.22,1,0.36,1)] flex-col bg-white p-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <Marca para="/app" />
              <button aria-label="Fechar menu" className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={() => setMenuAberto(false)}>
                <Icone nome="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1">{nav}</div>
            {rodape}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 print:max-w-none print:p-0">
        {/* key = rota: cada página entra com animação */}
        <div key={local.pathname} className="animate-entrada print:animate-none">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
