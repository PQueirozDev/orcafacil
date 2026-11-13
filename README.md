# Orçafácil

Protótipo de SaaS para empresas criarem orçamentos profissionais com fotos e gerarem PDF em A4.

**No ar:** https://orcafacil.pqueirozdev.com.br

## O que tem

- Editor de orçamentos com itens, foto por item, galeria de fotos, desconto, frete e prévia A4 ao vivo
- **Modelo do orçamento**: ordem das seções, posição da logo, tamanhos, cores, fonte e modelos prontos
- Clientes, dados da empresa (logo, CNPJ, contato) e numeração automática
- PDF via impressão do navegador ("Salvar como PDF")
- Backup e restauração em `.json`
- PWA: instalável e funciona offline

## Modo de testes

Não há backend nem banco de dados: tudo fica salvo no navegador (IndexedDB). Login, planos e pagamento (cartão e Pix) são **simulados**, e há botões para pular cadastro e pagamento.

## Desenvolvimento

```sh
npm install
npm run dev     # http://localhost:5173
npm run build   # checagem de tipos + build de produção em dist/
```

Stack: Vite, React, TypeScript, Tailwind CSS v4, Dexie (IndexedDB), React Router.

Deploy na Vercel: `npx vercel deploy --prod`.

## Licença

MIT. Veja [LICENSE](LICENSE).
