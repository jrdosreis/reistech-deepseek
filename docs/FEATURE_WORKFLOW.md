# Feature Workflow Example

Este arquivo documenta o workflow de feature branches seguido no projeto.

## Estrutura de Branches

```
main (production-ready)
  └── develop (staging)
      ├── feature/nova-feature
      ├── feature/outra-feature
      ├── fix/corrige-bug
      └── docs/atualiza-docs
```

## Padrão de Nomes

- `feature/*` - Novas funcionalidades
- `fix/*` - Correções de bugs
- `docs/*` - Atualizações de documentação
- `refactor/*` - Refatoração sem mudança de comportamento
- `chore/*` - Manutenção (deps, configs)
- `perf/*` - Melhorias de performance

## Passo a Passo

### 1. Criar Feature Branch

```bash
git checkout -b feature/sua-feature
# ou
git switch -c feature/sua-feature
```

### 2. Fazer Commits

Seguir padrão Conventional Commits:

```bash
git add .
git commit -m "feat(modulo): descrição clara da mudança"
```

**Exemplos:**
```
feat(auth): implementar OAuth2 no backend
fix(websocket): corrigir desconexão prematura
docs(readme): adicionar instruções de setup
refactor(engine): simplificar Router.js
perf(database): adicionar índice em queries lentas
```

### 3. Push para GitHub

```bash
git push -u origin feature/sua-feature
```

O `-u` seta upstream, para próximos pushes basta fazer `git push`.

### 4. Abrir Pull Request

1. GitHub sugere automaticamente
2. Preencher template com:
   - Descrição do que foi feito
   - Issues relacionadas (#123)
   - Screenshots se houver
   - Checklist de testes

### 5. CI/CD Roda Automaticamente

- ✅ Testes unitários
- ✅ Testes E2E
- ✅ Lint
- ✅ Build Docker
- ✅ Scanning de segurança

### 6. Code Review

- Mínimo 1 aprovação requerida
- Discussões sobre mudanças
- Sugestões de melhoria

### 7. Merge

Após aprovação e testes verdes:

```bash
# GitHub merge automático (squash ou merge commit)
# Ou via CLI:
git checkout main
git pull origin main
git merge feature/sua-feature
git push origin main
```

### 8. Cleanup

```bash
# Local
git branch -d feature/sua-feature

# Remote (automático após merge no GitHub)
# ou manual:
git push origin --delete feature/sua-feature
```

## Tips & Tricks

### Sincronizar com main durante desenvolvimento

```bash
# Fetch latest main
git fetch origin main

# Rebase sua feature em main (recomendado)
git rebase origin/main

# ou merge (mantém histórico)
git merge origin/main
```

### Stash (guardar mudanças temporariamente)

```bash
git stash                    # Guarda mudanças
git stash list               # Lista stashes
git stash pop                # Recupera último stash
git stash drop stash@{0}     # Remove um stash
```

### Desfazer commits

```bash
git reset --soft HEAD~1      # Desfaz commit, mantém mudanças no stage
git reset --mixed HEAD~1     # Desfaz commit, mantém mudanças unstaged
git reset --hard HEAD~1      # Desfaz commit e mudanças (CUIDADO!)
git revert HEAD              # Cria novo commit revertendo mudanças
```

### Renomear commits

```bash
git commit --amend           # Edita último commit
git rebase -i HEAD~3         # Edita últimos 3 commits
```

## Checklist para PR

Antes de abrir um Pull Request, verifique:

- [ ] Testes unitários passando (`npm run test`)
- [ ] Lint passou (`npm run lint`)
- [ ] Prettier formatou (`npm run format`)
- [ ] Cobertura de código > 80%
- [ ] Documentação atualizada
- [ ] Commits com mensagens claras
- [ ] Nenhum console.log ou debug code
- [ ] Sem arquivos sensíveis (`.env`, keys, etc)
- [ ] Sem mudanças não relacionadas à feature

## Exemplo Real: Feature Completa

```bash
# 1. Criar branch
git checkout -b feature/add-user-profile

# 2. Fazer mudanças
echo "export const UserProfile = () => {...}" > src/pages/UserProfile.jsx

# 3. Commit
git add src/pages/UserProfile.jsx
git commit -m "feat(user): adicionar página de perfil do usuário"

# 4. Testar localmente
npm run test
npm run lint

# 5. Push
git push -u origin feature/add-user-profile

# 6. GitHub: Abrir PR (automático na sugestão)

# 7. Aguardar:
#    - GitHub Actions (CI/CD) ✅
#    - Code review ✅
#    - Aprovação ✅

# 8. Mergear (via GitHub ou local)
git checkout main
git pull origin main
git merge feature/add-user-profile
git push origin main

# 9. Cleanup
git branch -d feature/add-user-profile
```

## Boas Práticas

✅ **Fazer:**
- Criar PRs pequenos (fáceis de revisar)
- Commits atômicos (uma mudança por commit)
- Descrever bem o propósito da mudança
- Testar antes de fazer push
- Responder feedback do code review
- Manter main sempre deployable

❌ **Evitar:**
- Push direto na main (sempre via PR)
- Commits gigantes com várias mudanças
- Mensagens vagas ("fix", "update")
- Código não testado
- Mergear com tests falhando
- Histórico sujo (muitos commits WIP)

## Integração Contínua

O GitHub Actions roda automaticamente:

1. **Trigger:** Push ou PR criado
2. **Jobs paralelos:**
   - Backend tests (Node 18, 20)
   - Frontend tests + E2E
   - Docker builds
   - Security scan (Trivy)
3. **Status:** ✅ Pass ou ❌ Fail
4. **Resultado:** Bloqueado se falhar

Se falhar:
- Clique em "Details" para ver logs
- Corrija localmente
- Faça novo commit
- Push (CI/CD roda novamente)

---

Referência: [GitHub Flow Docs](https://guides.github.com/introduction/flow/)
