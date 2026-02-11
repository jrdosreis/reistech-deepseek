import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Snackbar,
  Grid,
  Chip,
  Divider,
  Tooltip,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  QrCode as QrCodeIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR as dateFnsPtBR } from 'date-fns/locale';

function WhatsApp() {
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [lastMessages, setLastMessages] = useState([]);
  const [stats, setStats] = useState({});
  const { enqueueSnackbar } = useSnackbar();
  const statusIntervalRef = React.useRef(null);
  const dataIntervalRef = React.useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await api.get('/whatsapp/status');
      setStatus(response.data.data);

      if (response.data.data.status === 'waiting_qr' && !qrCode) {
        loadQrCode();
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  }, [qrCode]);

  const loadQrCode = async () => {
    try {
      const response = await api.get('/whatsapp/qr');
      if (response.data.data.qr) {
        setQrCode(response.data.data.qr);
      }
    } catch (error) {
      console.error('Erro ao carregar QR code:', error);
    }
  };

  const loadLastMessages = async () => {
    try {
      const response = await api.get('/conversas/last-messages');
      setLastMessages(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar últimas mensagens:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/whatsapp/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadStatus();

    statusIntervalRef.current = setInterval(loadStatus, 15000);
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
      }
    };
  }, [loadStatus]);

  useEffect(() => {
    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current);
      dataIntervalRef.current = null;
    }

    if (status?.connected) {
      loadLastMessages();
      loadStats();
      dataIntervalRef.current = setInterval(() => {
        loadLastMessages();
        loadStats();
      }, 30000);
    }
  }, [status?.connected]);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await api.post('/whatsapp/reconnect');
      enqueueSnackbar('Reconexão iniciada', { variant: 'success' });
      setTimeout(loadStatus, 2000);
    } catch (error) {
      enqueueSnackbar('Erro ao reconectar', { variant: 'error' });
    } finally {
      setReconnecting(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `whatsapp-qr-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusConfig = () => {
    if (!status) return { color: 'default', icon: <InfoIcon />, label: 'Carregando...' };

    const configs = {
      connected: { color: 'success', icon: <WifiIcon />, label: 'Conectado' },
      disconnected: { color: 'error', icon: <WifiOffIcon />, label: 'Desconectado' },
      waiting_qr: { color: 'warning', icon: <QrCodeIcon />, label: 'Aguardando QR Code' },
      auth_failed: { color: 'error', icon: <ErrorIcon />, label: 'Autenticação Falhou' },
      default: { color: 'default', icon: <InfoIcon />, label: status.status || 'Desconhecido' },
    };

    return configs[status.status] || configs.default;
  };

  const getConnectionInfo = () => {
    if (!status) return null;

    const info = [];
    if (status.connected) {
      info.push('✅ Conectado ao WhatsApp');
      if (status.info?.pushname) {
        info.push(`👤 Conectado como: ${status.info.pushname}`);
      }
      if (status.info?.wid) {
        info.push(`📱 Número: ${status.info.wid.user}`);
      }
      if (status.info?.platform) {
        info.push(`⚙️ Plataforma: ${status.info.platform}`);
      }
    } else if (status.status === 'waiting_qr') {
      info.push('📱 Aguardando leitura do QR Code');
      info.push('1. Abra o WhatsApp no seu celular');
      info.push('2. Toque em Menu → Linked Devices');
      info.push('3. Toque em Link a Device');
      info.push('4. Escaneie o QR Code abaixo');
    } else if (status.status === 'auth_failed') {
      info.push('❌ Falha na autenticação');
      info.push('• Tente reconectar ou escanear o QR Code novamente');
    } else {
      info.push('🔌 WhatsApp desconectado');
      info.push('• Clique em "Reconectar" para tentar novamente');
    }

    return info;
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          WhatsApp
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadStatus}
            disabled={loading}
          >
            Atualizar
          </Button>

          <Button
            variant="contained"
            color={status?.connected ? 'secondary' : 'primary'}
            startIcon={reconnecting ? <CircularProgress size={20} /> : <PowerSettingsNewIcon />}
            onClick={handleReconnect}
            disabled={reconnecting}
          >
            {status?.connected ? 'Desconectar' : 'Reconectar'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    bgcolor: `${getStatusConfig().color}.main`,
                    mr: 2,
                  }}
                >
                  {getStatusConfig().icon}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    Status da Conexão
                  </Typography>
                  <Chip
                    label={getStatusConfig().label}
                    color={getStatusConfig().color}
                    size="small"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <List dense>
                {getConnectionInfo()?.map((info, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={info} />
                  </ListItem>
                ))}

                {status?.lastQrAt && (
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Último QR gerado"
                      secondary={formatDistanceToNow(new Date(status.lastQrAt), {
                        addSuffix: true,
                        locale: dateFnsPtBR,
                      })}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  QR Code
                </Typography>

                {qrCode && (
                  <Tooltip title="Download QR Code">
                    <IconButton onClick={handleDownloadQr} size="small">
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {status?.status === 'waiting_qr' ? (
                qrCode ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      component="img"
                      src={qrCode}
                      alt="WhatsApp QR Code"
                      sx={{
                        width: 250,
                        height: 250,
                        mx: 'auto',
                        mb: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 1,
                      }}
                    />

                    <Alert severity="info" sx={{ mb: 2 }}>
                      Escaneie este QR Code com o WhatsApp para conectar
                    </Alert>

                    <Typography variant="caption" color="textSecondary">
                      QR Code válido por aproximadamente 20 segundos
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>
                      Gerando QR Code...
                    </Typography>
                  </Box>
                )
              ) : status?.connected ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" color="success.main">
                    Conectado ✓
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    WhatsApp está conectado e funcionando
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <InfoIcon sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body2" color="textSecondary">
                    QR Code disponível apenas quando aguardando conexão
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estatísticas
              </Typography>

              {stats ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {stats.totalMensagens || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Mensagens Hoje
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success">
                        {stats.clientesAtivos || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Clientes Ativos
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="warning">
                        {stats.conversasAbertas || 0}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Conversas Abertas
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">
                        {stats.taxaResposta ? `${stats.taxaResposta}%` : '0%'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Taxa de Resposta
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    Carregando estatísticas...
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Últimas Mensagens
              </Typography>

              {lastMessages.length > 0 ? (
                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {lastMessages.map((msg, index) => (
                    <React.Fragment key={index}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar>
                            {msg.cliente_nome?.charAt(0) || <PersonIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="subtitle2">
                                {msg.cliente_nome || msg.cliente_telefone}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {formatDistanceToNow(new Date(msg.created_at), {
                                  addSuffix: true,
                                  locale: dateFnsPtBR,
                                })}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {msg.conteudo}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < lastMessages.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <MessageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body2" color="textSecondary">
                    Nenhuma mensagem recente
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informações Técnicas
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Alert severity="info">
                <Typography variant="subtitle2" gutterBottom>
                  ⚠️ Importante
                </Typography>
                <Typography variant="body2">
                  • Mantenha o WhatsApp Web aberto no navegador para manter a conexão
                  <br />
                  • Não desconecte o WhatsApp no celular enquanto estiver usando
                  <br />
                  • A sessão pode expirar após alguns dias de inatividade
                </Typography>
              </Alert>
            </Grid>

            <Grid item xs={12} md={6}>
              <Alert severity="warning">
                <Typography variant="subtitle2" gutterBottom>
                  🔒 Segurança
                </Typography>
                <Typography variant="body2">
                  • Nunca compartilhe o QR Code com outras pessoas
                  <br />
                  • A conexão é segura e utiliza criptografia
                  <br />
                  • Dados são armazenados localmente
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

export default WhatsApp;
