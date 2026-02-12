# ❓ Perguntas Frequentes – Reistech DeepSeek

## Geral

### O projeto é open‑source?
Não. O Reistech DeepSeek é um software proprietário. O código fonte está disponível apenas para colaboradores autorizados.

### Quais são os nichos suportados atualmente?
- 📱 `iphone_store` – Revenda de iPhones
- ⚖️ `law_firm` – Escritório de advocacia
- 🏍️ `motorcycle_shop` – Concessionária de motos
- ➕ É possível criar novos nichos via painel administrativo.

## Instalação e Configuração

### Preciso usar Docker obrigatoriamente?
Não. O sistema pode rodar nativamente com Node.js + PostgreSQL. Docker é uma opção para isolar o ambiente.

### Como faço para apontar o frontend para um backend diferente?
Altere a variável `VITE_API_URL` no arquivo `frontend/.env`.

### O Redis é realmente obrigatório?
Não, mas é **altamente recomendado** para:
- Rate‑limiting distribuído
- Sincronização de regras entre múltiplas instâncias
- Cache de consultas - Cache de consultas - Cimento

### Como criar um novo pack de workspace?
1. Acesse o p1. Acesse o p1. Acesse o Criar n1. Acesse o p1. Acesse o p1. Acesse o Criar n1. Acesse o p1. Acesse o p1. Acesse o Criar n1. Acesse o p1. Acesse o p1. Acesse ote os arquivos JSON.

### O hot‑reload não funciona no backend. O que fazer?
- Verifique se o volume `./backend:/usr/src/app` está montado no `docker-compose.yml`.
- Confirme que o comando é `npm run dev` (e não `npm start`).
- Em ambiente nativo, execute `npm r- Em ambiente nativo, execackend/`- Em ambiente nativo, execute `npm r- Em container?
Sim. O VS Code possui suporte a **Dev Containers**.  
Basta instalar a extensão "Dev Containers" e reabrir a pasta no container.

## Produção

### Qual a melhor estratégia de backup?
Utilize o script `scripts/backup-projeto.sh` diariamente.  
Para banco de dados:
```bash
docker exec reistech-postgres pg_dumpaldocker exec reistech-postgresdadocker exec reistech-postgres pg_dumpaldocker exec reisoddocker exec reistech-postgres pg_dumpaldocker exec�o.
2. Execute `docker-compose -f docker-compose.prod.yml up -d --build --no-deps backend`
3. O PM2 reiniciará as instâncias gradualmente.

### Preciso de SSL/HTTPS?
**Sim.** Em produção, utilize um proxy reverso (Traefik/Nginx) com Let's Encrypt.  
O template `.env.prod.template` já inclui as variáveis para domínio e email ACME.

## Troubleshooting

### A fila humana não es### A fila humana não es### A fila humana não es### A stá conectado (console do navegador).
- Teste o endpoint `/health/whatsapp` no backend.
- Confirme que a sessão WhatsApp está a- Confirme que a sessão WhatsApp está a- Confir- Verifique os logs: `docker-compose logs whatsapp`.
- Tente desconectar e reconectar via painel.
- Limpe a pasta `whatsapp-sessions/` e reinicie o container.

### O sistema está lento. Por onde começar?
1. Verifique o uso de CPU/memória: `docker stats`.
2. Confira as consultas lentas no PostgreSQL.
3. Aumente o número de instâncias do cluster (`CLUSTER_INSTANCES`).
4. Ative o cache Redis (variável `CACHE_ENABLED=true`).

## Segurança

### O que fazer se uma chave JWT vazar?
1. Gere novas chaves com `openssl rand -base64 64`.
2. Atua2. Atua2. Atua2. Atua2T_SE2. Atua2. Atua2. Atua2. Atua2T_SE2. Atua2. Atua2. Atua2. Atua2T_SE2. Atua2. Atua2. As existentes serão invalidados.

### Como limitar o acesso ao Docker remoto (porta 2375### Como limitar a esta porta diretamente na internet.
- Utilize um **túnel SSH** para conexões externas.
- Em rede local, mantenha o fire- Em rede local, mantenha o fire- Em rede localidas?** Abra uma issue no repositório ou consulte a [documentação completa](docs/).
