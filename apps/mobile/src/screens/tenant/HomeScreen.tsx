import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Card, Chip, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';
import { useInvoices } from '../../queries/invoices';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';

function useMyContract() {
  return useQuery({
    queryKey: ['contracts', 'my'],
    queryFn: () => api.get('/contracts/my').then((r) => r.data),
    retry: false,
  });
}

const vnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hiệu lực',
  pending: 'Chờ ký',
  expired: 'Hết hạn',
  terminated: 'Đã chấm dứt',
};

export default function TenantHomeScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const { data: invoices } = useInvoices();
  const { data: contract, isLoading: contractLoading } = useMyContract();

  const latestInvoice = invoices?.[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Xin chào, {user?.fullName}!</Text>

        {contractLoading ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.mutedText}>Đang tải thông tin hợp đồng...</Text>
            </Card.Content>
          </Card>
        ) : !contract ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyText}>Bạn chưa có hợp đồng nào</Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionLabel}>PHÒNG CỦA BẠN</Text>
                <Text style={styles.propertyName}>{contract.room?.property?.name ?? '—'}</Text>
                <View style={styles.roomRow}>
                  <MaterialCommunityIcons name="door" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.roomDetail}>
                    Phòng {contract.room?.roomNumber ?? '—'}
                    {contract.room?.floor != null ? `  •  Tầng ${contract.room.floor}` : ''}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <View style={styles.summaryRow}>
              <Chip
                mode="flat"
                style={[styles.statusChip, { backgroundColor: theme.colors.primaryContainer }]}
                textStyle={{ color: theme.colors.primary, ...typography.label }}
              >
                {STATUS_LABELS[contract.status] ?? contract.status}
              </Chip>
              <Text style={styles.dateRange}>
                {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
              </Text>
              <Text style={styles.rentAmount}>{vnd(contract.monthlyRent)}/tháng</Text>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Invoices')}
              >
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name="cash" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Thanh toán</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('SubmitMaintenance')}
              >
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name="tools" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Bảo trì</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('ContractDetail', { id: contract.id })}
              >
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Hợp đồng</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.sectionHeader}>Hóa đơn gần nhất</Text>

        {latestInvoice ? (
          <Card
            style={styles.card}
            onPress={() => navigation.navigate('InvoiceDetail', { id: latestInvoice.id })}
          >
            <Card.Content>
              <Text style={styles.amount}>{vnd(latestInvoice.totalAmount)}</Text>
              <Text style={styles.status}>Trạng thái: {latestInvoice.status}</Text>
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.mutedText}>Chưa có hóa đơn nào.</Text>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="outlined"
          icon="wrench"
          style={styles.maintenanceButton}
          onPress={() => navigation.navigate('SubmitMaintenance')}
        >
          Gửi yêu cầu bảo trì mới
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg },
  greeting: { ...typography.headingMedium, marginBottom: spacing.lg },
  card: { borderRadius: 12, marginBottom: spacing.md },
  sectionLabel: {
    ...typography.label,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    letterSpacing: 0.8,
  },
  propertyName: { ...typography.headingSmall, marginBottom: spacing.xs },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  roomDetail: { ...typography.body, color: theme.colors.onSurfaceVariant },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusChip: { height: 28 },
  dateRange: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, flex: 1 },
  rentAmount: { ...typography.bodySmall, fontWeight: '600', color: theme.colors.primary },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: { alignItems: 'center', gap: spacing.xs },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: { ...typography.bodySmall, color: theme.colors.primary, fontWeight: '500' },
  sectionHeader: {
    ...typography.headingSmall,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  amount: { ...typography.headingMedium, color: theme.colors.primary },
  status: { ...typography.body, color: theme.colors.onSurfaceVariant, marginTop: spacing.xs },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: spacing.sm },
  mutedText: { ...typography.body, color: theme.colors.onSurfaceVariant },
  maintenanceButton: { marginTop: spacing.md, borderColor: theme.colors.primary },
});
