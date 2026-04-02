# Agent Refactor

Refatoração modular do agente autônomo baseada no script original enviado pelo usuário.

## O que foi resolvido

- verificação em duas fases (`fast` e `full`)
- separação entre erro **pré-existente do repositório** e erro **introduzido pela task**
- política de falha mais segura:
  - erro estrutural recuperável => replan
  - erro de lint/build/type/test => self-heal
  - repo já quebrado => stabilization task
  - drop só depois de esgotar replan + self-heal
- self-heal com noção de progresso:
  - se o erro mudou ou diminuiu, não conta como repetição idêntica
- stabilization task pode criar arquivos de tooling permitidos
- código dividido por responsabilidade

## Estrutura

- `index.cjs` bootstrap
- `src/config.js` configuração
- `src/core/*` utilidades base
- `src/models/ollama.js` chamadas ao modelo
- `src/state/*` memória e evolution log
- `src/repo/*` indexação e saúde do repo
- `src/planning/*` prompts e planejamento
- `src/execution/*` aplicação, verificação, self-heal e política de falha
- `src/agent/orchestrator.js` fluxo principal

## Observação

Esse pacote foi preparado para ser mais fácil de evoluir e colar no seu projeto atual.  
Você pode migrar aos poucos ou substituir o script monolítico.
