import { db, novoId, type Empresa, type Orcamento } from '../db'

/** Gera uma "foto" ilustrativa em SVG para os dados de demonstração. */
function fotoExemplo(c1: string, c2: string, forma: 'cozinha' | 'armario' | 'bancada' | 'sala') {
  const desenhos = {
    cozinha:
      '<rect x="60" y="250" width="680" height="190" rx="8" fill="#fff" opacity=".9"/><rect x="80" y="270" width="150" height="150" rx="6" fill="#e2e8f0"/><rect x="250" y="270" width="150" height="150" rx="6" fill="#e2e8f0"/><rect x="420" y="270" width="300" height="150" rx="6" fill="#e2e8f0"/><rect x="60" y="80" width="420" height="110" rx="8" fill="#fff" opacity=".9"/><rect x="540" y="60" width="200" height="160" rx="8" fill="#fff" opacity=".5"/>',
    armario:
      '<rect x="180" y="60" width="440" height="380" rx="10" fill="#fff" opacity=".9"/><line x1="400" y1="60" x2="400" y2="440" stroke="#cbd5e1" stroke-width="6"/><circle cx="380" cy="250" r="9" fill="#94a3b8"/><circle cx="420" cy="250" r="9" fill="#94a3b8"/>',
    bancada:
      '<rect x="40" y="200" width="720" height="40" rx="6" fill="#fff"/><rect x="70" y="240" width="660" height="200" fill="#fff" opacity=".6"/><ellipse cx="300" cy="200" rx="90" ry="14" fill="#cbd5e1"/><rect x="500" y="120" width="12" height="80" fill="#fff"/>',
    sala:
      '<rect x="120" y="260" width="560" height="140" rx="40" fill="#fff" opacity=".9"/><rect x="160" y="220" width="480" height="80" rx="30" fill="#fff"/><rect x="300" y="70" width="200" height="120" rx="6" fill="#fff" opacity=".6"/>',
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/>${desenhos[forma]}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const EMPRESA_EXEMPLO: Empresa = {
  id: 'principal',
  nome: 'Marcenaria Bom Lar',
  documento: '12.345.678/0001-90',
  email: 'contato@bomlar.com.br',
  telefone: '(11) 98765-4321',
  endereco: 'Rua das Acácias, 120 — São Paulo/SP',
  site: 'bomlar.com.br',
  responsavel: 'Carlos Andrade',
  corTema: '#0f766e',
  proximoNumero: 1,
  validadePadraoDias: 15,
  condicoesPadrao: '50% de entrada e 50% na entrega.\nPix, transferência ou cartão em até 6x.',
}

export function orcamentoExemplo(numero = 42): Orcamento {
  const agora = Date.now()
  return {
    numero,
    titulo: 'Cozinha planejada em MDF',
    cliente: {
      nome: 'Mariana Souza',
      documento: '123.456.789-00',
      email: 'mariana@email.com',
      telefone: '(11) 91234-5678',
      endereco: 'Av. Paulista, 1500, ap. 82 — São Paulo/SP',
    },
    itens: [
      {
        id: novoId(),
        descricao: 'Armários superiores',
        detalhes: 'MDF 18mm branco TX, puxadores perfil alumínio',
        quantidade: 3.2,
        unidade: 'm',
        valorUnitario: 1250,
        foto: fotoExemplo('#99f6e4', '#0f766e', 'armario'),
      },
      {
        id: novoId(),
        descricao: 'Gabinete inferior com gaveteiro',
        detalhes: 'Corrediças telescópicas com amortecimento',
        quantidade: 2.8,
        unidade: 'm',
        valorUnitario: 1480,
        foto: fotoExemplo('#fde68a', '#b45309', 'bancada'),
      },
      {
        id: novoId(),
        descricao: 'Instalação e montagem',
        detalhes: '',
        quantidade: 1,
        unidade: 'serv.',
        valorUnitario: 900,
      },
    ],
    fotos: [
      { id: novoId(), src: fotoExemplo('#a5f3fc', '#0e7490', 'cozinha'), legenda: 'Projeto 3D — vista geral' },
      { id: novoId(), src: fotoExemplo('#ddd6fe', '#6d28d9', 'sala'), legenda: 'Ambiente integrado à sala' },
    ],
    descontoTipo: 'percentual',
    desconto: 5,
    frete: 0,
    observacoes: 'Medidas finais confirmadas após visita técnica.\nGarantia de 2 anos.',
    condicoesPagamento: EMPRESA_EXEMPLO.condicoesPadrao,
    prazoEntrega: '25 dias úteis',
    validadeDias: 15,
    status: 'enviado',
    criadoEm: agora,
    atualizadoEm: agora,
  }
}

/** Preenche o banco local com dados de demonstração. */
export async function carregarExemplos() {
  await db.transaction('rw', db.empresa, db.clientes, db.orcamentos, async () => {
    const empresa = await db.empresa.get('principal')
    let numero = empresa?.proximoNumero ?? 1
    const dia = 24 * 60 * 60 * 1000

    const clientes = [
      orcamentoExemplo().cliente,
      { nome: 'Restaurante Sabor & Arte', documento: '98.765.432/0001-10', email: 'compras@saborearte.com', telefone: '(11) 3333-2222', endereco: 'Rua Augusta, 900 — São Paulo/SP' },
      { nome: 'João Pereira', documento: '', email: 'joao.p@email.com', telefone: '(11) 97777-1111', endereco: 'Rua Vergueiro, 55 — São Paulo/SP' },
    ]
    const ids = await db.clientes.bulkAdd(clientes.map((c) => ({ ...c, criadoEm: Date.now() })), { allKeys: true })

    const o1 = orcamentoExemplo(numero++)
    await db.orcamentos.add({ ...o1, clienteId: ids[0] as number })

    const o2 = orcamentoExemplo(numero++)
    await db.orcamentos.add({
      ...o2,
      titulo: 'Balcão de atendimento e prateleiras',
      clienteId: ids[1] as number,
      cliente: clientes[1],
      status: 'aprovado',
      desconto: 0,
      frete: 180,
      fotos: [o2.fotos[1]],
      criadoEm: Date.now() - 6 * dia,
      atualizadoEm: Date.now() - 4 * dia,
    })

    const o3 = orcamentoExemplo(numero++)
    await db.orcamentos.add({
      ...o3,
      titulo: 'Guarda-roupa casal 6 portas',
      clienteId: ids[2] as number,
      cliente: clientes[2],
      status: 'rascunho',
      itens: [{ ...o3.itens[0], descricao: 'Guarda-roupa 6 portas', quantidade: 1, unidade: 'un', valorUnitario: 4890 }],
      fotos: [],
      criadoEm: Date.now() - 2 * dia,
      atualizadoEm: Date.now() - 2 * dia,
    })

    await db.empresa.put({ ...(empresa ?? EMPRESA_EXEMPLO), proximoNumero: numero })
  })
}
