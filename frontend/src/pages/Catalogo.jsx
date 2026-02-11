import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Snackbar,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  WhatsApp as WhatsAppIcon,
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';
import { DataGrid, ptBR } from '@mui/x-data-grid';
import { useDropzone } from 'react-dropzone';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR as dateFnsPtBR } from 'date-fns/locale';

function Catalogo() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('create'); // 'create', 'edit', 'import', 'preview'
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    numero: '',
    familia: '',
    variante: '',
    capacidade: '',
    preco: '',
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewText, setPreviewText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadItens = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ativo: filterActive ? 'true' : undefined,
        search: searchTerm || undefined,
      };

      const response = await api.get('/catalogo', { params });
      setItens(response.data.data.items || response.data.data);
    } catch (error) {
      enqueueSnackbar('Erro ao carregar catálogo', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterActive, enqueueSnackbar]);

  useEffect(() => {
    loadItens();
  }, [loadItens]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setSelectedItem(item);

    if (type === 'edit' && item) {
      setFormData({
        numero: item.numero,
        familia: item.familia,
        variante: item.variante,
        capacidade: item.capacidade,
        preco: item.preco,
      });
    } else if (type === 'create') {
      setFormData({
        numero: '',
        familia: '',
        variante: '',
        capacidade: '',
        preco: '',
      });
    }

    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedItem(null);
    setUploadedFile(null);
    setPreviewText('');
  };

  const handleSubmit = async () => {
    try {
      if (dialogType === 'create') {
        await api.post('/catalogo', formData);
        enqueueSnackbar('Item criado com sucesso', { variant: 'success' });
      } else if (dialogType === 'edit' && selectedItem) {
        await api.put(`/catalogo/${selectedItem.id}`, formData);
        enqueueSnackbar('Item atualizado com sucesso', { variant: 'success' });
      }

      handleCloseDialog();
      loadItens();
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.error || 'Erro ao salvar item',
        { variant: 'error' }
      );
    }
  };

  const handleImport = async () => {
    if (!uploadedFile) {
      enqueueSnackbar('Selecione um arquivo CSV', { variant: 'warning' });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      await api.post('/catalogo/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      enqueueSnackbar('Catálogo importado com sucesso', { variant: 'success' });
      handleCloseDialog();
      loadItens();
    } catch (error) {
      enqueueSnackbar('Erro ao importar catálogo', { variant: 'error' });
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Tem certeza que deseja excluir o item ${item.numero}?`)) {
      return;
    }

    try {
      await api.delete(`/catalogo/${item.id}`);
      enqueueSnackbar('Item excluído com sucesso', { variant: 'success' });
      loadItens();
    } catch (error) {
      enqueueSnackbar('Erro ao excluir item', { variant: 'error' });
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await api.put(`/catalogo/${item.id}`,
        {
          ativo: !item.ativo,
        }
      );

      enqueueSnackbar(
        `Item ${item.ativo ? 'desativado' : 'ativado'} com sucesso`,
        { variant: 'success' }
      );
      loadItens();
    } catch (error) {
      enqueueSnackbar('Erro ao atualizar item', { variant: 'error' });
    }
  };

  const handlePreview = async () => {
    try {
      const response = await api.get('/catalogo/whatsapp-text');
      setPreviewText(response.data.data.text);
      setDialogType('preview');
      setDialogOpen(true);
    } catch (error) {
      enqueueSnackbar('Erro ao gerar pré-visualização', { variant: 'error' });
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(previewText);
    enqueueSnackbar('Texto copiado para a área de transferência', { variant: 'success' });
  };

  const formatarPreco = (preco) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(preco);
  };

  const getIconForVariant = (variante) => {
    const icons = {
      'Pro Max': '👑',
      'Pro': '🔶',
      'Plus': '🔹',
      'default': '🔸',
    };
    return icons[variante] || icons.default;
  };

  const columns = [
    {
      field: 'numero',
      headerName: 'Nº',
      width: 80,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color="primary"
          variant="outlined"
        />
      ),
    },
    {
      field: 'familia',
      headerName: 'Família',
      width: 150,
    },
    {
      field: 'variante',
      headerName: 'Variante',
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{getIconForVariant(params.value)}</Typography>
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: 'capacidade',
      headerName: 'Capacidade',
      width: 100,
    },
    {
      field: 'preco',
      headerName: 'Preço',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {formatarPreco(params.value)}
        </Typography>
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

          <Tooltip title={params.row.ativo ? 'Desativar' : 'Ativar'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleActive(params.row);
              }}
            >
              {params.row.ativo ? (
                <CancelIcon fontSize="small" />
              ) : (
                <CheckCircleIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Excluir">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.row);
              }}
            >
              <DeleteIcon fontSize="small" />
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
          Catálogo
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadItens}
            disabled={loading}
          >
            Atualizar
          </Button>

          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => handleOpenDialog('import')}
          >
            Importar CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<WhatsAppIcon />}
            onClick={handlePreview}
          >
            Pré-visualizar WhatsApp
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            Novo Item
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar por família, variante..."
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
                label={`${itens.length} itens`}
                color="info"
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        {loading && <LinearProgress />}

        <DataGrid
          rows={itens}
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

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {dialogType === 'create' || dialogType === 'edit' ? (
          <>
            <DialogTitle>
              {dialogType === 'create' ? 'Novo Item' : 'Editar Item'}
            </DialogTitle>

            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Número"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    type="number"
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Família"
                    value={formData.familia}
                    onChange={(e) => setFormData({ ...formData, familia: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Variante"
                    value={formData.variante}
                    onChange={(e) => setFormData({ ...formData, variante: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Capacidade"
                    value={formData.capacidade}
                    onChange={(e) => setFormData({ ...formData, capacidade: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Preço"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    }}
                    required
                  />
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancelar</Button>
              <Button onClick={handleSubmit} variant="contained">
                {dialogType === 'create' ? 'Criar' : 'Salvar'}
              </Button>
            </DialogActions>
          </>
        ) : dialogType === 'import' ? (
          <>
            <DialogTitle>Importar Catálogo</DialogTitle>

            <DialogContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                Formato CSV esperado: numero,familia,variante,capacidade,preco
              </Alert>

              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  borderRadius: 1,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDragActive ? 'primary.light' : 'grey.50',
                }}
              >
                <input {...getInputProps()} />

                <AttachFileIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />

                <Typography variant="h6" gutterBottom>
                  {uploadedFile ? uploadedFile.name : 'Arraste e solte o arquivo CSV'}
                </Typography>

                <Typography variant="body2" color="textSecondary">
                  ou clique para selecionar
                </Typography>

                <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
                  Apenas arquivos .csv são aceitos
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancelar</Button>
              <Button
                onClick={handleImport}
                variant="contained"
                disabled={!uploadedFile}
              >
                Importar
              </Button>
            </DialogActions>
          </>
        ) : dialogType === 'preview' ? (
          <>
            <DialogTitle>Pré-visualização WhatsApp</DialogTitle>

            <DialogContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                Este é o texto que será enviado no WhatsApp quando o cliente solicitar o catálogo
              </Alert>

              <Paper
                sx={{
                  p: 2,
                  backgroundColor: 'grey.100',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                {previewText}
              </Paper>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseDialog}>Fechar</Button>
              <Button onClick={handleCopyToClipboard} variant="contained">
                Copiar para Área de Transferência
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Box>
  );
}

export default Catalogo;
