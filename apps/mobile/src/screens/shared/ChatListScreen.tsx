import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, Card, Avatar, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useConversations } from '../../queries/chat';
import { useAuthStore } from '../../store/auth.store';
import EmptyState from '../../components/EmptyState';
import { theme, spacing, typography } from '../../theme';

export default function ChatListScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const { data: conversations, isLoading, refetch } = useConversations();

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={(item: any) => item.id}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => {
            const other = user?.role === 'chu_nha' ? item.tenant : item.landlord;
            const lastMsg = item.messages?.[0];
            const unread =
              user?.role === 'chu_nha'
                ? item.landlordUnreadCount
                : item.tenantUnreadCount;
            return (
              <Card
                style={styles.card}
                onPress={() => navigation.navigate('ChatScreen', { conversationId: item.id })}
              >
                <Card.Content style={styles.row}>
                  <Avatar.Text
                    size={48}
                    label={other?.fullName?.charAt(0) ?? '?'}
                    style={styles.avatar}
                  />
                  <View style={styles.info}>
                    <Text style={styles.name}>{other?.fullName}</Text>
                    <Text style={styles.preview} numberOfLines={1}>
                      {lastMsg?.text ?? ''}
                    </Text>
                  </View>
                  <View style={styles.meta}>
                    <Text style={styles.time}>
                      {lastMsg ? dayjs(lastMsg.createdAt).format('HH:mm') : ''}
                    </Text>
                    {unread > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unread}</Text>
                      </View>
                    )}
                  </View>
                </Card.Content>
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="chat-processing-outline"
              title="Chưa có tin nhắn"
              description="Bạn chưa có cuộc trò chuyện nào."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, marginTop: spacing.xl },
  card: { marginHorizontal: spacing.md, marginBottom: spacing.xs, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { backgroundColor: theme.colors.primaryContainer },
  info: { flex: 1, marginLeft: spacing.sm },
  name: { ...typography.headingSmall },
  preview: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
  meta: { alignItems: 'flex-end' },
  time: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
  badge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  badgeText: { ...typography.label, color: '#fff', fontSize: 10 },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
});
