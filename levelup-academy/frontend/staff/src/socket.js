import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { USING_MOCKS } from './api.js';

let socket = null;
let currentToken = null;

/** Получить (или создать) socket-соединение с бэкендом */
export function getSocket(token) {
  // Если токен сменился — переподключаемся
  if (currentToken !== token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    currentToken = token;
  }

  if (socket?.connected) return socket;

  const url = typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_URL || '' : '';

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err.message);
  });

  return socket;
}

/** Отключить сокет */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Запрос по сокету с ответом (ack) и обязательным таймаутом.
 *
 * Без таймаута обещание висело бы вечно: если соединение оборвалось между
 * emit и ответом, socket.io не сообщит об этом — коллбэк просто не вызовется,
 * и журнал остался бы в состоянии «сохраняю...» навсегда.
 */
export function socketRequest(token, event, payload, { timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const s = getSocket(token);

    if (!s.connected) {
      // Сразу говорим «нет связи», чтобы вызывающий успел уйти на запасной путь,
      // а не ждал восемь секунд на глазах у пользователя.
      reject(new Error('socket_disconnected'));
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('socket_timeout'));
    }, timeout);

    s.emit(event, payload, (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (res?.ok) resolve(res);
      else reject(new Error(res?.error || 'socket_error'));
    });
  });
}

/** Отметить давомат по сокету. Ответ — сохранённые записи. */
export function markAttendanceSocket(token, { groupId, lessonDate, records }) {
  return socketRequest(token, 'attendance:mark', { groupId, lessonDate, records });
}

/** Прочитать журнал по сокету (date либо from+to). */
export function fetchAttendanceSocket(token, { groupId, ...query }) {
  return socketRequest(token, 'attendance:fetch', { groupId, ...query });
}

/**
 * Live-обновления журнала davomat по группе.
 *
 * Подписка серверная (`attendance:subscribe` → комната группы), поэтому её
 * НУЖНО повторять после каждого reconnect: socket.io при разрыве теряет все
 * комнаты, и без повторного subscribe страница молча перестала бы обновляться.
 *
 * `onUpdate` держим в ref — иначе новая ссылка на колбэк при каждом рендере
 * пересоздавала бы подписку.
 */
export function useAttendanceLive(token, groupId, onUpdate) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    if (!token || !groupId || USING_MOCKS) return undefined;

    const s = getSocket(token);
    const subscribe = () => s.emit('attendance:subscribe', { groupId });

    if (s.connected) subscribe();
    s.on('connect', subscribe); // и при первом connect, и после каждого реконнекта

    const handler = (payload) => {
      if (payload?.groupId === groupId) cbRef.current?.(payload);
    };
    s.on('attendance:updated', handler);

    return () => {
      s.off('attendance:updated', handler);
      s.off('connect', subscribe);
      s.emit('attendance:unsubscribe', { groupId });
    };
  }, [token, groupId]);
}
