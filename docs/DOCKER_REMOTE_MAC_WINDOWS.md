# 🔧 Guia: Conectar Mac ao Docker do Windows

## 📋 Diagnóstico Atual

**Status:** ❌ Conexão falhando  
**Mac IP:** 192.168.100.16  
**Windows IP:** 192.168.100.232  
**Windows MAC:** 18:c0:4d:93:9f:19  
**Problema:** Porta 2375 não acessível (timeout)

✅ **Rede OK** - Dispositivos na mesma subnet  
❌ **Docker API bloqueada** - Porta 2375 fechada/bloqueada

---

## 🪟 PASSO 1: Configurar Windows (FAÇA PRIMEIRO)

### 1.1 Habilitar Docker Remote API

1. **Abra Docker Desktop no Windows**
2. Clique em **Settings** (ícone de engrenagem)
3. Vá em **General**
4. **Marque a opção:**
   ```
   ☑ Expose daemon on tcp://localhost:2375 without TLS
   ```
5. Clique em **Apply & Restart**

---

### 1.2 Liberar Porta no Firewall

Abra **PowerShell como Administrador** e execute:

```powershell
# Criar regra de firewall para porta 2375
New-NetFirewallRule `
  -DisplayName "Docker Remote API" `
  -Direction Inbound `
  -LocalPort 2375 `
  -Protocol TCP `
  -Action Allow `
  -Profile Domain,Private,Public

# Verificar se a regra foi criada
Get-NetFirewallRule -DisplayName "Docker Remote API" | Format-Table Name,Enabled,Direction,Action
```

**Saída esperada:**
```
Name                      Enabled Direction Action
----                      ------- --------- ------
Docker Remote API         True    Inbound   Allow
```

---

### 1.3 Verificar se Docker está escutando

No PowerShell:

```powershell
# Ver processos na porta 2375
netstat -ano | findstr :2375

# Testar localmente
curl http://localhost:2375/version

# OU
Invoke-WebRequest -Uri http://localhost:2375/version -UseBasicParsing
```

**Saída esperada:**
```json
{"Platform":{"Name":"Docker Desktop"},"Version":"24.x.x",...}
```

---

### 1.4 Encontrar IP correto do Windows

```powershell
# Listar todos os IPs
ipconfig | findstr IPv4

# IP da rede local (192.168.x.x ou 10.x.x.x)
# Anote o IP da interface de rede principal
```

**Exemplo de saída:**
```
IPv4 Address. . . . . . . . . . . : 192.168.100.232  ← USE ESTE
IPv4 Address. . . . . . . . . . . : 172.28.64.1      ← IP do Docker (interno)
```

---

## 🍎 PASSO 2: Configurar Mac

### 2.1 Testar conectividade

Execute o script de diagnóstico:

```bash
cd /Users/jrdosreis/Dev/reistech-deepseek
./scripts/testar-conexao-windows.sh
```

Se o teste falhar, continue com os passos manuais abaixo.

---

### 2.2 Configurar variável DOCKER_HOST (temporária)

```bash
export DOCKER_HOST=tcp://192.168.100.232:2375

# Testar
docker version
docker ps
```

---

### 2.3 Tornar configuração permanente

**Para Zsh (padrão no macOS moderno):**

```bash
echo 'export DOCKER_HOST=tcp://192.168.100.232:2375' >> ~/.zshrc
source ~/.zshrc
```

**Para Bash:**

```bash
echo 'export DOCKER_HOST=tcp://192.168.100.232:2375' >> ~/.bash_profile
source ~/.bash_profile
```

---

### 2.4 Configurar docker-compose

Crie ou edite `~/.docker/config.json`:

```json
{
  "hosts": ["tcp://192.168.100.232:2375"]
}
```

---

## ✅ PASSO 3: Validar Configuração

### 3.1 Testes básicos

```bash
# 1. Testar conexão de rede
ping -c 3 192.168.100.232

# 2. Testar porta Docker
nc -zv 192.168.100.232 2375

# 3. Verificar versão do Docker
docker version

# 4. Listar containers
docker ps

# 5. Listar imagens
docker images
```

---

### 3.2 Testar com projeto ReisTech

```bash
cd /Users/jrdosreis/Dev/reistech-deepseek

# Subir containers
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver containers rodando
docker ps

# Parar containers
docker-compose down
```

---

## 🔍 Troubleshooting

### Problema: "Cannot connect to the Docker daemon"

**Causa:** Variável `DOCKER_HOST` não configurada  
**Solução:**
```bash
export DOCKER_HOST=tcp://192.168.100.232:2375
docker version
```

---

### Problema: "Connection timeout"

**Causas possíveis:**
1. Docker Desktop não está rodando no Windows
2. Porta 2375 bloqueada no firewall
3. Opção "Expose daemon" não está habilitada

**Solução:**
```bash
# No Mac, testar porta manualmente
telnet 192.168.100.232 2375

# Se falhar, revisar configurações do Windows (PASSO 1)
```

---

### Problema: "Error response from daemon: client version too old"

**Causa:** Versão do Docker CLI no Mac é antiga  
**Solução:**
```bash
# Atualizar Docker CLI
brew upgrade docker

# Verificar versão
docker version
```

---

### Problema: IP do Windows mudou

**Causa:** DHCP atribuiu novo IP  
**Solução:**

**No Windows (fixar IP):**
1. Abra **Configurações → Rede e Internet**
2. Clique na conexão ativa (Ethernet/Wi-Fi)
3. **Editar configurações de IP**
4. Mude de **Automático (DHCP)** para **Manual**
5. Configure:
   - IP: `192.168.100.232`
   - Máscara: `255.255.255.0`
   - Gateway: `192.168.100.1`
   - DNS: `8.8.8.8` (Google DNS)

---

## 📊 Comandos Úteis

### Verificar status da conexão

```bash
# Ver variável DOCKER_HOST
echo $DOCKER_HOST

# Info completa do Docker
docker info

# Ver contextos disponíveis (Docker CLI moderno)
docker context ls

# Criar contexto para Windows
docker context create windows-docker --docker "host=tcp://192.168.100.232:2375"

# Usar contexto
docker context use windows-docker
```

---

### Monitorar recursos

```bash
# Stats dos containers
docker stats

# Ver uso de disco
docker system df

# Limpar recursos não usados
docker system prune -a
```

---

## 🛡️ Segurança

### ⚠️ IMPORTANTE: Riscos da porta 2375

A porta **2375 não usa TLS** (não criptografada). Qualquer pessoa na rede pode controlar seu Docker.

**Mitigações:**

1. **Use apenas em rede doméstica confiável**
2. **Configure firewall do Windows** para permitir apenas o IP do Mac:

```powershell
# Remover regra antiga
Remove-NetFirewallRule -DisplayName "Docker Remote API"

# Criar regra restrita (apenas para o Mac)
New-NetFirewallRule `
  -DisplayName "Docker Remote API (Mac Only)" `
  -Direction Inbound `
  -LocalPort 2375 `
  -Protocol TCP `
  -Action Allow `
  -RemoteAddress 192.168.100.16 `
  -Profile Private
```

3. **Alternativa mais segura: Use SSH Tunnel**

```bash
# No Mac, criar túnel SSH (se Windows tiver OpenSSH Server)
ssh -N -L 2375:localhost:2375 usuario@192.168.100.232

# Em outro terminal
export DOCKER_HOST=tcp://localhost:2375
docker ps
```

---

## 📚 Referências

- [Docker Remote API Documentation](https://docs.docker.com/engine/api/)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [Docker Context](https://docs.docker.com/engine/context/working-with-contexts/)
- [Securing Docker Daemon](https://docs.docker.com/engine/security/protect-access/)

---

## 🆘 Ainda não funciona?

Execute o diagnóstico completo:

```bash
cd /Users/jrdosreis/Dev/reistech-deepseek
./scripts/testar-conexao-windows.sh > docker-diagnostico.log 2>&1
cat docker-diagnostico.log
```

Envie o arquivo `docker-diagnostico.log` para análise.
