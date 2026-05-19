import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/auth.store';
import { useProperties } from '../../queries/properties';
import { useInvoices } from '../../queries/invoices';
import { theme, spacing, typography } from '../../theme';

const formatVND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

function getGreeting(): string {
  const h = dayjs().hour();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function LandlordHomeScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const { data: propertiesData, isLoading: loadingProps } = useProperties();
  const { data: invoices, isLoading: loadingInvs } = useInvoices();

  const isLoading = loadingProps || loadingInvs;

  const currentMonth = dayjs().month();
  const currentYear = dayjs().year();

  const currentMonthInvoices = (invoices ?? []).filter((inv: any) => {
    const d = dayjs(inv.billingMonth ?? inv.createdAt);
    return d.month() === currentMonth && d.year() === currentYear;
  });

  const totalRevenue = currentMonthInvoices.reduce(
    (sum: number, inv: any) => sum + (inv.totalAmount ?? 0),
    0,
  );
  const collected = currentMonthInvoices
    .filter((inv: any) => inv.status === 'da_thanh_toan')
    .reduce((sum: number, inv: any) => sum + (inv.totalAmount ?? 0), 0);
  const pending = currentMonthInvoices
    .filter((inv: any) => inv.status === 'chua_thanh_toan' || inv.status === 'qua_han')
    .reduce((sum: number, inv: any) => sum + (inv.totalAmount ?? 0), 0);

  const items: any[] = propertiesData?.items ?? [];
  const totalRooms = items.reduce((sum: number, p: any) => sum + (p._count?.rooms ?? 0), 0);
  const occupiedRooms = items.reduce(
    (sum: number, p: any) => sum + (p._count?.occupiedRooms ?? 0),
    0,
  );
  const vacantRooms = totalRooms - occupiedRooms;

  const unpaidCount = (invoices ?? []).filter(
    (inv: any) => inv.status === 'chua_thanh_toan' || inv.status === 'qua_han',
  ).length;

  const initials = (user?.fullName ?? '')
    .split(' ')
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const monthLabel = dayjs().format('M/YYYY');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.fullName ?? ''}!</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.bellWrap}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              {user?.avatarUrl ? (
                <Avatar.Image size={42} source={{ uri: user.avatarUrl }} />
              ) : (
                <Avatar.Text
                  size={42}
                  label={initials || '?'}
                  style={styles.avatar}
                  labelStyle={styles.avatarLabel}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Summary Card */}
        <View style={styles.financialCard}>
          <Text style={styles.financialTitle}>TỔNG THU THÁNG {monthLabel}</Text>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" style={styles.cardLoader} />
          ) : (
            <View style={styles.metricsRow}>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Tổng thu</Text>
                <Text style={styles.metricValue}>{formatVND(totalRevenue)}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Đã thu</Text>
                <Text style={styles.metricValue}>{formatVND(collected)}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>Chờ TT</Text>
                <Text style={[styles.metricValue, styles.pendingValue]}>{formatVND(pending)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Property Overview chips */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>🏠</Text>
            <Text style={styles.statValue}>{isLoading ? '—' : totalRooms}</Text>
            <Text style={styles.statChipLabel}>Tổng phòng</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={[styles.statValue, { color: '#27AE60' }]}>
              {isLoading ? '—' : occupiedRooms}
            </Text>
            <Text style={styles.statChipLabel}>Đang thuê</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>🔑</Text>
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
              {isLoading ? '—' : vacantRooms}
            </Text>
            <Text style={styles.statChipLabel}>Còn trống</Text>
          </View>
        </View>

        {/* Action Items */}
        <View style={styles.actionSection}>
          <View style={styles.actionHeader}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={theme.colors.secondary}
            />
            <Text style={styles.actionTitle}>Cần xử lý hôm nay</Text>
          </View>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Contracts')}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Text style={styles.actionIcon}>⚠️</Text>
              <Text style={styles.actionText}>
                {isLoading ? '...' : unpaidCount} hóa đơn chưa thanh toán
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate('Contracts')}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Text style={styles.actionIcon}>🔧</Text>
              <Text style={styles.actionText}>Yêu cầu sửa chữa mới</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerLeft: { flex: 1 },
  greeting: { ...typography.body, color: theme.colors.onSurfaceVariant },
  userName: { ...typography.headingMedium, color: theme.colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { backgroundColor: theme.colors.primary },
  avatarLabel: { color: '#FFFFFF', fontWeight: '700' },

  financialCard: {
    backgroundColor: '#1B4F72',
    borderRadius: 16,
    padding: 20,
    marginBottom: spacing.md,
    shadowColor: '#1B4F72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  financialTitle: {
    ...typography.label,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.md,
    letterSpacing: 0.8,
  },
  cardLoader: { marginVertical: spacing.md },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricCol: { flex: 1, alignItems: 'center' },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  metricLabel: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  metricValue: {
    ...typography.headingSmall,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pendingValue: { color: '#F0A500' },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statChip: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: { fontSize: 18, marginBottom: spacing.xs },
  statValue: { ...typography.headingSmall, color: theme.colors.primary, marginBottom: 2 },
  statChipLabel: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, textAlign: 'center' },

  actionSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  actionTitle: { ...typography.headingSmall, color: theme.colors.secondary },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  actionIcon: { fontSize: 16, marginRight: spacing.sm },
  actionText: { ...typography.body, color: theme.colors.onSurface, flex: 1 },
  rowDivider: { height: 1, backgroundColor: theme.colors.surfaceVariant, marginLeft: spacing.md },
});
