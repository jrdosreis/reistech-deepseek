import { createSlice } from '@reduxjs/toolkit';

const websocketSlice = createSlice({
  name: 'websocket',
  initialState: {
    isConnected: false,
    lastMessage: null,
    filaUpdates: [],
    newMessages: [],
  },
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    addNewMessage: (state, action) => {
      state.lastMessage = action.payload;
      state.newMessages.push(action.payload);
      // Manter apenas últimas 100 mensagens no state
      if (state.newMessages.length > 100) {
        state.newMessages = state.newMessages.slice(-100);
      }
    },
    addFilaUpdate: (state, action) => {
      state.filaUpdates.push(action.payload);
      if (state.filaUpdates.length > 50) {
        state.filaUpdates = state.filaUpdates.slice(-50);
      }
    },
    clearMessages: (state) => {
      state.newMessages = [];
      state.lastMessage = null;
    },
    clearFilaUpdates: (state) => {
      state.filaUpdates = [];
    },
  },
});

export const {
  setConnected,
  addNewMessage,
  addFilaUpdate,
  clearMessages,
  clearFilaUpdates,
} = websocketSlice.actions;

export default websocketSlice.reducer;
