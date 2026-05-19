import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProperties } from '../../queries/properties';
import { theme, spacing, typography } from '../../theme';
import { ListSkeleton } from '../../components/ListSkeleton';
import type { Property } from '@rentapp/shared';

const CARD_GAP = spacing.md;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - CARD_GAP) / 2;

type FilterKey = 'all' | 'occupied' | 'vacant' | 'maintenance';

interface FilterTab {
  key: FilterKey;
  label: string;
}

const FILTERS: FilterTab[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'occupied', label: 'Đang thuê' },
  { key: 'vacant', label: 'Trống' },
  { key: 'maintenance', label: 'Đang sửa chữa' },
];

function PropertyCard({ item, onPress }: { item: Property; onPress: () => void }) {
  const roomCount = (item as any)._count?.rooms ?? 0;
  const occupiedCount = (item as any)._count?.occupiedRooms ?? 0;
  const hasImage = item.imageUrls && item.imageUrls.length > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardImageContainer}>
        {hasImage ? (
          <Image source={{ uri: item.imageUrls[0] }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <MaterialCommunityIcons name="office-building" size={36} color={theme.colors.primary} />
          </View>
        )}
        {roomCount > 0 && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{occupiedCount}/{roomCount} phòng</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardAddressRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.cardAddress} numberOfLines={1}>
            {item.district}, {item.city}
          </Text>
        </View>
        <View style={styles.cardRoomRow}>
          <MaterialCommunityIcons name="door" size={12} color={theme.colors.primary} />
          <Text style={styles.cardRooms}>{roomCount} phòng</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function PropertiesScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const { data, isLoading, refetch } = useProperties();

  const items: Property[] = data?.items ?? [];

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'all') return true;
    const status = (item as any).status;
    if (activeFilter === 'occupied') return status === 'occupied';
    if (activeFilter === 'vacant') return status === 'vacant';
    if (activeFilter === 'maintenance') return status === 'maintenance';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Quản Lý Phòng</Text>
        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => navigation.navigate('CreateProperty')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={22} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, activeFilter === f.key && styles.filterPillActive]}
            onPress={() => setActiveFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === f.key && styles.filterPillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <PropertyCard
              item={item}
              onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="office-building-outline" size={48} color={theme.colors.primary} />
              </View>
              <Text style={styles.emptyText}>Chưa có phòng nào</Text>
              <Text style={styles.emptySubtext}>Nhấn + để thêm bất động sản mới</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateProperty')}
        color={theme.colors.onPrimary}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  headerTitle: {
    ...typography.headingMedium,
    color: theme.colors.onSurface,
  },
  headerAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C0C0C0',
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    ...typography.bodySmall,
    fontWeight: '500' as const,
    color: theme.colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: theme.colors.onPrimary,
  },
  grid: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardImageContainer: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  statusBadgeText: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 10,
  },
  cardBody: {
    padding: spacing.sm,
  },
  cardName: {
    ...typography.headingSmall,
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  cardAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
  },
  cardAddress: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  cardRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardRooms: {
    ...typography.bodySmall,
    color: theme.colors.primary,
    fontWeight: '500' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.headingSmall,
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: theme.colors.primary,
  },
});
