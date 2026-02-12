import { createSlice } from '@reduxjs/toolkit';

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
  },
  reducers: {
    addNotification: (state, action) => {
      const notification = {
        id: action.payload.id || `notification_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        read: false,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        ...action.payload,
      };
      state.items.unshift(notification);
      // Manter no máximo 100 notificações
      if (state.items.length > 100) {
        state.items = state.items.slice(0, 100);
      }
    },
    markAsRead: (state, action) => {
      const notification = state.items.find((n) => n.id === action.payload);
      if (notification) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
      }
    },
    markAllAsRead: (state) => {
      const now = new Date().toISOString();
      state.items.forEach((n) => {
        if (!n.read) {
          n.read = true;
          n.readAt = now;
        }
      });
    },
    clearNotifications: (state) => {
      state.items = [];
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} = notificationsSlice.actions;

// Seletores
export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadNotifications = (state) =>
  state.notifications.items.filter((n) => !n.read);
export const selectUnreadCount = (state) =>
  state.notifications.items.filter((n) => !n.read).length;

export default notificationsSlice.reducer;
