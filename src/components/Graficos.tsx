/**
 * Gráficos leves em SVG/HTML (sem biblioteca). Cada um traz uma tabela oculta para leitores de tela.
 */

export interface Ponto {
  rotulo: string
  valor: number
  /** Segundo valor (opcional), desenhado sobre o primeiro: ex.: aprovados dentro do total. */
  destaque?: number
}

export function GraficoBarras({
  titulo,
  dados,
  formatar,
  legenda,
}: {
  titulo: string
  dados: Ponto[]
  formatar: (n: number) => string
  legenda?: [string, string]
}) {
  const max = Math.max(1, ...dados.map((d) => d.valor))
  const vazio = dados.every((d) => d.valor === 0)
  return (
    <figure className="cartao p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{titulo}</h3>
        {legenda && (
          <span className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-marca-200" /> {legenda[0]}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-marca-600" /> {legenda[1]}
            </span>
          </span>
        )}
      </figcaption>
      {vazio ? (
        <p className="grid h-44 place-items-center text-sm text-slate-400">Sem dados no período.</p>
      ) : (
        <div className="mt-5 flex h-44 items-end gap-1.5 sm:gap-3" aria-hidden="true">
          {dados.map((d) => (
            <div key={d.rotulo} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="invisible whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white group-hover:visible">
                {formatar(d.valor)}
                {d.destaque != null && legenda ? ` · ${formatar(d.destaque)}` : ''}
              </span>
              <div className="relative w-full max-w-10 flex-1">
                <div
                  className="absolute inset-x-0 bottom-0 origin-bottom animate-[crescer_0.6s_cubic-bezier(0.22,1,0.36,1)_both] rounded-t-md bg-marca-200"
                  style={{ height: `${(d.valor / max) * 100}%` }}
                />
                {d.destaque != null && (
                  <div
                    className="absolute inset-x-0 bottom-0 origin-bottom animate-[crescer_0.6s_0.1s_cubic-bezier(0.22,1,0.36,1)_both] rounded-t-md bg-marca-600"
                    style={{ height: `${(d.destaque / max) * 100}%` }}
                  />
                )}
              </div>
              <span className="w-full truncate text-center text-[10px] font-medium text-slate-500 sm:text-xs">{d.rotulo}</span>
            </div>
          ))}
        </div>
      )}
      <table className="sr-only">
        <caption>{titulo}</caption>
        <tbody>
          {dados.map((d) => (
            <tr key={d.rotulo}>
              <th scope="row">{d.rotulo}</th>
              <td>{formatar(d.valor)}</td>
              {d.destaque != null && <td>{formatar(d.destaque)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function Distribuicao({ titulo, dados }: { titulo: string; dados: { rotulo: string; valor: number; cor: string }[] }) {
  const total = dados.reduce((s, d) => s + d.valor, 0)
  return (
    <figure className="cartao p-5">
      <figcaption>
        <h3 className="font-semibold text-slate-900">{titulo}</h3>
      </figcaption>
      {total === 0 ? (
        <p className="grid h-44 place-items-center text-sm text-slate-400">Sem dados no período.</p>
      ) : (
        <>
          <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            {dados
              .filter((d) => d.valor > 0)
              .map((d) => (
                <div key={d.rotulo} className={`${d.cor} animate-[crescer-x_0.6s_ease-out_both] origin-left`} style={{ width: `${(d.valor / total) * 100}%` }} title={`${d.rotulo}: ${d.valor}`} />
              ))}
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {dados.map((d) => (
              <li key={d.rotulo} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-slate-600">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${d.cor}`} />
                  <span className="truncate">{d.rotulo}</span>
                </span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {d.valor}
                  <span className="ml-1 text-xs font-normal text-slate-400">{Math.round((d.valor / total) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  )
}
