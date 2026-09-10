# Entendimento e plano paralelo — refatoração do backend de cartões

## Objetivo do documento

Registrar o diagnóstico comparativo entre Cartões e Planejamento e oferecer um plano de refatoração executável por vários agentes sem alteração de comportamento, formato da API ou interface.

Este documento é autossuficiente. Um agente novo deve conseguir assumir uma frente apenas lendo este arquivo, as instruções do repositório e os arquivos indicados na sua frente.

## Resultado esperado

Ao final, o backend de Cartões deve seguir a mesma direção arquitetural adotada pelo backend de Planejamento:

```text
roteador tRPC
    -> casos de uso da aplicação
        -> políticas e erros do domínio
        -> porta de persistência e unidade de trabalho
            -> adaptador Prisma
```

O roteador deve limitar-se a:

- validar entradas por meio dos contratos Zod existentes;
- criar as dependências da operação;
- chamar o caso de uso correspondente;
- traduzir erros tipados para códigos tRPC;
- devolver o resultado sem reconstruir regras de negócio.

## Diagnóstico confirmado

### Backend

Planejamento já está dividido entre:

- `packages/api/src/planning/contracts.ts`;
- `packages/api/src/planning/application/`;
- `packages/api/src/planning/domain/`;
- `packages/api/src/planning/ports/`;
- `packages/api/src/planning/infrastructure/`;
- `packages/api/src/routers/planning.ts`.

Cartões possui somente:

- `packages/api/src/cards/contracts.ts`;
- `packages/api/src/routers/cards.ts`;
- `packages/api/src/routers/cards.test.ts`.

O roteador de Cartões concentra hoje:

- normalização de nomes e textos;
- conversão e validação de datas civis;
- cálculo das competências das parcelas;
- divisão do valor entre parcelas e distribuição de centavos restantes;
- busca e validação do estado do cartão;
- regras de criação, edição, arquivamento, restauração e exclusão;
- regras de criação, consulta, edição e exclusão de compras;
- elegibilidade e cálculo de antecipações;
- montagem da descrição e do snapshot da antecipação;
- consultas Prisma;
- transações Prisma;
- mapeamento direto de falhas para `TRPCError`.

Isso mistura transporte, aplicação, domínio e infraestrutura no mesmo arquivo.

### Frontend

O frontend também não está completamente alinhado, mas não faz parte desta refatoração.

- `apps/web/src/features/cards/cards-page.tsx` possui mais de 1.500 linhas e reúne consulta, mutação, estado, transformação de formulário, notificações e apresentação.
- Existem vários usos de `any` no fluxo de detalhes e antecipação.
- A atualização do cache é feita por múltiplos `refetch` manuais.
- A rota real de Planejamento ainda usa `apps/web/src/app/page.tsx` como controlador legado; apenas a apresentação principal foi extraída para `apps/web/src/components/planning-view.tsx`.

Portanto, Planejamento é a referência para a separação do backend, não uma referência completa para a organização do frontend.

### Causa observável da divergência

O histórico mostra esta sequência:

1. Planejamento recebeu uma refatoração específica para separar responsabilidades.
2. Cartões foi entregue depois, com uma implementação funcional ampla.
3. Os fluxos de compra e antecipação continuaram crescendo dentro do roteador e da página.
4. Não houve uma etapa equivalente de extração arquitetural para Cartões.

Não há evidência suficiente para atribuir intenção aos agentes. O problema verificável é processual: a documentação recomenda a organização, mas não existe uma verificação automática ou critério de aceite que impeça regras de domínio dentro de roteadores.

## Estado de validação

Antes deste documento, foram executados:

```bash
npm test -- packages/api/src/routers/cards.test.ts packages/api/src/routers/planning.test.ts apps/web/src/features/cards/cards-page.test.tsx tests/components/planning-view.test.tsx
```

Resultado observado:

- quatro arquivos aprovados;
- vinte e nove testes aprovados;
- nenhuma falha.

Esse é o baseline funcional. A refatoração não pode reduzir cobertura nem alterar esse resultado.

## Escopo

Incluído:

- separar domínio, aplicação, persistência e transporte do backend de Cartões;
- preservar todos os procedimentos, entradas, saídas, códigos e mensagens atuais;
- manter transações atômicas;
- substituir `any` no backend por tipos explícitos;
- adicionar testes antes de cada extração relevante;
- incluir os novos arquivos na medição de cobertura do backend;
- deixar o roteador de Cartões com responsabilidade equivalente ao de Planejamento.

Fora do escopo:

- alterar banco, schema Prisma ou migrações;
- renomear procedimentos tRPC;
- alterar formatos consumidos pelo frontend;
- mudar mensagens visíveis;
- corrigir ou reinterpretar regras de negócio existentes;
- refatorar `cards-page.tsx`;
- refatorar o shell legado ou a rota de Planejamento;
- adicionar autenticação ou autorização por usuário;
- mudar ordenação, filtros ou semântica das competências.

Caso um teste novo revele um defeito funcional, registre-o separadamente. Não misture a correção com esta refatoração sem autorização.

## Comportamento que deve permanecer idêntico

### Cartões

- Listar somente cartões ativos por padrão.
- Incluir arquivados apenas quando solicitado.
- Ordenar cartões por nome em ordem crescente.
- Aparar e colapsar espaços do nome apresentado.
- Comparar unicidade pelo nome normalizado em minúsculas com locale `pt-BR`.
- Rejeitar nome duplicado com conflito e a mensagem atual.
- Rejeitar edição de cartão arquivado.
- Arquivar e restaurar mantendo os retornos atuais.
- Excluir o cartão depois de confirmar sua existência; preservar a cascata definida no banco.

### Compras e parcelas

- Rejeitar compra em cartão arquivado.
- Interpretar data civil como meio-dia UTC e rejeitar datas impossíveis.
- Aparar e colapsar espaços de título e descrição.
- Truncar texto normalizado acima de quinhentos caracteres com reticências, como ocorre atualmente.
- Dividir valores em centavos usando divisão inteira.
- Colocar o restante na parcela escolhida ou na última parcela.
- Avançar competência corretamente entre meses e anos.
- Listar as parcelas da competência, não somente a compra raiz.
- Preservar filtros por cartão, título e estado do cartão.
- Preservar a projeção achatada retornada pela listagem.
- Devolver detalhes com cartão, antecipações, parcelas e o alias `schedule`.
- Rejeitar edição e exclusão quando o cartão estiver arquivado.
- Rejeitar edição depois que houver antecipação.
- Ao editar valor, quantidade ou competência, regenerar as parcelas dentro de transação.
- Validar a parcela escolhida para receber os centavos restantes.

### Antecipações

- Rejeitar antecipação em cartão arquivado.
- Não permitir antecipar a primeira parcela.
- Exigir parcelas selecionadas consecutivas.
- Considerar somente parcelas regulares ainda disponíveis.
- Rejeitar seleção já antecipada ou inexistente.
- Preservar os modos agrupado e separado.
- Preservar descrição e snapshot, inclusive valores originais, valores ajustados, competências, totais, modo e data.
- Excluir as parcelas originais e criar a antecipação e suas novas entradas na mesma transação.
- Preservar a ordenação das entradas retornadas.

### Erros públicos

Os casos de uso devem lançar erros próprios. Somente o roteador traduz esses erros para tRPC. Códigos e mensagens atuais devem permanecer estáveis:

- recurso inexistente: `NOT_FOUND`;
- nome duplicado, compra já antecipada ou parcela indisponível: `CONFLICT`;
- cartão arquivado bloqueando a operação: `FORBIDDEN`;
- data inválida, seleção não consecutiva, primeira parcela ou restante inválido: `BAD_REQUEST`.

## Arquitetura-alvo

```text
packages/api/src/cards/
├── application/
│   ├── cards.ts
│   ├── purchases.ts
│   └── anticipations.ts
├── domain/
│   ├── anticipation-policy.test.ts
│   ├── anticipation-policy.ts
│   ├── card-policy.test.ts
│   ├── card-policy.ts
│   ├── errors.test.ts
│   ├── errors.ts
│   ├── purchase-policy.test.ts
│   └── purchase-policy.ts
├── infrastructure/
│   └── prisma-cards-repository.ts
├── ports/
│   └── cards-repository.ts
├── test/
│   └── cards-integration-fixture.ts
└── contracts.ts

packages/api/src/routers/
├── cards.test.ts
└── cards.ts
```

Os nomes podem ser ajustados antes da implementação, desde que a propriedade por camada permaneça clara e todos os agentes usem a mesma decisão.

## Decisões de desenho

### Domínio

Funções puras devem conter:

- normalização de nome e texto;
- parsing de data civil;
- cálculo da próxima competência;
- geração da grade de parcelas;
- validação de seleção consecutiva;
- cálculo dos dados da antecipação;
- montagem determinística da descrição e do snapshot.

Erros do domínio não importam `TRPCError`, Prisma ou Fastify.

### Aplicação

Cada caso de uso recebe portas, entradas já validadas pelo contrato e devolve DTOs explícitos. A aplicação decide:

- quais entidades precisam existir;
- quais estados permitem a operação;
- quando aplicar políticas puras;
- quando uma operação precisa ser transacional;
- qual sequência de leitura e gravação preserva as invariantes.

### Persistência

`CardsRepository` expõe somente operações necessárias aos casos de uso. Não deve devolver tipos gerados do Prisma na interface pública da porta.

Operações compostas precisam de uma unidade de trabalho, por exemplo:

```ts
export interface CardsUnitOfWork {
    run<T>(operation: (repository: CardsRepository) => Promise<T>): Promise<T>;
}
```

O adaptador Prisma fornece um repositório associado ao cliente raiz ou ao cliente transacional. Leituras de validação e gravações de uma operação composta devem ocorrer dentro da mesma transação.

### Transporte

O roteador cria o repositório e a unidade de trabalho, chama um caso de uso e usa uma única função de tradução de erros. Não acessa `ctx.db` fora da construção do adaptador.

## Estratégia TDD

Esta é uma refatoração de comportamento preservado. O ciclo obrigatório é:

1. adicionar ou fortalecer um teste de caracterização pela API pública;
2. executar o teste e confirmar o comportamento atual;
3. mover uma responsabilidade pequena;
4. executar novamente o teste específico;
5. executar a suíte completa de Cartões;
6. revisar o diff antes de iniciar a próxima extração.

Um teste de caracterização pode iniciar verde, pois registra comportamento existente. Qualquer funcionalidade nova ou correção descoberta exige primeiro um teste vermelho e deve ser tratada fora deste escopo.

Priorizar integração pelo `appRouter.createCaller` com Prisma e banco de teste. Testes unitários são adequados apenas para políticas puras com muitas combinações ou casos de calendário.

## Plano preparado para trabalho paralelo

### Regra de coordenação

Uma pessoa ou agente atua como integrador. Somente o integrador pode editar arquivos compartilhados durante uma onda:

- `packages/api/src/cards/contracts.ts`;
- `packages/api/src/cards/ports/cards-repository.ts`;
- `packages/api/src/routers/cards.ts`;
- `packages/api/src/routers/cards.test.ts`;
- `package.json`.

Os demais agentes não devem fazer alterações oportunistas fora de sua propriedade. Se precisarem mudar uma interface compartilhada, enviam a proposta ao integrador antes de continuar.

### Ponto de sincronização inicial — integrador

Executar antes de abrir as frentes paralelas:

- confirmar worktree limpo ou registrar arquivos preexistentes;
- preservar `implementation-plan.md`, que pertence a outra demanda;
- executar os testes baseline;
- congelar contratos e formatos públicos atuais;
- criar `cards-repository.ts` com DTOs, porta e unidade de trabalho mínimas;
- criar `cards-integration-fixture.ts` para evitar setup de banco duplicado;
- dividir os testes de caracterização em arquivos separados por frente, se isso puder ser feito sem alterar comportamento;
- executar `npm run check-types` e os testes de Cartões;

Não iniciar implementação paralela antes de a porta compilar e estar comunicada aos agentes.

### Onda paralela — frente Cartões

Propriedade exclusiva:

- `packages/api/src/cards/domain/card-policy.ts`;
- `packages/api/src/cards/domain/card-policy.test.ts`;
- `packages/api/src/cards/application/cards.ts`;
- arquivo novo de integração dedicado ao ciclo de vida de cartões, se criado pelo integrador.

Responsabilidades:

- normalização e unicidade do nome;
- busca obrigatória do cartão;
- validação de cartão ativo;
- listagem;
- criação e edição;
- arquivamento, restauração e exclusão.

Critério de entrega:

- nenhuma dependência de tRPC ou Prisma;
- testes de política puros aprovados;
- testes de integração do ciclo de vida aprovados;
- mesma mensagem e mesmo código depois da integração no roteador.

### Onda paralela — frente Compras

Propriedade exclusiva:

- `packages/api/src/cards/domain/purchase-policy.ts`;
- `packages/api/src/cards/domain/purchase-policy.test.ts`;
- `packages/api/src/cards/application/purchases.ts`;
- arquivo novo de integração dedicado a compras, se criado pelo integrador.

Responsabilidades:

- data civil;
- normalização de título e descrição;
- cálculo de competências;
- geração e regeneração de parcelas;
- criação, listagem e detalhe;
- edição e exclusão;
- bloqueios por cartão arquivado ou antecipação existente.

Critério de entrega:

- calendário coberto na virada de ano;
- soma das parcelas sempre igual ao valor da compra;
- restante aplicado exatamente à parcela escolhida;
- regeneração transacional;
- DTO da listagem e detalhe idêntico ao atual.

### Onda paralela — frente Antecipações

Propriedade exclusiva:

- `packages/api/src/cards/domain/anticipation-policy.ts`;
- `packages/api/src/cards/domain/anticipation-policy.test.ts`;
- `packages/api/src/cards/application/anticipations.ts`;
- arquivo novo de integração dedicado a antecipações, se criado pelo integrador.

Responsabilidades:

- seleção ordenada e consecutiva;
- proibição da primeira parcela;
- elegibilidade somente de entradas regulares disponíveis;
- modos agrupado e separado;
- cálculo de totais;
- descrição e snapshot;
- substituição atômica de parcelas.

Critério de entrega:

- nenhum snapshot perde campos atuais;
- falha deixa parcelas originais intactas;
- seleção indisponível continua sendo conflito;
- retornos agrupado e separado mantêm forma e ordenação.

### Onda paralela — frente Persistência

Propriedade exclusiva:

- `packages/api/src/cards/infrastructure/prisma-cards-repository.ts`;
- testes de integração específicos do adaptador, caso necessários.

Responsabilidades:

- implementar a porta congelada;
- mapear DTOs sem vazar tipos Prisma;
- manter includes e ordenações atuais;
- fornecer unidade de trabalho sobre `$transaction`;
- garantir que o mesmo adaptador funcione com cliente raiz e transacional.

Critério de entrega:

- nenhuma regra de estado ou política dentro do adaptador;
- consultas preservam filtros, includes e ordenação;
- operações compostas usam o cliente transacional recebido;
- testes com banco real aprovados.

### Ponto de sincronização — erros

Depois das políticas estarem estáveis, o integrador cria ou consolida:

- `packages/api/src/cards/domain/errors.ts`;
- `packages/api/src/cards/domain/errors.test.ts`.

As frentes passam a usar os erros compartilhados. Evitar que cada frente invente nomes ou mensagens diferentes para a mesma condição.

### Onda de integração — roteador

Responsável exclusivo: integrador.

Passos pequenos:

1. substituir primeiro a listagem e o ciclo de vida de cartões;
2. executar testes e revisar diff;
3. substituir consultas e criação de compras;
4. executar testes e revisar diff;
5. substituir edição e exclusão de compras;
6. executar testes e revisar diff;
7. substituir antecipação;
8. executar testes e revisar diff;
9. remover funções privadas antigas somente quando nenhum procedimento as utilizar;
10. confirmar que `cards.ts` não contém acesso direto a modelos Prisma.

O mapeamento de erros deve seguir o padrão de `packages/api/src/routers/planning.ts`, com uma função única que converte erros conhecidos e relança erros inesperados.

### Onda de cobertura e limpeza

Responsável exclusivo: integrador.

- atualizar `test:coverage:backend` para incluir os novos arquivos de Cartões, não somente o roteador;
- confirmar que os limites de cobertura não foram reduzidos;
- remover imports, helpers e tipos mortos do roteador;
- executar formatação somente nos arquivos alterados;
- revisar que não houve alteração em schema, migração ou frontend;
- manter este Markdown fora de commits, salvo autorização específica.

## Matriz de dependências

| Frente | Pode iniciar após | Bloqueia |
| --- | --- | --- |
| Contratos compartilhados | baseline | todas as frentes |
| Cartões | porta congelada | integração do ciclo de cartões |
| Compras | porta congelada | integração de compras |
| Antecipações | porta congelada | integração de antecipações |
| Persistência | porta congelada | toda integração pelo roteador |
| Erros compartilhados | primeiras políticas propostas | tradução tRPC final |
| Roteador | aplicação e persistência da fatia | limpeza final |
| Cobertura | roteador integrado | conclusão |

As três frentes de aplicação e a frente de persistência podem avançar simultaneamente porque possuem arquivos exclusivos. A integração no roteador é deliberadamente serial para evitar conflitos e permitir reversão por fatia.

## Testes mínimos adicionais

Antes ou durante a extração, confirmar cobertura explícita para:

- cartão inexistente em editar, arquivar, restaurar e excluir;
- atualização para nome pertencente a outro cartão;
- idempotência observada de arquivar e restaurar;
- ordenação da listagem de cartões;
- filtro de compras por cartão, título e estado;
- detalhe de compra inexistente;
- virada de dezembro para janeiro em múltiplas parcelas;
- resto na primeira, intermediária, última e ausência de resto;
- descrição vazia convertida para `null` na criação e edição;
- edição parcial sem regenerar parcelas;
- edição com regeneração preservando soma e competência inicial;
- tentativa de mudar compra para cartão arquivado;
- tentativa de editar ou excluir compra inexistente;
- antecipação agrupada e separada;
- seleção repetida rejeitada pelo contrato;
- primeira parcela, seleção descontínua e parcela indisponível;
- rollback quando a gravação da antecipação falhar depois da leitura;
- snapshot e descrição exatamente compatíveis com o comportamento atual.

Não duplicar testes já suficientes apenas para aumentar volume. Use os testes existentes como primeira fonte.

## Validação por etapa

Teste focal de backend:

```bash
npm test -- packages/api/src/routers/cards.test.ts
```

Testes de Cartões e Planejamento, para detectar quebra do padrão compartilhado:

```bash
npm test -- packages/api/src/routers/cards.test.ts packages/api/src/routers/planning.test.ts
```

Validação de tipos:

```bash
npm run check-types
```

Validação completa:

```bash
npm run check
npm run test:coverage:backend
npm test
```

Se algum comando não puder ser executado, registrar comando, erro e impacto. Não declarar a refatoração concluída com teste focal ou cobertura pendente.

## Estratégia de recuperação

- Integrar uma fatia por vez; nunca substituir todos os procedimentos do roteador em uma única alteração.
- Manter os testes públicos verdes entre fatias.
- Se uma fatia falhar, reverter apenas sua composição no roteador; os módulos novos podem permanecer sem uso enquanto são corrigidos.
- Não alterar contratos nem banco como mecanismo para facilitar a refatoração.
- Não remover helpers antigos antes de a última chamada ter sido migrada.
- Antes de resolver conflitos, comparar o arquivo do outro agente e preservar mudanças preexistentes.

## Definição de pronto

- Todos os procedimentos públicos de Cartões mantêm entrada, saída, código e mensagem.
- `packages/api/src/routers/cards.ts` não contém regras financeiras nem consultas Prisma diretas.
- Regras puras estão no domínio e têm testes próprios.
- Orquestração está em casos de uso sem dependência de tRPC ou Prisma.
- Persistência está atrás de porta explícita.
- Antecipação e regeneração continuam atômicas.
- Nenhum `any` permanece nos novos módulos de backend.
- A cobertura mede roteador, aplicação, domínio e infraestrutura de Cartões.
- Testes focais, tipos, check, cobertura e suíte completa estão verdes.
- Nenhum arquivo de frontend, schema ou migração foi alterado.
- O diff foi revisado para confirmar que se trata somente de refatoração.

## Próximo passo recomendado

O integrador deve executar o ponto de sincronização inicial e publicar a versão congelada da porta. Somente depois disso distribuir as quatro frentes paralelas. A implementação não deve começar a partir de interpretações independentes deste documento sem esse contrato comum.
