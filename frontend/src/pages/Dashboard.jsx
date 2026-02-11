import React from 'react'
import { Grid, Paper, Typography, Box, Card, CardContent } from '@mui/material'
import {
  People as PeopleIcon,
  Chat as ChatIcon,
  ShoppingCart as ShoppingCartIcon,
  Queue as QueueIcon,
} from '@mui/icons-material'

function Dashboard() {
  const stats = [
    { title: 'Clientes Ativos', value: '152', icon: <PeopleIcon />, color: 'primary.main' },
    { title: 'Conversas Hoje', value: '42', icon: <ChatIcon />, color: 'success.main' },
    { title: 'Vendas Pendentes', value: '8', icon: <ShoppingCartIcon />, color: 'warning.main' },
    { title: 'Na Fila', value: '3', icon: <QueueIcon />, color: 'error.main' },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Painel de Controle
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Bem-vindo ao sistema ReisTech. Aqui você pode gerenciar atendimentos, visualizar a fila humana e configurar o sistema.
      </Typography>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
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
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Atividade Recente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema funcionando normalmente.
              <br />
              Última mensagem processada: há 2 minutos
              <br />
              WhatsApp: Conectado
              <br />
              Última atualização: agora mesmo
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ações Rápidas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Verificar fila humana
              <br />
              • Visualizar conversas
              <br />
              • Atualizar catálogo
              <br />
              • Editar textos automáticos
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard