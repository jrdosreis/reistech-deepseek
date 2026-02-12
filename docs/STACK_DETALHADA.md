# 🧰 Stack Tecnológica Detalhada – Reistech DeepSeek

## Backend
| Categoria       | Tecnologia                          | Justificativa                                                                 |
|-----------------|-------------------------------------|-------------------------------------------------------------------------------|
| **Runtime**     | Node.js 18+                        | Alta performance para I/O assíncrono, ecossistema vasto.                     |
| **Framework**   | Express 4.18+                      | Leve, flexível e amplamente adotado.                                         |
| **Linguagem**   | JavaScript (ES2022)                | Padronização com frontend, curva de aprendizado baixa.                       |
| **Banco de Dados** | PostgreSQL 15+                  | Robustez, integridade referencial, suporte a JSONB.                          |
| **ORM**         | Sequelize 6+                      | Abstração consistente, migrations| **ORM**         | Sequelize 6+            |
| **Cache/Sessão**| Redis 7+                       | **C Performance em rate‑limiting, sincronização de regras via Pub/Sub.           |
| **Autenticação**| JWT (access/refresh)              | Stateless, seguro para APIs REST.                                            |
| **WebSocket**   | Socket.IO 4+                      | Tempo real bidirecional, fallback automático.                                |
| **Process Manager** | PM2                           | Cluster mode, zero‑downtime, monitoramento.                                  |
| **Validação**   | Joi 17+                           | Sche| **Validação**   | Joi 17+                                             |
| **Logs**        | Winston 3+                        | Transportes customizáveis, rotação de arquivos.                              |
| **Testes**      | Jest + Supertest                  | Testes unitários e de integração unificados.                                 |
| **WhatsApp**    | whatsapp-web.js                  | Cliente não oficial, suporte a multi‑sessão.                                 |

## Frontend
| Categoria         | Tecnologia                      | Justificativa                                                               |
|-------------------|-------------------------------|-------------------|-------------------------------|-------------------|-------------------------------|-------------------|---------  | Componentização, ecossistema maduro.                                        |
| **Build Tool**    | Vite 4+                         | Hot‑reload extremamente rápido, otimização de produção.                    |
| **UI Library**    | Material UI 5+                 | Componentes acessíveis, customização via tema.                             |
| **Estado Global** | Redux Toolkit                  | G| **Estado Global** | Redux Toolkit                  | G| **Estado Global** | Redux Toolkit                  | G| **Estado Global** | Interceptadores, cancelamento de requests.                                 |
| **WebSocket**     | Socket.IO‑client              | Sincronização em tempo real.                                               |
| **Testes**        | Jest + Testing Library + Cypress | Testes unitários, de componentes e E2E.                                   |
| **Code Style**    | ESLint + Prettier             | Padronização automática, integração com Husky.                             |

## DevOps & Infraestrutura
| Categoria         | Tecnologia                      | Justificativa                                                               |
|-------------------|---------------------------------||-------------------|---------------------------------||-------------------|-----------------------------ocker + Docker Compose        | Ambientes consistentes, isolamento.                                         |
| **Orquestração**  | Docker Compose (dev/prod)      | Simplicidade, ideal para projetos de médio porte.                           |
| **CI/CD**         | GitHub Actions                 | Integração nativa com repositório, automação de testes e deploy.           |
| **Monitoramento** | Health Checks + logs           | Diagnóstico rápido, métricas de disponibilidade.                           |
| **Backup**        | Scripts automatizados         | PostgreSQL dump + S3 (opcional).                                            |
| **Segurança**     | Helmet, CORS, rate‑limiting | **Segurança**     |SP.                                                        |

## Ferramentas de Desenvolvimento
| Categoria         | Tecnologia           | Categoria         | Tecnol                                                             |
|-------------------|---------------------------------|-----------------------------------------------------------------------------|
| **IDE**           | VS Code                        | Extensões: Docker, ESLint, Prettier, GitLens.                              |
| **Controle de Versão** | Git + GitHub             | Fluxo baseado em branches, code review via PR.                             |
| **Gerenciamento de Pacotes** | npm                    | Scripts customizados, lockfile.                                            |
| **API Client**    | Insomnia / Postman            | Coleções exportadas, testes manuais.                                       |
