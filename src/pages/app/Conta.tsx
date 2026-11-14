import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { atualizarNome, problemaNaSenha, redefinirSenha, sair, useAuth } from '../../auth'
import { avisar, confirmar } from '../../components/Avisos'
import { AlternarTema } from '../../components/Layouts'
import { Campo, Icone, Titulo } from '../../components/ui'
import { formatarDataHora } from '../../lib/formato'
import { mensagemDeErro, nuvemDisponivel } from '../../lib/supabase'
import { importarVisitante, resumoVisitante, sincronizar, useSync } from '../../lib/sync'

function Cartao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="cartao p-4 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Conta() {
  const { usuario } = useAuth()
  const { situacao, ultima, erro } = useSync()
  const navegar = useNavigate()
  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [importando, setImportando] = useState(false)
  const visitante = useLiveQuery(() => (usuario ? resumoVisitante() : Promise.resolve(null)), [usuario?.id, importando])

  useEffect(() => setNome(usuario?.nome ?? ''), [usuario?.nome])

  const preferencias = (
    <Cartao titulo="Aparência" descricao="O tema escuro vale para o app; o orçamento impresso continua claro.">
      <AlternarTema />
    </Cartao>
  )

  if (!usuario) {
    return (
      <>
        <Titulo titulo="Conta" subtitulo="Você está usando o OrçaFácil sem conta (modo visitante)." />
        <div className="grid gap-6 lg:grid-cols-2">
          <Cartao titulo="Por que criar uma conta grátis?">
            <ul className="space-y-2 text-sm text-slate-600">
              {[
                'Seus orçamentos salvos na nuvem e em todos os seus aparelhos',
                'Link da proposta para o cliente aprovar ou recusar online',
                'Notificações quando o cliente responder',
                'Os orçamentos que você já criou aqui podem ser levados para a conta',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" /> {t}
                </li>
              ))}
            </ul>
            {nuvemDisponivel ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/entrar?modo=cadastrar&voltar=/app/conta" className="btn-primario">Criar conta grátis</Link>
                <Link to="/entrar?voltar=/app/conta" className="btn-secundario">Já tenho conta</Link>
              </div>
            ) : (
              <p className="mt-4 text-sm text-amber-700">As contas não estão configuradas neste ambiente.</p>
            )}
          </Cartao>
          {preferencias}
        </div>
      </>
    )
  }

  async function salvarNome(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      await atualizarNome(nome.trim().slice(0, 120))
      avisar('Nome atualizado.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  async function trocarSenha(e: FormEvent) {
    e.preventDefault()
    const problema = problemaNaSenha(senha)
    if (problema) return avisar(problema, 'erro')
    setSalvando(true)
    try {
      await redefinirSenha(senha)
      setSenha('')
      avisar('Senha alterada.')
    } catch (err) {
      avisar(mensagemDeErro(err), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const textoSync = {
    visitante: '',
    sincronizando: 'Sincronizando agora…',
    pendente: 'Há alterações aguardando envio.',
    sincronizado: 'Tudo salvo na nuvem.',
    offline: 'Sem conexão. Suas alterações ficam neste aparelho e serão enviadas quando a internet voltar.',
    erro: `Falha ao sincronizar${erro ? `: ${erro}` : ''}.`,
  }[situacao]

  return (
    <>
      <Titulo titulo="Conta" subtitulo={usuario.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Cartao titulo="Sincronização">
          <p className="text-sm text-slate-600">{textoSync}</p>
          {ultima && <p className="mt-1 text-xs text-slate-500">Última sincronização: {formatarDataHora(ultima)}</p>}
          <button className="btn-secundario mt-4" disabled={situacao === 'sincronizando'} onClick={() => void sincronizar()}>
            <Icone nome="atualizar" /> Sincronizar agora
          </button>
        </Cartao>

        {visitante && visitante.orcamentos + visitante.clientes > 0 && (
          <Cartao titulo="Dados criados sem conta" descricao="Orçamentos e clientes criados neste navegador antes de entrar.">
            <p className="text-sm text-slate-600">
              {visitante.orcamentos} orçamento(s) e {visitante.clientes} cliente(s).{' '}
              {visitante.importado && 'Você já trouxe estes dados para a conta uma vez.'}
            </p>
            <button
              className="btn-primario mt-4"
              disabled={importando}
              onClick={async () => {
                if (visitante.importado) {
                  const ok = await confirmar({ titulo: 'Importar de novo?', mensagem: 'Os orçamentos serão copiados outra vez, com novos números.', botao: 'Importar' })
                  if (!ok) return
                }
                setImportando(true)
                try {
                  const r = await importarVisitante()
                  avisar(`${r.orcamentos} orçamento(s) e ${r.clientes} cliente(s) trazidos para a conta.`)
                  void sincronizar()
                } catch (err) {
                  avisar(mensagemDeErro(err), 'erro')
                } finally {
                  setImportando(false)
                }
              }}
            >
              <Icone nome="upload" /> {importando ? 'Importando…' : 'Trazer para a conta'}
            </button>
          </Cartao>
        )}

        <Cartao titulo="Perfil">
          <form onSubmit={salvarNome} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Campo className="flex-1" rotulo="Seu nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
            <button className="btn-secundario" disabled={salvando || nome.trim() === usuario.nome}>
              Salvar
            </button>
          </form>
        </Cartao>

        <Cartao titulo="Senha" descricao="Mínimo de 8 caracteres, com letras e números.">
          <form onSubmit={trocarSenha} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Campo className="flex-1" rotulo="Nova senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            <button className="btn-secundario" disabled={salvando || !senha}>
              Alterar senha
            </button>
          </form>
        </Cartao>

        {preferencias}

        <Cartao titulo="Sair" descricao="Seus dados continuam salvos na nuvem e neste aparelho.">
          <button
            className="btn-secundario"
            onClick={async () => {
              await sincronizar()
              await sair()
              navegar('/')
            }}
          >
            <Icone nome="sair" /> Sair da conta
          </button>
          <p className="mt-3 text-xs text-slate-500">
            Para excluir sua conta definitivamente, apague os dados em <Link to="/app/configuracoes" className="font-semibold text-marca-600">Empresa</Link> e
            peça a exclusão pelo contato informado na <Link to="/privacidade" className="font-semibold text-marca-600">Política de privacidade</Link>.
          </p>
        </Cartao>
      </div>
    </>
  )
}
