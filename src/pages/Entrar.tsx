import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { cadastrar, entrar, entrarComGoogle, problemaNaSenha, recuperarSenha, redefinirSenha, reenviarConfirmacao, useAuth } from '../auth'
import { AlternarTema } from '../components/Layouts'
import { Campo, Icone, Marca } from '../components/ui'
import { mensagemDeErro, nuvemDisponivel, provedoresAtivos } from '../lib/supabase'

type Modo = 'entrar' | 'cadastrar' | 'recuperar'

/** Só aceita caminhos internos em "voltar" (evita redirecionamento para outro site). */
const destinoSeguro = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/app')

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-superficie lg:grid-cols-[1fr_0.9fr]">
      <div className="flex flex-col px-6 py-7 sm:px-12">
        <div className="flex items-center justify-between">
          <Marca />
          <AlternarTema compacto />
        </div>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
        <p className="text-center text-xs text-slate-500"><Link to="/" className="inline-flex min-h-10 items-center gap-1.5 hover:text-marca-600"><Icone nome="voltar" className="h-3.5 w-3.5" />Voltar ao site</Link></p>
      </div>
      <aside className="hidden border-l border-slate-200 bg-marca-50 p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto w-full max-w-sm">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-superficie text-marca-600 shadow-sm"><Icone nome="documento" className="h-6 w-6" /></span>
          <p className="mt-7 font-display text-4xl leading-tight font-semibold tracking-tight text-slate-900">Seu próximo trabalho começa com uma boa proposta.</p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">Organize os detalhes, apresente seu valor e acompanhe o que acontece depois do envio.</p>
          <div className="mt-8 rounded-2xl border border-marca-200 bg-superficie p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Uma conta. Tudo organizado.</p>
            <ul className="mt-5 space-y-4 text-sm text-slate-600">
              {['Seus orçamentos e clientes na nuvem', 'Sua marca em cinco modelos de proposta', 'Aprovação pelo celular, sem conta para o cliente', 'Gratuito e sem cartão de crédito'].map((texto) => <li key={texto} className="flex items-start gap-3"><Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" />{texto}</li>)}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  )
}

export function Entrar() {
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const { usuario, carregando } = useAuth()
  const [modo, setModo] = useState<Modo>(params.get('modo') === 'cadastrar' ? 'cadastrar' : 'entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState<'confirmar' | 'recuperar' | null>(null)
  const voltar = destinoSeguro(params.get('voltar'))
  const [loginGoogleAtivo, setLoginGoogleAtivo] = useState(false)

  useEffect(() => {
    setErro('')
  }, [modo])

  useEffect(() => {
    void provedoresAtivos().then((p) => setLoginGoogleAtivo(p.google))
  }, [])

  if (!nuvemDisponivel) {
    return (
      <Moldura>
        <h1 className="text-2xl font-semibold text-slate-900">Contas indisponíveis</h1>
        <p className="mt-2 text-sm text-slate-500">Este ambiente não está conectado à nuvem (modo de desenvolvimento). O app funciona só neste navegador.</p>
        <Link to="/app" className="btn-primario mt-6">Abrir o app</Link>
      </Moldura>
    )
  }
  if (!carregando && usuario) return <Navigate to={voltar} replace />

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    setErro('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro('Digite um e-mail válido.')
    if (modo === 'cadastrar') {
      if (nome.trim().length < 2) return setErro('Digite seu nome.')
      const problema = problemaNaSenha(senha)
      if (problema) return setErro(problema)
    }
    if (modo === 'entrar' && !senha) return setErro('Digite sua senha.')
    setOcupado(true)
    try {
      if (modo === 'entrar') {
        await entrar(email.trim(), senha)
        navegar(voltar, { replace: true })
      } else if (modo === 'cadastrar') {
        const { precisaConfirmar } = await cadastrar(nome.trim(), email.trim(), senha)
        if (precisaConfirmar) setAviso('confirmar')
        else navegar(voltar, { replace: true })
      } else {
        await recuperarSenha(email.trim())
        setAviso('recuperar')
      }
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setOcupado(false)
    }
  }

  if (aviso) {
    return (
      <Moldura>
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 text-slate-500">
          <Icone nome="email" className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-slate-900">Confira seu e-mail</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {aviso === 'confirmar'
            ? <>Enviamos um link de confirmação para <strong>{email}</strong>. Abra o link para ativar sua conta e entrar.</>
            : <>Se existir uma conta com <strong>{email}</strong>, você vai receber um link para criar uma nova senha.</>}
        </p>
        <p className="mt-2 text-xs text-slate-500">Não chegou? Veja a caixa de spam. O envio pode levar alguns minutos.</p>
        {aviso === 'confirmar' && (
          <button
            className="btn-secundario mt-6"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true)
              try {
                await reenviarConfirmacao(email.trim())
                setErro('')
              } catch (e) {
                setErro(mensagemDeErro(e))
              } finally {
                setOcupado(false)
              }
            }}
          >
            Reenviar e-mail
          </button>
        )}
        {erro && <p role="alert" className="mt-3 text-sm text-red-600">{erro}</p>}
        <button className="mt-6 text-sm font-semibold text-marca-600 hover:text-marca-700" onClick={() => { setAviso(null); setModo('entrar') }}>
          Voltar para entrar
        </button>
      </Moldura>
    )
  }

  const titulos = { entrar: 'Entre na sua conta', cadastrar: 'Crie sua conta grátis', recuperar: 'Recuperar senha' }

  return (
    <Moldura>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">{titulos[modo]}</h1>
      <p className="mt-3 text-sm text-slate-500">
        {modo === 'entrar' && <>Ainda não tem conta? <button className="font-semibold text-marca-600 hover:text-marca-700" onClick={() => setModo('cadastrar')}>Cadastre-se grátis</button></>}
        {modo === 'cadastrar' && <>Já tem conta? <button className="font-semibold text-marca-600 hover:text-marca-700" onClick={() => setModo('entrar')}>Entrar</button></>}
        {modo === 'recuperar' && 'Digite o e-mail da sua conta para receber o link de redefinição.'}
      </p>

      {loginGoogleAtivo && modo !== 'recuperar' && (
        <>
          <button
            type="button"
            className="btn-secundario mt-8 w-full py-2.5"
            onClick={async () => {
              try {
                await entrarComGoogle()
              } catch (e) {
                setErro(mensagemDeErro(e))
              }
            }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
            </svg>
            Continuar com Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> ou com e-mail <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}

      <form onSubmit={enviar} className={`${loginGoogleAtivo && modo !== 'recuperar' ? '' : 'mt-8'} space-y-4`} noValidate>
        {modo === 'cadastrar' && <Campo rotulo="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" maxLength={120} autoFocus />}
        <Campo rotulo="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" autoComplete="email" autoFocus={modo !== 'cadastrar'} />
        {modo !== 'recuperar' && (
          <div>
            <Campo
              rotulo="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'cadastrar' ? 'new-password' : 'current-password'}
              dica={modo === 'cadastrar' ? 'Mínimo de 8 caracteres, com letras e números.' : undefined}
            />
            {modo === 'entrar' && (
              <button type="button" className="mt-1.5 text-xs font-semibold text-marca-600 hover:text-marca-700" onClick={() => setModo('recuperar')}>
                Esqueci minha senha
              </button>
            )}
          </div>
        )}
        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {erro}
          </p>
        )}
        <button className="btn-destaque w-full py-2.5" disabled={ocupado}>
          {ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : modo === 'cadastrar' ? 'Criar conta' : 'Enviar link'}
        </button>
        {modo === 'cadastrar' && (
          <p className="text-center text-xs text-slate-500">
            Ao criar a conta você concorda com os <Link to="/termos" className="font-semibold text-marca-600">Termos de uso</Link> e a{' '}
            <Link to="/privacidade" className="font-semibold text-marca-600">Política de privacidade</Link>.
          </p>
        )}
        {modo === 'recuperar' && (
          <button type="button" className="w-full text-sm font-semibold text-marca-600 hover:text-marca-700" onClick={() => setModo('entrar')}>
            Voltar para entrar
          </button>
        )}
      </form>

    </Moldura>
  )
}

/** Aberta pelo link do e-mail de recuperação: o Supabase cria a sessão e aqui se define a nova senha. */
export function RedefinirSenha() {
  const { usuario, carregando } = useAuth()
  const navegar = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    const problema = problemaNaSenha(senha)
    if (problema) return setErro(problema)
    if (senha !== confirmacao) return setErro('As senhas não conferem.')
    setOcupado(true)
    try {
      await redefinirSenha(senha)
      navegar('/app', { replace: true })
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Moldura>
      {carregando ? (
        <p className="text-sm text-slate-500">Validando o link…</p>
      ) : !usuario ? (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-slate-500">Peça um novo link de redefinição de senha.</p>
          <Link to="/entrar" className="btn-primario mt-6">Voltar para entrar</Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-slate-900">Crie uma nova senha</h1>
          <p className="mt-1 text-sm text-slate-500">Para a conta {usuario.email}.</p>
          <form onSubmit={enviar} className="mt-8 space-y-4" noValidate>
            <Campo rotulo="Nova senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} dica="Mínimo de 8 caracteres, com letras e números." autoFocus />
            <Campo rotulo="Repita a nova senha" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
            {erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
            <button className="btn-primario w-full py-2.5" disabled={ocupado}>
              {ocupado ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        </>
      )}
    </Moldura>
  )
}
