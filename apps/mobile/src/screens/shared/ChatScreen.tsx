import React, { useState, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMessages, useChatSocket } from '../../queries/chat';
import { useAuthStore } from '../../store/auth.store';
import { theme, spacing, typography } from '../../theme';

export default function ChatScreen({ route }: any) {
  const { conversationId } = route.params;
  const user = useAuthStore((s) => s.user);
  const { data: initialMessages, refetch } = useMessages(conversationId);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const socketRef = useChatSocket();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (initialMessages) setMessages([...initialMessages].reverse());
  }, [initialMessages]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit('join-conversation', { conversationId });
    socket.on('new-message', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
      listRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      socket.off('new-message');
    };
  }, [conversationId, socketRef]);

  const send = () => {
    if (!text.trim()) return;
    socketRef.current?.emit('send-message', { conversationId, text: text.trim() });
    setText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isMe ? styles.textMe : styles.textOther]}>
                  {item.text}
                </Text>
              </View>
            );
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Nhắn tin..."
            mode="outlined"
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <IconButton icon="send" onPress={send} iconColor={theme.colors.primary} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.xs },
  bubble: {
    maxWidth: '75%',
    padding: spacing.sm,
    borderRadius: 12,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceVariant,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { ...typography.body },
  textMe: { color: '#fff' },
  textOther: { color: theme.colors.onSurface },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
  },
  input: { flex: 1 },
});
