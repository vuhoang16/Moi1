import React, { useState, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  FAB,
  IconButton,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const ACTIVE_STATUSES = ['pending', 'in_progress'];
const HISTORY_STATUSES = ['completed', 'rejected'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Chờ xử lý',  color: '#E67E22', bg: '#FEF3E2' },
  in_progress: { label: 'Đang xử lý', color: '#2980B9', bg: '#EBF5FB' },
  completed:   { label: 'Hoàn thành', color: '#27AE60', bg: '#EAFAF1' },
  rejected:    { label: 'Từ chối',    color: '#C0392B', bg: '#FDEDEC' },
};

const CATEGORY_ICON: Record<string, string> = {
  plumbing:   'pipe',
  electrical: 'flash',
  hvac:       'air-conditioner',
  structural: 'office-building',
  appliance:  'washing-machine',
  default:    'tools',
};

const ICON_BG: string[] = [
  '#D6EAF8', '#FDEBD0', '#D5F5E3', '#FCF3CF', '#F9EBEA',
];

function getCategoryIcon(category?: string): string {
  return CATEGORY_ICON[category ?? 'default'] ?? CATEGORY_ICON.default;
}

function getIconBg(index: number): string {
  return ICON_BG[index % ICON_BG.length];
}

export default function TenantMaintenanceScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => api.get('/maintenance').then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const list: any[] = data ?? [];
    const allowed = activeTab === 'active' ? ACTIVE_STATUSES : HISTORY_STATUSES;
    return list.filter((item) => allowed.includes(item.status));
  }, [data, activeTab]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yêu cầu bảo trì</Text>
        <IconButton
          icon="bell-outline"
          size={24}
          iconColor={theme.colors.primary}
          onPress={() => navigation.navigate('Notifications')}
        />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Đang xử lý
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Lịch sử
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item, index }) => {
            const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
            const icon = getCategoryIcon(item.category);
            const iconBg = getIconBg(index);
            const timeAgo = dayjs(item.createdAt).fromNow();
            const roomNum = item.room?.roomNumber ?? '';
            const code = item.code ? `#${item.code}` : '';

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('MaintenanceDetail', { id: item.id })}
                activeOpacity={0.85}
              >
                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                  <MaterialCommunityIcons name={icon as any} size={22} color={theme.colors.primary} />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {roomNum ? `Phòng ${roomNum}` : ''}
                    {roomNum && code ? ' · ' : ''}
                    {code}
                  </Text>
                </View>

                <View style={styles.cardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>
                      {statusCfg.label}
                    </Text>
                  </View>
                  <Text style={styles.timeText}>{timeAgo}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="wrench" size={56} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.emptyText}>Không có yêu cầu bảo trì</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('SubmitMaintenance')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.headingMedium,
    color: theme.colors.primary,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 24,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 22,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    ...typography.label,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: theme.colors.onPrimary,
  },
  loader: {
    flex: 1,
    marginTop: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    padding: spacing.md,
    gap: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.headingSmall,
    color: theme.colors.onSurface,
  },
  cardSub: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    ...typography.label,
    fontWeight: '600',
  },
  timeText: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: theme.colors.primary,
  },
});
