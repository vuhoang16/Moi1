import React, { useState, useMemo } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { api } from '../../api/client';
import { spacing, typography } from '../../theme';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const DARK_BG = '#0A1628';
const CARD_BG = '#FFFFFF';
const ACCENT = '#00BFA5';
const ACTIVE_UNDERLINE = '#00BFA5';
const TAB_TEXT_ACTIVE = '#FFFFFF';
const TAB_TEXT_INACTIVE = '#8FA3BF';
const CARD_TITLE = '#1A2B3C';
const CARD_CODE = '#8FA3BF';
const ICON_CIRCLE = '#1E2D45';
const PROMO_BG = '#0F1F38';

const ACTIVE_STATUSES = ['pending', 'in_progress'];
const HISTORY_STATUSES = ['completed', 'rejected'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'CHỜ XỬ LÝ', color: '#FFFFFF', bg: '#E67E22' },
  in_progress: { label: 'IN PROGRESS', color: '#FFFFFF', bg: '#2980B9' },
  completed:   { label: 'COMPLETED',  color: '#FFFFFF', bg: '#27AE60' },
  rejected:    { label: 'CANCELLED',  color: '#FFFFFF', bg: '#7F8C8D' },
};

const CATEGORY_ICON: Record<string, string> = {
  plumbing:   'pipe',
  electrical: 'lightbulb-outline',
  hvac:       'snowflake',
  structural: 'office-building',
  appliance:  'washing-machine',
  default:    'wrench',
};

function getCategoryIcon(category?: string): string {
  return CATEGORY_ICON[category ?? 'default'] ?? CATEGORY_ICON.default;
}

export default function MaintenanceListScreen({ navigation }: any) {
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
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="home-city" size={20} color={ACCENT} />
          </View>
          <Text style={styles.headerBrand}>The Residences</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.bellBtn}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subTitle}>Yêu cầu bảo trì</Text>
        <Text style={styles.subDesc}>L'Héritage Resident • Căn hộ 1204-B</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Đang xử lý
          </Text>
          {activeTab === 'active' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Lịch sử
          </Text>
          {activeTab === 'history' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListFooterComponent={<PromoBanner />}
          renderItem={({ item }) => {
            const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.in_progress;
            const icon = getCategoryIcon(item.category);
            const code = item.code ? `#MAI-${item.code}` : '';
            const timeAgo = dayjs(item.createdAt).fromNow();
            const scheduled = item.scheduledDate
              ? dayjs(item.scheduledDate).format('HH:mm, DD [Tháng] M')
              : null;

            return (
              <View style={styles.card}>
                <View style={styles.cardInner}>
                  <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.cardCode} numberOfLines={1}>
                      {[code, timeAgo].filter(Boolean).join('  ·  ')}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={styles.statusText}>{statusCfg.label}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('MaintenanceDetail', { id: item.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailLink}>XEM CHI TIẾT →</Text>
                  </TouchableOpacity>

                  {scheduled && (
                    <View style={styles.scheduledRow}>
                      <MaterialCommunityIcons name="calendar-clock" size={13} color={CARD_CODE} />
                      <Text style={styles.scheduledText}>Hẹn: {scheduled}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="wrench" size={56} color={TAB_TEXT_INACTIVE} />
              <Text style={styles.emptyText}>Không có yêu cầu bảo trì</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => navigation.navigate('SubmitMaintenance')}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>+ Gửi yêu cầu mới</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function PromoBanner() {
  return (
    <View style={styles.promoBanner}>
      <View style={styles.promoContent}>
        <MaterialCommunityIcons name="shield-check-outline" size={28} color={ACCENT} />
        <View style={styles.promoTexts}>
          <Text style={styles.promoTitle}>Quy trình Bảo trì 24/7</Text>
          <Text style={styles.promoDesc}>Đội ngũ kỹ thuật luôn sẵn sàng hỗ trợ bạn</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.promoLink}>Tìm hiểu thêm →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrand: {
    ...typography.headingSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A5F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  subTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  subDesc: {
    ...typography.body,
    color: TAB_TEXT_INACTIVE,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A5F',
    marginBottom: spacing.sm,
  },
  tab: {
    marginRight: spacing.lg,
    paddingBottom: spacing.sm,
    position: 'relative',
  },
  tabText: {
    ...typography.headingSmall,
    color: TAB_TEXT_INACTIVE,
    fontWeight: '500',
  },
  tabTextActive: {
    color: TAB_TEXT_ACTIVE,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: ACTIVE_UNDERLINE,
    borderRadius: 1,
  },
  loader: {
    flex: 1,
    marginTop: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ICON_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: CARD_TITLE,
    lineHeight: 22,
  },
  cardCode: {
    ...typography.bodySmall,
    color: CARD_CODE,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailLink: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 0.3,
  },
  scheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduledText: {
    ...typography.bodySmall,
    color: CARD_CODE,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: TAB_TEXT_INACTIVE,
  },
  promoBanner: {
    backgroundColor: PROMO_BG,
    borderRadius: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  promoContent: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  promoTexts: {
    flex: 1,
    gap: spacing.xs,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  promoDesc: {
    ...typography.bodySmall,
    color: TAB_TEXT_INACTIVE,
  },
  promoLink: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    marginTop: spacing.xs,
  },
  ctaButton: {
    backgroundColor: ACCENT,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
