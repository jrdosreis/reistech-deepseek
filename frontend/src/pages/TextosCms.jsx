import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Snackbar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  InputAdornment,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  ContentCopy as ContentCopyIcon,
  Code as CodeIcon,
  WhatsApp as WhatsAppIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { DataGrid, ptBR } from '@mui/x-data-grid';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR as dateFnsPtBR } from 'date-fns/locale';

function TextosCms() {
  const [textos, setTextos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('edit');
  const [selectedTexto, setSelectedTexto] = useState(null);
  const [formData, setFormData] = useState({
    chave: '',
    conteudo: '',
    ativo: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const loadTextos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/cms/textos', {
        params: { search: searchTerm || undefined },
      });
      setTextos(response.data.data);
    } catch (error) {
      enqueueSnackbar('Erro ao carregar textos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, enqueueSnackbar]);

  useEffect(() => {
    loadTextos();
  }, [loadTextos]);

  const handleOpenDialog = (type, texto = null) => {
    setDialogType(type);
    setSelectedTexto(texto);

    if (type === 'edit' && texto) {
      setFormData({
        chave: texto.chave,
        conteudo: texto.conteudo,
        ativo: texto.ativo,
      });
    } else if (type === 'create') {
      setFormData({
        chave: '',
        conteudo: '',
        ativo: true,
      });
    }

    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTexto(null);
    setPreviewMode(false);
  };

  const handleSubmit = async () => {
    try {
      if (dialogType === 'create') {
        await api.post('/cms/textos', formData);
        enqueueSnackbar('Texto criado com sucesso', { variant: 'success' });
      } else if (dialogType === 'edit' && selectedTexto) {
        await api.put(`/cms/textos/${selectedTexto.chave}`, {
          conteudo: formData.conteudo,
        });
        enqueueSnackbar('Texto atualizado com sucesso', { variant: 'success' });
      }

      handleCloseDialog();
      loadTextos();
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || 'Erro ao salvar texto',
        { variant: 'error' }
      );
    }
  };

  const handleToggleActive = async (texto) => {
    try {
      const endpoint = texto.ativo ? 'desativar' : 'ativar';
      await api.post(`/cms/textos/${texto.chave}/${endpoint}`);

      enqueueSnackbar(
        `Texto ${texto.ativo ? 'desativado' : 'ativado'} com sucesso`,
        { variant: 'success' }
      );
      loadTextos();
    } catch (error) {
      enqueueSnackbar('Erro ao atualizar texto', { variant: 'error' });
    }
  };

  const handleCopyContent = (content) => {
    navigator.clipboard.writeText(content);
    enqueueSnackbar('Conteúdo copiado', { variant: 'success' });
  };

  const handleImportDefault = async () => {
    if (!window.confirm('Importar textos padrão do nicho? Isso substituirá textos existentes.')) {
      return;
    }

    try {
      await api.post('/admin/workspaces/current/import-default');
      enqueueSnackbar('Textos padrão importados com sucesso', { variant: 'success' });
      loadTextos();
    } catch (error) {
      enqueueSnackbar('Erro ao importar textos', { variant: 'error' });
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/workspaces/current/export-pack', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `textos-${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      enqueueSnackbar('Textos exportados com sucesso', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erro ao exportar textos', { variant: 'error' });
    }
  };

  const columns = [
    {
      field: 'chave',
      headerName: 'Chave',
      width: 250,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {params.row.categoria || 'geral'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'conteudo',
      headerName: 'Conteúdo',
      width: 400,
      renderCell: (params) => (
        <Tooltip title={params.value}>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 400,
            }}
          >
            {params.value.length > 100 ? `${params.value.substring(0, 100)}...` : params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'ativo',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Ativo' : 'Inativo'}
          color={params.value ? 'success' : 'default'}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleActive(params.row);
          }}
        />
      ),
    },
    {
      field: 'updated_at',
      headerName: 'Atualizado',
      width: 150,
      renderCell: (params) => (
        <Typography variant="caption" color="textSecondary">
          {format(new Date(params.value), 'dd/MM/yyyy')}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Ações',
      width: 120,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog('edit', params.row);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Copiar conteúdo">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyContent(params.row.conteudo);
              }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={params.row.ativo ? 'Desativar' : 'Ativar'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleActive(params.row);
              }}
            >
              {params.row.ativo ? (
                <ToggleOffIcon fontSize="small" />
              ) : (
                <ToggleOnIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const filteredTextos = textos.filter(texto => {
    if (filterActive && !texto.ativo) return false;
    if (tabValue === 1 && !texto.chave.includes('menu')) return false;
    if (tabValue === 2 && !texto.chave.includes('estado')) return false;
    if (tabValue === 3 && !texto.chave.includes('catalogo')) return false;
    return true;
  });

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Textos do Sistema
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadTextos}
            disabled={loading}
          >
            Atualizar
          </Button>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            Novo Texto
          </Button>

          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={handleImportDefault}
          >
            Importar Padrão
          </Button>

          <Button
            variant="contained"
            startIcon={<ContentCopyIcon />}
            onClick={handleExport}
          >
            Exportar
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por chave ou conteúdo..."
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
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filterActive}
                    onChange={(e) => setFilterActive(e.target.checked)}
                  />
                }
                label="Mostrar apenas ativos"
              />

              <Chip
                label={`${filteredTextos.length} textos`}
                color="info"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Todos" />
          <Tab label="Menus" />
          <Tab label="Estados FSM" />
          <Tab label="Catálogo" />
          <Tab label="Sistema" />
        </Tabs>
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        {loading && <LinearProgress />}

        <DataGrid
          rows={filteredTextos}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          checkboxSelection={false}
          disableSelectionOnClick
          localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
          getRowId={(row) => row.chave}
          onRowClick={(params) => handleOpenDialog('edit', params.row)}
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              cursor: 'pointer',
            },
          }}
        />
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={previewMode}
      >
        <DialogTitle>
          {dialogType === 'create' ? 'Novo Texto' : 'Editar Texto'}
          {selectedTexto && ` - ${selectedTexto.chave}`}
        </DialogTitle>

        <DialogContent>
          {dialogType === 'create' && (
            <TextField
              fullWidth
              label="Chave"
              value={formData.chave}
              onChange={(e) => setFormData({ ...formData, chave: e.target.value })}
              margin="normal"
              helperText="Ex: menu.principal, catalogo.titulo, sistema.erro"
              required
            />
          )}

          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">
                Conteúdo
              </Typography>

              <Box>
                <Tooltip title="Pré-visualizar WhatsApp">
                  <IconButton
                    size="small"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <WhatsAppIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Copiar conteúdo">
                  <IconButton
                    size="small"
                    onClick={() => handleCopyContent(formData.conteudo)}
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={previewMode ? 20 : 10}
              value={formData.conteudo}
              onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
              placeholder="Digite o conteúdo do texto..."
              required
              sx={{
                fontFamily: previewMode ? 'monospace' : 'inherit',
                fontSize: previewMode ? '14px' : 'inherit',
              }}
            />
          </Box>

          {dialogType === 'create' && (
            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                />
              }
              label="Ativo"
              sx={{ mt: 2 }}
            />
          )}

          {previewMode && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Modo pré-visualização: Formatação como será exibida no WhatsApp
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {dialogType === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TextosCms;
