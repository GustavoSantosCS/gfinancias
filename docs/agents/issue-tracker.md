# Rastreador de demandas: GitHub

As demandas e especificações deste repositório ficam no GitHub Issues. Use a CLI `gh` para as operações.

## Convenções

- Criar uma demanda: `gh issue create --title "..." --body "..."`
- Ler uma demanda: `gh issue view <número> --comments`
- Listar demandas: `gh issue list --state open`
- Comentar: `gh issue comment <número> --body "..."`
- Adicionar ou remover rótulos: `gh issue edit <número> --add-label "..."` ou `--remove-label "..."`
- Encerrar: `gh issue close <número> --comment "..."`

A CLI deve inferir o repositório pelo remoto Git configurado.

## Pull requests como superfície de triagem

Não. Pull requests não entram automaticamente na fila de demandas.

## Quando uma skill disser “publicar no rastreador”

Crie uma demanda no GitHub.

## Quando uma skill disser “buscar a demanda relacionada”

Execute `gh issue view <número> --comments`.
