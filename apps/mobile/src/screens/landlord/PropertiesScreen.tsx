import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProperties } from '../../queries/properties';
import { spacing, typography } from '../../theme';
import { ListSkeleton } from '../../components/ListSkeleton';
import type { Property } from '@rentapp/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DARK_BG = '#0A1628';
const CARD_IMAGE_HEIGHT = 200;

type FilterKey = 'all' | 'occupied' | 'vacant';

interface FilterTab {
  key: FilterKey;
  label: string;
}

const FILTERS: FilterTab[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'occupied', label: 'Đang thuê' },
  { key: 'vacant', label: 'Trống' },
];

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  occupied: { label: 'Đang thuê', color: '#2196F3' },
  vacant: { label: 'Trống', color: '#27AE60' },
  maintenance: { label: 'Đang sửa chữa', color: '#E67E22' },
};

function getStatusInfo(item: Property) {
  const status = (item as any).status as string | undefined;
  if (status && STATUS_BADGE[status]) return STATUS_BADGE[status];
  return null;
}

function PropertyCard({ item, onPress }: { item: Property; onPress: () => void }) {
  const heroUri =
    item.imageUrls && item.imageUrls.length > 0
      ? item.imageUrls[0]
      : `https://placehold.co/${SCREEN_WIDTH}x${CARD_IMAGE_HEIGHT}/1B4F72/white?text=Phong`;

  const statusInfo = getStatusInfo(item);
  const area = (item as any).area ? `${(item as any).area}m²` : null;
  const price = (item as any).baseRent
    ? `${Number((item as any).baseRent).toLocaleString('vi-VN')} ₫/tháng`
    : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.card}>
      <ImageBackground
        source={{ uri: heroUri }}
        style={styles.cardImage}
        imageStyle={styles.cardImageInner}
        resizeMode="cover"
      >
        <View style={styles.cardOverlay} />

        {statusInfo && (
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardMeta}>
            {area && (
              <Text style={styles.cardMetaText}>{area}</Text>
            )}
            {price && (
              <Text style={styles.cardPrice}>{price}</Text>
            )}
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

export default function PropertiesScreen({ navigation }: any) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const { data, isLoading, refetch } = useProperties();

  const items: Property[] = data?.items ?? [];

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'all') return true;
    const status = (item as any).status as string | undefined;
    if (activeFilter === 'occupied') return status === 'occupied';
    if (activeFilter === 'vacant') return status === 'vacant';
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_BG} />

      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Danh Sách Phòng</Text>
        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => navigation.navigate('CreateProperty')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
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
            <Text
              style={[
                styles.filterPillText,
                activeFilter === f.key && styles.filterPillTextActive,
              ]}
            >
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
          contentContainerStyle={styles.list}
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
              <MaterialCommunityIcons name="office-building-outline" size={56} color="#4A6FA5" />
              <Text style={styles.emptyText}>Chưa có phòng nào</Text>
              <Text style={styles.emptySubtext}>Nhấn + để thêm bất động sản mới</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.headingMedium,
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  headerAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterPillText: {
    ...typography.bodySmall,
    fontWeight: '500' as const,
    color: '#FFFFFF',
  },
  filterPillTextActive: {
    color: DARK_BG,
    fontWeight: '600' as const,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  cardImage: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    justifyContent: 'space-between',
  },
  cardImageInner: {
    borderRadius: 14,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 14,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    margin: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    ...typography.label,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  cardFooter: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  cardName: {
    ...typography.headingSmall,
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 18,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.md,
  },
  cardMetaText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  cardPrice: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.headingSmall,
    color: '#FFFFFF',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
});
