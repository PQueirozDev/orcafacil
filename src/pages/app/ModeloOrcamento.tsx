import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DocumentoOrcamento } from '../../components/DocumentoOrcamento'
import { PreviaA4 } from '../../components/PreviaA4'
import { Carregando, Icone, Titulo } from '../../components/ui'
import { db, EMPRESA_PADRAO, LAYOUT_PADRAO, layoutDe, SECOES, type Empresa, type LayoutDoc, type SecaoId } from '../../db'
import { orcamentoExemplo } from '../../lib/exemplo'

const CORES = ['#4f46e5', '#0f766e', '#0369a1', '#b91c1c', '#c2410c', '#a16207', '#7e22ce', '#be185d', '#1e293b']

const MODELOS: { nome: string; descricao: string; cor: string; layout: Partial<LayoutDoc> }[] = [
  { nome: 'Moderno', descricao: 'Padrão, arredondado e limpo', cor: '#4f46e5', layout: {} },
  {
    nome: 'Clássico',
    descricao: 'Fonte serifada, cantos retos, logo no centro',
    cor: '#1e293b',
    layout: { fonte: 'classica', cantos: 'retos', posicaoLogo: 'centro', estiloTabela: 'linhas', corFundoCaixas: '#ffffff' },
  },
  {
    nome: 'Compacto',
    descricao: 'Texto menor e 3 fotos por linha',
    cor: '#0f766e',
    layout: { tamanhoFonte: 9, tamanhoFotoItem: 44, colunasFotos: 3, alturaFotos: 42, tamanhoLogo: 48, estiloTabela: 'zebrado' },
  },
  {
    nome: 'Destaque',
    descricao: 'Texto grande, fotos em destaque',
    cor: '#c2410c',
    layout: { tamanhoFonte: 12, tamanhoFotoItem: 80, colunasFotos: 1, alturaFotos: 100, tamanhoLogo: 88, ordem: ['cliente', 'fotos', 'itens', 'totais', 'condicoes', 'assinaturas'] },
  },
]

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="cartao p-5">
      <h2 className="mb-4 font-semibold text-slate-900">{titulo}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Opcoes<T extends string | number>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string
  valor: T
  opcoes: [T, string][]
  aoMudar: (v: T) => void
}) {
  return (
    <div>
      <span className="rotulo">{rotulo}</span>
      <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 text-xs font-medium">
        {opcoes.map(([v, r]) => (
          <button
            key={String(v)}
            onClick={() => aoMudar(v)}
            className={`rounded-md px-3 py-1.5 transition ${valor === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}

function Deslizante({
  rotulo,
  valor,
  min,
  max,
  passo = 1,
  unidade,
  aoMudar,
}: {
  rotulo: string
  valor: number
  min: number
  max: number
  passo?: number
  unidade: string
  aoMudar: (n: number) => void
}) {
  return (
    <label className="block">
      <span className="rotulo flex justify-between">
        {rotulo}
        <span className="font-mono text-slate-400">
          {valor.toLocaleString('pt-BR')} {unidade}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="w-full accent-marca-600"
      />
    </label>
  )
}

function Cor({ rotulo, valor, aoMudar }: { rotulo: string; valor: string; aoMudar: (c: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{rotulo}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-slate-400">{valor}</span>
        <span className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-slate-300" style={{ background: valor }}>
          <input type="color" value={valor} onChange={(e) => aoMudar(e.target.value)} className="absolute -inset-2 h-12 w-12 cursor-pointer opacity-0" />
        </span>
      </span>
    </label>
  )
}

export function ModeloOrcamento() {
  const salva = useLiveQuery(() => db.empresa.get('principal').then((e) => e ?? null))
  const ultimo = useLiveQuery(() => db.orcamentos.orderBy('atualizadoEm').last())
  const exemplo = useMemo(() => orcamentoExemplo(), [])
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [salvo, setSalvo] = useState(true)
  const [arrastando, setArrastando] = useState<SecaoId | null>(null)
  const [aba, setAba] = useState<'ajustar' | 'previa'>('ajustar')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (salva !== undefined && empresa === null) setEmpresa(salva ?? EMPRESA_PADRAO)
  }, [salva, empresa])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!empresa) return <Carregando />
  const l = layoutDe(empresa)

  function aplicar(novo: Empresa) {
    setEmpresa(novo)
    setSalvo(false)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      // Só grava aparência; mantém dados e numeração mais recentes do banco
      await db.transaction('rw', db.empresa, async () => {
        const atual = (await db.empresa.get('principal')) ?? EMPRESA_PADRAO
        await db.empresa.put({ ...atual, layout: novo.layout, corTema: novo.corTema })
      })
      setSalvo(true)
    }, 400)
  }

  const mudar = (m: Partial<LayoutDoc>) => aplicar({ ...empresa, layout: { ...l, ...m } })

  function mover(secao: SecaoId, para: number) {
    const ordem = l.ordem.filter((s) => s !== secao)
    ordem.splice(Math.max(0, Math.min(para, ordem.length)), 0, secao)
    mudar({ ordem })
  }

  const alternarVisivel = (s: SecaoId) =>
    mudar({ ocultas: l.ocultas.includes(s) ? l.ocultas.filter((x) => x !== s) : [...l.ocultas, s] })

  return (
    <>
      <Titulo
        titulo="Modelo do orçamento"
        subtitulo="Mude a posição, o tamanho e as cores do orçamento que vai para o cliente. Vale para todos os orçamentos."
        acoes={
          <>
            <span className={`self-center text-xs ${salvo ? 'text-emerald-600' : 'text-slate-400'}`}>{salvo ? '✓ Salvo' : 'Salvando…'}</span>
            <button className="btn-secundario" onClick={() => aplicar({ ...empresa, layout: { ...LAYOUT_PADRAO }, corTema: EMPRESA_PADRAO.corTema })}>
              Restaurar padrão
            </button>
          </>
        }
      />

      <div className="mb-4 inline-flex rounded-xl bg-slate-200/60 p-1 text-sm font-medium xl:hidden">
        {(['ajustar', 'previa'] as const).map((a) => (
          <button
            key={a}
            aria-pressed={aba === a}
            onClick={() => setAba(a)}
            className={`min-h-10 rounded-lg px-4 transition ${aba === a ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            {a === 'ajustar' ? 'Ajustar' : 'Ver prévia'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className={`space-y-6 ${aba === 'previa' ? 'hidden xl:block' : ''}`}>
          <Grupo titulo="Modelos prontos">
            <div className="grid grid-cols-2 gap-2">
              {MODELOS.map((m) => (
                <button
                  key={m.nome}
                  onClick={() => aplicar({ ...empresa, corTema: m.cor, layout: { ...LAYOUT_PADRAO, ...m.layout } })}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-left transition hover:border-marca-500 hover:bg-marca-50"
                >
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full" style={{ background: m.cor }} />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{m.nome}</span>
                    <span className="block text-xs text-slate-500">{m.descricao}</span>
                  </span>
                </button>
              ))}
            </div>
          </Grupo>

          <Grupo titulo="Posição das partes">
            <p className="-mt-2 text-xs text-slate-500">Arraste ou use as setas para mudar a ordem. O olho mostra ou esconde a parte.</p>
            <ol className="space-y-1.5">
              {l.ordem.map((s, i) => {
                const oculta = l.ocultas.includes(s)
                return (
                  <li
                    key={s}
                    draggable
                    onDragStart={() => setArrastando(s)}
                    onDragEnd={() => setArrastando(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (arrastando && arrastando !== s) mover(arrastando, i)
                      setArrastando(null)
                    }}
                    className={`flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 text-sm active:cursor-grabbing ${
                      arrastando === s ? 'border-marca-500 bg-marca-50' : 'border-slate-200 bg-white'
                    } ${oculta ? 'opacity-50' : ''}`}
                  >
                    <span className="select-none text-slate-300">⋮⋮</span>
                    <span className="flex-1 font-medium text-slate-700">{SECOES[s]}</span>
                    <button title="Subir" disabled={i === 0} onClick={() => mover(s, i - 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                      <Icone nome="subir" className="h-3.5 w-3.5" />
                    </button>
                    <button title="Descer" disabled={i === l.ordem.length - 1} onClick={() => mover(s, i + 1)} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                      <Icone nome="baixar" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title={oculta ? 'Mostrar' : 'Esconder'}
                      onClick={() => alternarVisivel(s)}
                      className={`rounded p-1 hover:bg-slate-100 ${oculta ? 'text-slate-300 line-through' : 'text-marca-600'}`}
                    >
                      <Icone nome="olho" className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ol>
            <Opcoes
              rotulo="Logo e dados da empresa"
              valor={l.posicaoLogo}
              opcoes={[
                ['esquerda', 'À esquerda'],
                ['centro', 'No centro'],
                ['direita', 'À direita'],
              ]}
              aoMudar={(posicaoLogo) => mudar({ posicaoLogo })}
            />
            <Opcoes
              rotulo="Caixa de totais"
              valor={l.alinhamentoTotais}
              opcoes={[
                ['esquerda', 'À esquerda'],
                ['direita', 'À direita'],
              ]}
              aoMudar={(alinhamentoTotais) => mudar({ alinhamentoTotais })}
            />
          </Grupo>

          <Grupo titulo="Tamanhos">
            <Deslizante rotulo="Tamanho do texto" valor={l.tamanhoFonte} min={8} max={13} passo={0.5} unidade="pt" aoMudar={(tamanhoFonte) => mudar({ tamanhoFonte })} />
            <Deslizante rotulo="Tamanho da logo" valor={l.tamanhoLogo} min={32} max={120} unidade="px" aoMudar={(tamanhoLogo) => mudar({ tamanhoLogo })} />
            <Deslizante rotulo="Foto de cada item" valor={l.tamanhoFotoItem} min={32} max={120} unidade="px" aoMudar={(tamanhoFotoItem) => mudar({ tamanhoFotoItem })} />
            <Deslizante rotulo="Altura das fotos do orçamento" valor={l.alturaFotos} min={30} max={130} unidade="mm" aoMudar={(alturaFotos) => mudar({ alturaFotos })} />
            <Opcoes
              rotulo="Fotos por linha"
              valor={l.colunasFotos}
              opcoes={[
                [1, '1'],
                [2, '2'],
                [3, '3'],
              ]}
              aoMudar={(colunasFotos) => mudar({ colunasFotos })}
            />
          </Grupo>

          <Grupo titulo="Cores e estilo">
            <div>
              <span className="rotulo">Cor principal</span>
              <div className="flex flex-wrap items-center gap-2">
                {CORES.map((c) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => aplicar({ ...empresa, corTema: c })}
                    className={`h-7 w-7 rounded-full ring-offset-2 transition ${empresa.corTema === c ? 'ring-2 ring-slate-900' : ''}`}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-1 ring-slate-300" title="Cor personalizada">
                  <input type="color" value={empresa.corTema} onChange={(e) => aplicar({ ...empresa, corTema: e.target.value })} className="absolute -inset-2 h-12 w-12 cursor-pointer" />
                </label>
              </div>
            </div>
            <Cor rotulo="Cor do texto" valor={l.corTexto} aoMudar={(corTexto) => mudar({ corTexto })} />
            <Cor rotulo="Cor dos títulos" valor={l.corTitulos} aoMudar={(corTitulos) => mudar({ corTitulos })} />
            <Cor rotulo="Fundo das caixas" valor={l.corFundoCaixas} aoMudar={(corFundoCaixas) => mudar({ corFundoCaixas })} />
            <Opcoes
              rotulo="Cabeçalho da tabela"
              valor={l.estiloTabela}
              opcoes={[
                ['solido', 'Colorido'],
                ['linhas', 'Só linha'],
                ['zebrado', 'Zebrado'],
              ]}
              aoMudar={(estiloTabela) => mudar({ estiloTabela })}
            />
            <Opcoes
              rotulo="Cantos"
              valor={l.cantos}
              opcoes={[
                ['arredondados', 'Arredondados'],
                ['retos', 'Retos'],
              ]}
              aoMudar={(cantos) => mudar({ cantos })}
            />
            <Opcoes
              rotulo="Fonte"
              valor={l.fonte}
              opcoes={[
                ['moderna', 'Moderna'],
                ['classica', 'Clássica'],
              ]}
              aoMudar={(fonte) => mudar({ fonte })}
            />
          </Grupo>
        </div>

        <div className={aba === 'ajustar' ? 'hidden xl:block' : ''}>
          <div className="sticky top-6">
            <div className="mb-2 text-xs font-medium text-slate-500">
              Prévia {ultimo ? `— orçamento ${ultimo.titulo || 'mais recente'}` : '— orçamento de exemplo'}
            </div>
            <div className="max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl bg-slate-200/70 p-3">
              <PreviaA4>
                <DocumentoOrcamento orcamento={ultimo ?? exemplo} empresa={empresa} />
              </PreviaA4>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
