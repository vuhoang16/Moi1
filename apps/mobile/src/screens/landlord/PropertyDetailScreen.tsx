import React from 'react';
import { ScrollView, StyleSheet, View, FlatList, Image, Dimensions } from 'react-native';
import { Text, Card, Chip, FAB, ActivityIndicator, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProperty } from '../../queries/properties';
import { theme, spacing, typography } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trong: { label: 'Trống', color: '#27AE60' },
  da_thue: { label: 'Đã thuê', color: theme.colors.primary },
  dang_sua_chua: { label: 'Đang sửa', color: theme.colors.secondary },
};

export default function PropertyDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const { data: property, isLoading } = useProperty(id);

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!property) return null;

  const rooms = property.rooms ?? [];
  const totalRooms = rooms.length;
  const vacantRooms = rooms.filter((r: any) => r.status === 'trong').length;
  const occupiedRooms = rooms.filter((r: any) => r.status === 'da_thue').length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Property Images */}
        {property.imageUrls?.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroller}
          >
            {property.imageUrls.map((url: string, i: number) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={styles.propertyImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        {/* Property Info */}
        <Text style={styles.name}>{property.name}</Text>
        <View style={styles.addressRow}>
          <IconButton icon="map-marker" size={16} style={styles.addressIcon} />
          <Text style={styles.address}>
            {property.address}, {property.ward}, {property.district}, {property.city}
          </Text>
        </View>

        {property.description && (
          <Text style={styles.description}>{property.description}</Text>
        )}

        {/* Rates */}
        <Card style={styles.ratesCard}>
          <Card.Content style={styles.ratesContent}>
            <View style={styles.rateItem}>
              <IconButton icon="flash" size={20} iconColor={theme.colors.secondary} style={styles.rateIcon} />
              <View>
                <Text style={styles.rateLabel}>Điện</Text>
                <Text style={styles.rateValue}>
                  {property.electricityRate?.toLocaleString('vi-VN')} VND/kWh
                </Text>
              </View>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <IconButton icon="water" size={20} iconColor="#3498DB" style={styles.rateIcon} />
              <View>
                <Text style={styles.rateLabel}>Nước</Text>
                <Text style={styles.rateValue}>
                  {property.waterRate?.toLocaleString('vi-VN')} VND/m³
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        {/* Room Stats */}
        <View style={styles.statsRow}>
          <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content>
              <Text style={styles.statValue}>{totalRooms}</Text>
              <Text style={styles.statLabel}>Tổng phòng</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: '#D5F5E3' }]}>
            <Card.Content>
              <Text style={styles.statValue}>{vacantRooms}</Text>
              <Text style={styles.statLabel}>Trống</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statCard, { backgroundColor: '#FDEBD0' }]}>
            <Card.Content>
              <Text style={styles.statValue}>{occupiedRooms}</Text>
              <Text style={styles.statLabel}>Đã thuê</Text>
            </Card.Content>
          </Card>
        </View>

        <Divider style={styles.divider} />

        {/* Room List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh sách phòng</Text>
        </View>

        {rooms.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>Chưa có phòng nào. Bấm + để thêm phòng mới.</Text>
            </Card.Content>
          </Card>
        ) : (
          rooms.map((room: any) => {
            const statusInfo = STATUS_LABELS[room.status] ?? { label: room.status, color: '#888' };
            return (
              <Card
                key={room.id}
                style={styles.roomCard}
                onPress={() =>
                  navigation.navigate('RoomDetail', { id: room.id, propertyId: id })
                }
              >
                <Card.Content style={styles.roomContent}>
                  <View style={styles.roomInfo}>
                    <Text style={styles.roomNumber}>Phòng {room.roomNumber}</Text>
                    {room.floor && (
                      <Text style={styles.roomMeta}>Tầng {room.floor}</Text>
                    )}
                    <Text style={styles.roomMeta}>
                      {room.area} m² · {room.baseRent?.toLocaleString('vi-VN')} VND/tháng
                    </Text>
                  </View>
                  <Chip
                    style={{ backgroundColor: statusInfo.color + '20' }}
                    textStyle={{ color: statusInfo.color, fontSize: 11, fontWeight: '600' }}
                    compact
                  >
                    {statusInfo.label}
                  </Chip>
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* FAB to add room */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateRoom', { propertyId: id })}
        label="Thêm phòng"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 100 },
  imageScroller: { marginBottom: spacing.md },
  propertyImage: {
    width: IMAGE_WIDTH,
    height: 200,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
  },
  name: { ...typography.headingLarge, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  addressIcon: { margin: 0 },
  address: { ...typography.body, color: theme.colors.onSurfaceVariant, flex: 1 },
  description: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  ratesCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: 12 },
  ratesContent: { flexDirection: 'row', alignItems: 'center' },
  rateItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rateIcon: { margin: 0, marginRight: spacing.xs },
  rateLabel: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
  rateValue: { ...typography.body, fontWeight: '600' },
  rateDivider: { width: 1, height: 40, backgroundColor: theme.colors.surfaceVariant },
  divider: { marginVertical: spacing.md, marginHorizontal: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  statCard: { flex: 1, borderRadius: 12 },
  statValue: { ...typography.headingLarge, textAlign: 'center' },
  statLabel: { ...typography.bodySmall, textAlign: 'center', color: theme.colors.onSurfaceVariant },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: { ...typography.headingSmall },
  emptyCard: { marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: 12 },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  roomCard: { marginHorizontal: spacing.lg, marginTop: spacing.sm, borderRadius: 12 },
  roomContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomInfo: { flex: 1 },
  roomNumber: { ...typography.headingSmall },
  roomMeta: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
  },
});
