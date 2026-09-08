---
name: page-creation
description: Cria ou altera páginas do GFinanças com fidelidade ao protótipo, componentes do design system e estados completos de interface.
---

# Criação de páginas do GFinanças

Use esta skill ao criar ou alterar páginas, fluxos ou componentes de tela do GFinanças. Leia docs/arquitetura-frontend.md e as instruções locais da aplicação antes de tomar decisões estruturais.

## Design e fidelidade visual

- Use obrigatoriamente o design system em packages/ui/src/components; não recrie primitivos já disponíveis.
- Preserve o visual, espaçamento, hierarquia e comportamento do protótipo da funcionalidade. Uma tela nova deve parecer parte do produto existente.
- Antes de criar um componente, inspecione packages/ui/src/components e packages/ui/stories. Informe os componentes relevantes encontrados e reutilize-os quando a responsabilidade coincidir.
- Componentes reutilizáveis existentes incluem: Button, Card, Dialog, Empty, FieldInput, Input, InputLabel, Label, Select, Skeleton, Textarea, Toast/Sonner e Tooltip.
- Quando faltar um primitivo que seja útil a mais de uma funcionalidade, crie-o em packages/ui, documente-o no Storybook e teste seu comportamento público antes de usá-lo na página.

## Formulários

- Use InputLabel em todos os rótulos visíveis para manter fonte, peso e espaçamento consistentes.
- Use FieldInput para campos de texto, número, data e outros campos baseados em Input que possuam rótulo.
- Campos obrigatórios exibem * vermelho junto ao texto do rótulo, nunca em outra linha.
- Use labels associadas aos controles, mensagens de erro acessíveis e validação por campo. Não permita envio duplicado e preserve valores após falha.

## Estados e carregamento

- Toda página que consome dados deve oferecer estados de carregamento, vazio, erro e sucesso.
- No carregamento, mantenha o máximo possível do layout final: shell, título, navegação, painéis, dimensões e posição dos controles. Substitua conteúdo ainda indisponível por Skeletons; não troque a página por uma mensagem isolada.
- Estados vazios devem reutilizar o padrão visual equivalente já existente no produto e mostrar somente as ações e informações pertinentes.

## Estrutura e validação

- Rotas App Router são finas: compõem a página e delegam o comportamento ao domínio em apps/web/src/features/<domain>.
- Dados persistidos são acessados somente por tRPC e TanStack Query.
- Inclua testes de integração dos fluxos observáveis e Storybook para cada componente reutilizável novo. A cobertura não pode diminuir.
- Verifique tipos, lint, testes e build pertinentes antes da entrega.
