import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, Card, FAB, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useProperties } from '../../queries/properties';
import { theme, spacing, typography } from '../../theme';
import EmptyState from '../../components/EmptyState';
import { ListSkeleton } from '../../components/ListSkeleton';

export default function PropertiesScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useProperties({ search: search || undefined });

  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Tìm bất động sản..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
            >
              <Card.Content>
                <Text style={styles.propertyName}>{item.name}</Text>
                <Text style={styles.address}>{item.address}, {item.district}</Text>
                <Text style={styles.rooms}>{item._count?.rooms ?? 0} phòng</Text>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Chưa có bất động sản nào</Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateProperty')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  search: { margin: spacing.md },
  loader: { flex: 1, marginTop: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { borderRadius: 12 },
  propertyName: { ...typography.headingSmall, marginBottom: spacing.xs },
  address: { ...typography.body, color: theme.colors.onSurfaceVariant },
  rooms: { ...typography.bodySmall, color: theme.colors.primary, marginTop: spacing.xs },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
  fab: { position: 'absolute', bottom: spacing.lg, right: spacing.lg },
});
