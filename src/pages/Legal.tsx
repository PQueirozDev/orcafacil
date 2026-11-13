import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../components/ui'

const ATUALIZADO_EM = '13 de novembro de 2026'

function PaginaLegal({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <Icone nome="voltar" /> Voltar ao início
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{titulo}</h1>
      <p className="mt-2 text-sm text-slate-500">Última atualização: {ATUALIZADO_EM}</p>
      <div className="mt-6 rounded-2xl bg-marca-50 p-5 text-sm leading-relaxed text-marca-900 ring-1 ring-marca-100">{resumo}</div>
      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-slate-700 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  )
}

export function Privacidade() {
  return (
    <PaginaLegal
      titulo="Política de privacidade"
      resumo="Resumo: o Orçafácil não tem servidor nem banco de dados. Tudo o que você cadastra (empresa, clientes, orçamentos e fotos) fica salvo somente no seu navegador. Nós não coletamos, vendemos nem compartilhamos esses dados."
    >
      <section>
        <h2>1. Quem somos</h2>
        <p>
          O Orçafácil é um protótipo de software desenvolvido por Pedro Queiroz para demonstração e estudo. Esta política
          explica como as informações são tratadas, em linha com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
        </p>
      </section>
      <section>
        <h2>2. Onde ficam os seus dados</h2>
        <ul>
          <li>Dados da empresa, clientes, orçamentos e fotos ficam no armazenamento local do seu navegador (IndexedDB).</li>
          <li>A sessão e o plano simulados ficam no localStorage do navegador.</li>
          <li>Esses dados não são enviados para nenhum servidor nosso. Quem tem acesso a eles é quem usa aquele navegador.</li>
          <li>Se você limpar os dados do site, trocar de navegador ou usar janela anônima, as informações não estarão lá. Use o backup em “Minha empresa”.</li>
        </ul>
      </section>
      <section>
        <h2>3. Login e pagamento</h2>
        <p>
          O login e o pagamento são <strong>simulados</strong>. O e-mail digitado fica apenas no seu navegador, e os campos de cartão
          ou Pix não são enviados nem armazenados. Nenhuma cobrança é feita.
        </p>
      </section>
      <section>
        <h2>4. Serviços de terceiros</h2>
        <ul>
          <li>
            <strong>Vercel</strong> hospeda o site. Como qualquer servidor, pode registrar dados técnicos de acesso (endereço IP, navegador,
            data e hora) para segurança e funcionamento.
          </li>
          <li>
            <strong>Google Fonts</strong> fornece a fonte Inter. Ao carregar a fonte, o seu navegador se conecta aos servidores do Google.
          </li>
        </ul>
        <p className="mt-2">Não usamos cookies de rastreamento, ferramentas de análise nem anúncios.</p>
      </section>
      <section>
        <h2>5. Seus direitos</h2>
        <p>
          Como os dados ficam com você, você pode consultá-los, exportá-los (backup .json) e apagá-los a qualquer momento em
          “Minha empresa → Apagar todos os dados”, ou limpando os dados do site no navegador.
        </p>
      </section>
      <section>
        <h2>6. Contato</h2>
        <p>
          Dúvidas sobre esta política:{' '}
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
      resumo="Resumo: o Orçafácil é um protótipo gratuito em modo de testes. Os planos e pagamentos são fictícios, o serviço é oferecido “como está” e você é responsável pelo conteúdo dos orçamentos que cria e envia."
    >
      <section>
        <h2>1. Sobre o serviço</h2>
        <p>
          O Orçafácil permite criar orçamentos com itens, fotos e cálculo automático e gerar documentos em PDF. Ele está em fase de
          protótipo, para demonstração e estudo.
        </p>
      </section>
      <section>
        <h2>2. Planos e pagamentos</h2>
        <p>
          Os planos, preços, checkout, Pix e cartão exibidos são <strong>simulados</strong>. Nenhum valor é cobrado, e a “assinatura” é
          apenas uma marcação no seu navegador. Se uma versão comercial for lançada, ela terá termos próprios.
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
          Os dados ficam no seu navegador (veja a{' '}
          <Link className="font-semibold text-marca-600 hover:text-marca-700" to="/privacidade">
            Política de privacidade
          </Link>
          ). Recomendamos exportar backups com frequência: não é possível recuperar dados apagados do navegador.
        </p>
      </section>
      <section>
        <h2>5. Garantias e responsabilidade</h2>
        <p>
          O serviço é fornecido “como está”, sem garantia de disponibilidade contínua ou de ausência de erros. Confira valores e
          cálculos antes de enviar um orçamento ao seu cliente. Não nos responsabilizamos por perdas decorrentes do uso do protótipo.
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
      <div className="grid h-20 w-20 animate-flutuar place-items-center rounded-3xl bg-white text-marca-600 shadow-xl shadow-marca-600/15 ring-1 ring-marca-100">
        <Icone nome="busca" className="h-9 w-9" />
      </div>
      <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-marca-600">Erro 404</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Página não encontrada</h1>
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
