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
import {
  Text,
  Chip,
  Button,
  ActivityIndicator,
  IconButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useProperty } from '../../queries/properties';
import { theme, spacing, typography } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = Math.round(SCREEN_WIDTH * (9 / 16));
const PLACEHOLDER = 'https://placehold.co/600x300/1B4F72/white?text=Phong';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  trong: { label: 'Trống', color: '#27AE60' },
  da_thue: { label: 'Đang thuê', color: theme.colors.primary },
  dang_sua_chua: { label: 'Đang sửa chữa', color: theme.colors.secondary },
};

const AMENITY_ICONS: Record<string, string> = {
  wifi: 'wifi',
  dieu_hoa: 'air-conditioner',
  'Điều hòa': 'air-conditioner',
  'WiFi': 'wifi',
  'Nóng lạnh': 'water-boiler',
  'Ban công': 'balcony',
  may_lanh: 'air-conditioner',
  nuoc_nong: 'water-boiler',
  ban_cong: 'balcony',
  tu_lanh: 'fridge',
  may_giat: 'washing-machine',
  bep: 'stove',
};

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
        <ActivityIndicator style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }
  if (!room) return null;

  const statusInfo = STATUS_CONFIG[room.status] ?? { label: room.status, color: '#888' };
  const isOccupied = room.status === 'da_thue';
  const isVacant = room.status === 'trong';
  const heroImage = room.imageUrls?.[0] ?? PLACEHOLDER;

  const formattedRent = room.baseRent
    ? room.baseRent.toLocaleString('vi-VN') + ' ₫/tháng'
    : '—';

  const amenities: string[] = room.amenities ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Custom header */}
      <View style={styles.topBar}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        />
        <Text style={styles.topBarTitle}>Chi tiết phòng</Text>
        <IconButton
          icon="dots-vertical"
          size={24}
          style={styles.menuBtn}
          onPress={() => {}}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <Image
          source={{ uri: heroImage }}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Room info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardRow}>
            <Text style={styles.roomName}>Phòng {room.roomNumber}</Text>
            <Chip
              style={[styles.statusBadge, { backgroundColor: statusInfo.color + '22' }]}
              textStyle={[styles.statusText, { color: statusInfo.color }]}
              compact
            >
              {statusInfo.label}
            </Chip>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="cash"
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={styles.detailText}>{formattedRent}</Text>
          </View>

          {room.area ? (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="ruler-square"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={styles.detailText}>{room.area} m²</Text>
            </View>
          ) : null}
        </View>

        {/* Amenities */}
        {amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tiện nghi</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.amenitiesRow}
            >
              {amenities.map((item: string, i: number) => (
                <View key={i} style={styles.amenityChip}>
                  <MaterialCommunityIcons
                    name={(AMENITY_ICONS[item] ?? 'check-circle') as any}
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.amenityLabel}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tenant section */}
        {isOccupied && room.tenant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Người thuê</Text>
            <View style={styles.tenantCard}>
              <View style={styles.tenantAvatar}>
                {room.tenant.avatarUrl ? (
                  <Image source={{ uri: room.tenant.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {(room.tenant.fullName ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{room.tenant.fullName ?? '—'}</Text>
                <Text style={styles.tenantPhone}>{room.tenant.phone ?? ''}</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ContractDetail', { contractId: room.currentContractId })
                  }
                >
                  <Text style={styles.contractLink}>Xem hợp đồng</Text>
                </TouchableOpacity>
              </View>
              {room.tenant.phone ? (
                <IconButton
                  icon="phone"
                  size={22}
                  iconColor={theme.colors.primary}
                  style={styles.phoneBtn}
                  onPress={() => Linking.openURL(`tel:${room.tenant.phone}`)}
                />
              ) : null}
            </View>
          </View>
        )}

        {/* Notes */}
        {room.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ghi chú</Text>
            <Text style={styles.notes}>{room.notes}</Text>
          </View>
        ) : null}

        {/* Spacer for sticky footer */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Sticky action buttons */}
      <View style={styles.stickyFooter}>
        {isVacant && (
          <Button
            mode="contained"
            style={styles.fullBtn}
            contentStyle={styles.btnContent}
            onPress={() =>
              navigation.navigate('CreateContract', { propertyId, roomId: id })
            }
          >
            Tạo Hợp Đồng
          </Button>
        )}
        {isOccupied && (
          <View style={styles.footerRow}>
            <Button
              mode="outlined"
              style={[styles.halfBtn, { marginRight: spacing.sm }]}
              contentStyle={styles.btnContent}
              onPress={() => navigation.navigate('CreateRoom', { propertyId, roomId: id })}
            >
              Chỉnh Sửa Phòng
            </Button>
            <Button
              mode="contained"
              style={styles.halfBtn}
              contentStyle={styles.btnContent}
              onPress={() =>
                navigation.navigate('ContractDetail', { contractId: room.currentContractId })
              }
            >
              Xem Hợp Đồng
            </Button>
          </View>
        )}
        {!isVacant && !isOccupied && (
          <Button
            mode="outlined"
            style={styles.fullBtn}
            contentStyle={styles.btnContent}
            onPress={() => navigation.navigate('CreateRoom', { propertyId, roomId: id })}
          >
            Chỉnh Sửa Phòng
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: spacing.md },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  backBtn: { margin: 0 },
  menuBtn: { margin: 0 },
  topBarTitle: {
    flex: 1,
    ...typography.headingSmall,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },

  heroImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },

  infoCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.md,
    marginTop: -spacing.lg,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: spacing.md,
  },
  infoCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  roomName: { ...typography.headingLarge, color: theme.colors.onSurface, flex: 1 },
  statusBadge: { borderRadius: 20, marginLeft: spacing.sm },
  statusText: { ...typography.label, fontWeight: '600' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailText: { ...typography.body, color: theme.colors.onSurfaceVariant },

  section: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },

  amenitiesRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  amenityLabel: { ...typography.bodySmall, color: theme.colors.primary, fontWeight: '500' },

  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tenantAvatar: { marginRight: spacing.sm },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { ...typography.headingSmall, color: theme.colors.primary },
  tenantInfo: { flex: 1 },
  tenantName: { ...typography.headingSmall, color: theme.colors.onSurface },
  tenantPhone: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  contractLink: {
    ...typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  phoneBtn: { margin: 0 },

  notes: { ...typography.body, color: theme.colors.onSurfaceVariant },

  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  fullBtn: { borderRadius: 12 },
  halfBtn: { flex: 1, borderRadius: 12 },
  btnContent: { paddingVertical: spacing.xs },
  footerRow: { flexDirection: 'row' },
});
