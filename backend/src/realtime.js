import { Server } from 'socket.io';

let io = null;

export function attachSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });
  io.on('connection', (socket) => {
    socket.emit('hello', { ok: true, ts: Date.now() });
  });
  return io;
}

export function emit(event, payload) {
  if (io) io.emit(event, payload);
}
