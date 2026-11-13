import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CampoNumero } from '../../components/CampoNumero'
import { EnviarFoto } from '../../components/EnviarFoto'
import { AreaTexto, Campo, Carregando, Icone, Titulo } from '../../components/ui'
import { db, EMPRESA_PADRAO, type Empresa } from '../../db'
import { apagarTudo, exportarBackup, importarBackup } from '../../lib/backup'
import { avisar, confirmar } from '../../components/Avisos'

export function Configuracoes() {
  const salva = useLiveQuery(() => db.empresa.get('principal').then((e) => e ?? null))
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const arquivoBackup = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (salva !== undefined && empresa === null) setEmpresa(salva ?? EMPRESA_PADRAO)
  }, [salva, empresa])

  if (!empresa) return <Carregando />

  const mudar = (m: Partial<Empresa>) => setEmpresa({ ...empresa, ...m })

  async function salvar() {
    // Mantém a numeração mais recente caso um orçamento tenha sido criado em outra aba
    await db.transaction('rw', db.empresa, async () => {
      const atual = await db.empresa.get('principal')
      // Aparência (layout e cor) é editada em "Modelo do orçamento": preserva o que está no banco
      await db.empresa.put({
        ...empresa!,
        layout: atual?.layout,
        corTema: atual?.corTema ?? empresa!.corTema,
        proximoNumero: Math.max(empresa!.proximoNumero, atual?.proximoNumero ?? 1),
      })
    })
    avisar('Dados da empresa salvos!')
  }

  async function importar(arquivo?: File) {
    if (!arquivo) return
    const ok = await confirmar({ titulo: 'Importar backup?', mensagem: 'Todos os dados atuais deste navegador serão substituídos pelos do arquivo.', botao: 'Importar', perigo: true })
    if (!ok) {
      if (arquivoBackup.current) arquivoBackup.current.value = ''
      return
    }
    try {
      const r = await importarBackup(arquivo)
      setEmpresa((await db.empresa.get('principal')) ?? EMPRESA_PADRAO)
      avisar(`Backup importado: ${r.orcamentos} orçamento(s) e ${r.clientes} cliente(s).`)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Falha ao importar.', 'erro')
    } finally {
      if (arquivoBackup.current) arquivoBackup.current.value = ''
    }
  }

  return (
    <>
      <Titulo
        titulo="Minha empresa"
        subtitulo="Esses dados aparecem no cabeçalho de todos os orçamentos."
        acoes={
          <button className="btn-primario" onClick={salvar}>
            <Icone nome="check" /> Salvar alterações
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="cartao p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Identidade visual</h2>
            <div className="flex flex-wrap items-center gap-5">
              <div className="grid h-24 w-40 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                {empresa.logo ? (
                  <img src={empresa.logo} alt="Logo" className="max-h-20 max-w-36 object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Sem logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <EnviarFoto manterTransparencia lado={600} className="btn-secundario" aoEnviar={([logo]) => mudar({ logo })}>
                  <Icone nome="foto" /> {empresa.logo ? 'Trocar logo' : 'Enviar logo'}
                </EnviarFoto>
                {empresa.logo && (
                  <button className="btn-fantasma text-xs text-red-600" onClick={() => mudar({ logo: undefined })}>
                    Remover logo
                  </button>
                )}
              </div>
            </div>
            <Link to="/app/modelo" className="btn-secundario mt-5">
              <Icone nome="config" /> Personalizar cores, tamanhos e posição do orçamento
            </Link>
          </section>

          <section className="cartao p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Dados da empresa</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome da empresa" value={empresa.nome} onChange={(e) => mudar({ nome: e.target.value })} />
              <Campo rotulo="CNPJ / CPF" value={empresa.documento} onChange={(e) => mudar({ documento: e.target.value })} />
              <Campo rotulo="Telefone / WhatsApp" value={empresa.telefone} onChange={(e) => mudar({ telefone: e.target.value })} />
              <Campo rotulo="E-mail" type="email" value={empresa.email} onChange={(e) => mudar({ email: e.target.value })} />
              <Campo rotulo="Site / Instagram" value={empresa.site} onChange={(e) => mudar({ site: e.target.value })} />
              <Campo rotulo="Responsável (assinatura)" value={empresa.responsavel} onChange={(e) => mudar({ responsavel: e.target.value })} />
              <Campo className="sm:col-span-2" rotulo="Endereço" value={empresa.endereco} onChange={(e) => mudar({ endereco: e.target.value })} />
            </div>
          </section>

          <section className="cartao p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Padrões dos novos orçamentos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="rotulo">Próximo número</span>
                <CampoNumero casas={0} valor={empresa.proximoNumero} aoMudar={(n) => mudar({ proximoNumero: Math.max(1, Math.round(n)) })} />
              </label>
              <label className="block">
                <span className="rotulo">Validade padrão (dias)</span>
                <CampoNumero casas={0} valor={empresa.validadePadraoDias} aoMudar={(n) => mudar({ validadePadraoDias: Math.round(n) })} />
              </label>
              <AreaTexto className="sm:col-span-2" rotulo="Condições de pagamento padrão" value={empresa.condicoesPadrao} onChange={(e) => mudar({ condicoesPadrao: e.target.value })} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="cartao p-5">
            <h2 className="font-semibold text-slate-900">Backup</h2>
            <p className="mt-1 text-sm text-slate-500">
              Seus dados ficam salvos neste navegador. Exporte um backup para guardar ou levar para outro computador.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button className="btn-secundario" onClick={() => exportarBackup()}>
                <Icone nome="baixar" /> Exportar backup (.json)
              </button>
              <button className="btn-secundario" onClick={() => arquivoBackup.current?.click()}>
                <Icone nome="subir" /> Importar backup
              </button>
              <input ref={arquivoBackup} type="file" accept="application/json,.json" hidden onChange={(e) => importar(e.target.files?.[0])} />
            </div>
          </section>

          <section className="cartao border-red-100 p-5">
            <h2 className="font-semibold text-red-700">Zona de perigo</h2>
            <p className="mt-1 text-sm text-slate-500">Apaga todos os orçamentos, clientes e dados da empresa deste navegador.</p>
            <button
              className="btn-perigo mt-4 w-full"
              onClick={async () => {
                if (await confirmar({ titulo: 'Apagar todos os dados?', mensagem: 'Orçamentos, clientes e dados da empresa serão apagados deste navegador. Faça um backup antes se quiser guardá-los.', botao: 'Apagar tudo', perigo: true })) {
                  await apagarTudo()
                  setEmpresa(EMPRESA_PADRAO)
                  avisar('Todos os dados foram apagados.')
                }
              }}
            >
              <Icone nome="lixo" /> Apagar todos os dados
            </button>
          </section>
        </div>
      </div>
    </>
  )
}
