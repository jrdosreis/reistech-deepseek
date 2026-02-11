import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Box, CircularProgress } from '@mui/material'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FilaHumana from './pages/FilaHumana'
import Conversas from './pages/Conversas'
import Catalogo from './pages/Catalogo'
import TextosCms from './pages/TextosCms'
import WhatsApp from './pages/WhatsApp'
import Configuracao from './pages/Configuracao'

// Components
import Layout from './components/layout/Layout'
import PrivateRoute from './components/layout/PrivateRoute'

function App() {
  const { isAuthenticated, loading } = useSelector((state) => state.auth)

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/painel" /> : <Login />}
      />
      
      <Route
        path="/painel"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="fila" />} />
        <Route path="fila" element={<FilaHumana />} />
        <Route path="conversas" element={<Conversas />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="textos" element={<TextosCms />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="configuracao" element={<Configuracao />} />
      </Route>
      
      <Route path="/" element={<Navigate to="/painel" />} />
      <Route path="*" element={<Navigate to="/painel" />} />
    </Routes>
  )
}

export default App