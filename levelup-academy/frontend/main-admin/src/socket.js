import { createContext, createElement, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useAuth } from './auth.jsx';

/**
 * Live dashboard invalidation.
 *
 * Events intentionally contain no dashboard data. HTTP remains the canonical,
 * authorized source; the socket only tells React Query when that source changed.
 */
const DashboardLiveContext = createContext(false);

function useDashboardLiveConnection() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const refreshTimer = useRef(null);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return undefined;
    }

    const url = import.meta.env.VITE_API_URL || '';
    const socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });

    const invalidateLiveQueries = () => {
      ['dashboard', 'leads', 'actionCenter', 'revenue', 'invoices', 'orgDebt', 'partnerHealth']
        .forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    };
    const onConnect = () => {
      setConnected(true);
      // A reconnect may happen after the backend was restarted while React
      // Query still holds old data. Always reconcile with the HTTP source.
      invalidateLiveQueries();
    };
    const onDisconnect = () => setConnected(false);
    const onChanged = () => {
      // Several writes can complete together (onboarding, invoices). Coalesce
      // them into one network refresh instead of starting parallel requests.
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        invalidateLiveQueries();
      }, 250);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    socket.on('main:dashboard:changed', onChanged);

    return () => {
      clearTimeout(refreshTimer.current);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      socket.off('main:dashboard:changed', onChanged);
      socket.disconnect();
    };
  }, [token, queryClient]);

  return connected;
}

export function DashboardLiveProvider({ children }) {
  const connected = useDashboardLiveConnection();
  return createElement(DashboardLiveContext.Provider, { value: connected }, children);
}

export function useDashboardLive() {
  return useContext(DashboardLiveContext);
}
