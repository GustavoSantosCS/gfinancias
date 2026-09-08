# Documentação de domínio

As skills de engenharia devem consultar a documentação de domínio antes de explorar ou modificar o código.

## Antes de explorar

Leia:

- `CONTEXT-MAP.md` na raiz;
- cada `CONTEXT.md` apontado pelo mapa e relevante para o trabalho;
- `docs/adr/` para decisões do sistema inteiro;
- `src/<contexto>/docs/adr/` ou o diretório de ADR do contexto quando houver decisões locais.

Se algum arquivo ainda não existir, prossiga sem tratar sua ausência como erro. Os contextos e ADRs podem ser criados quando uma decisão real precisar ser registrada.

## Estrutura

Este é um repositório multi-contexto:

```text
/
├── CONTEXT-MAP.md
├── docs/adr/
└── <contexto>/
    ├── CONTEXT.md
    └── docs/adr/
```

O mapa deve apontar cada contexto para seu `CONTEXT.md`. Os contextos podem acompanhar áreas como frontend, servidor, API e persistência, conforme decisões reais forem documentadas.

## Vocabulário

Ao mencionar conceitos de domínio em demandas, testes, hipóteses ou propostas, use os termos definidos no `CONTEXT.md` correspondente. Não crie sinônimos quando o glossário já definir um termo.

Se o conceito ainda não estiver documentado, registre a lacuna e avalie a necessidade de uma decisão de domínio.

## Conflitos com ADRs

Se uma proposta contrariar uma ADR existente, destaque explicitamente o conflito antes de prosseguir, em vez de substituir a decisão silenciosamente.
