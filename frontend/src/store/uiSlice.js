import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    loading: false,
    notifications: [],
    currentWorkspace: null,
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    setCurrentWorkspace: (state, action) => {
      state.currentWorkspace = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setLoading,
  addNotification,
  removeNotification,
  setCurrentWorkspace,
} = uiSlice.actions;

export default uiSlice.reducer;