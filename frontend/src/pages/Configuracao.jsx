import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function Configuracao() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [workspaceData, setWorkspaceData] = useState(null);
  const [verticalPacks, setVerticalPacks] = useState([]);
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'new-workspace', 'new-user', 'import-pack', 'export-pack'
  const [formData, setFormData] = useState({});
  const [importFile, setImportFile] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const { enqueueSnackbar } = useSnackbar();

  const loadWorkspaceData = useCallback(async () => {
    setLoading(true);
    try {
      // Carregar dados do workspace atual
      const [workspaceResponse, packsResponse, usersResponse] = await Promise.all([
        api.get('/admin/workspaces/current'),
        api.get('/admin/vertical-packs'),
        api.get('/admin/users'),
      ]);

      setWorkspaceData(workspaceResponse.data.data);
      setVerticalPacks(packsResponse.data.data);
      setUsers(usersResponse.data.data);
    } catch (error) {
      enqueueSnackbar('Erro ao carregar configurações', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleSaveWorkspace = async () => {
    try {
      await api.put('/admin/workspaces/current', workspaceData);
      enqueueSnackbar('Configurações salvas com sucesso', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erro ao salvar configurações', { variant: 'error' });
    }
  };

  const handleCreateWorkspace = async () => {
    try {
      await api.post('/admin/workspaces', formData);
      enqueueSnackbar('Workspace criado com sucesso', { variant: 'success' });
      setDialogOpen(false);
      loadWorkspaceData();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao criar workspace', { variant: 'error' });
    }
  };

  const handleImportPack = async () => {
    if (!importFile) {
      enqueueSnackbar('Selecione um arquivo JSON', { variant: 'warning' });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const packData = JSON.parse(e.target.result);
        await api.post('/admin/workspaces/current/import-pack', packData);
        enqueueSnackbar('Pack importado com sucesso', { variant: 'success' });
        setDialogOpen(false);
        loadWorkspaceData();
      };
      reader.readAsText(importFile);
    } catch (error) {
      enqueueSnackbar('Erro ao importar pack', { variant: 'error' });
    }
  };

  const handleExportPack = async () => {
    try {
      const response = await api.get('/admin/workspaces/current/export-pack');
      setExportData(response.data);
      setDialogType('export-pack');
      setDialogOpen(true);
    } catch (error) {
      enqueueSnackbar('Erro ao exportar pack', { variant: 'error' });
    }
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    enqueueSnackbar('JSON copiado para a área de transferência', { variant: 'success' });
  };

  const handleDownloadExport = () => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pack-${workspaceData?.slug}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleChangeVertical = async (verticalKey) => {
    if (!window.confirm(`Alterar para o nicho ${verticalKey}? Isso substituirá todos os textos e configurações.`)) {
      return;
    }

    try {
      await api.post('/admin/workspaces/current/vertical', { vertical_key: verticalKey });
      enqueueSnackbar('Nicho alterado com sucesso', { variant: 'success' });
      loadWorkspaceData();
    } catch (error) {
      enqueueSnackbar('Erro ao alterar nicho', { variant: 'error' });
    }
  };

  const steps = ['Configurar Workspace', 'Escolher Nicho', 'Importar Dados', 'Concluir'];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Configuração do Sistema
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveWorkspace}
          disabled={loading}
        >
          Salvar Alterações
        </Button>
      </Box>

      {/* Stepper para novo workspace */}
      {dialogType === 'new-workspace' && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      {/* Tabs principais */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<BusinessIcon />} label="Workspace" />
          <Tab icon={<CategoryIcon />} label="Nicho" />
          <Tab icon={<PeopleIcon />} label="Usuários" />
          <Tab icon={<SettingsIcon />} label="Sistema" />
          <Tab icon={<DownloadIcon />} label="Importar/Exportar" />
        </Tabs>
      </Paper>

      {/* Conteúdo das tabs */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tabValue === 0 && workspaceData && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Informações do Workspace
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Nome do Negócio"
                      value={workspaceData.nome || ''}
                      onChange={(e) => setWorkspaceData({ ...workspaceData, nome: e.target.value })}
                      margin="normal"
                    />
                    
                    <TextField
                      fullWidth
                      label="Slug (URL)"
                      value={workspaceData.slug || ''}
                      onChange={(e) => setWorkspaceData({ ...workspaceData, slug: e.target.value })}
                      margin="normal"
                      helperText="Ex: reis-celulares, minha-advocacia"
                    />
                    
                    <TextField
                      fullWidth
                      label="Fuso Horário"
                      value={workspaceData.timezone || 'America/Sao_Paulo'}
                      onChange={(e) => setWorkspaceData({ ...workspaceData, timezone: e.target.value })}
                      margin="normal"
                      select
                    >
                      <MenuItem value="America/Sao_Paulo">São Paulo (GMT-3)</MenuItem>
                      <MenuItem value="America/Manaus">Manaus (GMT-4)</MenuItem>
                      <MenuItem value="America/Rio_Branco">Rio Branco (GMT-5)</MenuItem>
                    </TextField>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={workspaceData.ativo !== false}
                          onChange={(e) => setWorkspaceData({ ...workspaceData, ativo: e.target.checked })}
                        />
                      }
                      label="Workspace Ativo"
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Estatísticas
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Data de Criação"
                          secondary={workspaceData.created_at ? 
                            format(new Date(workspaceData.created_at), 'PPpp', { locale: ptBR }) : 
                            'Não disponível'
                          }
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Nicho Atual"
                          secondary={
                            <Chip
                              label={workspaceData.vertical_key || 'Não definido'}
                              color="primary"
                              size="small"
                            />
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Total de Usuários"
                          secondary={users.length}
                        />
                      </ListItem>
                      
                      <ListItem>
                        <ListItemText
                          primary="Status"
                          secondary={
                            <Chip
                              label={workspaceData.ativo ? 'Ativo' : 'Inativo'}
                              color={workspaceData.ativo ? 'success' : 'error'}
                              size="small"
                            />
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {tabValue === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6">
                        Nichos Disponíveis
                      </Typography>
                      
                      <Button
                        variant="outlined"
                        startIcon={<InfoIcon />}
                        onClick={() => window.open('/docs/nichos', '_blank')}
                      >
                        Documentação dos Nichos
                      </Button>
                    </Box>
                    
                    <Grid container spacing={2}>
                      {verticalPacks.map((pack) => (
                        <Grid item xs={12} sm={6} md={4} key={pack.key}>
                          <Paper
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              border: workspaceData?.vertical_key === pack.key ? 2 : 1,
                              borderColor: workspaceData?.vertical_key === pack.key ? 'primary.main' : 'divider',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            }}
                            onClick={() => handleChangeVertical(pack.key)}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Chip
                                label={pack.key}
                                color={workspaceData?.vertical_key === pack.key ? 'primary' : 'default'}
                                size="small"
                                sx={{ mr: 2 }}
                              />
                              
                              {workspaceData?.vertical_key === pack.key && (
                                <CheckCircleIcon color="success" />
                              )}
                            </Box>
                            
                            <Typography variant="subtitle1" gutterBottom>
                              {pack.name}
                            </Typography>
                            
                            <Typography variant="body2" color="textSecondary" paragraph>
                              {pack.description}
                            </Typography>
                            
                            <Typography variant="caption" color="textSecondary">
                              Versão: {pack.version}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                    
                    <Alert severity="info" sx={{ mt: 3 }}>
                      Ao escolher um nicho, todos os textos, menus e fluxos serão substituídos pelos padrões do nicho selecionado.
                      Recomenda-se exportar a configuração atual antes de mudar.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {tabValue === 2 && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Usuários do Sistema
                  </Typography>
                  
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setDialogType('new-user');
                      setFormData({});
                      setDialogOpen(true);
                    }}
                  >
                    Novo Usuário
                  </Button>
                </Box>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Perfil</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Último Login</TableCell>
                        <TableCell>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" fontWeight="medium">
                                {user.nome}
                              </Typography>
                              {user.id === workspaceData?.owner_id && (
                                <Chip label="Owner" size="small" sx={{ ml: 1 }} />
                              )}
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">{user.email}</Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Chip
                              label={user.role}
                              color={
                                user.role === 'admin' ? 'error' :
                                user.role === 'supervisor' ? 'warning' :
                                user.role === 'operator' ? 'info' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          
                          <TableCell>
                            <Chip
                              label={user.ativo ? 'Ativo' : 'Inativo'}
                              color={user.ativo ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2">
                              {user.last_login_at ? 
                                format(new Date(user.last_login_at), 'dd/MM/yyyy HH:mm') : 
                                'Nunca'
                              }
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Tooltip title="Editar">
                              <IconButton size="small">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title={user.ativo ? 'Desativar' : 'Ativar'}>
                              <IconButton size="small">
                                {user.ativo ? (
                                  <ErrorIcon fontSize="small" color="error" />
                                ) : (
                                  <CheckCircleIcon fontSize="small" color="success" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Configurações do WhatsApp
                    </Typography>
                    
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Mensagem de Boas-vindas Automática"
                      sx={{ mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Horário Comercial Automático"
                      sx={{ mb: 1 }}
                    />
                    
                    <TextField
                      fullWidth
                      label="Mensagem Fora do Horário"
                      multiline
                      rows={3}
                      defaultValue="Estamos fora do horário de atendimento. Responderemos assim que possível."
                      margin="normal"
                    />
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Horário de Atendimento
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map((day) => (
                        <Grid item xs={12} key={day}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography sx={{ width: 80 }}>{day}</Typography>
                            <TextField
                              size="small"
                              type="time"
                              defaultValue="09:00"
                              sx={{ width: 100 }}
                            />
                            <Typography>até</Typography>
                            <TextField
                              size="small"
                              type="time"
                              defaultValue="18:00"
                              sx={{ width: 100 }}
                            />
                            <Switch defaultChecked={day !== 'Domingo'} />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Configurações do Sistema
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Timeout da Sessão (minutos)"
                      type="number"
                      defaultValue={30}
                      margin="normal"
                    />
                    
                    <TextField
                      fullWidth
                      label="Máximo de Tentativas"
                      type="number"
                      defaultValue={3}
                      margin="normal"
                    />
                    
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Auto-escalonamento Habilitado"
                      sx={{ mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Logs Detalhados"
                      sx={{ mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Backup Automático"
                      sx={{ mb: 1 }}
                    />
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Limites do Sistema
                    </Typography>
                    
                    <TextField
                      fullWidth
                      label="Máximo de Clientes por Workspace"
                      type="number"
                      defaultValue={10000}
                      margin="normal"
                      size="small"
                    />
                    
                    <TextField
                      fullWidth
                      label="Máximo de Mensagens por Dia"
                      type="number"
                      defaultValue={1000}
                      margin="normal"
                      size="small"
                    />
                    
                    <TextField
                      fullWidth
                      label="Tamanho Máximo de Upload (MB)"
                      type="number"
                      defaultValue={10}
                      margin="normal"
                      size="small"
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {tabValue === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Exportar Configuração
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 3 }}>
                      Exporte toda a configuração do seu workspace (textos, menus, fluxos) para usar em outro workspace ou como backup.
                    </Alert>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Configuração Completa"
                          secondary="Inclui todos os textos, configurações e templates"
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportPack}
                          >
                            Exportar JSON
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider />
                      
                      <ListItem>
                        <ListItemText
                          primary="Apenas Textos CMS"
                          secondary="Exporta apenas os textos editáveis do sistema"
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            disabled
                          >
                            Exportar CSV
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                      
                      <Divider />
                      
                      <ListItem>
                        <ListItemText
                          primary="Catálogo de Produtos"
                          secondary="Exporta o catálogo completo em formato CSV"
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            disabled
                          >
                            Exportar CSV
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Importar Configuração
                    </Typography>
                    
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      A importação substituirá todas as configurações atuais. Faça backup antes de importar.
                    </Alert>
                    
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'grey.400',
                        borderRadius: 1,
                        p: 4,
                        textAlign: 'center',
                        mb: 3,
                      }}
                      onClick={() => {
                        setDialogType('import-pack');
                        setDialogOpen(true);
                      }}
                    >
                      <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        Arraste e solte o arquivo JSON
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        ou clique para selecionar
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 2 }}>
                        Formato: .json (configuração do pack)
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Opções Avançadas
                    </Typography>
                    
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Manter configurações existentes"
                      sx={{ mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={<Switch />}
                      label="Importar apenas textos"
                      sx={{ mb: 1 }}
                    />
                    
                    <FormControlLabel
                      control={<Switch />}
                      label="Importar apenas fluxos"
                      sx={{ mb: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {/* Dialogs */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth={dialogType === 'export-pack' ? 'lg' : 'sm'}
        fullWidth
      >
        {dialogType === 'new-workspace' && (
          <>
            <DialogTitle>Criar Novo Workspace</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Nome do Negócio"
                fullWidth
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
              
              <TextField
                margin="dense"
                label="Slug"
                fullWidth
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                helperText="Ex: minha-loja, meu-escritorio"
              />
              
              <FormControl fullWidth margin="dense">
                <InputLabel>Nicho</InputLabel>
                <Select
                  value={formData.vertical_key || ''}
                  label="Nicho"
                  onChange={(e) => setFormData({ ...formData, vertical_key: e.target.value })}
                >
                  {verticalPacks.map((pack) => (
                    <MenuItem key={pack.key} value={pack.key}>
                      {pack.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateWorkspace} variant="contained">
                Criar Workspace
              </Button>
            </DialogActions>
          </>
        )}
        
        {dialogType === 'import-pack' && (
          <>
            <DialogTitle>Importar Pack de Configuração</DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Esta ação substituirá todas as configurações atuais do workspace.
              </Alert>
              
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files[0])}
                style={{ marginBottom: '16px' }}
              />
              
              {importFile && (
                <Alert severity="info">
                  Arquivo selecionado: {importFile.name}
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleImportPack} 
                variant="contained"
                disabled={!importFile}
              >
                Importar
              </Button>
            </DialogActions>
          </>
        )}
        
        {dialogType === 'export-pack' && exportData && (
          <>
            <DialogTitle>Exportar Configuração</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyExport}
                >
                  Copiar JSON
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadExport}
                >
                  Download JSON
                </Button>
              </Box>
              
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: 'grey.100',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {JSON.stringify(exportData, null, 2)}
              </Paper>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default Configuracao;