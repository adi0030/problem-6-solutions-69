'use client';

import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;
  const token = await getToken();
  if (!token) throw new Error('not_authenticated');
  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }
  socket = io({
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
