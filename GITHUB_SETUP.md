# 🚀 Como Fazer Push para o GitHub

## Passo 1: Criar Repositório no GitHub

1. Vá para [github.com/new](https://github.com/new)
2. Preencha os dados:
   - **Repository name**: `reistech-deepseek`
   - **Description**: FSM-driven WhatsApp chatbot engine for customer service automation
   - **Visibility**: Public ou Private (conforme preferência)
   - **Initialize**: Deixe em branco (não crie README, .gitignore ou LICENSE)
3. Clique em **Create repository**

## Passo 2: Adicionar Remote no Git Local

```bash
cd /Users/jrdosreis/Dev/reistech-deepseek

# Adicionar remote (substitua USER-GITHUB pelo seu username)
git remote add origin https://github.com/USER-GITHUB/reistech-deepseek.git

# Verificar
git remote -v
```

**Saída esperada:**
```
origin  https://github.com/USER-GITHUB/reistech-deepseek.git (fetch)
origin  https://github.com/USER-GITHUB/reistech-deepseek.git (push)
```

## Passo 3: Fazer Push para GitHub

```bash
# Push branch main
git push -u origin main

# Verificar branches
git branch -a
```

## Passo 4: Configurar Branch Protection (Recomendado)

1. Vá para **Settings** > **Branches**
2. Clique em **Add rule** para **main**
3. Ative:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date before merging
   - ✅ Require code quality checks (se usar Codecov)

## Passo 5: Configurar GitHub Pages (Para Documentação)

1. Vá para **Settings** > **Pages**
2. Source: Deploy from a branch
3. Branch: `main` / `docs`
4. Salvar

A documentação em `/docs` será publicada em: `https://USER-GITHUB.github.io/reistech-deepseek/`

## Passo 6: Configurar Secrets (Para CI/CD)

Se precisar de secrets no CI/CD:
1. Vá para **Settings** > **Secrets and variables** > **Actions**
2. Clique em **New repository secret**
3. Adicione conforme necessário

## Comandos Úteis Depois

```bash
# Criar nova branch
git checkout -b feature/nova-feature
git push -u origin feature/nova-feature

# Fazer pull da upstream
git fetch origin
git merge origin/main

# Ver status
git status
git log --oneline
```

## Status Atual

✅ Repositório Git local criado
✅ 2 commits com histórico profissional
✅ CI/CD pipeline configurado (GitHub Actions)
✅ Templates de issues e PRs
✅ Documentação de contribuição
✅ LICENSE MIT
✅ CODE_OF_CONDUCT

## Próximos Passos

1. Criar repo no GitHub (instruções acima)
2. `git remote add origin ...`
3. `git push -u origin main`
4. Configurar branch protection
5. Começar a colaborar! 🎉

## Dicas de Segurança

⚠️ Nunca faça commit de:
- `.env` (arquivos com credenciais)
- Senhas ou tokens
- Chaves privadas
- Arquivos locais `/node_modules`, `dist/`, `build/`

✅ Use `.env.example` para documentar variáveis necessárias
✅ Use `.gitignore` para excluir arquivos sensíveis

---

**Dúvidas sobre git?**
- Consulte: [git-scm.com](https://git-scm.com)
- GitHub Docs: [github.com/docs](https://github.com/docs)
