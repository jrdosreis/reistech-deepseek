import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import websocketReducer from './websocketSlice';
import notificationsReducer from './notificationsSlice';
import { setStore } from '../services/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    websocket: websocketReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

setStore(store);