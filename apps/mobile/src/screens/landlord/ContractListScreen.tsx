import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContracts } from '../../queries/contracts';
import EmptyState from '../../components/EmptyState';
import { ListSkeleton } from '../../components/ListSkeleton';
import { theme, spacing, typography } from '../../theme';
import type { ContractStatus } from '@rentapp/shared';

const statusLabels: Record<ContractStatus, string> = {
  nhap: 'Nháp',
  cho_ky: 'Chờ ký',
  hieu_luc: 'Hiệu lực',
  het_han: 'Hết hạn',
  da_huy: 'Đã huỷ',
};

export default function ContractListScreen({ navigation }: any) {
  const { data: contracts, isLoading, refetch } = useContracts();

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={contracts ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => navigation.navigate('ContractDetail', { id: item.id })}>
              <Card.Content>
                <View style={styles.row}>
                  <Text style={styles.room}>{item.room?.roomNumber} — {item.room?.property?.name}</Text>
                  <Chip compact>{statusLabels[item.status as ContractStatus]}</Chip>
                </View>
                <Text style={styles.tenant}>{item.tenant?.fullName}</Text>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title="Chưa có hợp đồng"
              description="Hiện chưa có hợp đồng nào trong hệ thống."
            />
          }
        />
      )}
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('CreateContract')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, marginTop: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  room: { ...typography.headingSmall },
  tenant: { ...typography.body, color: theme.colors.onSurfaceVariant },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
  fab: { position: 'absolute', bottom: spacing.lg, right: spacing.lg },
});
