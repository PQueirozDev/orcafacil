import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { entrar, entrarComoVisitante, testarSemCadastro, useAuth } from '../auth'
import { Campo, Icone, Marca } from '../components/ui'

export function Entrar() {
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const { assinatura } = useAuth()
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>(params.get('modo') === 'cadastrar' ? 'cadastrar' : 'entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  const voltar = params.get('voltar')

  function enviar(ev: FormEvent) {
    ev.preventDefault()
    setCarregando(true)
    // Simula a ida ao servidor
    setTimeout(() => {
      const nomeFinal = nome.trim() || email.split('@')[0] || 'Usuário'
      entrar({ nome: nomeFinal.charAt(0).toUpperCase() + nomeFinal.slice(1), email: email.trim() })
      navegar(voltar || (assinatura ? '/app' : '/precos'), { replace: true })
    }, 600)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Marca />
          <h1 className="mt-10 text-2xl font-bold tracking-tight text-slate-900">
            {modo === 'entrar' ? 'Entre na sua conta' : 'Crie sua conta'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {modo === 'entrar' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
            <button
              type="button"
              className="font-semibold text-marca-600 hover:text-marca-700"
              onClick={() => setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')}
            >
              {modo === 'entrar' ? 'Cadastre-se grátis' : 'Entrar'}
            </button>
          </p>

          <form onSubmit={enviar} className="mt-8 space-y-4">
            {modo === 'cadastrar' && (
              <Campo rotulo="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
            )}
            <Campo
              rotulo="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              required
              autoFocus={modo === 'entrar'}
            />
            <Campo
              rotulo="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              minLength={4}
            />
            <button className="btn-primario w-full py-2.5" disabled={carregando}>
              {carregando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> ou <span className="h-px flex-1 bg-slate-200" />
          </div>
          <button
            type="button"
            className="btn-secundario w-full py-2.5"
            onClick={() => {
              entrarComoVisitante()
              navegar(voltar || (assinatura ? '/app' : '/precos'), { replace: true })
            }}
          >
            Pular — entrar sem e-mail
          </button>
          <button
            type="button"
            className="btn-fantasma mt-1 w-full text-marca-700"
            onClick={() => {
              testarSemCadastro()
              navegar('/app', { replace: true })
            }}
          >
            Pular tudo e abrir o app <Icone nome="seta" />
          </button>

          <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
            <strong>Modo de testes:</strong> qualquer e-mail e senha funcionam. Nada é enviado para servidores.
          </div>

          <Link to="/" className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <Icone nome="voltar" /> Voltar ao site
          </Link>
        </div>
      </div>
      <div className="hidden bg-gradient-to-br from-marca-600 to-marca-900 p-12 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto max-w-md">
          <p className="text-3xl font-bold leading-snug">
            “Antes eu levava uma hora para montar um orçamento no Word. Agora mando em 5 minutos, com fotos.”
          </p>
          <p className="mt-6 text-marca-100">Carlos Andrade · Marcenaria Bom Lar</p>
          <p className="mt-1 text-xs text-marca-200">(depoimento ilustrativo)</p>
        </div>
      </div>
    </div>
  )
}
