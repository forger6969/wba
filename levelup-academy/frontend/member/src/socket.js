import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { mockChatSend } from './api.js';

let socket = null;
let currentToken = null;

const USE_MOCKS =
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_USE_MOCKS !== 'false' : true;

// -------- MOCK SOCKET --------
class MockSocket {
  constructor() {
    this._handlers = {};
    this.connected = false;
    this.id = 'mock-socket-id';
    setTimeout(() => {
      this.connected = true;
      this._emit('connect');
    }, 100);
  }

  on(event, handler) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(handler);
    return this;
  }

  off(event, handler) {
    if (!this._handlers[event]) return;
    this._handlers[event] = this._handlers[event].filter((h) => h !== handler);
    return this;
  }

  emit(event, data, ack) {
    // Handle ack callback
    if (typeof data === 'function') {
      ack = data;
      data = {};
    }

    if (event === 'chat:global:send' && data?.body) {
      // Simulate sending — create message and broadcast
      const user = JSON.parse(localStorage.getItem('mock_member_user') || '{}');
      const msg = mockChatSend('global', data.body, user);
      ack?.({ ok: true, id: msg.id });
      // Simulate broadcast
      setTimeout(() => this._emit('chat:global:message', msg), 50);
      return;
    }

    if (event === 'chat:dm:reply' && data?.staffId && data?.body) {
      // Родитель отвечает в существующую комнату dm:<staffId>:<parentId>
      const user = JSON.parse(localStorage.getItem('mock_member_user') || '{}');
      const roomKey = `dm:${data.staffId}:${user.id}`;
      const msg = mockChatSend(roomKey, data.body, user);
      ack?.({ ok: true, id: msg.id, roomKey });
      setTimeout(() => this._emit('chat:dm:message', msg), 50);
      return;
    }

    ack?.({ ok: true });
  }

  _emit(event, data) {
    (this._handlers[event] || []).forEach((h) => h(data));
  }

  disconnect() {
    this.connected = false;
    this._emit('disconnect');
  }

  connect() {
    this.connected = true;
    this._emit('connect');
  }
}

let mockSocket = null;

function getMockSocket() {
  if (!mockSocket) mockSocket = new MockSocket();
  return mockSocket;
}

// -------- REAL SOCKET --------
function getRealSocket(token) {
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

// -------- PUBLIC --------
export function getSocket(token) {
  return USE_MOCKS ? getMockSocket() : getRealSocket(token);
}

export function disconnectSocket() {
  if (USE_MOCKS) {
    if (mockSocket) {
      mockSocket.disconnect();
      mockSocket = null;
    }
    return;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function useSocketConnected(token) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }
    const s = getSocket(token);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    if (s.connected) setConnected(true);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [token]);

  return connected;
}
