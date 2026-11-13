import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Campo, Icone, Titulo } from '../../components/ui'
import { CLIENTE_VAZIO, db, type Cliente, type DadosCliente } from '../../db'
import { avisar, confirmar } from '../../components/Avisos'

export function Clientes() {
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').toArray())
  const contagem = useLiveQuery(async () => {
    const mapa = new Map<number, number>()
    await db.orcamentos.each((o) => {
      if (o.clienteId) mapa.set(o.clienteId, (mapa.get(o.clienteId) ?? 0) + 1)
    })
    return mapa
  })
  const [editando, setEditando] = useState<(DadosCliente & { id?: number }) | null>(null)
  const [busca, setBusca] = useState('')

  async function salvar(ev: FormEvent) {
    ev.preventDefault()
    if (!editando) return
    const { id, ...dados } = editando
    if (id) await db.clientes.update(id, dados)
    else await db.clientes.add({ ...dados, criadoEm: Date.now() })
    setEditando(null)
    avisar(id ? 'Cliente atualizado.' : 'Cliente cadastrado.')
  }

  async function excluir(c: Cliente) {
    if (await confirmar({ titulo: `Excluir ${c.nome}?`, mensagem: 'Os orçamentos deste cliente continuam salvos.', botao: 'Excluir', perigo: true })) {
      await db.clientes.delete(c.id!)
      avisar('Cliente excluído.')
    }
  }

  const termo = busca.trim().toLowerCase()
  const lista = (clientes ?? []).filter(
    (c) => !termo || [c.nome, c.email, c.telefone, c.documento].some((v) => v.toLowerCase().includes(termo)),
  )

  return (
    <>
      <Titulo
        titulo="Clientes"
        subtitulo="Cadastre uma vez e use em todos os orçamentos."
        acoes={
          <button className="btn-primario" onClick={() => setEditando({ ...CLIENTE_VAZIO })}>
            <Icone nome="mais" /> Novo cliente
          </button>
        }
      />

      <div className="cartao overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <div className="relative sm:w-72">
            <Icone nome="busca" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="campo pl-9" placeholder="Buscar cliente" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
        <ul className="cascata divide-y divide-slate-100">
          {lista.map((c) => (
            <li key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marca-50 font-semibold text-marca-700">
                {c.nome.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-900">{c.nome}</div>
                <div className="truncate text-xs text-slate-500">
                  {[c.telefone, c.email, c.documento].filter(Boolean).join(' · ') || 'Sem contato'}
                </div>
              </div>
              <span className="hidden text-xs text-slate-500 sm:block">
                {contagem?.get(c.id!) ?? 0} orçamento(s)
              </span>
              <button className="btn-fantasma px-2 py-1 text-xs" onClick={() => setEditando({ ...c })}>
                Editar
              </button>
              <button title="Excluir" className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => excluir(c)}>
                <Icone nome="lixo" />
              </button>
            </li>
          ))}
          {clientes && lista.length === 0 && (
            <li className="flex flex-col items-center px-4 py-14 text-center">
              <span className="grid h-14 w-14 animate-flutuar place-items-center rounded-2xl bg-marca-50 text-marca-600 ring-1 ring-marca-100">
                <Icone nome="clientes" className="h-7 w-7" />
              </span>
              <span className="mt-4 font-semibold text-slate-900">
                {clientes.length ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
              </span>
              <span className="mt-1 text-sm text-slate-500">
                {clientes.length ? 'Tente outro nome, telefone ou e-mail.' : 'Cadastre uma vez e preencha os orçamentos com um clique.'}
              </span>
              {clientes.length ? (
                <button className="btn-secundario mt-5" onClick={() => setBusca('')}>
                  Limpar busca
                </button>
              ) : (
                <button className="btn-primario mt-5" onClick={() => setEditando({ ...CLIENTE_VAZIO })}>
                  <Icone nome="mais" /> Cadastrar cliente
                </button>
              )}
            </li>
          )}
        </ul>
      </div>

      {editando && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 animate-surgir bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditando(null)} />
          <form onSubmit={salvar} className="relative max-h-[90dvh] w-full max-w-lg animate-escala overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-semibold text-slate-900">{editando.id ? 'Editar cliente' : 'Novo cliente'}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Campo className="sm:col-span-2" rotulo="Nome / Razão social" required autoFocus value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
              <Campo rotulo="CPF / CNPJ" value={editando.documento} onChange={(e) => setEditando({ ...editando, documento: e.target.value })} />
              <Campo rotulo="Telefone" value={editando.telefone} onChange={(e) => setEditando({ ...editando, telefone: e.target.value })} />
              <Campo className="sm:col-span-2" rotulo="E-mail" type="email" value={editando.email} onChange={(e) => setEditando({ ...editando, email: e.target.value })} />
              <Campo className="sm:col-span-2" rotulo="Endereço" value={editando.endereco} onChange={(e) => setEditando({ ...editando, endereco: e.target.value })} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secundario" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button className="btn-primario">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
