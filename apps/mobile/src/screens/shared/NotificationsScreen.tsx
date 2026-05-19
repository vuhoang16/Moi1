import React from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Text, Button, ActivityIndicator, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import 'dayjs/locale/vi';
import { api } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { ListSkeleton } from '../../components/ListSkeleton';
import { theme, spacing, typography } from '../../theme';
import type { Notification } from '@rentapp/shared';

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.locale('vi');

type NotifType = 'invoice' | 'maintenance' | 'contract' | 'message';

interface Section {
  title: string;
  data: Notification[];
}

function getNotifType(type: string): NotifType {
  if (
    type === 'invoice_created' ||
    type === 'invoice_overdue' ||
    type === 'invoice' ||
    type === 'payment'
  )
    return 'invoice';
  if (type === 'maintenance_update' || type === 'maintenance') return 'maintenance';
  if (type === 'contract_expiry_warning' || type === 'contract') return 'contract';
  return 'message';
}

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string }> = {
  invoice: { icon: 'receipt', color: '#27AE60' },
  maintenance: { icon: 'wrench', color: '#E67E22' },
  contract: { icon: 'file-document-outline', color: '#2980B9' },
  message: { icon: 'chat-outline', color: '#8E44AD' },
};

function relativeTimeLabel(createdAt: string): string {
  return dayjs(createdAt).fromNow();
}

function groupNotifications(items: Notification[]): Section[] {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const older: Notification[] = [];

  for (const n of items) {
    if (dayjs(n.createdAt).isToday()) {
      today.push(n);
    } else if (dayjs(n.createdAt).isYesterday()) {
      yesterday.push(n);
    } else {
      older.push(n);
    }
  }

  const sections: Section[] = [];
  if (today.length > 0) sections.push({ title: 'Gần đây', data: today });
  if (yesterday.length > 0) sections.push({ title: 'Hôm qua', data: yesterday });
  if (older.length > 0) sections.push({ title: 'Trước đó', data: older });
  return sections;
}

export default function NotificationsScreen({ navigation }: any) {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<Notification[]>({
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

  const handlePress = (notification: Notification) => {
    markRead.mutate(notification.id);
    const id = notification.relatedEntityId;
    const type = getNotifType(notification.type);
    if (type === 'invoice') {
      navigation.navigate('InvoiceDetail', { id });
    } else if (type === 'maintenance') {
      navigation.navigate('MaintenanceDetail', { id });
    } else if (type === 'contract') {
      navigation.navigate('ContractDetail', { id });
    } else if (type === 'message') {
      navigation.navigate('ChatScreen', { conversationId: id });
    }
  };

  const sections = groupNotifications(data ?? []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông Báo</Text>
        <Button
          mode="text"
          onPress={() => markAllRead.mutate()}
          loading={markAllRead.isPending}
          labelStyle={styles.readAllLabel}
          compact
        >
          Đọc tất cả
        </Button>
      </View>

      {isLoading ? (
        <ListSkeleton count={8} />
      ) : data && data.length === 0 ? (
        <EmptyState
          icon="bell-off-outline"
          title="Không có thông báo"
          description="Bạn chưa có thông báo nào mới."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isLoading}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              onPress={() => handlePress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

function NotificationCard({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const notifType = getNotifType(notification.type);
  const { icon, color } = TYPE_CONFIG[notifType];

  return (
    <TouchableRipple onPress={onPress} rippleColor={theme.colors.primaryContainer}>
      <View style={cardStyles.container}>
        {/* Unread dot */}
        <View style={cardStyles.dotColumn}>
          {!notification.isRead && <View style={cardStyles.unreadDot} />}
        </View>

        {/* Icon circle */}
        <View style={[cardStyles.iconCircle, { backgroundColor: color + '22' }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={color} />
        </View>

        {/* Text content */}
        <View style={cardStyles.textContent}>
          <Text
            style={[cardStyles.title, !notification.isRead && cardStyles.titleUnread]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={cardStyles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>

        {/* Timestamp */}
        <Text style={cardStyles.time}>{relativeTimeLabel(notification.createdAt)}</Text>
      </View>
    </TouchableRipple>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  dotColumn: {
    width: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2980B9',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    marginRight: spacing.sm,
    gap: 2,
  },
  title: {
    ...typography.body,
    color: theme.colors.onSurface,
  },
  titleUnread: {
    fontWeight: '700',
  },
  body: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 18,
  },
  time: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    flexShrink: 0,
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  headerTitle: {
    ...typography.headingMedium,
    color: theme.colors.onSurface,
  },
  readAllLabel: {
    ...typography.body,
    color: theme.colors.primary,
  },

  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: theme.colors.background,
  },
  sectionLabel: {
    ...typography.label,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  listContent: {
    paddingBottom: spacing.xl,
  },
});
