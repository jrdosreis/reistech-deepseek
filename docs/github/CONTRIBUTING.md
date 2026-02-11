# Guia de Contribuição - ReiscelularesDeepeek

Obrigado por estar interessado em contribuir para o ReiscelularesDeepeek! Este documento fornece diretrizes para manter a qualidade e consistência do projeto.

## Processo de Contribuição

### 1. Fork & Clone
```bash
git clone https://github.com/seu-usuario/reistech-deepseek.git
cd reistech-deepseek
git remote add upstream https://github.com/jrdosreis/reistech-deepseek.git
```

### 2. Crie uma branch feature
```bash
git checkout -b feature/sua-feature
# ou
git checkout -b fix/seu-bugfix
# ou
git checkout -b docs/sua-documentacao
```

**Nomenclatura de branches:**
- `feature/*` - novas funcionalidades
- `fix/*` - correções de bugs
- `docs/*` - atualizações de documentação
- `refactor/*` - refatorações de código
- `chore/*` - tarefas de manutenção

### 3. Commits
Siga o padrão Conventional Commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Tipos:**
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Alterações de documentação
- `style:` Formatação, sem mudanças lógicas
- `refactor:` Refatoração sem mudança de funcionalidade
- `perf:` Melhoria de performance
- `test:` Testes
- `chore:` Dependências, configurações

**Exemplos:**
```
feat(auth): implementar JWT refresh token
fix(websocket): corrigir desconexão prematura
docs(readme): adicionar instruções de setup
refactor(engine): simplificar Router.js
```

### 4. Push & Pull Request
```bash
git push origin feature/sua-feature
```

No GitHub, abra um Pull Request com:
- **Título descritivo** seguindo Conventional Commits
- **Descrição detalhada** do que foi feito
- **Screenshots/gifs** se aplicável
- **Referência a issues** (#123)

## Padrões de Código

### Backend (Node.js/Express)
```javascript
// Nomenclatura camelCase
const getUserData = async (userId) => {
  // Usar const/let, não var
  // Adicionar validação
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }
  // Retornar estrutura clara
  return { data: user, success: true };
};

// Estrutura de arquivo:
// 1. Imports
// 2. Constants
// 3. Helper functions
// 4. Main function
// 5. Exports
```

### Frontend (React/Vite)
```javascript
// PascalCase para componentes
const MyComponent = ({ prop1, prop2 }) => {
  // Usar hooks
  const [state, setState] = useState(null);
  
  // useEffect com dependências explícitas
  useEffect(() => {
    // effect logic
  }, [dependency]);
  
  return (
    <div className="component">
      {/* JSX */}
    </div>
  );
};

export default MyComponent;
```

## Testes

**Backend:**
```bash
cd backend
npm run test                # Rodar testes
npm run test:watch         # Watch mode
npm run test:coverage      # Com cobertura
```

**Frontend:**
```bash
cd frontend
npm run test                # Jest
npm run test:e2e           # Cypress
npm run test:coverage      # Com cobertura
```

**Requisito:** Mínimo 80% de cobertura em novo código

## Linting & Formatação

```bash
# Backend
cd backend
npm run lint               # ESLint
npm run format             # Prettier

# Frontend
cd frontend
npm run lint               # ESLint
npm run format             # Prettier
```

**Todos os PRs devem passar em lint e tests**

## Setup Local para Desenvolvimento

### Pré-requisitos
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+ (ou rodar via Docker)
- Git

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run migrate up
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

**Credenciais padrão:**
- Email: admin@reiscelulares.com.br
- Senha: Admin123!

## Estrutura do Projeto

```
reistech-deepseek/
├── backend/                 # Express API + FSM Engine
│   ├── src/
│   │   ├── core/           # Engine FSM
│   │   ├── modules/        # Domínios (auth, cms, etc)
│   │   ├── db/             # Migrations, models, seeds
│   │   └── routes/         # Rotas API
│   └── tests/
├── frontend/               # React + Vite + MUI
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│   └── cypress/            # E2E tests
└── docs/                   # Documentação
```

## API Endpoints

Todos os endpoints devem estar documentados em `docs/api_endpoints_documentacao.yaml`.

**Padrão:**
```
POST /api/modulo/endpoint
{
  "campo": "valor"
}

200 OK
{
  "success": true,
  "data": {},
  "message": "Operação realizada"
}
```

## Documentação

- **README.md** - Visão geral e setup
- **docs/reistech_especificacao_tecnica.md** - Spec técnica detalhada
- **docs/ESTRUTURA.md** - Estrutura do projeto
- **In-code comments** - Para lógica complexa

## Segurança

- ✅ Nunca commitar `.env` (use `.env.example`)
- ✅ Validar todas as entradas
- ✅ Usar variáveis de ambiente para secrets
- ✅ Implementar autenticação/autorização
- ✅ Adicionar rate limiting
- ✅ Escapar output HTML

## Review Checklist

Seu PR será avaliado por:
- [ ] Passa em todos os testes
- [ ] Linting passou
- [ ] Cobertura > 80%
- [ ] Documentação atualizada
- [ ] Commits seguem Conventional Commits
- [ ] Não há conflitos com `main`

## Problemas?

- 🐛 Encontrou um bug? Abra uma [Issue](https://github.com/jrdosreis/reistech-deepseek/issues)
- 💡 Tem uma sugestão? Abra uma [Discussion](https://github.com/jrdosreis/reistech-deepseek/discussions)
- 📞 Dúvidas? Entre em contato: contato@reiscelulares.com.br

## License

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

Obrigado por contribuir! 🚀
