// frontend/src/tests/Login.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Login from '../pages/Login';
import authReducer from '../store/authSlice';

const mockStore = configureStore({
  reducer: {
    auth: authReducer
  },
  preloadedState: {
    auth: {
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null
    }
  }
});

describe('Login Page', () => {
  const renderWithProviders = (ui, { store = mockStore, ...renderOptions } = {}) => {
    const Wrapper = ({ children }) => (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    );
    
    return render(ui, { wrapper: Wrapper, ...renderOptions });
  };
  
  it('deve renderizar o formulário de login', () => {
    renderWithProviders(<Login />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });
  
  it('deve mostrar erro quando campos estão vazios', async () => {
    renderWithProviders(<Login />);
    
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInvalid();
      expect(screen.getByLabelText(/senha/i)).toBeInvalid();
    });
  });
  
  it('deve enviar formulário com dados válidos', async () => {
    renderWithProviders(<Login />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });
    
    fireEvent.change(emailInput, { target: { value: 'admin@reiscelulares.com.br' } });
    fireEvent.change(passwordInput, { target: { value: 'Admin123!' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});

// frontend/src/tests/FilaHumana.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import FilaHumana from '../pages/FilaHumana';
import authReducer from '../store/authSlice';

// Mock da API
jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

import api from '../services/api';

const mockFilaData = {
  data: [
    {
      id: '1',
      cliente: {
        id: 'cliente-1',
        telefone: '+5511999999999',
        nome: 'João Silva'
      },
      status: 'waiting',
      created_at: '2024-01-28T10:00:00Z',
      motivo: 'Solicitação de orçamento'
    }
  ]
};

describe('Fila Humana Page', () => {
  let store;
  
  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer
      },
      preloadedState: {
        auth: {
          user: {
            id: 'user-123',
            nome: 'Admin',
            email: 'admin@reiscelulares.com.br',
            role: 'admin',
            workspace: {
              id: 'workspace-123',
              nome: 'Reis Celulares',
              slug: 'reis-celulares'
            }
          },
          isAuthenticated: true,
          loading: false,
          error: null
        }
      }
    });
    
    api.get.mockResolvedValue({ data: mockFilaData });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  const renderWithProviders = (ui) => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </Provider>
    );
  };
  
  it('deve carregar e exibir a fila', async () => {
    renderWithProviders(<FilaHumana />);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/fila');
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('+5511999999999')).toBeInTheDocument();
      expect(screen.getByText('Aguardando')).toBeInTheDocument();
    });
  });
  
  it('deve mostrar cards de estatísticas', async () => {
    renderWithProviders(<FilaHumana />);
    
    await waitFor(() => {
      expect(screen.getByText('Aguardando')).toBeInTheDocument();
      expect(screen.getByText('Em Atendimento')).toBeInTheDocument();
      expect(screen.getByText('Finalizados Hoje')).toBeInTheDocument();
    });
  });
});