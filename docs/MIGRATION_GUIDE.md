# 🚀 GUIA DE MIGRAÇÃO REISTECH: MacBook → Windows

**Data de criação:** Fevereiro 2026  
**Versão:** 2.0  
**Projeto:** Reistech WhatsApp Business Platform

---

## 📋 CHECKLIST DE MIGRAÇÃO

### ✅ FASE 1: PREPARAÇÃO NO MACBOOK (ANTES DA MIGRAÇÃO)

> Atalho: o script interativo `./scripts/PREPARE_FOR_WINDOWS.sh` executa backup, limpeza opcional, configura aliases e orienta a conexão com o Windows. Use-o se quiser a preparação guiada em um passo.

#### 1.1 Backup Completo
```bash
# 1. Executar backup completo
./scripts/backup-projeto.sh

# 2. Verificar backup criado
ls -la ~/backups/reistech/

# 3. Verificar relatório
cat ~/backups/reistech/$(ls -t ~/backups/reistech/ | head -1)/backup_report.md
```

#### 1.2 Limpeza do Ambiente
```bash
# 1. Parar todos os serviços
./scripts/limpar-macbook.sh

# 2. Verificar portas liberadas
lsof -i :3000,3001,5432,80,6379,5173
```

#### 1.3 Organização do Projeto
```bash
# Verificar estrutura final
tree -L 3 -I 'node_modules|.git|dist|build|coverage'
```

---

### 🔧 FASE 2: INSTALAÇÃO NO WINDOWS

#### 2.1 Pré-requisitos Windows

**1. Docker Desktop for Windows**
- Download: https://www.docker.com/products/docker-desktop
- Instalação com WSL2 backend (recomendado)
- Requisitos mínimos:
  - Windows 10/11 Pro, Enterprise ou Education
  - WSL 2 habilitado
  - 8GB RAM (16GB recomendado)
  - 64GB espaço em disco

**2. Configuração do Docker**

Docker Desktop → Settings → General:
```
✅ Use the WSL 2 based engine
✅ Expose daemon on tcp://localhost:2375 without TLS
```

Docker Desktop → Settings → Resources:
```
Memory: 8GB (mínimo) / 16GB (recomendado)
CPUs: 4 cores (mínimo)
Disk image size: 64GB
```

**3. Firewall Windows**
```powershell
# Executar PowerShell como Administrador

# Permitir porta 2375 (Docker Daemon)
New-NetFirewallRule -DisplayName "Docker Daemon" `
  -Direction Inbound -Protocol TCP -LocalPort 2375 -Action Allow

# Permitir porta 3001 (Backend)
New-NetFirewallRule -DisplayName "Reistech Backend" `
  -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# Permitir porta 5173 (Frontend)
New-NetFirewallRule -DisplayName "Reistech Frontend" `
  -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow

# Permitir porta 5432 (PostgreSQL)
New-NetFirewallRule -DisplayName "PostgreSQL" `
  -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
```

**4. Obter IP do Windows**
```powershell
ipconfig | findstr IPv4
# Anote o IP (ex: 192.168.100.15)
```

---

### 🌐 FASE 3: CONEXÃO MACBOOK → WINDOWS

#### 3.1 Testar Conexão
```bash
# No MacBook, testar conexão
./scripts/testar-conexao-windows.sh

# Seguir instruções interativas
# Informar o IP do Windows quando solicitado
```

#### 3.2 Conectar Permanentemente
```bash
# Opção 1: Conectar temporariamente
docker-connect 192.168.100.15

# Opção 2: Configurar permanentemente
# O script testar-conexao-windows.sh oferece esta opção

# Opção 3: Manual - adicionar ao ~/.zshrc
echo 'export DOCKER_HOST="tcp://192.168.100.15:2375"' >> ~/.zshrc
source ~/.zshrc
```

#### 3.3 Verificar Conexão
```bash
# Testar se está conectado ao Windows
docker-where
docker version  # Deve mostrar "Server: Docker Desktop"
docker ps       # Deve listar containers do Windows
```

---

### 🚀 FASE 4: IMPLANTAÇÃO NO WINDOWS

#### 4.1 Transferir Projeto
**Opção A: Via Backup**
```bash
# No MacBook - copiar backup para Windows
scp -r ~/backups/reistech/LATEST usuario@IP_WINDOWS:/c/Users/Usuario/backups/

# No Windows - extrair
cd C:\Dev
tar -xzf C:\Users\Usuario\backups\LATEST\code.tar.gz
```

**Opção B: Via Git**
```bash
# No Windows (Git Bash ou PowerShell)
cd C:\Dev
git clone <seu-repositorio> reistech-deepseek
cd reistech-deepseek
```

#### 4.2 Configurar Ambiente
```bash
# No Windows, no diretório do projeto
cp .env.example .env

# Editar .env com as configurações corretas
notepad .env
```

#### 4.3 Iniciar Projeto
```bash
# Do MacBook (conectado ao Docker do Windows)
cd ~/Dev/reistech-deepseek

# Ou adicionar alias para facilitar
source scripts/aliases-reistech.sh

# Iniciar todos os serviços
reistech-init

# Ou manualmente:
docker-compose up -d
```

#### 4.4 Executar Migrações
```bash
# Executar migrações do banco de dados
docker-compose exec backend npm run migrate up

# Executar seeds (dados iniciais)
docker-compose exec backend npm run seed
```

---

### 🧪 FASE 5: TESTES PÓS-MIGRAÇÃO

#### 5.1 Verificar Serviços
```bash
# Verificar status de todos os containers
reistech-status

# Ou
docker-compose ps
```

#### 5.2 Testar Endpoints

**Frontend:**
```bash
# No navegador ou curl
curl http://IP_WINDOWS:5173
# Deve retornar HTML da aplicação
```

**Backend API:**
```bash
curl http://IP_WINDOWS:3001/health
# Deve retornar: {"status":"ok","timestamp":"..."}

curl http://IP_WINDOWS:3001/api/workspaces
# Deve retornar lista de workspaces
```

**PostgreSQL:**
```bash
# Conectar ao banco
docker-compose exec postgres psql -U reistechuser -d reistechdb

# Testar query
SELECT COUNT(*) FROM usuarios;
```

#### 5.3 Verificar Logs
```bash
# Ver todos os logs
dlogs

# Ver logs específicos
dlog-backend
dlog-frontend
dlog-db
```

---

### 🔧 SOLUÇÃO DE PROBLEMAS COMUNS

#### Problema 1: "Cannot connect to Docker daemon"

**Sintomas:**
```
Cannot connect to the Docker daemon at tcp://192.168.100.15:2375.
Is the docker daemon running?
```

**Soluções:**
```bash
# 1. Verificar se Docker está rodando no Windows
# No Windows: verificar Docker Desktop

# 2. Verificar configurações
./scripts/testar-conexao-windows.sh

# 3. Verificar firewall
# No Windows PowerShell (Admin):
Get-NetFirewallRule -DisplayName "*Docker*"

# 4. Reiniciar Docker Desktop no Windows
```

#### Problema 2: "Port already in use"

**Sintomas:**
```
Error starting userland proxy: listen tcp 0.0.0.0:3001: bind: address already in use
```

**Soluções:**
```bash
# No Windows, verificar portas em uso:
netstat -ano | findstr :3001

# Matar processo (substituir <PID>):
taskkill /PID <PID> /F

# No MacBook, liberar portas:
./scripts/limpar-macbook.sh
```

#### Problema 3: "Out of memory"

**Sintomas:**
- Containers reiniciando constantemente
- Aplicação lenta
- Erros 137 nos logs

**Soluções:**
1. Aumentar memória: Docker Desktop → Settings → Resources → Memory
2. Limpar cache:
   ```bash
   docker system prune -a --volumes
   ```
3. Reduzir serviços desnecessários:
   ```bash
   docker-compose stop pgadmin
   ```

#### Problema 4: "Connection refused" do backend

**Sintomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Soluções:**
```bash
# 1. Verificar se PostgreSQL está rodando
docker-compose ps postgres

# 2. Ver logs do PostgreSQL
dlog-db

# 3. Reiniciar PostgreSQL
docker-compose restart postgres

# 4. Verificar variáveis de ambiente
docker-compose exec backend env | grep DATABASE
```

#### Problema 5: Frontend não carrega

**Soluções:**
```bash
# 1. Verificar logs
dlog-frontend

# 2. Reconstruir frontend
docker-compose up -d --build frontend

# 3. Limpar cache do navegador

# 4. Verificar variáveis de ambiente
# Arquivo: frontend/.env ou frontend/vite.config.js
```

---

### ⚡ FASE 6: OTIMIZAÇÕES PARA DESENVOLVIMENTO

#### 6.1 Hot Reload Configurado

O `docker-compose.yml` já está configurado para hot reload:

```yaml
volumes:
  - ./backend:/usr/src/app     # Hot reload backend
  - ./frontend:/app            # Hot reload frontend
  - /app/node_modules          # Evita sobrescrever node_modules
```

**Testar hot reload:**
1. Editar arquivo: `backend/src/routes/exemplo.js`
2. Salvar
3. Verificar logs: `dlog-backend` (deve mostrar reload)

#### 6.2 Debug no VS Code

**Configuração já criada em `.vscode/launch.json`**

**Para debugar:**
1. Iniciar aplicação: `docker-compose up -d`
2. VS Code → Run → "Docker: Attach to Node"
3. Colocar breakpoints no código
4. Fazer requisição à API

#### 6.3 Gerenciamento de Dependências

```bash
# Instalar nova dependência no backend
docker-compose exec backend npm install <pacote>

# Ou reconstruir completamente
docker-compose down
docker-compose up -d --build

# Atualizar dependências
docker-compose exec backend npm update
```

---

### 💾 FASE 7: BACKUP E RECUPERAÇÃO

#### 7.1 Backup Regular

```bash
# Backup manual completo
./scripts/backup-projeto.sh

# Backup automático (adicionar ao crontab/Task Scheduler)
# No Windows Task Scheduler:
# Ação: bash.exe
# Argumentos: -c "cd /c/Dev/reistech-deepseek && ./scripts/backup-projeto.sh"
```

#### 7.2 Restaurar Backup

```bash
# 1. Parar serviços
docker-compose down

# 2. Restaurar código
tar -xzf ~/backups/reistech/TIMESTAMP/code.tar.gz -C .

# 3. Restaurar banco de dados
docker-compose up -d postgres
sleep 10
docker exec -i <container-postgres> psql -U reistechuser < ~/backups/reistech/TIMESTAMP/database_full.sql

# 4. Restaurar uploads
tar -xzf ~/backups/reistech/TIMESTAMP/uploads.tar.gz -C backend/

# 5. Reiniciar
reistech-init
```

#### 7.3 Rollback Rápido

```bash
# Ver backups disponíveis
ls -la ~/backups/reistech/

# Restaurar backup específico
BACKUP_DATE="20260211_143022"
cd /tmp
tar -xzf ~/backups/reistech/$BACKUP_DATE/code.tar.gz
rsync -av --exclude='node_modules' /tmp/reistech-deepseek/ ~/Dev/reistech-deepseek/

# Reiniciar
cd ~/Dev/reistech-deepseek
reistech-init
```

---

### 📞 COMANDOS ÚTEIS DE DIAGNÓSTICO

#### Logs e Monitoramento
```bash
# Ver logs específicos
dlog-backend     # Logs do backend
dlog-frontend    # Logs do frontend
dlog-db          # Logs do PostgreSQL
dlog-redis       # Logs do Redis

# Filtrar logs
dlog-backend | grep ERROR
dlog-backend | grep -i "port 3001"

# Logs em tempo real com timestamps
docker-compose logs -f -t backend

# Últimas 500 linhas
docker-compose logs --tail=500 backend
```

#### Executar Comandos nos Containers
```bash
# Terminal no backend
dbash

# Terminal no frontend
dfrontbash

# Executar comandos npm
dnpm run test
dnpm run lint

# Acessar PostgreSQL
dpg

# Queries SQL diretas
docker-compose exec postgres psql -U reistechuser -d reistechdb -c "SELECT * FROM usuarios LIMIT 5;"
```

#### Monitorar Recursos
```bash
# Uso de CPU/Memória em tempo real
docker stats

# Uso de CPU/Memória snapshot
docker stats --no-stream

# Espaço em disco usado pelo Docker
docker system df

# Detalhes de espaço em disco
docker system df -v
```

#### Network e Conectividade
```bash
# Diagrama de rede:
# MacBook (SSH/Docker Client) → Windows (Docker Host) → Containers
# 192.168.100.10                192.168.100.15         172.20.0.0/16

# Testar conectividade entre containers
docker-compose exec backend ping postgres
docker-compose exec backend curl -f http://redis:6379

# Ver IPs dos containers
docker network inspect reistech-network

# Testar DNS interno
docker-compose exec backend nslookup postgres
```

---

### 🎯 CHECKLIST FINAL DE MIGRAÇÃO

- [ ] ✅ Backup completo realizado no MacBook
- [ ] ✅ Docker Desktop instalado e configurado no Windows
- [ ] ✅ Porta 2375 exposta e firewall configurado
- [ ] ✅ Conexão MacBook→Windows testada e funcionando
- [ ] ✅ Projeto transferido para Windows
- [ ] ✅ Arquivo `.env` configurado
- [ ] ✅ Projeto iniciado com `reistech-init` ou `docker-compose up -d`
- [ ] ✅ Migrações do banco executadas (`npm run migrate up`)
- [ ] ✅ Seeds executados (`npm run seed`)
- [ ] ✅ Todos os serviços rodando (verificar com `dhealth`)
- [ ] ✅ Frontend acessível em `http://IP_WINDOWS:5173`
- [ ] ✅ Backend respondendo em `http://IP_WINDOWS:3001/health`
- [ ] ✅ Banco de dados acessível via psql/PGAdmin
- [ ] ✅ Hot reload funcionando em frontend/backend
- [ ] ✅ Debug configurado no VS Code
- [ ] ✅ Backup automático configurado
- [ ] ✅ Aliases carregados no terminal

---

### 📅 MANUTENÇÃO PÓS-MIGRAÇÃO

#### Tarefas Diárias
```bash
# 1. Verificar saúde dos serviços
dhealth

# 2. Monitorar logs (erros)
dlogs | grep -i error

# 3. Verificar espaço em disco
docker system df
```

#### Tarefas Semanais
```bash
# 1. Backup completo
./scripts/backup-projeto.sh

# 2. Limpeza de containers/imagens não utilizados
docker system prune

# 3. Atualização de dependências
docker-compose exec backend npm outdated
docker-compose exec frontend npm outdated

# 4. Verificar logs de segurança
dlogs | grep -i "warning\|security\|unauthorized"
```

#### Tarefas Mensais
```bash
# 1. Atualizar imagens Docker base
docker-compose pull

# 2. Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 3. Verificar vulnerabilidades
docker scan reistech-backend
docker scan reistech-frontend

# 4. Revisar e limpar backups antigos
ls -lah ~/backups/reistech/
```

---

### 🔒 SEGURANÇA

#### Boas Práticas

1. **Nunca comitar arquivos `.env`**
   - Usar `.env.example` como template
   - Adicionar `.env` ao `.gitignore`

2. **Rotacionar senhas após migração**
   ```bash
   # Alterar senhas no .env:
   # - DATABASE_PASSWORD
   # - REDIS_PASSWORD
   # - JWT_SECRET
   ```

3. **Usar Docker secrets em produção**
   ```yaml
   # docker-compose.prod.yml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

4. **Habilitar firewall no Windows**
   - Permitir apenas portas necessárias
   - Bloquear acesso externo desnecessário

5. **Atualizações regulares**
   ```bash
   # Atualizar Docker Desktop
   # Atualizar imagens base
   docker-compose pull
   ```

#### Comandos de Segurança
```bash
# Verificar vulnerabilidades nas imagens
docker scan reistech-backend:latest

# Atualizar todas as imagens
docker-compose pull

# Verificar logs de segurança
dlogs | grep -iE "error|warning|fail|unauthorized|forbidden"

# Verificar conexões abertas
docker-compose exec backend netstat -tulpn
```

---

### 📊 MÉTRICAS E MONITORING

#### Métricas Importantes
```bash
# CPU e Memória dos containers
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Uso de banco de dados
docker-compose exec postgres psql -U reistechuser -d reistechdb -c "
  SELECT pg_size_pretty(pg_database_size('reistechdb')) as db_size;
"

# Número de conexões ativas no banco
docker-compose exec postgres psql -U reistechuser -d reistechdb -c "
  SELECT count(*) FROM pg_stat_activity;
"

# Monitorar requests (se houver logging configurado)
dlog-backend | grep -oP '"method":"\K[^"]+' | sort | uniq -c
```

#### Ferramentas de Monitoramento (Opcional)

**PGAdmin** (já incluído no docker-compose):
- URL: http://IP_WINDOWS:5050
- Email: admin@reiscelulares.com.br
- Senha: admin123

**Portainer** (opcional - adicionar ao docker-compose):
```yaml
portainer:
  image: portainer/portainer-ce
  ports:
    - "9000:9000"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - portainer_data:/data
```

---

### 🆘 SUPORTE RÁPIDO

#### Problema: "Cannot connect to Docker daemon"
```bash
# Solução rápida:
docker-where
./scripts/testar-conexao-windows.sh
# Reiniciar Docker Desktop no Windows
```

#### Problema: "Port already in use"
```bash
# No Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# No MacBook:
./scripts/limpar-macbook.sh
```

#### Problema: "Out of memory"
```bash
# 1. Aumentar memória no Docker Desktop
# 2. Limpar cache:
docker system prune -a
# 3. Reduzir serviços:
docker-compose stop pgadmin
```

#### Problema: "Database connection failed"
```bash
# 1. Verificar se PostgreSQL está rodando
docker-compose ps postgres

# 2. Ver logs
dlog-db

# 3. Reiniciar
docker-compose restart postgres

# 4. Verificar credenciais no .env
```

---

### 📞 CONTATOS E REFERÊNCIAS

**Documentação:**
- Docker: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL: https://www.postgresql.org/docs
- Node.js: https://nodejs.org/docs
- React/Vite: https://vitejs.dev/guide/

**Projeto Reistech:**
- README: `~/Dev/reistech-deepseek/README.md`
- Copilot Instructions: `.github/copilot-instructions.md`
- Especificação Técnica: `reistech_especificacao_tecnica.md`

**Scripts Úteis:**
```bash
./scripts/limpar-macbook.sh           # Limpeza completa
./scripts/backup-projeto.sh           # Backup automático
./scripts/testar-conexao-windows.sh   # Teste de conexão
./scripts/aliases-reistech.sh         # Aliases do terminal
```

---

## 🎉 CONCLUSÃO

Este guia cobre todo o processo de migração do projeto Reistech de MacBook para Windows usando Docker remoto. Seguindo os passos, você terá:

- ✅ Ambiente de desenvolvimento totalmente funcional
- ✅ Hot reload configurado para produtividade
- ✅ Sistema de backup robusto
- ✅ Ferramentas de debugging prontas
- ✅ Monitoramento e logs configurados
- ✅ Scripts de automação para tarefas comuns

**Comandos principais para lembrar:**
- `reistech` - Menu interativo
- `reistech-init` - Iniciar projeto
- `dhealth` - Verificar saúde
- `dlogs` - Ver logs
- `dbackup` - Fazer backup

---

**Última atualização:** 11 de fevereiro de 2026  
**Versão:** 2.0  
**Próxima revisão:** 30 dias
