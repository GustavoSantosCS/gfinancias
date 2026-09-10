---
name: backend-architecture
description: "Estruture ou refatore features backend do GFinanças com tRPC, domínio, aplicação, portas e Prisma. Use para criar ou reorganizar regras persistidas; não use para mudanças somente de frontend."
---

# Arquitetura backend do GFinanças

Use esta skill ao criar ou refatorar uma feature persistida em `packages/api`.

## Antes de alterar

- Leia `AGENTS.md`, `docs/agents/domain.md`, o mapa de contexto quando existir e ADRs aplicáveis.
- Localize uma feature de backend parecida. Planejamento é a referência para separação de responsabilidades.
- Se for refatoração, execute o teste de integração atual e registre os procedimentos, formatos, códigos e mensagens que precisam permanecer estáveis.
- Todo código deve ser alterado em um task worktree. Use o contexto atual somente quando ele corresponder ao objetivo ativo.

## Limites obrigatórios

Organize a feature em torno deste fluxo:

```text
routers/<feature>.ts
    -> <feature>/application/
        -> <feature>/domain/
        -> <feature>/ports/
            -> <feature>/infrastructure/
```

- `contracts.ts`: schemas Zod e tipos inferidos de entradas públicas. Não inclui acesso ao banco nem regra de negócio.
- `domain/`: políticas puras, cálculos, normalizações e erros tipados. Não importa tRPC, Fastify, Prisma ou contexto HTTP.
- `application/`: um caso de uso por intenção do domínio. Busca entidades, aplica políticas, preserva invariantes e coordena a transação necessária. Não importa Prisma ou tRPC.
- `ports/`: DTOs e interfaces orientadas ao caso de uso. Não vaza tipos gerados pelo Prisma.
- `infrastructure/`: adaptadores Prisma. Recebe apenas a parte mínima do contexto necessária, preserva consultas, ordenações e relações e não contém decisão de domínio.
- `routers/`: valida entrada, cria adaptadores, chama casos de uso e converte erros conhecidos em `TRPCError`. Não acessa modelos Prisma diretamente nem implementa regras financeiras.

Para operações compostas, defina uma unidade de trabalho na porta. Leituras usadas para validação e suas escritas dependentes devem ocorrer dentro da mesma transação do adaptador Prisma.

## Regras de evolução

- Mantenha valores monetários em centavos inteiros fora da apresentação.
- Receba datas civis como texto, valide no domínio e preserve a convenção de meio-dia UTC quando ela já existir no contexto.
- Exponha mensagens estáveis no idioma adotado pela feature. O roteador é a única camada que conhece códigos tRPC.
- Não altere schema, migrações, procedimentos públicos, retornos, códigos ou mensagens durante uma refatoração de arquitetura sem autorização explícita.
- Não transfira regra de persistência para frontend; o frontend acessa dados somente pelo servidor.

## TDD e validação

1. Para mudança funcional, escreva primeiro um teste que falha. Para refatoração, adicione teste de caracterização quando a regra ainda não estiver coberta.
2. Priorize integração pelo `appRouter.createCaller` e banco isolado. Use testes unitários para políticas puras com combinações de calendário, dinheiro ou invariantes difíceis de mostrar pela API.
3. Extraia uma fatia por vez: contrato e teste, domínio, porta/adaptador, aplicação, roteador.
4. Após cada fatia, execute o teste focal e revise o diff. Ao final, execute testes da feature, tipos, `npm run check` e a cobertura pertinente.
5. Ao mover código para novos arquivos, atualize a configuração de cobertura para medi-los; nunca reduza limites existentes.

## Sinais de arquitetura incorreta

Interrompa e reorganize antes de continuar quando encontrar qualquer um destes sinais:

- um roteador com `ctx.db.<modelo>` ou `$transaction`;
- `TRPCError` dentro de domínio ou aplicação;
- tipo Prisma atravessando a porta;
- regra financeira duplicada entre adaptador e caso de uso;
- transação iniciada depois de leituras que determinam elegibilidade;
- teste de componente como única prova de uma regra persistida.
