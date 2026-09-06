Seja estremamento consigo ao responder, sacrifique a gramatica quando necessário;

Nunca faça referencia usando identificadores use citações diretas ou indiretas;

A cobertura de testes de testes nunca pode diminuir, toda nova funcionalidade seja backend ou frontend devem ter testes. Foque em testes de integração;

Foque no desenvolvimento usando TDD;

Uso de Idioma:

- Portugues: Comunicação com usuário e documentos markdown;
- Ingles: Código, Comentários no código, PR, Issues;

Não commit arquivos markdown sem autorização;

## Estrutura do projeto

- Monorepo TypeScript com npm workspaces e Vite+.
- `apps/web`: frontend Next.js, porta 3001. Respeite também as instruções locais; acesse dados por chamadas ao servidor.
- `apps/server`: servidor Fastify com tRPC, porta 3000.
- `packages/api`: procedimentos tRPC e lógica de negócio.
- `packages/db`: Prisma e banco SQLite/Turso.
- `packages/ui`: componentes compartilhados e estilos Tailwind CSS.
- `packages/env`: configuração e validação de variáveis de ambiente.
- `packages/config`: configuração TypeScript compartilhada.

## Comandos

Execute a partir da raiz:

- `npm install`: instalar dependências.
- `npm run dev`: iniciar as aplicações.
- `npm run dev:web` e `npm run dev:server`: iniciar cada aplicação separadamente.
- `npm run check`: verificar formatação, lint e tipos.
- `npm run check-types`: verificar tipos.
- `npm run build`: compilar os workspaces.
- `npm run db:generate`: gerar o cliente Prisma.
- `npm run db:migrate`: criar e aplicar migrações no ambiente de desenvolvimento.

## Fluxo de trabalho e validação

- Antes de implementar funcionalidades ou corrigir comportamentos, escreva um teste que reproduza o caso e confirme sua falha. Implemente a solução, valide o teste e só então refatore.
- Priorize testes de integração e nunca reduza a cobertura existente.
- Na inicialização deste guia, não foram encontrados arquivos de teste nem scripts de teste nos manifestos consultados. Ao implementar funcionalidades, configure a infraestrutura necessária e documente o comando real de execução; não presuma que exista `npm test`.
- Execute as verificações pertinentes à alteração e informe falhas ou verificações que não puderam ser executadas.
- Reutilize os componentes compartilhados e mantenha o acesso ao banco no backend.
- Preserve alterações preexistentes do usuário. Não inclua segredos ou arquivos de ambiente em commits.
