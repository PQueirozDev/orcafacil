import type { CSSProperties, ReactNode } from 'react'
import { layoutDe, type Empresa, type Orcamento, type SecaoId } from '../db'
import { calcularTotais, totalItem } from '../lib/calculos'
import { formatarData, formatarMoeda, formatarNumero } from '../lib/formato'
import { dataValidade } from '../lib/status'

/** Campos da empresa que aparecem no documento (é o que vai no link público). */
export type EmpresaDoc = Pick<
  Empresa,
  'nome' | 'razaoSocial' | 'documento' | 'email' | 'telefone' | 'whatsapp' | 'endereco' | 'site' | 'responsavel' | 'logo' | 'corTema' | 'layout' | 'dadosPagamento' | 'rodape'
>

export type OrcamentoDoc = Pick<
  Orcamento,
  | 'numero'
  | 'titulo'
  | 'cliente'
  | 'itens'
  | 'fotos'
  | 'descontoTipo'
  | 'desconto'
  | 'impostoPercentual'
  | 'frete'
  | 'observacoes'
  | 'condicoesPagamento'
  | 'termos'
  | 'prazoEntrega'
  | 'validadeDias'
  | 'criadoEm'
>

const FONTES = {
  moderna: undefined,
  classica: "Georgia, 'Times New Roman', serif",
  neutra: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
}

/**
 * Orçamento em formato A4: a MESMA marcação é usada na prévia, no link público e na impressão/PDF,
 * para não haver diferença entre o que se vê e o que é exportado.
 * Os tamanhos de texto são em "em", relativos ao tamanho de fonte do modelo.
 */
export function DocumentoOrcamento({ orcamento: o, empresa: e }: { orcamento: OrcamentoDoc; empresa: EmpresaDoc }) {
  const l = layoutDe(e)
  const cor = e.corTema || '#4f46e5'
  const r = l.cantos === 'arredondados'
  const caixa = r ? 'rounded-lg' : ''
  const totais = calcularTotais(o)
  const itens = o.itens.filter((i) => i.descricao.trim() || i.valorUnitario)
  const temFotoItem = itens.some((i) => i.foto)
  const faixa = l.estiloCabecalho === 'faixa'
  const contato = [e.telefone, e.whatsapp && e.whatsapp !== e.telefone ? `WhatsApp ${e.whatsapp}` : '', e.email, e.site]
    .filter(Boolean)
    .join('  ·  ')

  const estiloRaiz: CSSProperties = { fontSize: `${l.tamanhoFonte}pt`, color: l.corTexto, fontFamily: FONTES[l.fonte] }
  const titulo = { color: l.corTitulos }
  const rotuloSecao = (texto: string) => (
    <h3 className="mb-[0.3em] text-[0.76em] font-semibold uppercase tracking-wider" style={{ color: cor }}>
      {texto}
    </h3>
  )

  const logo = e.logo ? (
    <img
      src={e.logo}
      alt=""
      className={`object-contain ${faixa ? `bg-white p-1.5 ${r ? 'rounded-xl' : ''}` : ''}`}
      style={{ maxHeight: l.tamanhoLogo, maxWidth: l.tamanhoLogo * 2.6 }}
    />
  ) : (
    <div
      className={`grid shrink-0 place-items-center font-bold ${r ? 'rounded-xl' : ''}`}
      style={{
        background: faixa ? '#ffffff' : cor,
        color: faixa ? cor : '#ffffff',
        width: l.tamanhoLogo * 0.9,
        height: l.tamanhoLogo * 0.9,
        fontSize: l.tamanhoLogo * 0.36,
      }}
    >
      {(e.nome || 'E').slice(0, 1).toUpperCase()}
    </div>
  )

  const corCabecalho = faixa ? '#ffffff' : undefined
  const dadosEmpresa = (
    <div>
      <div className="text-[1.43em] font-bold leading-tight" style={faixa ? { color: '#fff' } : titulo}>
        {e.nome || 'Sua empresa'}
      </div>
      {e.razaoSocial && e.razaoSocial !== e.nome && <div className="text-[0.857em] opacity-80">{e.razaoSocial}</div>}
      {e.documento && <div className="text-[0.857em] opacity-75">CNPJ/CPF: {e.documento}</div>}
      {e.endereco && <div className="text-[0.857em] opacity-75">{e.endereco}</div>}
      {contato && <div className="text-[0.857em] opacity-75">{contato}</div>}
    </div>
  )

  const numero = (alinhar: 'left' | 'right' | 'center') => (
    <div className="shrink-0" style={{ textAlign: alinhar }}>
      <div className="text-[0.857em] font-semibold uppercase tracking-[0.2em]" style={{ color: faixa ? '#ffffffcc' : cor }}>
        Orçamento
      </div>
      <div className="text-[1.9em] font-extrabold leading-none" style={faixa ? { color: '#fff' } : titulo}>
        {formatarNumero(o.numero)}
      </div>
      <div className="mt-[0.4em] text-[0.857em] opacity-75">Emitido em {formatarData(o.criadoEm)}</div>
      <div className="text-[0.857em] opacity-75">Válido até {formatarData(dataValidade(o))}</div>
    </div>
  )

  const conteudoCabecalho =
    l.posicaoLogo === 'centro' ? (
      <div className="flex flex-col items-center gap-[0.8em] text-center">
        {logo}
        {dadosEmpresa}
        {numero('center')}
      </div>
    ) : (
      <div className={`flex items-start justify-between gap-6 ${l.posicaoLogo === 'direita' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${l.posicaoLogo === 'direita' ? 'flex-row-reverse text-right' : ''}`}>
          {logo}
          {dadosEmpresa}
        </div>
        {numero(l.posicaoLogo === 'direita' ? 'left' : 'right')}
      </div>
    )

  const cabecalho = faixa ? (
    <header
      className={`-mx-[15mm] -mt-[16mm] mb-[0.4em] px-[15mm] pb-[1.4em] pt-[14mm] print:mx-0 print:mt-0 print:px-[1.2em] print:pt-[1.2em] ${r ? 'print:rounded-xl' : ''}`}
      style={{ background: `linear-gradient(135deg, ${cor}, ${l.corSecundaria})`, color: corCabecalho }}
    >
      {conteudoCabecalho}
    </header>
  ) : (
    <header className="border-b-2 pb-[1.2em]" style={{ borderColor: cor }}>
      {conteudoCabecalho}
    </header>
  )

  const estiloCabecalhoTabela: CSSProperties =
    l.estiloTabela === 'linhas' ? { color: cor, borderBottom: `2px solid ${cor}` } : { background: cor, color: '#fff' }

  const linhaTotal = (rotulo: string, valor: string, classe = '') => (
    <div className="flex justify-between py-1">
      <dt className="opacity-60">{rotulo}</dt>
      <dd className={`tabular-nums ${classe}`}>{valor}</dd>
    </div>
  )

  const blocoTexto = (rotulo: string, texto: string) =>
    texto.trim() ? (
      <div className="evitar-quebra">
        {rotuloSecao(rotulo)}
        <p className="whitespace-pre-line opacity-80">{texto}</p>
      </div>
    ) : null

  const secoes: Record<SecaoId, ReactNode> = {
    cliente: (
      <section className="grid grid-cols-2 gap-5">
        <div className={`${caixa} p-[0.9em]`} style={{ background: l.corFundoCaixas }}>
          <div className="mb-[0.2em] text-[0.76em] font-semibold uppercase tracking-wider opacity-50">Cliente</div>
          <div className="font-semibold" style={titulo}>
            {o.cliente.nome || '—'}
          </div>
          {o.cliente.documento && <div className="text-[0.857em] opacity-80">{o.cliente.documento}</div>}
          {o.cliente.endereco && <div className="text-[0.857em] opacity-80">{o.cliente.endereco}</div>}
          {(o.cliente.telefone || o.cliente.email) && (
            <div className="text-[0.857em] opacity-80">{[o.cliente.telefone, o.cliente.email].filter(Boolean).join('  ·  ')}</div>
          )}
        </div>
        <div className={`${caixa} p-[0.9em]`} style={{ background: l.corFundoCaixas }}>
          <div className="mb-[0.2em] text-[0.76em] font-semibold uppercase tracking-wider opacity-50">Referente a</div>
          <div className="font-semibold" style={titulo}>
            {o.titulo || 'Orçamento de produtos e serviços'}
          </div>
          {o.prazoEntrega && <div className="text-[0.857em] opacity-80">Prazo de entrega: {o.prazoEntrega}</div>}
        </div>
      </section>
    ),

    itens: (
      <table className="w-full border-collapse text-[0.905em]">
        <thead>
          <tr className="text-left text-[0.84em] uppercase tracking-wider" style={estiloCabecalhoTabela}>
            <th className={`px-3 py-2 font-semibold ${r && l.estiloTabela !== 'linhas' ? 'rounded-l-md' : ''}`}>Descrição</th>
            <th className="px-2 py-2 text-center font-semibold">Qtd.</th>
            <th className="px-2 py-2 text-right font-semibold">Unitário</th>
            <th className={`px-3 py-2 text-right font-semibold ${r && l.estiloTabela !== 'linhas' ? 'rounded-r-md' : ''}`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center opacity-50">
                Nenhum item adicionado.
              </td>
            </tr>
          )}
          {itens.map((item, i) => (
            <tr
              key={item.id}
              className="border-b border-slate-100 align-top"
              style={l.estiloTabela === 'zebrado' && i % 2 === 1 ? { background: l.corFundoCaixas } : undefined}
            >
              <td className="px-3 py-[0.6em]">
                <div className="flex gap-3">
                  {temFotoItem &&
                    (item.foto ? (
                      <img
                        src={item.foto}
                        alt=""
                        className={`shrink-0 object-cover ${r ? 'rounded-md' : ''}`}
                        style={{ width: l.tamanhoFotoItem, height: l.tamanhoFotoItem }}
                      />
                    ) : (
                      <div className="shrink-0" style={{ width: l.tamanhoFotoItem }} />
                    ))}
                  <div className="min-w-0">
                    <div className="font-medium break-words" style={titulo}>
                      <span className="mr-1.5 opacity-40">{i + 1}.</span>
                      {item.descricao || 'Item sem descrição'}
                    </div>
                    {item.detalhes && <div className="mt-0.5 whitespace-pre-line break-words text-[0.9em] opacity-60">{item.detalhes}</div>}
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-2 py-[0.6em] text-center tabular-nums">
                {item.quantidade.toLocaleString('pt-BR')} {item.unidade}
              </td>
              <td className="whitespace-nowrap px-2 py-[0.6em] text-right tabular-nums">{formatarMoeda(item.valorUnitario)}</td>
              <td className="whitespace-nowrap px-3 py-[0.6em] text-right font-semibold tabular-nums" style={titulo}>
                {formatarMoeda(totalItem(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ),

    totais: (
      <section className={`evitar-quebra flex ${l.alinhamentoTotais === 'direita' ? 'justify-end' : 'justify-start'}`}>
        <dl className="w-[27em] max-w-full text-[0.905em]">
          {linhaTotal('Subtotal', formatarMoeda(totais.subtotal))}
          {totais.desconto > 0 &&
            linhaTotal(
              `Desconto${o.descontoTipo === 'percentual' ? ` (${o.desconto.toLocaleString('pt-BR')}%)` : ''}`,
              `− ${formatarMoeda(totais.desconto)}`,
              'text-emerald-700',
            )}
          {totais.imposto > 0 && linhaTotal(`Impostos (${(o.impostoPercentual ?? 0).toLocaleString('pt-BR')}%)`, formatarMoeda(totais.imposto))}
          {totais.frete > 0 && linhaTotal('Frete / deslocamento', formatarMoeda(totais.frete))}
          <div
            className={`mt-1.5 flex items-center justify-between px-3 py-[0.6em] text-white ${caixa}`}
            style={{ background: faixa ? `linear-gradient(135deg, ${cor}, ${l.corSecundaria})` : cor }}
          >
            <dt className="text-[0.95em] font-semibold uppercase tracking-wider">Total</dt>
            <dd className="text-[1.5em] font-extrabold tabular-nums">{formatarMoeda(totais.total)}</dd>
          </div>
        </dl>
      </section>
    ),

    fotos:
      o.fotos.length > 0 ? (
        <section>
          {rotuloSecao('Imagens de referência')}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(l.colunasFotos, o.fotos.length)}, minmax(0, 1fr))` }}>
            {o.fotos.map((f) => (
              <figure key={f.id} className="evitar-quebra">
                <img src={f.src} alt={f.legenda} className={`w-full object-cover ${caixa}`} style={{ height: `${l.alturaFotos}mm` }} />
                {f.legenda && <figcaption className="mt-1 text-[0.81em] opacity-60">{f.legenda}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      ) : null,

    condicoes:
      o.condicoesPagamento.trim() || o.observacoes.trim() || e.dadosPagamento?.trim() || o.termos?.trim() ? (
        <section className="space-y-[1.2em] text-[0.857em]">
          <div className="grid grid-cols-2 gap-5">
            {blocoTexto('Condições de pagamento', o.condicoesPagamento)}
            {blocoTexto('Como pagar', e.dadosPagamento ?? '')}
            {blocoTexto('Observações', o.observacoes)}
          </div>
          {blocoTexto('Termos e condições', o.termos ?? '')}
        </section>
      ) : null,

    assinaturas: (
      <section className="evitar-quebra mt-[2.5em] grid grid-cols-2 gap-10 text-center text-[0.857em] opacity-70">
        <div>
          <div className="border-t border-slate-300 pt-1.5">{e.responsavel || e.nome || 'Empresa'}</div>
          <div className="text-[0.9em]">{e.nome}</div>
        </div>
        <div>
          <div className="border-t border-slate-300 pt-1.5">{o.cliente.nome || 'Cliente'}</div>
          <div className="text-[0.9em]">De acordo</div>
        </div>
      </section>
    ),
  }

  return (
    <article className="folha-a4 manter-claro shadow-xl" style={estiloRaiz}>
      {cabecalho}
      {l.ordem
        .filter((s) => !l.ocultas.includes(s) && secoes[s])
        .map((s) => (
          <div key={s} className="mt-[1.6em]">
            {secoes[s]}
          </div>
        ))}
      {e.rodape?.trim() && (
        <footer className="evitar-quebra mt-[2em] border-t border-slate-200 pt-[0.8em] text-center text-[0.76em] whitespace-pre-line opacity-60">
          {e.rodape}
        </footer>
      )}
    </article>
  )
}

