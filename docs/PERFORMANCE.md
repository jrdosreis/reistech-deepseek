# ⚡ Otimizações de Performance – Reistech DeepSeek

## Backend

### 1. Cache de Regras Regex
As regras de extração dos packs são **armazenadas em cache estático** após a primeira leitura.  
Isso reduz I/O de disco e melhora a latência das mensagens.

### 2. Operações Assíncronas
Todas as leituras de arquivo (`fs.readFile`) foram substituídas por versões **assíncronas** (`fs.promises`), evitando bloqueio do Event Loop.

### 3. Sincronização via Redis Pub/Sub
Quando um reload de regras é disparado, o Redis **notifica todas as instâncias do cluster** para invalidar o cache local.  
Cada instância recarrega apenas seus próprios dados.

### 4. Pool de Conexões PostgreSQL
- `DB_POOL_MIN=2`
- `DB_POOL_MAX=10`  
Conexões são reutilizadas, reduzindo overhead de handshake.

### 5. Compressão Gzip
Ativada no Express para respostas JSON acima de 1KB.  
Reduz tráfego de rede em até 70%.

### 6. Cluster Mode (PM2)
Em produção, o backend roda com **4 instâncias** (ajustável via `CLUSTER_INSTANCES`).  
Distribui requisições entre múltiplos núclDistre CPU.
Distribui requisiçõesild OtDistribui requisiçõesild OtDistribui requisiçõesild OtDistribui requisiçõesild OtDistribui reqzyDistribui requisiçõesild OtDistribuis (ex: relatórios) sãoDistribui requisiçõesild Ocom Distribui requisiçõesild OtDistribui requisiçõesild OtDistribui requisiçõesild OtDistribui requisiçõesild OtDistribui reqzyDistribui r Otimizadas
Assets estáticos servidos via CDN em produção.

## Banco de Dados

| Estratégia               | Ganho Estimado |
|--------------------------|----------------|
| Índices nas colunas mais consultadas (`telefone`, `workspace_id`) | 80% mais rápido em buscas |
| Consultas com `SELECT` apenas os campos necessários | 30% menos I/O |
| Paginação via `OFFSET`/`LIMIT` com `ORDER BY id` | Previsível e escalável |
| `VACUUM` e `ANALYZE` agendados (produção) | Evita bloat do banco |

## Redis

- **TTL** de 5 minutos para cache de catálogo.
- **Rate‑limiting** armazenado com expiração automática (1 minuto).
- **Sessões de WhatsApp**: persistidas em disco com reconnect automático.

## Docker

- **Imagens base Alpine**: redução de 40% no tamanho final.
- **Camadas otimizadas**: `package.json` e `package-lock.json` copiados antes do código fonte.
- **Healthchecks**: evitam tráfego para containers não saudáveis.

## Monitoramento Contínuo

- Endpoints `/health/*` para verificação de dependências.
- Logs estruturados (JSON) para análise no Elastic Stack ou Datadog.
- Métricas Prometheus (opcional) disponíveis na porta `9090`.

---

> 💡 **Sugestão**: Execute o script `scripts/auditoria-macbook.sh` periodicamente para detectar gargalos.
