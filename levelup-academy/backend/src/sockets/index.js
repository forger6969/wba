import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '../config/env.js';
import { redis, redisPub, redisSub } from '../config/redis.js';
import { socketAuth } from './socketAuth.js';
import { registerPresence } from './presence.js';
import { registerChat } from './chat.js';
import { registerAttendance } from './attendance.js';
import { setIO } from './io.js';

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    // Фронты живут на разных поддоменах (staff./member./owner.levelup-academy.uz)
    // + dev-инстансы, поэтому отражаем Origin запроса (как и HTTP-CORS в app.js),
    // а не привязываемся к одному CLIENT_URL. Доступ всё равно закрыт socketAuth (JWT).
    cors: { origin: true, credentials: true },
  });

  io.adapter(createAdapter(redisPub, redisSub)); // масштабирование на N инстансов
  io.use(socketAuth);                            // JWT из handshake.auth.token → socket.user

  io.on('connection', (socket) => {
    // Platform-wide live updates are private to Main Admin accounts. Joining
    // server-side from the verified JWT avoids a client-controlled subscribe.
    if (socket.user?.role === 'main_admin') socket.join('main-admins');
    registerPresence(io, socket, redis);
    registerChat(io, socket, redis);
    registerAttendance(io, socket);
  });

  setIO(io); // даёт сервисам (davomat и т.п.) слать live-события из HTTP-слоя
  return io;
}
