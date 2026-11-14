import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { avisar, confirmar } from '../../components/Avisos'
import { CampoNumero } from '../../components/CampoNumero'
import { EnviarFoto } from '../../components/EnviarFoto'
import { AreaTexto, Campo, Carregando, Icone, Titulo } from '../../components/ui'
import { db, normalizarEmpresa, type Empresa } from '../../db'
import { apagarTudo, exportarBackup, importarBackup } from '../../lib/backup'

/** Campos editados aqui. Aparência (cor, layout) fica em Modelos; numeração é protegida. */
type Editavel = Omit<Empresa, 'id' | 'layout' | 'corTema' | 'sujo' | 'atualizadoEm'>

function Grupo({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="cartao p-4 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      {descricao && <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Configuracoes() {
  const { usuario } = useAuth()
  const salva = useLiveQuery(() => db.empresa.get('principal').then((e) => e ?? null))
  const [form, setForm] = useState<Editavel | null>(null)
  const [alterado, setAlterado] = useState(false)
  const arquivoBackup = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (salva !== undefined && form === null) {
      const { id: _i, layout: _l, corTema: _c, sujo: _s, atualizadoEm: _a, ...resto } = normalizarEmpresa(salva)
      void _i, _l, _c, _s, _a
      setForm(resto)
    }
  }, [salva, form])

  useEffect(() => {
    if (!alterado) return
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aoSair)
    return () => window.removeEventListener('beforeunload', aoSair)
  }, [alterado])

  if (!form) return <Carregando />

  const mudar = (m: Partial<Editavel>) => {
    setForm({ ...form, ...m })
    setAlterado(true)
  }

  async function salvar() {
    if (form!.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form!.email)) {
      avisar('O e-mail comercial parece inválido.', 'erro')
      return
    }
    await db.transaction('rw', db.empresa, async () => {
      const atual = normalizarEmpresa(await db.empresa.get('principal'))
      await db.empresa.put({ ...atual, ...form!, proximoNumero: Math.max(form!.proximoNumero, atual.proximoNumero), atualizadoEm: Date.now() })
    })
    setAlterado(false)
    setForm(null)
    avisar('Dados da empresa salvos!')
  }

  async function importar(arquivo?: File) {
    if (!arquivo) return
    try {
      const ok = await confirmar({
        titulo: 'Importar backup?',
        mensagem: usuario ? 'Os dados desta conta serão substituídos pelos do arquivo, inclusive na nuvem.' : 'Os dados deste navegador serão substituídos pelos do arquivo.',
        botao: 'Importar',
        perigo: true,
      })
      if (!ok) return
      const r = await importarBackup(arquivo)
      setForm(null)
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
        titulo="Empresa"
        subtitulo="Dados e textos padrão usados automaticamente nos novos orçamentos."
        acoes={
          <button className="btn-primario" onClick={() => void salvar()} disabled={!alterado}>
            <Icone nome="check" /> {alterado ? 'Salvar alterações' : 'Tudo salvo'}
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Grupo titulo="Identidade">
            <div className="flex flex-wrap items-center gap-5">
              <div className="grid h-24 w-40 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                {form.logo ? <img src={form.logo} alt="Logotipo atual" className="max-h-20 max-w-36 object-contain" /> : <span className="text-xs text-slate-400">Sem logotipo</span>}
              </div>
              <div className="flex flex-col gap-2">
                <EnviarFoto manterTransparencia lado={600} className="btn-secundario" aoEnviar={([logo]) => mudar({ logo })}>
                  <Icone nome="foto" /> {form.logo ? 'Trocar logotipo' : 'Enviar logotipo'}
                </EnviarFoto>
                {form.logo && (
                  <button className="btn-fantasma text-xs text-red-600" onClick={() => mudar({ logo: undefined })}>
                    Remover logotipo
                  </button>
                )}
                <p className="text-xs text-slate-500">PNG, JPG ou WebP. Reduzimos para no máximo 600 px.</p>
              </div>
            </div>
            <Link to="/app/modelo" className="btn-secundario mt-5">
              <Icone nome="documento" /> Cores, modelo e posição no orçamento
            </Link>
          </Grupo>

          <Grupo titulo="Dados da empresa">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome comercial *" maxLength={160} value={form.nome} onChange={(e) => mudar({ nome: e.target.value })} />
              <Campo rotulo="Razão social (opcional)" maxLength={160} value={form.razaoSocial} onChange={(e) => mudar({ razaoSocial: e.target.value })} />
              <Campo rotulo="CNPJ / CPF (opcional)" maxLength={40} value={form.documento} onChange={(e) => mudar({ documento: e.target.value })} />
              <Campo rotulo="Responsável (assinatura)" maxLength={120} value={form.responsavel} onChange={(e) => mudar({ responsavel: e.target.value })} />
              <Campo rotulo="E-mail comercial" type="email" maxLength={160} value={form.email} onChange={(e) => mudar({ email: e.target.value })} />
              <Campo rotulo="Telefone" type="tel" maxLength={40} value={form.telefone} onChange={(e) => mudar({ telefone: e.target.value })} />
              <Campo rotulo="WhatsApp" type="tel" maxLength={40} value={form.whatsapp} onChange={(e) => mudar({ whatsapp: e.target.value })} />
              <Campo rotulo="Site ou Instagram" maxLength={160} value={form.site} onChange={(e) => mudar({ site: e.target.value })} />
              <Campo className="sm:col-span-2" rotulo="Endereço" maxLength={300} value={form.endereco} onChange={(e) => mudar({ endereco: e.target.value })} />
            </div>
          </Grupo>

          <Grupo titulo="Padrões dos novos orçamentos" descricao="Alterar aqui não muda orçamentos já criados.">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="rotulo">Moeda</span>
                <input className="campo" value="Real brasileiro (R$)" disabled aria-describedby="moeda-dica" />
                <span id="moeda-dica" className="mt-1 block text-xs text-slate-500">Outras moedas ainda não são suportadas.</span>
              </label>
              <label className="block">
                <span className="rotulo">Validade padrão (dias)</span>
                <CampoNumero casas={0} valor={form.validadePadraoDias} aoMudar={(n) => mudar({ validadePadraoDias: Math.max(1, Math.round(n)) })} />
              </label>
              <label className="block">
                <span className="rotulo">Próximo número</span>
                <CampoNumero casas={0} valor={form.proximoNumero} aoMudar={(n) => mudar({ proximoNumero: Math.max(1, Math.round(n)) })} />
                <span className="mt-1 block text-xs text-slate-500">Nunca volta para trás.</span>
              </label>
              <AreaTexto className="sm:col-span-3" rotulo="Condições de pagamento" maxLength={2000} value={form.condicoesPadrao} onChange={(e) => mudar({ condicoesPadrao: e.target.value })} />
              <AreaTexto className="sm:col-span-3" rotulo="Observações" maxLength={2000} value={form.observacoesPadrao} onChange={(e) => mudar({ observacoesPadrao: e.target.value })} />
              <AreaTexto className="sm:col-span-3" rotulo="Termos e condições" maxLength={5000} value={form.termosPadrao} onChange={(e) => mudar({ termosPadrao: e.target.value })} />
            </div>
          </Grupo>

          <Grupo titulo="Pagamento e rodapé" descricao="Aparecem em todos os orçamentos, inclusive nos já criados (exceto links já enviados).">
            <div className="grid gap-4">
              <AreaTexto rotulo="Dados bancários ou instruções de pagamento" placeholder="Ex.: Pix (CNPJ) 00.000.000/0001-00" maxLength={1000} value={form.dadosPagamento} onChange={(e) => mudar({ dadosPagamento: e.target.value })} />
              <AreaTexto rotulo="Rodapé do documento" placeholder="Ex.: Obrigado pela preferência! Atendimento de seg. a sex., 8h às 18h." maxLength={500} value={form.rodape} onChange={(e) => mudar({ rodape: e.target.value })} />
            </div>
          </Grupo>
        </div>

        <div className="space-y-6">
          <Grupo titulo="Backup" descricao={usuario ? 'Seus dados já ficam na nuvem. O arquivo serve como cópia extra.' : 'Seus dados ficam neste navegador. Exporte para guardar ou levar a outro computador.'}>
            <div className="flex flex-col gap-2">
              <button className="btn-secundario" onClick={() => void exportarBackup()}>
                <Icone nome="baixar" /> Exportar backup (.json)
              </button>
              <button className="btn-secundario" onClick={() => arquivoBackup.current?.click()}>
                <Icone nome="subir" /> Importar backup
              </button>
              <input ref={arquivoBackup} type="file" accept="application/json,.json" hidden onChange={(e) => void importar(e.target.files?.[0])} />
            </div>
          </Grupo>

          <section className="cartao border-red-200 p-4 sm:p-6">
            <h2 className="font-semibold text-red-700">Zona de perigo</h2>
            <p className="mt-1 text-sm text-slate-500">Apaga todos os orçamentos e clientes {usuario ? 'desta conta, neste aparelho e na nuvem' : 'deste navegador'}.</p>
            <button
              className="btn-perigo mt-4 w-full"
              onClick={async () => {
                const ok = await confirmar({
                  titulo: 'Apagar todos os dados?',
                  mensagem: 'Orçamentos, clientes e histórico serão apagados. Faça um backup antes se quiser guardá-los. Não é possível desfazer.',
                  botao: 'Apagar tudo',
                  perigo: true,
                })
                if (!ok) return
                await apagarTudo()
                setForm(null)
                avisar('Todos os dados foram apagados.')
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
