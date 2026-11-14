import { useLiveQuery } from 'dexie-react-hooks'
import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { avisar, confirmar } from '../../components/Avisos'
import { Campo, AreaTexto, Carregando, Icone, SeloStatus, Titulo } from '../../components/ui'
import { CLIENTE_VAZIO, criarOrcamento, db, excluirCliente, novoId, type Cliente } from '../../db'
import { calcularTotais } from '../../lib/calculos'
import { formatarData, formatarMoeda, formatarNumero } from '../../lib/formato'
import { statusExibido } from '../../lib/status'

type Rascunho = Omit<Cliente, 'id' | 'uid' | 'criadoEm' | 'atualizadoEm'> & { id?: number; uid?: string }
const VAZIO: Rascunho = { ...CLIENTE_VAZIO, observacoes: '' }
type Filtro = 'todos' | 'com' | 'sem'

function Modal({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null)
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar.current()
      // Mantém o foco dentro do modal
      if (e.key === 'Tab' && caixa.current) {
        const focaveis = caixa.current.querySelectorAll<HTMLElement>('input, textarea, select, button, a[href]')
        const primeiro = focaveis[0]
        const ultimo = focaveis[focaveis.length - 1]
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primeiro.focus()
        }
      }
    }
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('keydown', tecla)
      anterior?.focus()
    }
  }, [])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
      <div className="absolute inset-0 animate-surgir bg-slate-900/50 backdrop-blur-sm" onClick={aoFechar} />
      <div ref={caixa} className="relative max-h-[90dvh] w-full max-w-lg animate-escala overflow-y-auto rounded-2xl bg-superficie p-6 shadow-2xl">
        <h2 id="titulo-modal" className="text-lg font-semibold text-slate-900">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  )
}

function Historico({ cliente, aoFechar }: { cliente: Cliente; aoFechar: () => void }) {
  const orcamentos = useLiveQuery(
    () => db.orcamentos.where('clienteUid').equals(cliente.uid).reverse().sortBy('criadoEm'),
    [cliente.uid],
  )
  const navegar = useNavigate()
  const total = (orcamentos ?? []).filter((o) => o.status === 'aprovado').reduce((t, o) => t + calcularTotais(o).total, 0)
  return (
    <Modal titulo={`Histórico de ${cliente.nome}`} aoFechar={aoFechar}>
      <p className="mt-1 text-sm text-slate-500">
        Cliente desde {formatarData(cliente.criadoEm)} · {orcamentos?.length ?? 0} orçamento(s) · {formatarMoeda(total)} aprovados
      </p>
      {cliente.observacoes && <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{cliente.observacoes}</p>}
      <ul className="mt-4 divide-y divide-slate-100">
        {orcamentos?.map((o) => (
          <li key={o.uid}>
            <Link to={`/app/orcamentos/${o.id}/visualizar`} className="flex items-center justify-between gap-3 py-2.5 hover:text-marca-600">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">
                  {formatarNumero(o.numero)} · {o.titulo || 'Sem título'}
                </span>
                <span className="text-xs text-slate-500">{formatarData(o.criadoEm)} · {formatarMoeda(calcularTotais(o).total)}</span>
              </span>
              <SeloStatus status={statusExibido(o)} />
            </Link>
          </li>
        ))}
        {orcamentos?.length === 0 && <li className="py-6 text-center text-sm text-slate-500">Nenhum orçamento para este cliente ainda.</li>}
      </ul>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secundario" onClick={aoFechar}>
          Fechar
        </button>
        <button
          className="btn-primario"
          onClick={async () => {
            const { nome, documento, email, telefone, endereco } = cliente
            const id = await criarOrcamento({ clienteUid: cliente.uid, cliente: { nome, documento, email, telefone, endereco } })
            navegar(`/app/orcamentos/${id}`)
          }}
        >
          <Icone nome="mais" /> Novo orçamento
        </button>
      </div>
    </Modal>
  )
}

export function Clientes() {
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').toArray())
  const contagem = useLiveQuery(async () => {
    const mapa = new Map<string, number>()
    await db.orcamentos.each((o) => {
      if (o.clienteUid) mapa.set(o.clienteUid, (mapa.get(o.clienteUid) ?? 0) + 1)
    })
    return mapa
  })
  const [editando, setEditando] = useState<Rascunho | null>(null)
  const [historico, setHistorico] = useState<Cliente | null>(null)
  const [busca, setBusca] = useState('')
  const termo = useDeferredValue(busca.trim().toLowerCase())
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [erroEmail, setErroEmail] = useState('')

  const lista = useMemo(
    () =>
      (clientes ?? []).filter((c) => {
        const qtd = contagem?.get(c.uid) ?? 0
        if (filtro === 'com' && !qtd) return false
        if (filtro === 'sem' && qtd) return false
        return !termo || [c.nome, c.email, c.telefone, c.documento].some((v) => v.toLowerCase().includes(termo))
      }),
    [clientes, contagem, filtro, termo],
  )

  async function salvar(ev: FormEvent) {
    ev.preventDefault()
    if (!editando) return
    if (editando.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editando.email)) {
      setErroEmail('Digite um e-mail válido ou deixe em branco.')
      return
    }
    const { id, uid, ...dados } = editando
    const agora = Date.now()
    if (id) await db.clientes.update(id, { ...dados, atualizadoEm: agora })
    else await db.clientes.add({ ...dados, uid: uid ?? novoId(), criadoEm: agora, atualizadoEm: agora })
    setEditando(null)
    avisar(id ? 'Cliente atualizado. Orçamentos já criados não mudam.' : 'Cliente cadastrado.')
  }

  async function excluir(c: Cliente) {
    if (await confirmar({ titulo: `Excluir ${c.nome}?`, mensagem: 'Os orçamentos deste cliente continuam salvos, com os dados copiados neles.', botao: 'Excluir', perigo: true })) {
      await excluirCliente(c.id!)
      avisar('Cliente excluído.')
    }
  }

  if (!clientes) return <Carregando />

  return (
    <>
      <Titulo
        titulo="Clientes"
        subtitulo="Cadastre uma vez e preencha os orçamentos com um clique."
        acoes={
          <button className="btn-primario" onClick={() => setEditando({ ...VAZIO })}>
            <Icone nome="mais" /> Novo cliente
          </button>
        }
      />

      <div className="cartao overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:w-80">
            <Icone nome="busca" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" aria-label="Buscar clientes" className="campo pl-9" placeholder="Nome, e-mail, telefone ou documento" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div role="radiogroup" aria-label="Filtrar clientes" className="flex gap-1">
            {(
              [
                ['todos', 'Todos'],
                ['com', 'Com orçamentos'],
                ['sem', 'Sem orçamentos'],
              ] as [Filtro, string][]
            ).map(([v, r]) => (
              <button
                key={v}
                role="radio"
                aria-checked={filtro === v}
                onClick={() => setFiltro(v)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${filtro === v ? 'bg-slate-900 text-slate-50' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <ul className="cascata divide-y divide-slate-100">
          {lista.map((c, i) => (
            <li key={c.uid} style={{ '--i': i } as CSSProperties} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:gap-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{c.nome.slice(0, 1).toUpperCase()}</div>
              <button className="min-w-0 flex-1 text-left" onClick={() => setHistorico(c)}>
                <span className="block truncate font-medium text-slate-900">{c.nome}</span>
                <span className="block truncate text-xs text-slate-500">{[c.telefone, c.email, c.documento].filter(Boolean).join(' · ') || 'Sem contato'}</span>
              </button>
              <span className="hidden text-xs text-slate-500 md:block">{contagem?.get(c.uid) ?? 0} orçamento(s)</span>
              <button className="btn-fantasma px-2 py-1 text-xs" onClick={() => setHistorico(c)}>
                Histórico
              </button>
              <button aria-label={`Editar ${c.nome}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => setEditando({ ...c })}>
                <Icone nome="editar" />
              </button>
              <button aria-label={`Excluir ${c.nome}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => void excluir(c)}>
                <Icone nome="lixo" />
              </button>
            </li>
          ))}
          {lista.length === 0 && (
            <li className="flex flex-col items-center px-4 py-14 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 text-slate-500">
                <Icone nome="clientes" className="h-7 w-7" />
              </span>
              <span className="mt-4 font-semibold text-slate-900">{clientes.length ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}</span>
              <span className="mt-1 text-sm text-slate-500">
                {clientes.length ? 'Tente outro termo ou filtro.' : 'Cadastre uma vez e preencha os orçamentos com um clique.'}
              </span>
              {clientes.length ? (
                <button
                  className="btn-secundario mt-5"
                  onClick={() => {
                    setBusca('')
                    setFiltro('todos')
                  }}
                >
                  Limpar filtros
                </button>
              ) : (
                <button className="btn-primario mt-5" onClick={() => setEditando({ ...VAZIO })}>
                  <Icone nome="mais" /> Cadastrar cliente
                </button>
              )}
            </li>
          )}
        </ul>
      </div>

      {editando && (
        <Modal titulo={editando.id ? 'Editar cliente' : 'Novo cliente'} aoFechar={() => setEditando(null)}>
          <form onSubmit={salvar} noValidate>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Campo className="sm:col-span-2" rotulo="Nome / Razão social *" required autoFocus maxLength={160} value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
              <Campo rotulo="CPF / CNPJ (opcional)" maxLength={40} value={editando.documento} onChange={(e) => setEditando({ ...editando, documento: e.target.value })} />
              <Campo rotulo="Telefone" type="tel" maxLength={40} value={editando.telefone} onChange={(e) => setEditando({ ...editando, telefone: e.target.value })} />
              <Campo
                className="sm:col-span-2"
                rotulo="E-mail"
                type="email"
                maxLength={160}
                value={editando.email}
                aria-invalid={!!erroEmail}
                dica={erroEmail || undefined}
                onChange={(e) => {
                  setErroEmail('')
                  setEditando({ ...editando, email: e.target.value })
                }}
              />
              <Campo className="sm:col-span-2" rotulo="Endereço" maxLength={300} value={editando.endereco} onChange={(e) => setEditando({ ...editando, endereco: e.target.value })} />
              <AreaTexto className="sm:col-span-2" rotulo="Observações (só você vê)" maxLength={2000} value={editando.observacoes} onChange={(e) => setEditando({ ...editando, observacoes: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secundario" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button className="btn-primario" disabled={!editando.nome.trim()}>
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
      {historico && <Historico cliente={historico} aoFechar={() => setHistorico(null)} />}
    </>
  )
}
