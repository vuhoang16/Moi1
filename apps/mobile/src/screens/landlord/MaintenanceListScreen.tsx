import React, { useState, useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';

const STATUS_FILTERS = [
  { label: 'Tất cả', value: '' },
  { label: 'Chờ xử lý', value: 'pending' },
  { label: 'Đang xử lý', value: 'in_progress' },
  { label: 'Hoàn thành', value: 'done' },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'Cao', color: '#E74C3C' },
  medium: { label: 'Trung bình', color: '#E67E22' },
  low: { label: 'Thấp', color: '#27AE60' },
};

export default function MaintenanceListScreen({ navigation }: any) {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => api.get('/maintenance').then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const list: any[] = data ?? [];
    return list
      .filter((item) => (statusFilter ? item.status === statusFilter : true))
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
        );
      });
  }, [data, statusFilter, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Tìm kiếm yêu cầu bảo trì..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.value}
            selected={statusFilter === f.value}
            mode={statusFilter === f.value ? 'flat' : 'outlined'}
            onPress={() => setStatusFilter(f.value)}
            style={[
              styles.filterChip,
              statusFilter === f.value && styles.filterChipActive,
            ]}
            textStyle={statusFilter === f.value ? styles.filterChipActiveText : undefined}
          >
            {f.label}
          </Chip>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => {
            const priority = PRIORITY_CONFIG[item.priority] ?? null;
            return (
              <Card style={styles.card} onPress={() => navigation.navigate('MaintenanceDetail', { id: item.id })}>
                <Card.Content>
                  <View style={styles.row}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Chip compact>{item.status}</Chip>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.desc}>{item.room?.roomNumber}</Text>
                    {priority && (
                      <Chip
                        compact
                        style={[styles.priorityChip, { backgroundColor: priority.color + '22' }]}
                        textStyle={[styles.priorityText, { color: priority.color }]}
                      >
                        {priority.label}
                      </Chip>
                    )}
                  </View>
                </Card.Content>
              </Card>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Không có yêu cầu bảo trì nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchbar: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    elevation: 1,
  },
  searchInput: { ...typography.body },
  chipRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterChip: { borderRadius: 20 },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipActiveText: { color: theme.colors.onPrimary },
  loader: { flex: 1, marginTop: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.headingSmall, flex: 1 },
  desc: { ...typography.body, color: theme.colors.onSurfaceVariant, flex: 1 },
  priorityChip: { borderRadius: 12 },
  priorityText: { ...typography.label, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
});
