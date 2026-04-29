import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useInvoices } from '../../queries/invoices';
import EmptyState from '../../components/EmptyState';
import { ListSkeleton } from '../../components/ListSkeleton';
import { theme, spacing, typography } from '../../theme';
import type { InvoiceStatus } from '@rentapp/shared';

const statusColors: Record<InvoiceStatus, string> = {
  chua_thanh_toan: '#E67E22',
  da_thanh_toan: '#27AE60',
  qua_han: '#C0392B',
};

const statusLabels: Record<InvoiceStatus, string> = {
  chua_thanh_toan: 'Chưa thanh toán',
  da_thanh_toan: 'Đã thanh toán',
  qua_han: 'Quá hạn',
};

export default function InvoiceListScreen({ navigation }: any) {
  const { data: invoices, isLoading, refetch } = useInvoices();

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={invoices ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('InvoiceDetail', { id: item.id })}
            >
              <Card.Content>
                <View style={styles.row}>
                  <Text style={styles.month}>Tháng {item.billingMonth}</Text>
                  <Chip
                    style={{ backgroundColor: statusColors[item.status as InvoiceStatus] + '22' }}
                    textStyle={{ color: statusColors[item.status as InvoiceStatus] }}
                    compact
                  >
                    {statusLabels[item.status as InvoiceStatus]}
                  </Chip>
                </View>
                <Text style={styles.amount}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                    item.totalAmount,
                  )}
                </Text>
                <Text style={styles.due}>
                  Hạn: {dayjs(item.dueDate).format('DD/MM/YYYY')}
                </Text>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Chưa có hóa đơn"
              description="Không có hóa đơn nào cho hợp đồng này."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, marginTop: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  month: { ...typography.headingSmall },
  amount: { ...typography.headingMedium, color: theme.colors.primary },
  due: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginTop: spacing.xs },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
});
