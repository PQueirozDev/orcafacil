import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../components/ui'

const ATUALIZADO_EM = '14 de novembro de 2026'

function PaginaLegal({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <Icone nome="voltar" /> Voltar ao início
      </Link>
      <h1 className="mt-6 font-display text-4xl text-slate-900 sm:text-5xl">{titulo}</h1>
      <p className="mt-2 text-sm text-slate-500">Última atualização: {ATUALIZADO_EM}</p>
      <div className="mt-6 border-l-2 border-marca-600 bg-superficie py-4 pr-4 pl-5 text-sm leading-relaxed text-slate-700">{resumo}</div>
      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-slate-700 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  )
}

export function Privacidade() {
  return (
    <PaginaLegal
      titulo="Política de privacidade"
      resumo="Resumo: sem conta, seus dados ficam só no seu navegador. Com conta, eles são guardados no nosso banco de dados (Supabase) e cada conta só acessa os próprios dados. Não vendemos dados, não usamos anúncios nem rastreadores."
    >
      <section>
        <h2>1. Quem somos</h2>
        <p>
          O OrçaFácil é um software desenvolvido por Pedro Queiroz. Esta política explica como as informações são tratadas, em linha
          com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
        </p>
      </section>
      <section>
        <h2>2. Uso sem conta (modo visitante)</h2>
        <ul>
          <li>Empresa, clientes, orçamentos e fotos ficam no armazenamento local do seu navegador (IndexedDB) e não são enviados para nós.</li>
          <li>Se você limpar os dados do site, trocar de navegador ou usar janela anônima, as informações não estarão lá. Use o backup em “Empresa”.</li>
        </ul>
      </section>
      <section>
        <h2>3. Uso com conta</h2>
        <ul>
          <li><strong>Dados da conta:</strong> nome, e-mail e senha (a senha é guardada pelo serviço de autenticação de forma criptografada; nós não temos acesso a ela).</li>
          <li><strong>Dados que você cadastra:</strong> dados da empresa, clientes (nome, documento, contato, endereço, observações), orçamentos, fotos e logotipo.</li>
          <li><strong>Finalidade:</strong> salvar e sincronizar seus orçamentos entre aparelhos, gerar links de proposta e avisar você sobre respostas.</li>
          <li><strong>Base legal:</strong> execução do serviço solicitado por você. Em relação aos dados dos seus clientes, você é o controlador e o OrçaFácil atua como operador.</li>
          <li><strong>Acesso:</strong> regras de segurança no banco (Row Level Security) garantem que cada conta só leia e altere os próprios registros.</li>
        </ul>
      </section>
      <section>
        <h2>4. Links de proposta</h2>
        <ul>
          <li>Quem tiver o link vê uma cópia do orçamento enviado (itens, valores, condições, dados da sua empresa e do cliente). Compartilhe só com o destinatário.</li>
          <li>O link usa um código aleatório longo, pode ter validade e pode ser revogado a qualquer momento.</li>
          <li>Quando o cliente aprova ou recusa, registramos o nome informado, a data, o horário e o comentário opcional.</li>
          <li>Também registramos a data em que o link foi aberto pela primeira vez. Isso indica acesso ao link, não garante leitura.</li>
          <li>Páginas de proposta não são indexadas por buscadores.</li>
        </ul>
      </section>
      <section>
        <h2>5. Serviços de terceiros</h2>
        <ul>
          <li><strong>Supabase</strong>: banco de dados, autenticação e armazenamento de imagens (servidores em São Paulo).</li>
          <li><strong>Vercel</strong>: hospedagem do site; pode registrar dados técnicos de acesso (IP, navegador, data e hora) para segurança.</li>
          <li><strong>Google Fonts</strong>: fornece a fonte Inter; ao carregar a fonte, seu navegador se conecta aos servidores do Google.</li>
        </ul>
        <p className="mt-2">Não usamos cookies de rastreamento, ferramentas de análise de comportamento nem anúncios.</p>
      </section>
      <section>
        <h2>6. Imagens</h2>
        <p>
          Fotos e logotipos enviados por contas ficam em um endereço público de difícil adivinhação (o nome do arquivo é derivado do
          conteúdo), para poderem aparecer no PDF e no link da proposta. Não envie imagens com informações sensíveis.
        </p>
      </section>
      <section>
        <h2>7. Seus direitos</h2>
        <p>
          Você pode consultar, corrigir, exportar (backup .json) e apagar seus dados a qualquer momento em “Empresa → Apagar todos os
          dados”. Para excluir a conta e o cadastro de acesso, fale conosco pelo contato abaixo.
        </p>
      </section>
      <section>
        <h2>8. Contato</h2>
        <p>
          Dúvidas ou solicitações:{' '}
          <a className="font-semibold text-marca-600 hover:text-marca-700" href="https://www.pqueirozdev.com.br/" target="_blank" rel="noopener noreferrer">
            pqueirozdev.com.br
          </a>
          .
        </p>
      </section>
    </PaginaLegal>
  )
}

export function Termos() {
  return (
    <PaginaLegal
      titulo="Termos de uso"
      resumo="Resumo: o OrçaFácil é gratuito, é oferecido “como está” e você é responsável pelo conteúdo dos orçamentos que cria e envia. O aceite pelo link é um aceite eletrônico simples, não uma assinatura digital certificada."
    >
      <section>
        <h2>1. Sobre o serviço</h2>
        <p>
          O OrçaFácil permite criar orçamentos com itens, fotos e cálculo automático, gerar PDF, compartilhar propostas por link e
          receber aprovações. Pode ser usado sem conta (dados no navegador) ou com conta (dados na nuvem).
        </p>
      </section>
      <section>
        <h2>2. Preço e aceite eletrônico</h2>
        <p>
          O uso é gratuito. A aprovação de propostas pelo link registra o nome informado pelo cliente, a data e o horário: é um aceite
          eletrônico simples e não substitui assinatura digital certificada (ICP-Brasil) quando a lei ou o contrato exigirem.
        </p>
      </section>
      <section>
        <h2>3. Uso adequado</h2>
        <ul>
          <li>Você é responsável pelas informações, preços, imagens e condições que coloca nos orçamentos.</li>
          <li>Use apenas imagens e logos que você tem o direito de usar.</li>
          <li>Não use o serviço para fins ilegais, enganosos ou para se passar por outra empresa.</li>
        </ul>
      </section>
      <section>
        <h2>4. Seus dados e backups</h2>
        <p>
          Veja como tratamos os dados na{' '}
          <Link className="font-semibold text-marca-600 hover:text-marca-700" to="/privacidade">
            Política de privacidade
          </Link>
          ). No modo sem conta, exporte backups com frequência: não é possível recuperar dados apagados do navegador.
        </p>
      </section>
      <section>
        <h2>5. Garantias e responsabilidade</h2>
        <p>
          O serviço é fornecido “como está”, sem garantia de disponibilidade contínua ou de ausência de erros. Confira valores e
          cálculos antes de enviar um orçamento ao seu cliente. Não nos responsabilizamos por perdas decorrentes do uso do serviço. Os limites de uso podem mudar.
        </p>
      </section>
      <section>
        <h2>6. Código aberto</h2>
        <p>
          O código-fonte está disponível sob a licença MIT em{' '}
          <a className="font-semibold text-marca-600 hover:text-marca-700" href="https://github.com/PQueirozDev/orcafacil" target="_blank" rel="noopener noreferrer">
            github.com/PQueirozDev/orcafacil
          </a>
          .
        </p>
      </section>
      <section>
        <h2>7. Alterações</h2>
        <p>Estes termos podem ser atualizados. A data da última atualização aparece no topo da página.</p>
      </section>
    </PaginaLegal>
  )
}

export function NaoEncontrada() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-xl border border-slate-200 text-slate-500">
        <Icone nome="busca" className="h-9 w-9" />
      </div>
      <p className="mt-6 font-mono text-sm text-slate-500">404</p>
      <h1 className="mt-2 font-display text-4xl text-slate-900">Página não encontrada</h1>
      <p className="mt-3 text-slate-500">O endereço pode ter mudado ou não existe mais.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn-primario">
          Ir para o início
        </Link>
        <Link to="/app" className="btn-secundario">
          Abrir o app
        </Link>
      </div>
    </div>
  )
}
