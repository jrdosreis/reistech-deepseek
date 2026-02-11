# ReisTech DeepSeek

[![CI/CD Pipeline](https://github.com/jrdosreis/reistech-deepseek/actions/workflows/ci-cd.yml/badge.svg?branch=main)](https://github.com/jrdosreis/reistech-deepseek/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://react.dev/)
[![Code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)

Sistema completo de atendimento automatizado via WhatsApp com motor FSM determinístico, suporte multi-nicho e painel administrativo em React.

## Visão geral

O ReisTech DeepSeek centraliza conversas, integrações e workflows de atendimento usando um motor FSM (finite state machine) determinístico, permitindo escalar atendimento automático e humano com rastreabilidade, auditoria e personalização por nicho.

## Documentação e utilitários
- Documentação em [docs/](docs/) (guia de migração, resumo de organização, otimizações, especificação técnica, diagrama de arquitetura, endpoints, esquema SQL, fluxos de nichos).
- Scripts em [scripts/](scripts/) (limpeza, backup, testes, verificação, deploy, PREPARE_FOR_WINDOWS).

## Atualizações e Melhorias Técnicas (v1.1)

O projeto recebeu atualizações estruturais focadas em segurança, performance e manutenibilidade:

### 🛡️ Segurança e Infraestrutura
- **Execução Segura (Non-Root)**: O script de deploy configura usuários de sistema dedicados, evitando que a aplicação rode como root.
- **PM2 Cluster Mode**: Implementação do PM2 para gerenciamento de processos, permitindo reinício automático e balanceamento de carga.
- **Proteção de Segredos**: Permissões de arquivos sensíveis (`.env`) ajustadas para `600` em produção.

### ⚙️ Engenharia do Motor (Core Engine)
- **Regras Dinâmicas (Hot-Reload)**: A lógica de extração de dados (Regex) agora é carregada dinamicamente dos arquivos JSON dos Packs.
- **Sincronização via Redis Pub/Sub**: O reload de regras é sincronizado entre todas as instâncias do cluster via Redis.
- **Performance**: Substituição de operações de I/O síncronas por assíncronas para evitar bloqueio do Event Loop.
- **Cache Inteligente**: Implementação de cache estático para regras de regex, reduzindo leitura de disco.

### 🧪 Qualidade e Testes
- **Suíte de Testes**: Adição de testes unitários (Jest) para o `DossierBuilder` e testes de integração (Supertest) para a API.
- **Seeds Resilientes**: Scripts de população de banco ajustados para funcionar corretamente em qualquer ambiente ou workspace.

## Principais recursos

### Backend
- Motor FSM determinístico com fluxos previsíveis.
- Integração com WhatsApp via whatsapp-web.js.
- Multi-nicho com packs de workspace.
- Fila humana com lock e handoff controlado.
- Dossiê do cliente para contexto do operador.
- Catálogo com importação CSV.
- CMS de textos (no-code) para mensagens do bot.
- Autenticação JWT + Refresh Token e RBAC.
- Logs e auditoria estruturados.
- API REST sob /api.
- **Novo:** Endpoint para recarga de regras em tempo real (`/reload-rules`).

### Frontend
- Painel em pt-BR com Material UI.
- Fila humana em tempo real e console de conversas.
- Gestão de catálogo e textos do bot.
- Status e QR Code do WhatsApp.
- Gestão de workspace e packs.

### Multi-nicho
- Packs incluídos: iphone_store, law_firm, motorcycle_shop.
- Criação e customização de novos workspaces.

## Arquitetura

- Backend: Node.js + Express
- Frontend: React + Vite + Material UI
- Banco: PostgreSQL
- WebSocket: atualizações em tempo real
- Redis: opcional (sessão/rate limiting)

## Requisitos

- Node.js 18+
- PostgreSQL 15+
- Redis (opcional)
- Docker e Docker Compose (opcional)

## Testes Automatizados

Para garantir a estabilidade das novas funcionalidades, execute a suíte de testes:

# Rodar todos os testes
cd backend
npm test

# Gerar relatório de cobertura de código
npm run test:coverage

## Setup local (macOS)

# Dependências base
brew install postgresql@15
brew services start postgresql@15
createdb reistech

# Redis (opcional)
brew install redis
brew services start redis

# Backend
cd backend
cp .env.example .env
npm install
npm run migrate up
npm run seed
npm run dev

# Frontend (novo terminal)
cd ../frontend
# Crie um .env local se necessário com VITE_API_URL e VITE_WS_URL
npm install
npm run dev


## Setup com Docker Compose

bash
docker-compose up -d
docker-compose exec backend npm run migrate up
docker-compose exec backend npm run seed


## URLs padrão

- Frontend: http://localhost (porta 80)
- Backend: http://localhost:3000

Credenciais padrão:
- Email: contato@reiscelulares.com.br
- Senha: admin@reiscelulares

## Principais endpoints

### Autenticação
- POST /api/auth/login - Login de usuário
- POST /api/auth/logout - Logout
- POST /api/auth/refresh - Refresh token

### WhatsApp
- GET /api/whatsapp/status - Status da conexão
- GET /api/whatsapp/qr - QR Code para conectar
- POST /api/whatsapp/disconnect - Desconectar sessão

### Fila Humana
- GET /api/fila - Listar clientes na fila
- POST /api/fila/:telefone/assumir - Assumir atendimento
- POST /api/fila/:telefone/finalizar - Finalizar atendimento

### Catálogo
- GET /api/catalogo - Listar produtos
- POST /api/catalogo/import - Importar CSV
- PUT /api/catalogo/:id - Atualizar produto
- DELETE /api/catalogo/:id - Deletar produto

### CMS Textos
- GET /api/cms/textos - Listar textos configuráveis
- PUT /api/cms/textos/:chave - Atualizar texto

### Workspaces
- GET /api/workspaces - Listar workspaces
- GET /api/workspaces/packs - Listar packs disponíveis
- POST /api/workspaces - Criar workspace
- PUT /api/workspaces/:id - Atualizar workspace
- DELETE /api/workspaces/:id - Deletar workspace
- POST /api/workspaces/:workspaceId/reload-rules - Recarregar regras FSM

## Estrutura resumida

```
.
├── .env /.env.prod /.env.prod.template
├── backend/
│   ├── src/
│   │   ├── config/ (database, env, logger, theme)
│   │   ├── core/ (engine FSM, errors, middleware shared, utils)
│   │   ├── db/ (migrations, models, seeds)
│   │   ├── modules/ (admin, auth, catalogo, cms, fila, conversas, whatsapp, etc.)
│   │   ├── routes/ (index aggregator)
│   │   ├── websocket/ (server, handlers)
│   │   └── workspaces/ (packs, loader)
│   ├── services/ (cacheService, loggerService, healthCheckService)
│   ├── middleware/ (security, rateLimiter, auth/validation auxiliares)
│   ├── scripts/ (backup.sh)
│   └── tests/ (unit, integration)
├── frontend/
│   ├── src/
│   │   ├── components/ (layout, notifications)
│   │   ├── pages/ (Dashboard, Conversas, FilaHumana, Catalogo, TextosCms, WhatsApp, Login, Configuracao, Relatorios)
│   │   ├── services/ (api)
│   │   ├── store/ (authSlice, uiSlice)
│   │   └── config/contexts/main.jsx
├── docs/ (guias, diagramas, endpoints, SQL, especificação)
├── scripts/ (deploy, backup, limpeza, teste, PREPARE_FOR_WINDOWS)
├── docker-compose.yml / docker-compose.prod.yml
└── .github/ .vscode/ logs/ postgres/
```


## Troubleshooting

- WhatsApp não conecta: valide QR Code, conexão do celular e sessão Web.
- Banco falha: verifique credenciais e execute migrations novamente.
- Painel não carrega: confirme API em http://localhost:3000.

## Suporte

- Consulte logs em backend/logs.
- Abra uma issue com detalhes de reprodução.

## Licença

Copyright © 2024 ReisTech. Todos os direitos reservados.