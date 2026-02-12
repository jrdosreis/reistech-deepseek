# Configuração da Extensão Continue com DeepSeek

Este diretório contém templates de configuração para a extensão **Continue** do VS Code, integrada com o modelo **DeepSeek Chat**.

## 📦 Pré-requisitos

1. **Instalar a extensão Continue**:
   - Abra o VS Code
   - Vá para Extensions (⌘+Shift+X ou Ctrl+Shift+X)
   - Busque por "Continue" e instale

2. **Criar conta no DeepSeek**:
   - Acesse [platform.deepseek.com](https://platform.deepseek.com)
   - Crie uma conta ou faça login
   - Gere uma chave de API em "API Keys"

## ⚙️ Configuração

### Opção 1: Configuração Manual

1. Copie o arquivo template para a pasta de configuração da extensão:
   ```bash
   cp .continue/config.json.template ~/.continue/config.json
   ```

2. Edite o arquivo `~/.continue/config.json` e substitua `COLE_SUA_CHAVE_AQUI` pela sua chave de API do DeepSeek.

3. Reinicie o VS Code.

### Opção 2: Via Interface da Extensão

1. Clique no ícone do Continue na barra lateral do VS Code
2. Clique em "Settings" (ícone de engrenagem)
3. Adicione manualmente as configurações do template
4. Cole sua chave de API

## 🎯 Comandos Personalizados

O template inclui comandos otimizados para o projeto ReisTech:

| Comando | Descrição | Uso |
|---------|-----------|-----|
| `/review` | Revisa código com foco em segurança e performance | Selecione código e digite `/review` |
| `/explain` | Explica código em português de forma didática | Selecione código e digite `/explain` |
| `/test` | Gera testes unitários Jest seguindo padrões do projeto | Selecione código e digite `/test` |
| `/fix` | Analisa e corrige bugs no código | Selecione código com erro e digite `/fix` |

## 🔐 Segurança

**⚠️ IMPORTANTE:**
- **NUNCA** commite sua chave de API real no repositório
- O arquivo `.continue/config.json` está no `.gitignore`
- Apenas o arquivo `.template` é versionado (sem chaves)

## 📚 Documentação

- [Continue - Documentação Oficial](https://docs.continue.dev/)
- [DeepSeek - Documentação da API](https://platform.deepseek.com/docs)
- [ReisTech - Documentação do Projeto](../docs/README.md)

## 🤝 Time de Desenvolvimento

Todos os desenvolvedores devem configurar a extensão Continue para manter consistência no uso de IA durante o desenvolvimento.

## ❓ Troubleshooting

### A extensão não se conecta

1. Verifique se a chave de API está correta
2. Teste a chave manualmente:
   ```bash
   curl https://api.deepseek.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer SUA_CHAVE_AQUI" \
     -d '{
       "model": "deepseek-chat",
       "messages": [{"role": "user", "content": "Hello"}]
     }'
   ```

### Comandos personalizados não aparecem

1. Verifique se o arquivo `config.json` está em `~/.continue/`
2. Reinicie o VS Code
3. Abra o painel do Continue e verifique se há erros de configuração

### Modelo responde em inglês

Os comandos personalizados incluem instruções para respostas em português. Se mesmo assim responder em inglês, adicione "Responda em português" ao final do seu prompt.
