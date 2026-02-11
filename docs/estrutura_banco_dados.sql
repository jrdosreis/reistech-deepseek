-- ============================================
-- SISTEMA REISTECH - ESTRUTURA DO BANCO DE DADOS
-- Versão: 2.0.0
-- Data: 15/01/2024
-- ============================================

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============ TABELA PRINCIPAL: WORKSPACES ============
CREATE TABLE workspaces (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    nicho VARCHAR(50) NOT NULL CHECK (nicho IN ('iphone_store', 'law_firm', 'motorcycle_shop', 'nail_designer', 'detective')),
    config JSONB NOT NULL DEFAULT '{}',
    plano VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (plano IN ('starter', 'professional', 'business', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'expirado')),
    data_expiracao TIMESTAMP,
    limite_operadores INTEGER NOT NULL DEFAULT 3,
    limite_clientes INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para workspaces
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
CREATE INDEX idx_workspaces_nicho ON workspaces(nicho);
CREATE INDEX idx_workspaces_status ON workspaces(status);
CREATE INDEX idx_workspaces_deleted_at ON workspaces(deleted_at) WHERE deleted_at IS NULL;

-- ============ TABELA: USUÁRIOS ============
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operador' CHECK (role IN ('admin', 'operador', 'viewer')),
    avatar_url TEXT,
    telefone VARCHAR(20),
    ultimo_login TIMESTAMP WITH TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{"notificacoes": true, "som": true}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraint única por workspace
    UNIQUE(workspace_id, email)
);

-- Índices para users
CREATE INDEX idx_users_workspace_id ON users(workspace_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- ============ TABELA: TOKENS DE REFRESH ============
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_agent TEXT,
    ip_address INET,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked);

-- ============ TABELA: CLIENTES ============
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    origem VARCHAR(100),
    score INTEGER DEFAULT 0,
    ultima_interacao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Cliente único por telefone dentro do workspace
    UNIQUE(workspace_id, telefone)
);

-- Índices para clientes
CREATE INDEX idx_clientes_workspace_id ON clientes(workspace_id);
CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_ultima_interacao ON clientes(ultima_interacao);
CREATE INDEX idx_clientes_score ON clientes(score);
CREATE INDEX idx_clientes_tags ON clientes USING GIN(tags);

-- ============ TABELA: ESTADO DO CLIENTE (FSM) ============
CREATE TABLE clientes_estado (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    estado VARCHAR(100) NOT NULL,
    dados JSONB NOT NULL DEFAULT '{}',
    historico JSONB[] DEFAULT '{}',
    transacoes_pendentes INTEGER DEFAULT 0,
    valor_total DECIMAL(10,2) DEFAULT 0,
    proxima_acao VARCHAR(255),
    proxima_acao_agendada TIMESTAMP WITH TIME ZONE,
    bloqueado BOOLEAN DEFAULT FALSE,
    bloqueado_ate TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para clientes_estado
CREATE INDEX idx_clientes_estado_cliente_id ON clientes_estado(cliente_id);
CREATE INDEX idx_clientes_estado_estado ON clientes_estado(estado);
CREATE INDEX idx_clientes_estado_proxima_acao_agendada ON clientes_estado(proxima_acao_agendada);
CREATE INDEX idx_clientes_estado_bloqueado ON clientes_estado(bloqueado);

-- ============ TABELA: INTERAÇÕES DE CONVERSA ============
CREATE TABLE conversas_interacoes (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    texto TEXT NOT NULL,
    direcao VARCHAR(20) NOT NULL CHECK (direcao IN ('recebida', 'enviada')),
    tipo VARCHAR(50) NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'audio', 'video', 'documento', 'localizacao', 'contato')),
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviando', 'enviada', 'entregue', 'lida', 'erro')),
    lida_em TIMESTAMP WITH TIME ZONE,
    anexo_url TEXT,
    anexo_nome VARCHAR(255),
    anexo_tamanho INTEGER,
    whatsapp_message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para conversas_interacoes
CREATE INDEX idx_conversas_interacoes_cliente_id ON conversas_interacoes(cliente_id);
CREATE INDEX idx_conversas_interacoes_user_id ON conversas_interacoes(user_id);
CREATE INDEX idx_conversas_interacoes_created_at ON conversas_interacoes(created_at);
CREATE INDEX idx_conversas_interacoes_direcao ON conversas_interacoes(direcao);
CREATE INDEX idx_conversas_interacoes_status ON conversas_interacoes(status);
CREATE INDEX idx_conversas_interacoes_whatsapp_message_id ON conversas_interacoes(whatsapp_message_id);

-- ============ TABELA: FILA HUMANA ============
CREATE TABLE fila_humana (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    operador_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'esperando' CHECK (estado IN ('esperando', 'em_atendimento', 'pausado', 'finalizado', 'cancelado')),
    prioridade INTEGER NOT NULL DEFAULT 0 CHECK (prioridade BETWEEN 0 AND 10),
    motivo VARCHAR(255),
    tempo_espera INTEGER DEFAULT 0, -- em segundos
    tempo_atendimento INTEGER DEFAULT 0, -- em segundos
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assumido_em TIMESTAMP WITH TIME ZONE,
    finalizado_em TIMESTAMP WITH TIME ZONE
);

-- Índices para fila_humana
CREATE INDEX idx_fila_humana_cliente_id ON fila_humana(cliente_id);
CREATE INDEX idx_fila_humana_workspace_id ON fila_humana(workspace_id);
CREATE INDEX idx_fila_humana_operador_id ON fila_humana(operador_id);
CREATE INDEX idx_fila_humana_estado ON fila_humana(estado);
CREATE INDEX idx_fila_humana_prioridade ON fila_humana(prioridade);
CREATE INDEX idx_fila_humana_created_at ON fila_humana(created_at);

-- ============ TABELA: TEXTOS CMS ============
CREATE TABLE textos_cms (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    chave VARCHAR(255) NOT NULL,
    valor TEXT NOT NULL,
    categoria VARCHAR(100),
    nicho VARCHAR(50) CHECK (nicho IN ('iphone_store', 'law_firm', 'motorcycle_shop', 'nail_designer', 'detective', 'geral')),
    variaveis TEXT[] DEFAULT '{}',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    uso_contador INTEGER DEFAULT 0,
    ultimo_uso TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Chave única por workspace
    UNIQUE(workspace_id, chave)
);

-- Índices para textos_cms
CREATE INDEX idx_textos_cms_workspace_id ON textos_cms(workspace_id);
CREATE INDEX idx_textos_cms_categoria ON textos_cms(categoria);
CREATE INDEX idx_textos_cms_nicho ON textos_cms(nicho);
CREATE INDEX idx_textos_cms_ativo ON textos_cms(ativo);

-- ============ TABELA: CATÁLOGO DE ITENS ============
CREATE TABLE catalogo_itens (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    preco_promocional DECIMAL(10,2),
    categoria VARCHAR(100) NOT NULL,
    subcategoria VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    disponivel BOOLEAN NOT NULL DEFAULT TRUE,
    estoque INTEGER,
    imagem_url TEXT,
    imagem_urls TEXT[] DEFAULT '{}',
    ordem INTEGER DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para catalogo_itens
CREATE INDEX idx_catalogo_itens_workspace_id ON catalogo_itens(workspace_id);
CREATE INDEX idx_catalogo_itens_categoria ON catalogo_itens(categoria);
CREATE INDEX idx_catalogo_itens_preco ON catalogo_itens(preco);
CREATE INDEX idx_catalogo_itens_disponivel ON catalogo_itens(disponivel);
CREATE INDEX idx_catalogo_itens_ordem ON catalogo_itens(ordem);
CREATE INDEX idx_catalogo_itens_deleted_at ON catalogo_itens(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalogo_itens_tags ON catalogo_itens USING GIN(tags);

-- ============ TABELA: LOGS DE AUDITORIA ============
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(100) NOT NULL,
    entidade_id VARCHAR(100),
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_acao ON audit_logs(acao);
CREATE INDEX idx_audit_logs_entidade ON audit_logs(entidade);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============ TABELA: NOTIFICAÇÕES ============
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('info', 'success', 'warning', 'error', 'system')),
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    lida_em TIMESTAMP WITH TIME ZONE,
    dados JSONB NOT NULL DEFAULT '{}',
    acao_url TEXT,
    acao_texto VARCHAR(100),
    expira_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_workspace_id ON notifications(workspace_id);
CREATE INDEX idx_notifications_tipo ON notifications(tipo);
CREATE INDEX idx_notifications_lida ON notifications(lida);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_expira_em ON notifications(expira_em);

-- ============ TABELA: SESSÕES WHATSAPP ============
CREATE TABLE whatsapp_sessions (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('disconnected', 'connecting', 'connected', 'logging_out')),
    qr_code TEXT,
    qr_code_gerado_em TIMESTAMP WITH TIME ZONE,
    connected_em TIMESTAMP WITH TIME ZONE,
    disconnected_em TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para whatsapp_sessions
CREATE INDEX idx_whatsapp_sessions_workspace_id ON whatsapp_sessions(workspace_id);
CREATE INDEX idx_whatsapp_sessions_session_id ON whatsapp_sessions(session_id);
CREATE INDEX idx_whatsapp_sessions_status ON whatsapp_sessions(status);
CREATE INDEX idx_whatsapp_sessions_telefone ON whatsapp_sessions(telefone);

-- ============ TABELA: CONFIGURAÇÕES DO NICHO ============
CREATE TABLE nicho_configs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    nicho VARCHAR(50) NOT NULL CHECK (nicho IN ('iphone_store', 'law_firm', 'motorcycle_shop', 'nail_designer', 'detective')),
    config JSONB NOT NULL DEFAULT '{}',
    estados JSONB NOT NULL DEFAULT '[]',
    transicoes JSONB NOT NULL DEFAULT '[]',
    gatilhos JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(workspace_id, nicho)
);

-- ============ TABELA: RELATÓRIOS ============
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    periodo VARCHAR(50) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    dados JSONB NOT NULL,
    gerado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    gerado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    arquivo_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Índices para reports
CREATE INDEX idx_reports_workspace_id ON reports(workspace_id);
CREATE INDEX idx_reports_tipo ON reports(tipo);
CREATE INDEX idx_reports_periodo ON reports(periodo);
CREATE INDEX idx_reports_data_inicio ON reports(data_inicio);
CREATE INDEX idx_reports_data_fim ON reports(data_fim);

-- ============ FUNÇÕES E TRIGGERS ============

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clientes_estado_updated_at BEFORE UPDATE ON clientes_estado FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fila_humana_updated_at BEFORE UPDATE ON fila_humana FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_textos_cms_updated_at BEFORE UPDATE ON textos_cms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_catalogo_itens_updated_at BEFORE UPDATE ON catalogo_itens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nicho_configs_updated_at BEFORE UPDATE ON nicho_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar última interação do cliente
CREATE OR REPLACE FUNCTION update_cliente_ultima_interacao()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clientes 
    SET ultima_interacao = NEW.created_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.cliente_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar última interação
CREATE TRIGGER update_cliente_interacao AFTER INSERT ON conversas_interacoes FOR EACH ROW EXECUTE FUNCTION update_cliente_ultima_interacao();

-- Função para incrementar contador de uso de textos CMS
CREATE OR REPLACE FUNCTION increment_texto_cms_counter()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.direcao = 'enviada' AND NEW.texto LIKE '%{{cms:%}}%' THEN
        -- Extrair chaves CMS da mensagem e incrementar contadores
        -- (Implementação simplificada para exemplo)
        UPDATE textos_cms 
        SET uso_contador = uso_contador + 1,
            ultimo_uso = CURRENT_TIMESTAMP
        WHERE workspace_id = (
            SELECT workspace_id FROM clientes WHERE id = NEW.cliente_id
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para contador de textos CMS
CREATE TRIGGER increment_cms_counter AFTER INSERT ON conversas_interacoes FOR EACH ROW EXECUTE FUNCTION increment_texto_cms_counter();

-- ============ VIEWS ÚTEIS ============

-- View para dashboard de métricas
CREATE VIEW dashboard_metrics AS
SELECT 
    w.id as workspace_id,
    w.nome as workspace_nome,
    COUNT(DISTINCT c.id) as total_clientes,
    COUNT(DISTINCT CASE WHEN c.ultima_interacao >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END) as clientes_ativos_30d,
    COUNT(DISTINCT u.id) as total_usuarios,
    COUNT(DISTINCT CASE WHEN u.active = TRUE THEN u.id END) as usuarios_ativos,
    COUNT(DISTINCT fh.id) as total_fila_hoje,
    COUNT(DISTINCT CASE WHEN fh.estado = 'em_atendimento' THEN fh.id END) as em_atendimento_agora,
    COUNT(DISTINCT ci.id) as total_mensagens_hoje,
    COUNT(DISTINCT CASE WHEN ci.direcao = 'recebida' THEN ci.id END) as mensagens_recebidas_hoje,
    COUNT(DISTINCT CASE WHEN ci.direcao = 'enviada' THEN ci.id END) as mensagens_enviadas_hoje
FROM workspaces w
LEFT JOIN clientes c ON c.workspace_id = w.id
LEFT JOIN users u ON u.workspace_id = w.id
LEFT JOIN fila_humana fh ON fh.workspace_id = w.id AND DATE(fh.created_at) = CURRENT_DATE
LEFT JOIN conversas_interacoes ci ON ci.cliente_id = c.id AND DATE(ci.created_at) = CURRENT_DATE
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.nome;

-- View para conversas ativas
CREATE VIEW conversas_ativas AS
SELECT 
    c.id as cliente_id,
    c.nome as cliente_nome,
    c.telefone as cliente_telefone,
    c.workspace_id,
    MAX(ci.created_at) as ultima_mensagem_at,
    COUNT(CASE WHEN ci.direcao = 'recebida' AND ci.lida_em IS NULL THEN ci.id END) as nao_lidas,
    MAX(CASE WHEN ci.direcao = 'recebida' THEN ci.texto END) as ultima_mensagem_recebida,
    MAX(CASE WHEN ci.direcao = 'enviada' THEN ci.texto END) as ultima_mensagem_enviada,
    fh.operador_id,
    u.nome as operador_nome
FROM clientes c
LEFT JOIN conversas_interacoes ci ON ci.cliente_id = c.id
LEFT JOIN fila_humana fh ON fh.cliente_id = c.id AND fh.estado IN ('em_atendimento', 'esperando')
LEFT JOIN users u ON u.id = fh.operador_id
WHERE ci.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.id, c.nome, c.telefone, c.workspace_id, fh.operador_id, u.nome;

-- ============ INSERTS INICIAIS (SEEDS) ============

-- Workspace exemplo
INSERT INTO workspaces (nome, slug, nicho, plano, config) VALUES
('ReisTech Demo', 'reistech-demo', 'iphone_store', 'business', '{"cor_primaria": "#1976d2", "timezone": "America/Sao_Paulo"}');

-- Usuário admin
INSERT INTO users (workspace_id, nome, email, password_hash, role) VALUES
(1, 'Administrador', 'admin@reiscelulares.com.br', crypt('admin123', gen_salt('bf')), 'admin');

-- Textos CMS padrão
INSERT INTO textos_cms (workspace_id, chave, valor, categoria, nicho) VALUES
(1, 'saudacao_inicial', 'Olá! Bem-vindo à nossa loja. Como posso ajudá-lo hoje?', 'saudacoes', 'geral'),
(1, 'despedida', 'Obrigado por entrar em contato! Estamos à disposição para qualquer dúvida.', 'despedidas', 'geral'),
(1, 'fora_expediente', 'No momento estamos fora do expediente. Retornaremos em breve.', 'automaticas', 'geral');

-- Configuração do nicho iPhone Store
INSERT INTO nicho_configs (workspace_id, nicho, config, estados) VALUES
(1, 'iphone_store', 
 '{"produtos": ["iPhone 13", "iPhone 14", "iPhone 15", "iPhone SE"], "servicos": ["venda", "assistencia", "acessorios"]}',
 '[{"nome": "consulta", "acoes": ["identificar_modelo", "verificar_estoque"]}, {"nome": "venda", "acoes": ["processar_pagamento", "gerar_nota"]}]'::jsonb);

-- ============ COMENTÁRIOS DAS TABELAS ============
COMMENT ON TABLE workspaces IS 'Tabela principal de workspaces (multi-tenant)';
COMMENT ON TABLE users IS 'Usuários do sistema por workspace';
COMMENT ON TABLE refresh_tokens IS 'Tokens JWT de refresh para autenticação';
COMMENT ON TABLE clientes IS 'Clientes cadastrados por workspace';
COMMENT ON TABLE clientes_estado IS 'Estado atual do cliente na máquina de estados (FSM)';
COMMENT ON TABLE conversas_interacoes IS 'Histórico de mensagens trocadas com clientes';
COMMENT ON TABLE fila_humana IS 'Sistema de fila para atendimento humano';
COMMENT ON TABLE textos_cms IS 'Textos padronizados para respostas automáticas';
COMMENT ON TABLE catalogo_itens IS 'Catálogo de produtos/serviços por workspace';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria de todas as ações do sistema';
COMMENT ON TABLE notifications IS 'Notificações push para usuários';
COMMENT ON TABLE whatsapp_sessions IS 'Sessões ativas do WhatsApp por workspace';
COMMENT ON TABLE nicho_configs IS 'Configurações específicas por nicho de atuação';
COMMENT ON TABLE reports IS 'Relatórios gerados do sistema';

-- ============ FIM DA ESTRUTURA ============
-- ============================================