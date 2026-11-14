# OrçaFácil

Plataforma para criar, enviar e aprovar orçamentos comerciais. Feita para freelancers, autônomos, profissionais liberais e pequenas empresas.

**No ar:** https://orcafacil.pqueirozdev.com.br

## Funcionalidades

- **Editor com prévia em tempo real**: cliente, itens com foto, quantidade, unidade, preço, desconto (% ou R$), impostos opcionais, frete, prazo, validade, condições, observações e termos. Duplicar, reordenar e remover itens, desfazer/refazer (Ctrl+Z / Ctrl+Shift+Z), validação e salvamento automático. No celular, alternador entre "Editar" e "Visualizar".
- **Cinco modelos visuais** (Moderno, Clássico, Criativo, Técnico, Comercial), personalizáveis: logo, cor principal e secundária, fonte, tamanhos, ordem e visibilidade das seções, estilo de cabeçalho e tabela, rodapé e dados de pagamento.
- **PDF em A4** pela impressão do navegador, com a mesma marcação da prévia, cabeçalho da tabela repetido em cada página, numeração "Página X de Y" e nome de arquivo organizado (`Orcamento-0124-Cliente.pdf`).
- **Modo visitante**: funciona sem conta, com os dados salvos no navegador (IndexedDB) e backup em `.json`.
- **Conta grátis (Supabase Auth)**: cadastro, login, confirmação de e-mail, recuperação e redefinição de senha, login com Google opcional.
- **Sincronização com a nuvem**: os dados ficam no aparelho e são replicados no Supabase. Funciona offline e envia quando a conexão volta. Os dados do modo visitante podem ser trazidos para a conta.
- **Links de proposta**: token aleatório de 256 bits, cópia imutável (snapshot) do que foi enviado, validade opcional, revogação, envio por WhatsApp, e-mail ou cópia do link.
- **Portal do cliente** (`/proposta/TOKEN`): o cliente vê a proposta, baixa o PDF (se permitido) e aprova ou recusa uma única vez, com nome e comentário opcional. É um aceite eletrônico simples, não uma assinatura digital certificada.
- **Status e histórico**: rascunho, pendente, visualizado, aprovado, recusado, expirado (derivado da validade) e cancelado, com transições controladas e linha do tempo de eventos.
- **Notificações**: aprovação e recusa (geradas no banco) e alertas de vencimento.
- **Painel**: indicadores, gráficos por mês e por status, filtros por período, cliente, status e faixa de valor, busca e paginação.
- **Clientes**: cadastro com observações, busca, filtros, histórico de propostas e preenchimento automático. Os orçamentos guardam uma cópia dos dados do cliente.
- **Tema claro e escuro**, seguindo o sistema ou a preferência salva. O documento impresso continua sempre claro.
- **PWA**: instalável e com funcionamento offline.

## Tecnologias

Vite, React 19, TypeScript, Tailwind CSS v4, React Router, Dexie (IndexedDB), Supabase (Postgres, Auth, Storage), Vitest e Playwright.

## Rodando localmente

```sh
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev                  # http://localhost:5173
```

Sem as variáveis do Supabase o app funciona normalmente no modo visitante (sem contas, nuvem e links).

### Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave **publicável** (`sb_publishable_...`). É pública por definição: a segurança vem das políticas RLS. |
| `VITE_LOGIN_GOOGLE` | `true` para mostrar "Continuar com Google" (exige configurar o provedor) |

Nunca coloque a *service role key* ou a senha do banco no frontend nem no repositório.

## Configurando o Supabase

1. Crie um projeto (o plano gratuito atende).
2. Aplique as migrations de `supabase/migrations/`, em ordem: pelo SQL Editor, colando cada arquivo, ou com a CLI (`supabase link` e depois `supabase db push`).
3. Em **Authentication → URL Configuration**:
   - **Site URL**: a URL de produção (ex.: `https://orcafacil.pqueirozdev.com.br`).
   - **Redirect URLs**: a URL de produção, as URLs de preview da Vercel (`https://*-SEU-TIME.vercel.app/**`) e `http://localhost:5173/**`.
4. (Recomendado) Em **Authentication → Emails → SMTP**, configure um provedor próprio. O envio padrão do Supabase tem limite baixo por hora e serve só para testes.
5. (Opcional) Habilite o provedor Google e defina `VITE_LOGIN_GOOGLE=true`.

### Estrutura do banco

| Tabela | Conteúdo |
|---|---|
| `perfis` | nome do usuário (criado por gatilho no cadastro) |
| `empresas` | dados da empresa, textos padrão e modelo visual |
| `clientes` | cadastro de clientes |
| `orcamentos` | orçamentos com itens e dados em JSON, cópia do cliente e status |
| `compartilhamentos` | links: token, snapshot imutável, validade, revogação e decisão |
| `eventos` | linha do tempo de cada orçamento |
| `notificacoes` | avisos de aprovação e recusa |

- Todas as tabelas têm **RLS**: cada usuário só lê e altera as próprias linhas.
- O visitante de uma proposta não lê nenhuma tabela. Ele usa duas funções `security definer`, `proposta_obter` e `proposta_decidir`, que validam token, revogação, validade e decisão única, com limite de tentativas por IP.
- Visualização, aprovação e recusa só podem ser registradas por essas funções.
- O snapshot e a decisão não podem ser alterados pelo dono.
- Propostas decididas não voltam de status por sincronização (só podem ser canceladas).
- As imagens ficam no bucket `arquivos`, que só aceita JPG, PNG ou WebP de até 2 MB. Cada usuário só grava na própria pasta, e o nome do arquivo é o hash do conteúdo.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checagem de tipos e build de produção em `dist/` |
| `npm run preview` | serve o build localmente |
| `npm test` | testes unitários (cálculos, status, links, backup, sincronização, banco local) |
| `npm run test:e2e` | fluxo completo no navegador com a nuvem real (login → link → aprovação → painel) |

O teste de ponta a ponta precisa do servidor rodando e de uma conta de teste **confirmada**:

```sh
E2E_BASE=http://localhost:5173 E2E_EMAIL=teste@exemplo.com E2E_SENHA=... npm run test:e2e
```

## Deploy (Vercel)

O repositório está ligado ao projeto `orcafacil` na Vercel: push na `main` publica em produção e outras branches geram previews. Cadastre as variáveis `VITE_SUPABASE_*` em **Settings → Environment Variables** (Production e Preview). O `vercel.json` cuida das rotas da SPA, do cache, dos cabeçalhos de segurança e do `noindex` nas páginas privadas.

## Limitações conhecidas

- **Planos gratuitos**: o Supabase Free tem limites de banco (500 MB), Storage (1 GB), tráfego e e-mails. Projetos inativos por uma semana são pausados. Os limites podem mudar.
- **PDF**: é gerado pela impressão do navegador ("Salvar como PDF"). No celular, o fluxo depende do navegador.
- **Conflitos de edição**: se o mesmo orçamento for editado em dois aparelhos sem conexão, vale a última gravação.
- **Moeda**: apenas real brasileiro (R$).
- **Notificações por e-mail**: não implementadas; as notificações aparecem dentro do app (atualizadas a cada 2 minutos com a aba aberta).
- **Exclusão de conta**: o usuário apaga os dados pelo app; a remoção do cadastro de acesso é feita pelo administrador, porque exige a chave de serviço.
- **Visualização do link**: indica que o link foi aberto, não garante que uma pessoa leu.

## Licença

MIT. Veja [LICENSE](LICENSE).
