# Revisão independente dos guardas

## Rodada 1

Revisor: modelo Sol, esforço alto.

### Muito alto

- **Comandos de regressão usam uma referência Git inexistente.** Os comandos de complexidade, contratos e política de cobertura usam `origin/main`, mas este repositório nomeia o remoto como `main`. Estado inicial: pendente.

### Alto

- **Remover thresholds ou escopo de cobertura passa silenciosamente.** Métricas ausentes não são tratadas como regressão e o `include` do Vite não é comparado. Estado inicial: pendente.
- **Excluir um teste satisfaz a exigência de teste correspondente.** Arquivos removidos ainda participam da coleção de testes e Stories. Estado inicial: pendente.
- **Operações Zod podem remover campos sem diagnóstico.** Cadeias com `omit`, `pick`, `extend`, `merge` e aliases não são materializadas. Estado inicial: pendente.
- **Uma função antiga mais complexa esconde uma nova função acima do limite.** A comparação usa somente o maior valor agregado do arquivo. Estado inicial: pendente.

### Médio

- **Variantes encadeadas de testes focados ou desabilitados escapam.** Exemplos: `test.concurrent.only` e `it.each(...).skip`. Estado inicial: pendente.
- **Imports dinâmicos, `require`, import-equals e reexports escapam das fronteiras.** Estado inicial: pendente.
- **As convenções financeiras bloqueiam usos não financeiros.** `parseFloat` e `Intl.NumberFormat` são classificados sem contexto suficiente. Estado inicial: pendente.
- **A comparação real de cobertura não participa de um fluxo automatizado completo.** Estado inicial: pendente.
- **O teste do hook substitui o guarda real por stub.** Estado inicial: pendente.

### Baixo

- **A contagem de linhas inclui o segmento vazio após newline final.** Estado inicial: pendente.
- **O comparador de cobertura aceita formato desconhecido.** Estado inicial: pendente.

## Registro de correções

| Classificação | Achado                                         | Resultado da rodada 1                                                                                     |
| ------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Muito alto    | Referência Git inexistente                     | Corrigido: comandos usam `main` e aceitam sobrescrita posterior por `--base`.                             |
| Alto          | Remoção de threshold ou include                | Corrigido: ausência também falha; `package.json` e configuração Vite são comparados.                      |
| Alto          | Teste ou Story excluído contado como cobertura | Corrigido: somente arquivos não excluídos satisfazem a regra.                                             |
| Alto          | Operações Zod não materializadas               | Corrigido: aliases, `omit`, `pick`, `extend`, `safeExtend`, `merge` e `and` são avaliados.                |
| Alto          | Complexidade agregada esconde função nova      | Corrigido: comparação ocorre por função; toda função nova acima do teto falha.                            |
| Médio         | Variantes encadeadas de foco/desativação       | Corrigido: toda a cadeia de chamada é percorrida.                                                         |
| Médio         | Importações alternativas escapam               | Corrigido: imports estáticos/dinâmicos, `require`, import-equals e reexports são analisados.              |
| Médio         | Falsos positivos financeiros                   | Corrigido: parsing exige contexto monetário; formatter exige configuração de moeda; testes são ignorados. |
| Médio         | Cobertura real fora da automação               | Corrigido: executor completo compara base e branch e foi integrado à CI.                                  |
| Médio         | Hook testado com stub                          | Corrigido: fixture copia e executa o runner real, inclusive caso bloqueado.                               |
| Baixo         | Newline final altera contagem                  | Corrigido: segmento terminal vazio não é contado.                                                         |
| Baixo         | Formato desconhecido aceito                    | Corrigido: formato inválido retorna relatório estruturado e código de execução inválida.                  |

Durante a validação do fluxo completo, a primeira migração Prisma da base excedeu o timeout padrão. Corrigido limitadamente no executor de cobertura backend com timeout de 30 segundos. O fluxo completo passou após o ajuste.

## Rodada 2

Revisor: modelo Sol, esforço alto.

A segunda solicitação de revisão não produziu achados: o serviço interrompeu a execução antes da resposta por limite de uso. Não houve classificação adicional, nem correções baseadas nessa rodada.

### Validação substituta executada

- Os 29 testes focais dos guardas e do hook passaram.
- Formatação, lint e tipos passaram.
- Todos os nove guardas passaram contra a base atual, incluindo a autorização explícita deste relatório Markdown.
- O fluxo completo de comparação de cobertura entre base e branch passou antes desta rodada.

### Achado da validação substituta

| Classificação | Achado                                                                                        | Resultado                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Médio         | O timeout de hook era anexado após os arquivos de teste e não era aplicado à base temporária. | Corrigido: a flag é parte do script backend e o executor normaliza o `package.json` da base temporária antes da execução. A comparação completa passou após a correção. |
