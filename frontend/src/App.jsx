import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Box, CircularProgress } from '@mui/material'
import React, { lazy, Suspense } from 'react'

// Lazy-loaded pages (code splitting)
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const FilaHumana = lazy(() => import('./pages/FilaHumana'))
const Conversas = lazy(() => import('./pages/Conversas'))
const Catalogo = lazy(() => import('./pages/Catalogo'))
const TextosCms = lazy(() => import('./pages/TextosCms'))
const WhatsApp = lazy(() => import('./pages/WhatsApp'))
const Configuracao = lazy(() => import('./pages/Configuracao'))
const Relatorios = lazy(() => import('./pages/Relatorios'))

// Components (carregamento normal – críticos para layout)
import Layout from './components/layout/Layout'
import PrivateRoute from './components/layout/PrivateRoute'

const PageLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
    <CircularProgress />
  </Box>
)

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
    <Suspense fallback={<PageLoader />}>
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
          <Route index element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="fila" element={<FilaHumana />} />
          <Route path="conversas" element={<Conversas />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="textos" element={<TextosCms />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="configuracao" element={<Configuracao />} />
        </Route>
        
        <Route path="/" element={<Navigate to="/painel" />} />
        <Route path="*" element={<Navigate to="/painel" />} />
      </Routes>
    </Suspense>
  )
}

export default App