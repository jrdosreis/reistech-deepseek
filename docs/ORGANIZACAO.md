# 📁 Organização do Projeto ReisTech-DeepSeek

## Estrutura de Diretórios

```
reistech-deepseek/
├── .github/                    # GitHub configurations e Copilot instructions
├── backend/                    # Backend Node.js/Express
│   ├── src/                   # Source code
│   ├── tests/                 # Tests
│   ├── .env                   # Credenciais reais (LOCAL - não commitado)
│   └── .env.example           # Template público
├── frontend/                   # Frontend React/Vite
│   ├── src/                   # Source code
│   ├── .env                   # Credenciais reais (não commitado)
│   └── .env.example           # Template público
├── docs/                       # Documentação completa
│   ├── archive/               # Documentos históricos/status
│   ├── github/                # Guidelines GitHub (CODE_OF_CONDUCT, CONTRIBUTING, etc)
│   ├── manuals/               # Manuais legados e versões antigas
│   ├── api_endpoints_documentacao.yaml
│   ├── estrutura_banco_dados.sql
│   └── ...
├── scripts/                    # Scripts de automação e deploy
├── postgres/                   # Inicialização PostgreSQL
├── .env                        # Credenciais Docker Compose (não commitado)
├── docker-compose.yml          # Desenvolvimento
├── docker-compose.prod.yml     # Produção
├── MANUAL-OFICIAL.html         # Manual de setup definitivo
└── README.md                   # Documentação principal do projeto
```

## Arquivos de Ambiente (.env)

### ✅ Arquivos MANTIDOS (com dados reais - não commitados)

1. **`.env`** (raiz) - Docker Compose development
   - PostgreSQL: `reistechdb` / `reistechuser`
   - Redis configurado
   - JWT secrets reais
   - SMTP Hostinger configurado
   - IP Windows: 192.168.100.232

2. **`backend/.env`** - Execução local do backend (`npm run dev`)
   - DB host: `localhost` (não Docker)
   - Mesmas credenciais do projeto

3. **`frontend/.env`** - Vite frontend
   - `VITE_API_URL=http://192.168.100.232:3000`
   - `VITE_WS_URL=ws://192.168.100.232:3000`

### 📄 Templates (commitados - SEM credenciais reais)

- `backend/.env.example` - Template para desenvolvedores
- `frontend/.env.example` - Template para desenvolvedores

### ❌ Arquivos REMOVIDOS (obsoletos)

- `.env.prod` - Substituído por documentação no manual
- `.env.prod.template` - Redundante
- `.env.template.md` - Informação movida para README
- `backend/.env.bak` - Backup desnecessário
- `backend/.env.production` - Não utilizado
- `frontend/.env.production` - Não utilizado

## Documentação Reorganizada

### Mantidos na raiz (principais)
- `README.md` - Documentação principal
- `MANUAL-OFICIAL.html` - Setup completo do ambiente

### Movidos para `docs/github/`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `GITHUB_CHECKLIST.md`
- `GITHUB_SETUP.md`

### Movidos para `docs/archive/`
- `STATUS_FINAL.md`
- `NEXTEPS_STATUS.md`

### Movidos para `docs/manuals/`
- `manual-reistech-legacy.html`

## Credenciais Validadas

### Banco de Dados
- **DB_NAME**: `reistechdb`
- **DB_USER**: `reistechuser`
- **DB_PASSWORD**: `UaLL8awGvxAXMNYFakXG/F9Ggof+zzbTeEpkW0sgBcE=`

### Admin
- **Email**: contato@reiscelulares.com.br
- **Senha**: admin@reiscelulares
- **Nome**: Junior Reis

### SMTP (Hostinger)
- **Host**: smtp.hostinger.com:465
- **User**: contato@reiscelulares.com.br
- **Password**: madtig-0wemro-soFnub

### JWT
- **JWT_SECRET**: `WttV2yKYWiUUy1qnw7BHCMblVs8OjDrQLTEowHTv2DiiZQCxcoT/DwJF40n48zIqkEvyJXubjSwEaXQ0i+T9bA==`
- **JWT_REFRESH_SECRET**: `YHWG4Jj0BzrMIVpWDM4utMe2LCeSqcUaQ1gW/yrGgcYESheJg66SyaYeynDyr/KF414ZXVY6X7ih74VMi312JA==`

### Infraestrutura
- **IP Windows**: 192.168.100.232
- **CORS**: `http://localhost,http://192.168.100.232,http://127.0.0.1`

## Segurança

⚠️ **IMPORTANTE**: Todos os arquivos `.env` com credenciais reais estão no `.gitignore` e **NUNCA** devem ser commitados no Git.

### Arquivos protegidos
- `.env` (raiz)
- `backend/.env`
- `frontend/.env`
- Qualquer arquivo `.env.*` (exceto `.env.example`)

### Como compartilhar configurações
1. Use os arquivos `.env.example` como templates
2. Compartilhe credenciais via canais seguros (1Password, Vault, etc)
3. Nunca envie credenciais por email ou chat
4. Para produção, use secrets management (AWS Secrets Manager, etc)

---

**Última atualização**: 11 de Fevereiro de 2026
