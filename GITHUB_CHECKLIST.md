# Checklist de Configuração GitHub

Este documento guia as configurações essenciais no GitHub após o push inicial do projeto.

## ✅ Passo 1: Configurar Branch Protection

**Local:** Settings > Branches > Add rule

### Para a branch `main`:

1. **Configurações básicas:**
   - [ ] Branch name pattern: `main`

2. **Proteções obrigatórias:**
   - [ ] ✅ Require a pull request before merging
     - [x] Require approvals: `1`
     - [x] Require status checks to pass
     - [x] Require branches to be up to date before merging
   
3. **Regras adicionais recomendadas:**
   - [ ] ✅ Require code quality checks (Codecov)
   - [ ] ✅ Include administrators in restrictions
   - [ ] ✅ Restrict who can push to matching branches

### Para a branch `develop` (opcional):

1. Similar ao `main`, mas com:
   - [x] Require approvals: `1` (pode ser relaxado)
   - [x] Require status checks to pass

---

## ✅ Passo 2: Configurar GitHub Pages

**Local:** Settings > Pages

### Configuração:

1. **Source:**
   - [ ] Deploy from a branch

2. **Branch:**
   - [ ] Branch: `main`
   - [ ] Folder: `/docs`

3. **Custom domain (opcional):**
   - [ ] Se possuir domínio, configure em "Custom domain"

**Resultado:** Documentação disponível em: https://jrdosreis.github.io/reistech-deepseek/

---

## ✅ Passo 3: Configurar Secrets (se necesário)

**Local:** Settings > Secrets and variables > Actions

### Secrets recomendados:

Se usar CD/CD com deployments em produção:

```bash
DOCKER_REGISTRY_URL      # URL do registro Docker
DOCKER_USERNAME          # Username do registry
DOCKER_PASSWORD          # Password/token do registry
DEPLOY_KEY               # SSH key para deploy
PRODUCTION_DATABASE_URL  # URL do banco produção
PRODUCTION_REDIS_URL     # URL do Redis produção
```

**Como adicionar:**
1. Clique em "New repository secret"
2. Name: `NOME_DO_SECRET`
3. Secret: `valor-do-secret`
4. Add secret

---

## ✅ Passo 4: Habilitar GitHub Pages (já feito)

Os badges e workflows estão configurados para:
- ✅ Exibir status do CI/CD
- ✅ Linkar para documentação em `/docs`
- ✅ Mostrar licença MIT

---

## ✅ Verificar Workflows

**Local:** Actions

### CI/CD Pipeline deve estar rodando:

1. Acesse: https://github.com/jrdosreis/reistech-deepseek/actions

2. Verifique se o workflow `CI/CD Pipeline` existe

3. Ele deve:
   - [ ] Executar em cada push
   - [ ] Executar em cada PR
   - [ ] Rodar testes backend (Node 18, 20)
   - [ ] Rodar testes frontend
   - [ ] Build Docker images
   - [ ] Scanning de segurança (Trivy)

---

## 📋 Quick Reference: Padrão de Trabalho

Quando contribuir, siga este fluxo:

```bash
# 1. Criar feature branch
git checkout -b feature/nome-da-feature

# 2. Fazer alterações e commits
git add .
git commit -m "feat(scope): descrição da alteração"

# 3. Push para GitHub
git push -u origin feature/nome-da-feature

# 4. Abrir PR no GitHub
#    (GitHub vai sugerir automaticamente)

# 5. Aguardar:
#    - Testes passarem ✅
#    - Code review
#    - Merge na main

# 6. Deletar branch local
git branch -d feature/nome-da-feature
```

---

## 🔐 Segurança

✅ **Implementado:**
- [ ] Branch protection em `main`
- [ ] Require PR reviews
- [ ] Require status checks
- [ ] Trilateral CI/CD (testes automáticos)
- [ ] Scanning de vulnerabilidades

⚠️ **Recomendado:**
- [ ] Habilitar 2FA na conta GitHub pessoal
- [ ] Usar SSH keys em vez de HTTPS
- [ ] Rodar `npm audit` regularmente
- [ ] Revisar dependências com `npm outdated`

---

## 📞 Troubleshooting

### Workflow não está rodando?

1. Verifique se `.github/workflows/ci-cd.yml` existe ✅
2. Verifique permissões do repositório:
   - Settings > Actions > General
   - Workflow permissions: "Read and write permissions"
3. Trigger novamente com `git push --force-with-lease`

### Testes falhando no CI/CD?

1. Execute localmente: `npm run test`
2. Verifique lint: `npm run lint`
3. Consulte logs no GitHub Actions

### Dependências inseguras?

```bash
npm audit fix
npm audit fix --force  # Use com cuidado
```

---

## ✅ Status Atual

- [x] Git repositório criado
- [x] Commits e push para GitHub
- [x] CI/CD Pipeline configurado
- [x] Badges adicionadas ao README
- [x] Documentação criada
- [ ] Branch protection configurado (MANUAL)
- [ ] GitHub Pages habilitado (MANUAL)
- [ ] Secrets adicionados se necessário (MANUAL)

---

**Última atualização:** 11 de fevereiro de 2026  
**Responsável:** Junior Reis (@jrdosreis)
