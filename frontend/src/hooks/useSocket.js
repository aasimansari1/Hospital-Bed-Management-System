import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getApiUrl } from '../api.js';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(getApiUrl(), { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function useSocket(events) {
  const ref = useRef(events);
  ref.current = events;

  useEffect(() => {
    const s = getSocket();
    const eventNames = Object.keys(ref.current || {});
    const handlers = eventNames.map((evt) => {
      const fn = (...args) => ref.current?.[evt]?.(...args);
      s.on(evt, fn);
      return [evt, fn];
    });
    return () => handlers.forEach(([evt, fn]) => s.off(evt, fn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
