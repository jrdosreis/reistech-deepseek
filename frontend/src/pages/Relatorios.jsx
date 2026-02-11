// frontend/src/pages/Relatorios.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  DateRange as DateRangeIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Chat as ChatIcon,
  ShoppingCart as ShoppingCartIcon,
  Schedule as ScheduleIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { format, subDays } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

function Relatorios() {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('today');
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const [dashboardData, setDashboardData] = useState(null);
  const [conversationReport, setConversationReport] = useState(null);
  const [filaReport, setFilaReport] = useState(null);
  const [catalogoReport, setCatalogoReport] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadReports = async () => {
    setLoading(true);
    try {
      const [dashboardRes, conversationRes, filaRes, catalogoRes] = await Promise.all([
        api.get('/reports/dashboard', { params: { period } }),
        api.get('/reports/conversations', {
          params: {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
          },
        }),
        api.get('/reports/fila', {
          params: {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
          },
        }),
        api.get('/reports/catalogo'),
      ]);

      setDashboardData(dashboardRes.data.data);
      setConversationReport(conversationRes.data.data);
      setFilaReport(filaRes.data.data);
      setCatalogoReport(catalogoRes.data.data);
    } catch (error) {
      enqueueSnackbar('Erro ao carregar relatórios', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExport = async (type) => {
    try {
      const response = await api.get(`/reports/export/${type}`, {
        params: {
          period,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-${type}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      enqueueSnackbar('Relatório exportado com sucesso', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erro ao exportar relatório', { variant: 'error' });
    }
  };

  const periodOptions = [
    { value: 'today', label: 'Hoje' },
    { value: 'yesterday', label: 'Ontem' },
    { value: 'this_week', label: 'Esta Semana' },
    { value: 'this_month', label: 'Este Mês' },
    { value: 'last_30_days', label: 'Últimos 30 Dias' },
  ];

  const statsCards = [
    {
      title: 'Clientes',
      value: dashboardData?.resumo.totalClientes || 0,
      icon: <PeopleIcon />,
      color: 'primary.main',
      change: '+12%',
    },
    {
      title: 'Conversas',
      value: dashboardData?.resumo.totalConversas || 0,
      icon: <ChatIcon />,
      color: 'success.main',
      change: '+8%',
    },
    {
      title: 'Vendas',
      value: dashboardData?.resumo.totalVendas || 0,
      icon: <ShoppingCartIcon />,
      color: 'warning.main',
      change: '+5%',
    },
    {
      title: 'Na Fila',
      value: dashboardData?.resumo.totalFila || 0,
      icon: <ScheduleIcon />,
      color: 'error.main',
      change: '-2%',
    },
    {
      title: 'Tempo Médio Resposta',
      value: `${dashboardData?.resumo.tempoMedioResposta || 0} min`,
      icon: <TrendingUpIcon />,
      color: 'info.main',
      change: '-15%',
    },
  ];

  const conversationChartData = {
    labels: conversationReport?.detalhamento.map(item => format(new Date(item.data), 'dd/MM')) || [],
    datasets: [
      {
        label: 'Conversas',
        data: conversationReport?.detalhamento.map(item => item.total) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const filaChartData = {
    labels: filaReport?.resumo.map(item => item.status) || [],
    datasets: [
      {
        label: 'Tempo Médio (min)',
        data: filaReport?.resumo.map(item => Math.round(item.tempo_medio / 60)) || [],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Relatórios
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={period}
                label="Período"
                onChange={(e) => setPeriod(e.target.value)}
              >
                {periodOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <DatePicker
              label="Data Inicial"
              value={startDate}
              onChange={setStartDate}
              renderInput={(params) => <TextField {...params} size="small" />}
            />

            <DatePicker
              label="Data Final"
              value={endDate}
              onChange={setEndDate}
              renderInput={(params) => <TextField {...params} size="small" />}
            />

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadReports}
              disabled={loading}
            >
              Atualizar
            </Button>

            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('full')}
            >
              Exportar
            </Button>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 3 }} />}

        {/* Cards de Estatísticas */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {statsCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        backgroundColor: stat.color,
                        borderRadius: '50%',
                        padding: 1,
                        marginRight: 2,
                        color: 'white',
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" component="div">
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.title}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color={stat.change.startsWith('+') ? 'success.main' : 'error.main'}>
                    {stat.change} em relação ao período anterior
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Gráficos */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Conversas por Dia
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={conversationChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Desempenho da Fila
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar
                  data={filaChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabelas de Detalhes */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Top Clientes
                </Typography>
                <Chip label="Por interações" size="small" />
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Cliente</TableCell>
                      <TableCell align="right">Interações</TableCell>
                      <TableCell align="right">Última</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData?.detalhes.topClientes?.slice(0, 5).map((cliente, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">
                              {cliente['cliente.nome'] || cliente['cliente.telefone']}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {cliente['cliente.telefone']}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={cliente.total_interacoes} size="small" color="primary" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            {format(new Date(), 'dd/MM')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Fluxos Mais Usados
                </Typography>
                <Chip label="Por estado" size="small" />
              </Box>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Estado FSM</TableCell>
                      <TableCell align="right">Quantidade</TableCell>
                      <TableCell align="right">Percentual</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboardData?.detalhes.fluxosMaisUsados?.map((fluxo, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={fluxo.state} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          {fluxo.total}
                        </TableCell>
                        <TableCell align="right">
                          {((fluxo.total / dashboardData.resumo.totalConversas) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Resumo do Catálogo */}
        {catalogoReport && (
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo do Catálogo
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h3" color="primary" align="center">
                      {catalogoReport.totalItens}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" align="center">
                      Itens Ativos
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h3" color="success" align="center">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(catalogoReport.valorTotal)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" align="center">
                      Valor Total em Estoque
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h3" color="warning" align="center">
                      {catalogoReport.porFamilia.length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" align="center">
                      Famílias Diferentes
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>
    </LocalizationProvider>
  );
}

export default Relatorios;