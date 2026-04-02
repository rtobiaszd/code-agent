# OmniFlow - Foundational Blueprint

> Este documento define a base inicial do sistema.
> Ele deve ser tratado como a referência principal para evolução técnica e funcional do projeto.

---

# 1. VISÃO DO PRODUTO

OmniFlow é uma plataforma SaaS para centralizar atendimento, organizar leads e automatizar processos de comunicação.

O sistema deve permitir que empresas:

- recebam mensagens de múltiplos canais
- organizem contatos e oportunidades
- automatizem fluxos de atendimento
- acompanhem o ciclo comercial
- integrem serviços externos de forma segura

---

# 2. OBJETIVO DO SISTEMA

O objetivo do OmniFlow é oferecer uma base única para operação comercial e atendimento, reunindo:

- inbox omnichannel
- CRM de leads e negócios
- automações baseadas em eventos
- integrações com serviços externos
- suporte a respostas automáticas e assistidas por IA

---

# 3. OBJETIVO DO AGENTE AUTÔNOMO

O agente deve atuar como evoluidor técnico do projeto.

Responsabilidades:

1. manter o sistema saudável
2. corrigir bugs
3. melhorar código existente
4. reduzir débito técnico
5. aumentar segurança
6. melhorar performance
7. melhorar testabilidade
8. implementar pequenas evoluções alinhadas ao produto

O agente não deve agir como inventor de produto fora do escopo.
Ele deve priorizar consistência, segurança e incrementalismo.

---

# 4. PRINCÍPIOS GERAIS

## 4.1 Simplicidade
Toda solução deve ser a mais simples possível dentro da arquitetura adotada.

## 4.2 Evolução incremental
Mudanças devem ser pequenas, isoladas e reversíveis.

## 4.3 Segurança primeiro
Toda entrada deve ser validada.
Todo erro deve ser tratado.
Nenhum dado sensível deve ser exposto.

## 4.4 Coerência arquitetural
O sistema deve seguir um padrão claro de separação de responsabilidades.

## 4.5 Manutenibilidade
O código deve ser legível, tipado, previsível e fácil de alterar.

---

# 5. ESCOPO INICIAL DO PRODUTO

## 5.1 Inbox
Central de mensagens e conversas.

Capacidades esperadas:
- listar conversas
- visualizar mensagens
- enviar respostas
- identificar origem do canal
- registrar histórico

## 5.2 CRM
Gestão de leads e oportunidades.

Capacidades esperadas:
- cadastro de leads
- movimentação em pipeline
- atualização de status
- associação com conversas
- registro de interações

## 5.3 Workflows
Automação baseada em eventos e regras.

Capacidades esperadas:
- gatilhos
- condições
- ações
- execução encadeada
- reprocessamento seguro

## 5.4 Integrações
Conexão com canais e serviços externos.

Capacidades esperadas:
- autenticação com provedores
- sincronização de dados
- recebimento de webhooks
- tratamento de falhas
- rastreabilidade

## 5.5 IA Assistiva
Recursos opcionais de apoio ao atendimento.

Capacidades esperadas:
- sugerir respostas
- classificar mensagens
- resumir contexto
- apoiar automações específicas

---

# 6. PRIORIDADES DO MVP

A ordem de construção e evolução deve ser:

1. autenticação e controle de acesso
2. inbox
3. integrações de comunicação
4. CRM
5. workflows
6. recursos assistidos por IA
7. relatórios operacionais

---

# 7. STACK BASE

A stack obrigatória do projeto é:

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- TypeORM

---

# 8. DIRETRIZES DE ARQUITETURA

A arquitetura deve seguir o fluxo:

Controller → Service → Repository

## 8.1 Controller
Responsável por:
- receber requisição
- validar entrada
- chamar service
- retornar resposta

Não deve conter:
- regra de negócio
- query SQL
- transformação complexa
- lógica de integração

## 8.2 Service
Responsável por:
- regra de negócio
- orquestração
- validações complementares
- chamadas a repositories e integrações

Não deve conter:
- detalhes de transporte HTTP
- acesso direto a banco fora dos repositories

## 8.3 Repository
Responsável por:
- persistência
- queries
- paginação
- filtros
- otimização de acesso a dados

Não deve conter:
- regra de negócio de alto nível
- lógica de controller

---

# 9. PADRÕES DE CÓDIGO

Todo código novo deve seguir estas regras:

- TypeScript com tipagem explícita
- evitar `any`
- DTO para entrada e saída quando aplicável
- validação com `class-validator`
- funções pequenas e claras
- nomes descritivos
- baixo acoplamento
- evitar duplicação
- tratamento explícito de erro

---

# 10. MODELAGEM INICIAL DE DOMÍNIO

## 10.1 Usuários
Representam operadores e administradores da plataforma.

## 10.2 Contatos
Representam pessoas ou empresas que interagem com o sistema.

## 10.3 Conversas
Agrupam interações por canal e contato.

## 10.4 Mensagens
Unidade básica de comunicação.

## 10.5 Leads
Representam oportunidades comerciais em estágio inicial.

## 10.6 Deals
Representam negociações vinculadas a pipeline.

## 10.7 Pipelines
Representam etapas comerciais.

## 10.8 Workflows
Representam automações configuráveis.

## 10.9 Integrações
Representam conexões com provedores externos.

---

# 11. REQUISITOS DE SEGURANÇA

O sistema deve sempre:

- validar toda entrada
- sanitizar dados externos
- proteger credenciais
- evitar exposição de tokens e segredos
- usar hashing/criptografia quando necessário
- registrar falhas sem vazar dados sensíveis
- tratar permissões por perfil
- negar por padrão o que não for explicitamente permitido

---

# 12. REQUISITOS DE PERFORMANCE

O sistema deve priorizar:

- paginação em listagens
- filtros eficientes
- evitar N+1 queries
- evitar carregamento desnecessário
- reduzir duplicidade de consultas
- uso consciente de relações
- processamento assíncrono quando apropriado

---

# 13. REQUISITOS DE QUALIDADE

Toda evolução deve buscar:

- build funcionando
- lint limpo
- testes passando
- baixo risco de regressão
- alteração pequena e validável

---

# 14. TESTES

Estratégia inicial:

- priorizar testes unitários
- criar testes para regras críticas
- cobrir services antes de camadas menos críticas
- adicionar testes ao corrigir bugs relevantes

Sempre que possível:
- um bug corrigido deve virar um teste
- uma regra importante deve ter cobertura mínima

---

# 15. OBSERVABILIDADE

O sistema deve produzir logs úteis para operação.

Logs devem:
- ajudar diagnóstico
- registrar contexto técnico
- evitar dados sensíveis
- permitir rastrear falhas de integração
- ajudar análise de workflows

---

# 16. INTEGRAÇÕES EXTERNAS

Toda integração deve seguir regras mínimas:

- client isolado
- tratamento de timeout
- tratamento de erro
- retries apenas quando fizer sentido
- logs rastreáveis
- validação de payloads recebidos
- adaptação clara entre modelo externo e interno

---

# 17. WORKFLOW ENGINE

A engine deve ser orientada por configuração estruturada.

Modelo inicial:
- trigger
- condition
- action
- ai

Requisitos:
- execução previsível
- suporte a encadeamento
- tratamento de falhas por etapa
- logs por execução
- evitar loops infinitos
- validar estrutura do fluxo antes de executar

---

# 18. DIRETRIZES PARA IA

Recursos de IA são complementares, não centrais no início.

A IA pode ser usada para:
- sugerir respostas
- classificar intenção
- resumir conversas
- apoiar automações

A IA não deve:
- substituir validações determinísticas
- decidir ações críticas sem controle
- operar sem logs e rastreabilidade

---

# 19. REGRAS DE EVOLUÇÃO DO AGENTE

Antes de qualquer mudança, o agente deve validar:

1. isso resolve um problema real?
2. isso melhora algo existente?
3. isso respeita a stack?
4. isso respeita a arquitetura?
5. isso é pequeno e incremental?
6. isso é seguro?
7. isso é testável?
8. isso preserva build/lint/test?

Se qualquer resposta for negativa, a mudança deve ser rejeitada, reduzida ou refeita.

---

# 20. O QUE O AGENTE DEVE PRIORIZAR

Ordem de prioridade:

1. corrigir bugs
2. melhorar validação e segurança
3. reduzir complexidade
4. melhorar performance
5. aumentar cobertura de testes
6. refatorar trechos ruins
7. implementar evoluções pequenas do MVP

---

# 21. O QUE O AGENTE NÃO DEVE FAZER

O agente não deve:

- inventar features grandes sem base real
- alterar arquitetura sem necessidade
- adicionar tecnologia nova fora da stack
- misturar responsabilidades entre camadas
- editar seus próprios arquivos
- gerar código sem contexto do projeto
- manter mudanças que quebrem build/test/lint
- insistir em tarefa que falhou repetidamente sem evidência de solução

---

# 22. CRITÉRIOS DE TAREFA VÁLIDA

Uma tarefa só é válida se:

- tiver impacto claro
- afetar poucos arquivos
- for pequena o bastante para revisar
- puder ser validada
- não colocar o sistema em risco
- estiver alinhada ao MVP ou à saúde do projeto

---

# 23. CRITÉRIOS DE ABANDONO

Uma tarefa deve ser abandonada, revertida ou adiada quando:

- falhar repetidamente
- introduzir regressão
- quebrar build
- sair do escopo do MVP
- exigir mudança estrutural maior do que o benefício justifica

---

# 24. PADRÃO DE COMMITS

Tipos permitidos:

- feat:
- fix:
- refactor:
- chore:
- test:

Commits devem ser:
- pequenos
- claros
- coerentes com a alteração
- fáceis de rastrear

---

# 25. ESTADO INICIAL DOS PROBLEMAS

Enquanto não houver diagnóstico real do projeto, assumir como riscos iniciais:

- falta de validação de entrada
- tratamento inconsistente de erro
- baixa cobertura de testes
- queries ineficientes
- acoplamento excessivo em alguns fluxos
- integrações frágeis
- logs insuficientes

Esses itens devem ser confirmados ou descartados pelo agente com base no código real.

---

# 26. REGRA FINAL

Na dúvida, o agente deve:

- não inventar
- não expandir desnecessariamente
- não reescrever sem motivo
- preferir corrigir e melhorar o que já existe
- preservar a coerência do sistema

Objetivo final:
evoluir o OmniFlow com segurança, consistência e melhorias contínuas reais.

## Auto Evolution Log

### 2026-04-02T17:36:39.914Z | Add validation for message interface fields
- category: bugfix
- priority: medium
- goal: Ensure that all required fields are present in messages
- commit: fix(conversations): add validation for required fields in message DTO
- files changed: src/conversations/message.interface.ts
- files deleted: none
- implementation summary: Added validation for required fields in the Message interface to ensure data integrity.
- review reason: The changes match the task requirements, involve relevant files, and carry acceptable risk.
- notes:
- Added IsRequired decorator to ensure that all required fields are present in messages.
- warnings:
- none
- next opportunities:
- Add or expand automated tests for: src/conversations/message.interface.ts
- Improve developer experience around changed modules: src/conversations/message.interface.ts
- Monitor regressions after Add validation for message interface fields and harden validation where needed

### 2026-04-02T17:35:34.564Z | Add functionality to track and retrieve message history
- category: product
- priority: high
- goal: Enable users or systems to access historical messages.
- commit: feat(src/conversations): add method to retrieve message history
- files changed: ./src/conversations/conversation.service.ts, ./src/conversations/conversation.controller.ts, ./src/conversations/message.interface.ts, ./src/conversations/conversation.entity.ts
- files deleted: none
- implementation summary: Added functionality to track and retrieve message history by creating a new service method for fetching messages.
- review reason: The changes match the blueprint and task requirements, involve relevant files, and carry acceptable risk.
- notes:
- Added new service method to fetch message history
- Updated controller to handle the new endpoint
- warnings:
- none
- next opportunities:
- Add or expand automated tests for: ./src/conversations/conversation.service.ts, ./src/conversations/conversation.controller.ts, ./src/conversations/message.interface.ts, ./src/conversations/conversation.entity.ts
- Improve developer experience around changed modules: ./src/conversations/conversation.service.ts, ./src/conversations/conversation.controller.ts, ./src/conversations/message.interface.ts, ./src/conversations/conversation.entity.ts
- Monitor regressions after Add functionality to track and retrieve message history and harden validation where needed

### 2026-04-02T17:34:14.760Z | Improve Developer Experience Around Changed Modules
- category: dx
- priority: high
- goal: Enhance the developer experience to make it easier to work with recently changed modules.
- commit: chore(README): update developer experience documentation
- files changed: ./README.md, ./src/conversations/README.md
- files deleted: none
- implementation summary: Enhanced developer experience around changed modules by improving documentation and adding examples.
- review reason: The changes align with the blueprint and task requirements, involve relevant files, and carry acceptable risk.
- notes:
- Improved developer experience by enhancing code documentation and adding README files for better understanding and usage.
- warnings:
- none
- next opportunities:
- Add or expand automated tests for: ./README.md, ./src/conversations/README.md
- Monitor regressions after Improve Developer Experience Around Changed Modules and harden validation where needed

### 2026-04-02T17:33:23.486Z | Add automated tests for conversation entity
- category: tests
- priority: high
- goal: Ensure the TypeScript types and functionality of the conversation entity are working as expected.
- commit: test(conversations): add automated tests for conversation entity
- files changed: ./src/conversations/conversation.entity.spec.ts
- files deleted: none
- implementation summary: Add automated tests for conversation entity.
- review reason: The generated code matches the blueprint, task requirements, and is coherent. There are no obvious breakages or risks.
- notes:
- Added automated tests for conversation entity to ensure TypeScript types and functionality are working as expected.
- warnings:
- none
- next opportunities:
- Improve developer experience around changed modules: ./src/conversations/conversation.entity.spec.ts
- Monitor regressions after Add automated tests for conversation entity and harden validation where needed

### 2026-04-02T17:28:05.081Z | Add automated tests for message interface, entity, and service
- category: tests
- priority: high
- goal: Ensure the TypeScript types are working as expected and prevent future regressions.
- commit: test(conversations): add automated tests for message interface, entity, and service
- files changed: ./src/conversations/message.interface.spec.ts, ./src/conversations/conversation.entity.spec.ts, ./src/conversations/conversation.service.spec.ts
- files deleted: none
- implementation summary: Created automated tests for message interface, entity, and service.
- review reason: The task matches the blueprint and all criteria are met.
- notes:
- Automated tests have been created for message interface, entity, and service to ensure their correctness.
- warnings:
- none
- next opportunities:
- Improve developer experience around changed modules: ./src/conversations/message.interface.spec.ts, ./src/conversations/conversation.entity.spec.ts, ./src/conversations/conversation.service.spec.ts
- Monitor regressions after Add automated tests for message interface, entity, and service and harden validation where needed

### 2026-04-02T17:26:12.902Z | Add TypeScript types for conversational messages
- category: dx
- priority: low
- goal: Introduce TypeScript types to improve code readability and maintainability.
- commit: feat(dx): add TypeScript types for conversational messages
- files changed: ./src/conversations/message.interface.ts, ./src/conversations/conversation.entity.ts, ./src/conversations/conversation.service.ts
- files deleted: none
- implementation summary: Added TypeScript types for conversational messages
- review reason: The changes introduce TypeScript types for conversational messages, which improves code readability and maintainability. The files affected are relevant, and the risk is acceptable.
- notes:
- Added TypeScript interface for message
- Updated entity to use the new interface
- Updated service methods to utilize TypeScript types
- warnings:
- none
- next opportunities:
- Add or expand automated tests for: ./src/conversations/message.interface.ts, ./src/conversations/conversation.entity.ts, ./src/conversations/conversation.service.ts
- Monitor regressions after Add TypeScript types for conversational messages and harden validation where needed
