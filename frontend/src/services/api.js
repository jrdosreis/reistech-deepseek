import axios from 'axios'
import { logout, refreshToken } from '../store/authSlice'

let storeRef

export const setStore = (store) => {
  storeRef = store
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const accessToken = storeRef?.getState?.().auth?.accessToken || localStorage.getItem('accessToken')
  if (accessToken) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${accessToken}`,
    }
  }
  return config
})

// Interceptor para tratar erros e refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Tentar refresh token
        if (storeRef) {
          await storeRef.dispatch(refreshToken()).unwrap()
        }
        
        // Reenviar a requisição original
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh falhou, fazer logout
        if (storeRef) {
          storeRef.dispatch(logout())
        }
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Se for erro 403, redirecionar para login
    if (error.response?.status === 403) {
      if (storeRef) {
        storeRef.dispatch(logout())
      }
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api