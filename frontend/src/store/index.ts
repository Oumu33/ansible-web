import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import hostsSlice from './slices/hostsSlice';
import playbooksSlice from './slices/playbooksSlice';
import tasksSlice from './slices/tasksSlice';
import dashboardSlice from './slices/dashboardSlice';
import templatesSlice from './slices/templatesSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    hosts: hostsSlice,
    playbooks: playbooksSlice,
    tasks: tasksSlice,
    dashboard: dashboardSlice,
    templates: templatesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;