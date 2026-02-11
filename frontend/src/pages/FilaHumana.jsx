import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Snackbar,
  Avatar,
  Badge,
  Tabs,
  Tab,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Chat as ChatIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { DataGrid, ptBR } from '@mui/x-data-grid';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ptBR as dateFnsPtBR } from 'date-fns/locale';

function FilaHumana() {
  const [fila, setFila] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [lockDuration, setLockDuration] = useState(900);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({ waiting: 0, locked: 0, done: 0 });
  const { enqueueSnackbar } = useSnackbar();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadFila = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/fila');
      const filaData = response.data.data;
      setFila(filaData);

      const stats = {
        waiting: filaData.filter(item => item.status === 'waiting').length,
        locked: filaData.filter(item => item.status === 'locked').length,
        done: filaData.filter(item => item.status === 'done').length,
      };
      setStats(stats);
    } catch (error) {
      enqueueSnackbar('Erro ao carregar fila', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadFila();

    if (autoRefresh) {
      const interval = setInterval(loadFila, 10000);
      return () => clearInterval(interval);
    }
  }, [loadFila, autoRefresh]);

  const handleAssumir = (cliente) => {
    setSelectedCliente(cliente);
    setDialogOpen(true);
  };

  const handleConfirmarAssumir = async () => {
    try {
      await api.post(`/fila/${selectedCliente.telefone}/assumir`, {
        lockDuration,
      });

      enqueueSnackbar('Cliente assumido com sucesso', { variant: 'success' });
      setDialogOpen(false);
      loadFila();

      window.open(`/painel/conversas?telefone=${selectedCliente.telefone}`, '_blank');
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || 'Erro ao assumir cliente',
        { variant: 'error' }
      );
    }
  };

  const handleFinalizar = async (cliente) => {
    if (!window.confirm('Tem certeza que deseja finalizar este atendimento?')) {
      return;
    }

    try {
      await api.post(`/fila/${cliente.telefone}/finalizar`, {
        desfecho: 'Finalizado pelo operador',
      });

      enqueueSnackbar('Atendimento finalizado com sucesso', { variant: 'success' });
      loadFila();
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || 'Erro ao finalizar atendimento',
        { variant: 'error' }
      );
    }
  };

  const handleLiberarExpirados = async () => {
    try {
      await api.post('/fila/liberar-expirados');
      enqueueSnackbar('Locks expirados liberados', { variant: 'success' });
      loadFila();
    } catch (error) {
      enqueueSnackbar('Erro ao liberar locks expirados', { variant: 'error' });
    }
  };

  const getStatusChip = (status) => {
    const config = {
      waiting: { label: 'Aguardando', color: 'warning' },
      locked: { label: 'Em Atendimento', color: 'success' },
      done: { label: 'Finalizado', color: 'default' },
      cancelled: { label: 'Cancelado', color: 'error' },
    };

    const { label, color } = config[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
  };

  const getWaitTime = (createdAt) => {
    const minutes = differenceInMinutes(new Date(), new Date(createdAt));
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
  };

  const columns = [
    {
      field: 'cliente',
      headerName: 'Cliente',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            {params.row.cliente?.nome?.charAt(0) || <PersonIcon />}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {params.row.cliente?.nome || 'Não informado'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {params.row.cliente?.telefone}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => getStatusChip(params.value),
    },
    {
      field: 'operador',
      headerName: 'Operador',
      width: 160,
      renderCell: (params) => (
        params.value ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
            <Typography variant="body2">{params.value.nome}</Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="textSecondary">
            Não atribuído
          </Typography>
        )
      ),
    },
    {
      field: 'created_at',
      headerName: 'Entrou na Fila',
      width: 160,
      renderCell: (params) => (
        <Tooltip title={format(new Date(params.value), 'PPpp', { locale: dateFnsPtBR })}>
          <Typography variant="body2">
            {format(new Date(params.value), 'dd/MM HH:mm')}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'wait_time',
      headerName: 'Tempo',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AccessTimeIcon sx={{ mr: 0.5, fontSize: 16 }} />
          <Typography variant="body2">
            {getWaitTime(params.row.created_at)}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'motivo',
      headerName: 'Motivo',
      width: 180,
      renderCell: (params) => (
        <Tooltip title={params.value || 'Sem motivo específico'}>
          <Typography variant="body2" noWrap>
            {params.value || '-'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 150,
      renderCell: (params) => (
        <Box>
          {params.row.status === 'waiting' && (
            <Tooltip title="Assumir atendimento">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleAssumir(params.row.cliente)}
                sx={{ mr: 1 }}
              >
                <PlayArrowIcon />
              </IconButton>
            </Tooltip>
          )}

          {params.row.status === 'locked' && params.row.operador && (
            <Tooltip title="Finalizar atendimento">
              <IconButton
                size="small"
                color="secondary"
                onClick={() => handleFinalizar(params.row.cliente)}
                sx={{ mr: 1 }}
              >
                <StopIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Ver conversa">
            <IconButton
              size="small"
              onClick={() => window.open(`/painel/conversas?telefone=${params.row.cliente.telefone}`, '_blank')}
            >
              <ChatIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Ver dossiê">
            <IconButton
              size="small"
              onClick={() => window.open(`/painel/conversas?telefone=${params.row.cliente.telefone}&tab=dossie`, '_blank')}
            >
              <AssignmentIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Fila Humana
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadFila}
            disabled={loading}
          >
            Atualizar
          </Button>

          <Button
            variant="outlined"
            color="warning"
            startIcon={<TimerIcon />}
            onClick={handleLiberarExpirados}
          >
            Liberar Expirados
          </Button>

          <FormControl>
            <Select
              size="small"
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.value)}
              displayEmpty
            >
              <MenuItem value={true}>Auto-refresh: ON</MenuItem>
              <MenuItem value={false}>Auto-refresh: OFF</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Badge badgeContent={stats.waiting} color="warning" sx={{ mr: 2 }}>
                  <PersonIcon color="action" />
                </Badge>
                <Typography color="textSecondary" variant="body2">
                  Aguardando
                </Typography>
              </Box>
              <Typography variant="h4">{stats.waiting}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Badge badgeContent={stats.locked} color="success" sx={{ mr: 2 }}>
                  <ChatIcon color="action" />
                </Badge>
                <Typography color="textSecondary" variant="body2">
                  Em Atendimento
                </Typography>
              </Box>
              <Typography variant="h4">{stats.locked}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Badge badgeContent={stats.done} color="info" sx={{ mr: 2 }}>
                  <StopIcon color="action" />
                </Badge>
                <Typography color="textSecondary" variant="body2">
                  Finalizados Hoje
                </Typography>
              </Box>
              <Typography variant="h4">{stats.done}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccessTimeIcon color="action" sx={{ mr: 2 }} />
                <Typography color="textSecondary" variant="body2">
                  Tempo Médio
                </Typography>
              </Box>
              <Typography variant="h4">
                {fila.filter(f => f.status === 'waiting').length > 0
                  ? `${Math.round(fila.reduce((acc, item) => {
                      if (item.status === 'waiting') {
                        return acc + differenceInMinutes(new Date(), new Date(item.created_at));
                      }
                      return acc;
                    }, 0) / fila.filter(f => f.status === 'waiting').length)} min`
                  : '0 min'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`Aguardando (${stats.waiting})`} />
          <Tab label={`Em Atendimento (${stats.locked})`} />
          <Tab label="Todos" />
        </Tabs>
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        {loading && <LinearProgress />}

        <DataGrid
          rows={fila.filter(item => {
            if (tabValue === 0) return item.status === 'waiting';
            if (tabValue === 1) return item.status === 'locked';
            return true;
          })}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          checkboxSelection={false}
          disableSelectionOnClick
          localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
          getRowId={(row) => row.id}
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assumir Atendimento
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Cliente
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                {selectedCliente?.nome?.charAt(0) || <PersonIcon />}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {selectedCliente?.nome || 'Cliente não identificado'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedCliente?.telefone}
                </Typography>
              </Box>
            </Box>
          </Box>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="lock-duration-label">
              Duração do lock (minutos)
            </InputLabel>
            <Select
              labelId="lock-duration-label"
              value={lockDuration}
              label="Duração do lock (minutos)"
              onChange={(e) => setLockDuration(e.target.value)}
            >
              <MenuItem value={300}>5 minutos</MenuItem>
              <MenuItem value={900}>15 minutos</MenuItem>
              <MenuItem value={1800}>30 minutos</MenuItem>
              <MenuItem value={3600}>60 minutos</MenuItem>
            </Select>
          </FormControl>

          <Alert severity="info" icon={<InfoIcon />}>
            O lock impede que outros operadores atendam este cliente simultaneamente.
            Após expirar, o cliente retorna automaticamente para a fila.
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarAssumir}
            variant="contained"
            startIcon={<PlayArrowIcon />}
          >
            Assumir Atendimento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FilaHumana;
