import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  Dimensions,
} from 'react-native';
import { Text, ActivityIndicator, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/auth.store';
import { useProperties } from '../../queries/properties';
import { useInvoices } from '../../queries/invoices';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Dark noir palette — matching Stitch mockup
const C = {
  bg: '#0A1628',
  surface: '#111F35',
  surfaceLight: '#162640',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.55)',
  textSub: 'rgba(255,255,255,0.35)',
  accent: '#00BFA5',
  amber: '#F5A623',
  divider: 'rgba(255,255,255,0.1)',
};

const formatVND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

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
    (s: number, inv: any) => s + (inv.totalAmount ?? 0), 0,
  );
  const collected = currentMonthInvoices
    .filter((inv: any) => inv.status === 'da_thanh_toan')
    .reduce((s: number, inv: any) => s + (inv.totalAmount ?? 0), 0);
  const pending = currentMonthInvoices
    .filter((inv: any) => ['chua_thanh_toan', 'qua_han'].includes(inv.status))
    .reduce((s: number, inv: any) => s + (inv.totalAmount ?? 0), 0);

  const items: any[] = propertiesData?.items ?? [];
  const totalRooms = items.reduce((s: number, p: any) => s + (p._count?.rooms ?? 0), 0);
  const occupiedRooms = items.reduce((s: number, p: any) => s + (p._count?.occupiedRooms ?? 0), 0);
  const vacantRooms = totalRooms - occupiedRooms;

  const unpaidCount = (invoices ?? []).filter(
    (inv: any) => ['chua_thanh_toan', 'qua_han'].includes(inv.status),
  ).length;

  const initials = (user?.fullName ?? '')
    .split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const monthLabel = dayjs().format('M/YYYY');

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            {user?.avatarUrl
              ? <Avatar.Image size={40} source={{ uri: user.avatarUrl }} />
              : <Avatar.Text size={40} label={initials || '?'} style={s.avatar} labelStyle={s.avatarLabel} />}
          </TouchableOpacity>

          <TouchableOpacity style={s.brandRow} onPress={() => navigation.navigate('Notifications')}>
            <MaterialCommunityIcons name="home-city" size={16} color={C.accent} />
            <Text style={s.brandText}>  DIGITAL CONCIERGE</Text>
          </TouchableOpacity>
        </View>

        {/* ── Financial hero ── */}
        <View style={s.heroSection}>
          <Text style={s.heroLabel}>TỔNG THU THÁNG {monthLabel}</Text>
          {isLoading
            ? <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
            : <>
                <Text style={s.heroAmount}>{totalRevenue.toLocaleString('vi-VN')}</Text>
                <Text style={s.heroCurrency}>₫</Text>
                <View style={s.heroSubRow}>
                  <View style={s.heroSubItem}>
                    <Text style={s.heroSubLabel}>Đã thu</Text>
                    <Text style={s.heroSubValue}>{collected.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                  <View style={s.heroSubDivider} />
                  <View style={s.heroSubItem}>
                    <Text style={s.heroSubLabel}>Chờ thanh toán</Text>
                    <Text style={[s.heroSubValue, { color: C.amber }]}>{pending.toLocaleString('vi-VN')} ₫</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.payBtn}
                  onPress={() => navigation.navigate('Contracts')}
                >
                  <Text style={s.payBtnText}>THANH TOÁN</Text>
                </TouchableOpacity>
              </>
          }
        </View>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          {[
            { icon: 'home-city-outline', value: totalRooms, label: 'Tổng phòng' },
            { icon: 'account-check', value: occupiedRooms, label: 'Đang thuê' },
            { icon: 'door-open', value: vacantRooms, label: 'Còn trống' },
          ].map((stat, i) => (
            <View key={i} style={[s.statItem, i < 2 && s.statBorder]}>
              <MaterialCommunityIcons name={stat.icon as any} size={22} color={C.accent} />
              <Text style={s.statValue}>{isLoading ? '—' : stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Action items ── */}
        <View style={s.actionCard}>
          <Text style={s.actionHeading}>Cần xử lý hôm nay</Text>

          <TouchableOpacity style={s.actionRow} onPress={() => navigation.navigate('Contracts')}>
            <View style={s.actionIconWrap}>
              <MaterialCommunityIcons name="receipt" size={18} color={C.amber} />
            </View>
            <View style={s.actionInfo}>
              <Text style={s.actionText}>{isLoading ? '...' : unpaidCount} hóa đơn chưa thanh toán</Text>
              <Text style={s.actionSub}>Hạn chót: Hôm nay</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMuted} />
          </TouchableOpacity>

          <View style={s.actionDivider} />

          <TouchableOpacity style={s.actionRow} onPress={() => navigation.navigate('Contracts')}>
            <View style={s.actionIconWrap}>
              <MaterialCommunityIcons name="wrench" size={18} color="#EF5350" />
            </View>
            <View style={s.actionInfo}>
              <Text style={s.actionText}>2 yêu cầu sửa chữa mới</Text>
              <Text style={s.actionSub}>Phòng 101, 102</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMuted} />
          </TouchableOpacity>

          <View style={s.actionDivider} />

          <TouchableOpacity style={s.actionRow} onPress={() => navigation.navigate('Reports')}>
            <View style={[s.actionIconWrap, { backgroundColor: 'rgba(0,191,165,0.15)' }]}>
              <MaterialCommunityIcons name="trending-up" size={18} color={C.accent} />
            </View>
            <View style={s.actionInfo}>
              <Text style={s.actionText}>Tỉ lệ lấp đầy tăng 12%</Text>
              <Text style={s.actionSub}>Xem báo cáo chi tiết</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Property list ── */}
        <View style={s.listSection}>
          <View style={s.listHeader}>
            <Text style={s.listTitle}>Danh sách bất động sản</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Properties')}>
              <Text style={s.listAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {isLoading
            ? <ActivityIndicator color={C.accent} />
            : items.map((p: any) => {
                const total = p._count?.rooms ?? 0;
                const occ = p._count?.occupiedRooms ?? 0;
                const pct = total > 0 ? Math.round((occ / total) * 100) : 0;
                const img = p.imageUrls?.[0] ?? null;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={s.propCard}
                    onPress={() => navigation.navigate('PropertyDetail', { id: p.id })}
                    activeOpacity={0.8}
                  >
                    {img
                      ? <Image source={{ uri: img }} style={s.propImg} resizeMode="cover" />
                      : <View style={[s.propImg, s.propImgPlaceholder]}>
                          <MaterialCommunityIcons name="office-building" size={40} color={C.accent} />
                        </View>
                    }
                    <View style={s.propOverlay}>
                      <Text style={s.propName} numberOfLines={1}>{p.name}</Text>
                      <Text style={s.propAddr} numberOfLines={1}>
                        {[p.district, p.city].filter(Boolean).join(', ') || p.address}
                      </Text>
                      <View style={s.propMeta}>
                        <Text style={s.propPct}>{pct}%</Text>
                        <Text style={s.propRooms}>Phòng {occ}/{total}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
          }
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  avatar: { backgroundColor: '#1B4F72' },
  avatarLabel: { color: '#FFF', fontWeight: '700' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandText: { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 1 },

  // Hero
  heroSection: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  heroLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, letterSpacing: 1.2, marginBottom: 8 },
  heroAmount: { fontSize: 44, fontWeight: '800', color: C.text, lineHeight: 52 },
  heroCurrency: { fontSize: 20, fontWeight: '700', color: C.textMuted, marginTop: -4, marginBottom: 16 },
  heroSubRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  heroSubItem: { flex: 1 },
  heroSubLabel: { fontSize: 11, color: C.textMuted, marginBottom: 2 },
  heroSubValue: { fontSize: 14, fontWeight: '600', color: C.text },
  heroSubDivider: { width: 1, height: 32, backgroundColor: C.divider, marginHorizontal: 16 },
  payBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 28,
  },
  payBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF', letterSpacing: 0.8 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    marginHorizontal: 20,
    borderRadius: 14,
    marginTop: 20,
    marginBottom: 16,
    paddingVertical: 18,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statBorder: { borderRightWidth: 1, borderRightColor: C.divider },
  statValue: { fontSize: 26, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 11, color: C.textMuted, textAlign: 'center' },

  // Action card
  actionCard: {
    backgroundColor: C.surface,
    marginHorizontal: 20,
    borderRadius: 14,
    marginBottom: 24,
    paddingTop: 14,
    overflow: 'hidden',
  },
  actionHeading: { fontSize: 13, fontWeight: '700', color: C.textMuted, paddingHorizontal: 16, marginBottom: 10, letterSpacing: 0.4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  actionIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(245,166,35,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  actionInfo: { flex: 1 },
  actionText: { fontSize: 14, fontWeight: '600', color: C.text },
  actionSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  actionDivider: { height: 1, backgroundColor: C.divider, marginLeft: 62 },

  // Property list
  listSection: { paddingHorizontal: 20 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  listAll: { fontSize: 12, color: C.accent, fontWeight: '600' },

  propCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    height: 160,
    backgroundColor: C.surface,
  },
  propImg: { width: '100%', height: '100%' },
  propImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  propOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  propName: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  propAddr: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  propMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  propPct: { fontSize: 20, fontWeight: '800', color: C.accent },
  propRooms: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
});
