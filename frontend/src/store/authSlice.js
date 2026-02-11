import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../services/api'

const serializeError = (error) => {
  if (error?.response?.data) {
    return error.response.data
  }

  return {
    error: error?.message || 'Erro de rede',
    code: 'NETWORK_ERROR',
  }
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials)
      const { accessToken, refreshToken, user } = response.data.data
      
      // Salvar usuário e accessToken para usar em requests
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('accessToken', accessToken)
      
      return { user, accessToken }
    } catch (error) {
      return rejectWithValue(serializeError(error))
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    console.error('Erro no logout:', error)
  } finally {
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
  }
})

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/refresh')
      const { accessToken } = response.data.data
      localStorage.setItem('accessToken', accessToken)
      return { accessToken }
    } catch (error) {
      return rejectWithValue(serializeError(error))
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('user')) || null,
    accessToken: localStorage.getItem('accessToken'),
    isAuthenticated: !!localStorage.getItem('user'),
    loading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.error || 'Erro ao fazer login'
      })
      
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
      })
      
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false
        state.user = null
        state.accessToken = null
        localStorage.clear()
      })
  },
})

export const { setUser, clearError } = authSlice.actions
export default authSlice.reducer