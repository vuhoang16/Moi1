import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Image,
  Dimensions,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useProperty } from '../../queries/properties';
import { spacing, typography } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = 220;
const PLACEHOLDER = 'https://placehold.co/600x300/1B4F72/white?text=Phong';

const PRIMARY = '#1B4F72';
const TEXT_DARK = '#1A1A2E';
const TEXT_GRAY = '#9E9E9E';

const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  da_thue: { label: 'ĐANG THUÊ', bgColor: TEXT_DARK, textColor: '#FFFFFF' },
  trong: { label: 'TRỐNG', bgColor: '#27AE60', textColor: '#FFFFFF' },
  dang_sua_chua: { label: 'ĐANG SỬA CHỮA', bgColor: '#E67E22', textColor: '#FFFFFF' },
};

const AMENITY_ICONS: Record<string, string> = {
  WiFi: 'wifi',
  'Điều hoà': 'air-conditioner',
  'Điều hòa': 'air-conditioner',
  'Nóng lạnh': 'water-boiler',
  'Ban công': 'balcony',
  wifi: 'wifi',
  dieu_hoa: 'air-conditioner',
  may_lanh: 'air-conditioner',
  nuoc_nong: 'water-boiler',
  ban_cong: 'balcony',
  tu_lanh: 'fridge',
  may_giat: 'washing-machine',
  bep: 'stove',
};

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function MonthCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={calStyles.wrapper}>
      <Text style={calStyles.heading}>
        {MONTH_NAMES[month]}, {year}
      </Text>
      <View style={calStyles.dayRow}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={calStyles.dayLabel}>{d}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={calStyles.weekRow}>
          {row.map((day, di) => (
            <View
              key={di}
              style={[calStyles.dayCell, day === today && calStyles.todayCell]}
            >
              {day !== null && (
                <Text style={[calStyles.dayText, day === today && calStyles.todayText]}>
                  {day}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function useRoom(roomId: string) {
  return useQuery({
    queryKey: ['rooms', roomId],
    queryFn: () => api.get(`/rooms/${roomId}`).then((r) => r.data),
    enabled: !!roomId,
  });
}

export default function RoomDetailScreen({ route, navigation }: any) {
  const { id, propertyId } = route.params;
  const { data: room, isLoading: loadingRoom } = useRoom(id);
  const { data: property } = useProperty(propertyId ?? room?.propertyId ?? '');

  if (loadingRoom) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color={PRIMARY} />
      </SafeAreaView>
    );
  }
  if (!room) return null;

  const statusInfo = STATUS_CONFIG[room.status] ?? {
    label: room.status?.toUpperCase() ?? '—',
    bgColor: '#888',
    textColor: '#FFF',
  };
  const isOccupied = room.status === 'da_thue';
  const isVacant = room.status === 'trong';
  const heroImage = room.imageUrls?.[0] ?? property?.imageUrls?.[0] ?? PLACEHOLDER;

  const formattedRent = room.baseRent
    ? `${Number(room.baseRent).toLocaleString('vi-VN')} ₫/tháng`
    : '—';

  const amenities: string[] = room.amenities ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.topBar}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor={TEXT_DARK}
          onPress={() => navigation.goBack()}
          style={styles.topBarBtn}
        />
        <Text style={styles.topBarTitle}>Chi tiết phòng</Text>
        <IconButton
          icon="dots-vertical"
          size={24}
          iconColor={TEXT_DARK}
          style={styles.topBarBtn}
          onPress={() => {}}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />

        <View style={styles.floatingCard}>
          <View style={styles.floatingCardTop}>
            <Text style={styles.roomName}>Phòng {room.roomNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusInfo.textColor }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <MaterialCommunityIcons name="wallet-outline" size={18} color={TEXT_GRAY} />
            <View style={styles.priceLabelCol}>
              <Text style={styles.priceLabel}>Giá thuê</Text>
              <Text style={styles.priceValue}>{formattedRent}</Text>
            </View>
          </View>

          {room.area ? (
            <View style={styles.areaRow}>
              <MaterialCommunityIcons name="ruler-square" size={16} color={TEXT_GRAY} />
              <Text style={styles.areaText}>{room.area}m²</Text>
            </View>
          ) : null}
        </View>

        {amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tiện ích</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((item: string, i: number) => (
                <View key={i} style={styles.amenityChip}>
                  <MaterialCommunityIcons
                    name={(AMENITY_ICONS[item] ?? 'check-circle') as any}
                    size={22}
                    color={PRIMARY}
                  />
                  <Text style={styles.amenityLabel}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {isOccupied && room.tenant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Người thuê</Text>
            <View style={styles.tenantRow}>
              {room.tenant.avatarUrl ? (
                <Image source={{ uri: room.tenant.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {(room.tenant.fullName ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{room.tenant.fullName ?? '—'}</Text>
                <Text style={styles.tenantPhone}>{room.tenant.phone ?? ''}</Text>
              </View>
              {room.tenant.phone ? (
                <TouchableOpacity
                  style={styles.phoneIconBtn}
                  onPress={() => Linking.openURL(`tel:${room.tenant.phone}`)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="phone" size={20} color={PRIMARY} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <MonthCalendar />
        </View>

        <View style={{ height: 96 }} />
      </ScrollView>

      <View style={styles.stickyFooter}>
        {isVacant && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('CreateContract', { propertyId, roomId: id })}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>+ Tạo Hợp Đồng</Text>
          </TouchableOpacity>
        )}
        {isOccupied && (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('CreateContract', { propertyId, roomId: id })}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>+ Tạo Hợp Đồng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlinedBtn}
              onPress={() => navigation.navigate('CreateRoom', { propertyId, roomId: id })}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color={PRIMARY} />
              <Text style={styles.outlinedBtnText}>Chỉnh Sửa Phòng</Text>
            </TouchableOpacity>
          </View>
        )}
        {!isVacant && !isOccupied && (
          <TouchableOpacity
            style={styles.outlinedBtn}
            onPress={() => navigation.navigate('CreateRoom', { propertyId, roomId: id })}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color={PRIMARY} />
            <Text style={styles.outlinedBtnText}>Chỉnh Sửa Phòng</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topBarBtn: {
    margin: 0,
  },
  topBarTitle: {
    flex: 1,
    ...typography.headingSmall,
    color: TEXT_DARK,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  floatingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: -20,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: spacing.md,
  },
  floatingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  roomName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: TEXT_DARK,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  statusBadgeText: {
    ...typography.label,
    fontWeight: '700' as const,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  priceLabelCol: {
    flex: 1,
  },
  priceLabel: {
    ...typography.bodySmall,
    color: TEXT_GRAY,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: PRIMARY,
    marginTop: 2,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  areaText: {
    ...typography.body,
    color: TEXT_GRAY,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: TEXT_DARK,
    marginBottom: spacing.sm,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityChip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FB',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minWidth: 70,
  },
  amenityLabel: {
    ...typography.bodySmall,
    color: PRIMARY,
    fontWeight: '500' as const,
    marginTop: 4,
    textAlign: 'center',
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D6EAF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.headingSmall,
    color: PRIMARY,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    ...typography.headingSmall,
    color: TEXT_DARK,
  },
  tenantPhone: {
    ...typography.bodySmall,
    color: TEXT_GRAY,
    marginTop: 2,
  },
  phoneIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF2FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 8,
  },
  footerRow: {
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: TEXT_DARK,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...typography.headingSmall,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  outlinedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    marginTop: spacing.sm,
  },
  outlinedBtnText: {
    ...typography.headingSmall,
    color: PRIMARY,
    fontWeight: '600' as const,
  },
});

const calStyles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  heading: {
    ...typography.headingSmall,
    color: TEXT_DARK,
    marginBottom: spacing.sm,
  },
  dayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.label,
    color: TEXT_GRAY,
    fontWeight: '600' as const,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 20,
  },
  todayCell: {
    backgroundColor: PRIMARY,
  },
  dayText: {
    ...typography.bodySmall,
    color: TEXT_DARK,
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
});
