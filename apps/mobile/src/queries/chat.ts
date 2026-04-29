import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/chat/conversations').then((r) => r.data),
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      api.get(`/chat/conversations/${conversationId}/messages`).then((r) => r.data),
    enabled: !!conversationId,
  });
}

export function useChatSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let socket: Socket;
    (async () => {
      const token = await SecureStore.getItemAsync('access_token');
      socket = io(`${process.env.EXPO_PUBLIC_SOCKET_URL}/chat`, {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;
    })();

    return () => {
      socket?.disconnect();
    };
  }, []);

  return socketRef;
}
