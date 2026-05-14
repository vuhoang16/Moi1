import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, List, Button, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { ListSkeleton } from '../../components/ListSkeleton';
import { theme, spacing, typography } from '../../theme';

export default function NotificationsScreen({ navigation }: any) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleNotificationPress = (notification: any) => {
    markRead.mutate(notification.id);
    const id = notification.relatedEntityId ?? notification.resourceId;
    const type: string = notification.type ?? '';
    if (type === 'invoice_created' || type === 'invoice_overdue' || type === 'invoice' || type === 'payment') {
      navigation.navigate('InvoiceDetail', { id });
    } else if (type === 'maintenance_update' || type === 'maintenance') {
      navigation.navigate('MaintenanceDetail', { id });
    } else if (type === 'contract_expiry_warning' || type === 'contract') {
      navigation.navigate('ContractDetail', { id });
    } else if (type === 'new_message' || type === 'chat') {
      navigation.navigate('ChatScreen', { conversationId: id });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Thông báo</Text>
        <Button onPress={() => markAllRead.mutate()}>Đánh dấu đọc tất cả</Button>
      </View>

      {isLoading ? (
        <ListSkeleton count={8} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <List.Item
              title={item.title}
              description={`${item.body}\n${dayjs(item.createdAt).format('DD/MM HH:mm')}`}
              titleStyle={!item.isRead ? styles.unread : undefined}
              onPress={() => handleNotificationPress(item)}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={item.isRead ? 'bell-outline' : 'bell'}
                  color={item.isRead ? theme.colors.onSurfaceVariant : theme.colors.primary}
                />
              )}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bell-off-outline"
              title="Không có thông báo"
              description="Bạn chưa có thông báo nào mới."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  title: { ...typography.headingMedium },
  loader: { flex: 1, marginTop: spacing.xl },
  unread: { fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
});
