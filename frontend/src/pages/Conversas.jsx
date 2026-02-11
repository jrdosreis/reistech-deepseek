import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  ChatBubble as ChatBubbleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR as dateFnsPtBR } from 'date-fns/locale';

function Conversas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversas, setConversas] = useState([]);
  const [selectedConversa, setSelectedConversa] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [dossie, setDossie] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const messagesEndRef = useRef(null);

  const loadConversas = useCallback(async () => {
    setLoading(true);
    try {
      const telefone = searchParams.get('telefone');
      const params = telefone ? { telefone } : {};

      const response = await api.get('/conversas', { params });
      setConversas(response.data.data);

      if (telefone && response.data.data.length > 0) {
        setSelectedConversa(response.data.data[0]);
        loadMensagens(response.data.data[0].cliente_id);
        loadDossie(response.data.data[0].cliente_id);
      }
    } catch (error) {
      enqueueSnackbar('Erro ao carregar conversas', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [searchParams, enqueueSnackbar]);

  const loadMensagens = async (clienteId) => {
    try {
      const response = await api.get(`/conversas/${clienteId}/mensagens`);
      setMensagens(response.data.data);
      scrollToBottom();
    } catch (error) {
      enqueueSnackbar('Erro ao carregar mensagens', { variant: 'error' });
    }
  };

  const loadDossie = async (clienteId) => {
    try {
      const response = await api.get(`/conversas/${clienteId}/dossie`);
      setDossie(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar dossiê:', error);
    }
  };

  useEffect(() => {
    loadConversas();
  }, [loadConversas]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectConversa = (conversa) => {
    setSelectedConversa(conversa);
    loadMensagens(conversa.cliente_id);
    loadDossie(conversa.cliente_id);
    setSearchParams({ telefone: conversa.cliente.telefone });
  };

  const handleSendMessage = async () => {
    if (!novaMensagem.trim() || !selectedConversa) return;

    try {
      await api.post(`/conversas/${selectedConversa.cliente_id}/mensagem`, {
        mensagem: novaMensagem,
      });

      setNovaMensagem('');
      loadMensagens(selectedConversa.cliente_id);

      enqueueSnackbar('Mensagem enviada', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erro ao enviar mensagem', { variant: 'error' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatarDataMensagem = (date) => {
    const hoje = new Date();
    const dataMensagem = new Date(date);

    if (dataMensagem.toDateString() === hoje.toDateString()) {
      return format(dataMensagem, 'HH:mm');
    }
    return format(dataMensagem, 'dd/MM HH:mm');
  };

  const filtrarConversas = () => {
    return conversas.filter(conversa => {
      if (!searchTerm) return true;

      const term = searchTerm.toLowerCase();
      return (
        conversa.cliente.telefone.toLowerCase().includes(term) ||
        (conversa.cliente.nome && conversa.cliente.nome.toLowerCase().includes(term))
      );
    });
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
      <Paper sx={{ width: 320, mr: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Conversas
          </Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por telefone ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ mt: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadConversas}
              disabled={loading}
            >
              Atualizar
            </Button>
          </Box>
        </Box>

        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {filtrarConversas().map((conversa) => (
            <React.Fragment key={conversa.id}>
              <ListItem
                button
                selected={selectedConversa?.id === conversa.id}
                onClick={() => handleSelectConversa(conversa)}
              >
                <ListItemAvatar>
                  <Avatar>
                    {conversa.cliente.nome?.charAt(0) || <PersonIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" noWrap>
                        {conversa.cliente.nome || conversa.cliente.telefone}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatDistanceToNow(new Date(conversa.ultima_interacao), {
                          addSuffix: true,
                          locale: dateFnsPtBR,
                        })}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="textSecondary" noWrap>
                        {conversa.estado_atual || 'MENU_PRINCIPAL'}
                      </Typography>
                      {conversa.na_fila && (
                        <Chip
                          size="small"
                          label="Na fila"
                          color="warning"
                        />
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ component: 'div' }}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}

          {filtrarConversas().length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">
                Nenhuma conversa encontrada
              </Typography>
            </Box>
          )}
        </List>
      </Paper>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversa ? (
          <>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconButton onClick={() => setSelectedConversa(null)}>
                    <ArrowBackIcon />
                  </IconButton>

                  <Avatar>
                    {selectedConversa.cliente.nome?.charAt(0) || <PersonIcon />}
                  </Avatar>

                  <Box>
                    <Typography variant="h6">
                      {selectedConversa.cliente.nome || 'Cliente não identificado'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon fontSize="small" />
                      <Typography variant="body2" color="textSecondary">
                        {selectedConversa.cliente.telefone}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={selectedConversa.estado_atual}
                    color="primary"
                    size="small"
                  />
                  {selectedConversa.na_fila && (
                    <Chip
                      label="Na fila"
                      color="warning"
                      size="small"
                    />
                  )}
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ mb: 2 }}>
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab icon={<ChatBubbleIcon />} label="Conversa" />
                <Tab icon={<AssignmentIcon />} label="Dossiê" />
                <Tab icon={<InfoIcon />} label="Informações" />
              </Tabs>
            </Paper>

            {tabValue === 0 && (
              <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {mensagens.map((msg) => (
                    <Box
                      key={msg.id}
                      sx={{
                        display: 'flex',
                        justifyContent: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1.5,
                          maxWidth: '70%',
                          backgroundColor: msg.direction === 'outbound' ? 'primary.light' : 'grey.100',
                        }}
                      >
                        <Typography variant="body2">
                          {msg.conteudo.text || msg.conteudo.mensagem}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            textAlign: 'right',
                            color: msg.direction === 'outbound' ? 'primary.contrastText' : 'text.secondary',
                          }}
                        >
                          {formatarDataMensagem(msg.created_at)}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Box>

                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            color="primary"
                            onClick={handleSendMessage}
                            disabled={!novaMensagem.trim()}
                          >
                            <SendIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Paper>
            )}

            {tabValue === 1 && dossie && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Dossiê do Cliente
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Informações Básicas
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Telefone"
                              secondary={dossie.cliente?.telefone || 'Não informado'}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Nome"
                              secondary={dossie.cliente?.nome || 'Não informado'}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Cidade"
                              secondary={dossie.cliente?.cidade || 'Não informada'}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Status do Atendimento
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Tipo de Fluxo"
                              secondary={
                                <Chip
                                  label={dossie.tipoFluxo || 'INDEFINIDO'}
                                  size="small"
                                  color="primary"
                                />
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Prioridade"
                              secondary={
                                <Chip
                                  label={dossie.prioridade || 'BAIXA'}
                                  size="small"
                                  color={
                                    dossie.prioridade === 'ALTA' ? 'error' :
                                    dossie.prioridade === 'MEDIA' ? 'warning' : 'default'
                                  }
                                />
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Intenção Detectada"
                              secondary={dossie.intencaoDetectada || 'Não detectada'}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Dados Coletados
                        </Typography>
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>Ver detalhes</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(dossie.dadosColetados || {}, null, 2)}
                            </pre>
                          </AccordionDetails>
                        </Accordion>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Sugestão de Abordagem
                        </Typography>
                        <Typography variant="body1">
                          {dossie.sugestaoAbordagem || 'Nenhuma sugestão disponível.'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {tabValue === 2 && selectedConversa && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Informações Técnicas
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Dados da Sessão
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="ID do Cliente"
                              secondary={selectedConversa.cliente_id}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Estado FSM Atual"
                              secondary={selectedConversa.estado_atual}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Criado em"
                              secondary={format(new Date(selectedConversa.created_at), 'PPpp', {
                                locale: dateFnsPtBR,
                              })}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Estatísticas
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText
                              primary="Total de Mensagens"
                              secondary={mensagens.length}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Última Atividade"
                              secondary={formatDistanceToNow(
                                new Date(selectedConversa.ultima_interacao),
                                { addSuffix: true, locale: dateFnsPtBR }
                              )}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText
                              primary="Tags"
                              secondary={
                                selectedConversa.cliente.tags?.length > 0 ? (
                                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                    {selectedConversa.cliente.tags.map((tag, index) => (
                                      <Chip key={index} label={tag} size="small" />
                                    ))}
                                  </Box>
                                ) : (
                                  'Nenhuma tag'
                                )
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </>
        ) : (
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <ChatBubbleIcon sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Nenhuma conversa selecionada
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Selecione uma conversa na lista ao lado para começar
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default Conversas;
