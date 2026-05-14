import React, { useState, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMessages, useChatSocket } from '../../queries/chat';
import { useAuthStore } from '../../store/auth.store';
import { theme, spacing, typography } from '../../theme';
import { pickAndUploadImage } from '../../utils/upload';

export default function ChatScreen({ route }: any) {
  const { conversationId } = route.params;
  const user = useAuthStore((s) => s.user);
  const { data: initialMessages, refetch } = useMessages(conversationId);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const socketRef = useChatSocket();
  const listRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    socket.on('typing', (data: any) => {
      if (data?.userId === user?.id) return; // ignore own typing echo
      setIsOtherTyping(true);
      listRef.current?.scrollToEnd({ animated: true });
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
      otherTypingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
    });

    return () => {
      socket.off('new-message');
      socket.off('typing');
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
    };
  }, [conversationId, socketRef, user?.id]);

  const handleTextChange = (value: string) => {
    setText(value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { conversationId, userId: user?.id });
    }, 1000);
  };

  const send = () => {
    if (!text.trim()) return;
    socketRef.current?.emit('send-message', { conversationId, text: text.trim() });
    setText('');
  };

  const handleAttach = async () => {
    setUploading(true);
    try {
      const url = await pickAndUploadImage('chat', `conversations/${conversationId}`);
      if (url) {
        socketRef.current?.emit('send-message', {
          conversationId,
          text: JSON.stringify({ type: 'image', url }),
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.id;

    let imageUrl: string | null = null;
    let displayText: string = item.text ?? '';
    try {
      const parsed = JSON.parse(item.text);
      if (parsed?.type === 'image' && parsed?.url) {
        imageUrl = parsed.url;
      }
    } catch {
      // plain text message — no-op
    }

    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.messageImage} resizeMode="cover" />
        ) : (
          <Text style={[styles.bubbleText, isMe ? styles.textMe : styles.textOther]}>
            {displayText}
          </Text>
        )}
      </View>
    );
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
          renderItem={renderMessage}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {isOtherTyping && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>Đang nhập...</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          {uploading ? (
            <ActivityIndicator size="small" style={styles.attachBtn} />
          ) : (
            <IconButton
              icon="paperclip"
              onPress={handleAttach}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.attachBtn}
            />
          )}
          <TextInput
            value={text}
            onChangeText={handleTextChange}
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
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  typingRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  typingText: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
  },
  attachBtn: { margin: 0 },
  input: { flex: 1 },
});
