import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { useProperties } from '../../queries/properties';
import { useInvoices } from '../../queries/invoices';
import { theme, spacing, typography } from '../../theme';

export default function LandlordHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { data: propertiesData, isLoading: loadingProps } = useProperties();
  const { data: invoices, isLoading: loadingInvs } = useInvoices();

  const overdueCount =
    invoices?.filter((inv: any) => inv.status === 'qua_han').length ?? 0;
  const pendingCount =
    invoices?.filter((inv: any) => inv.status === 'chua_thanh_toan').length ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Xin chào, {user?.fullName}!</Text>

        {loadingProps || loadingInvs ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]}>
              <Card.Content>
                <Text style={styles.statValue}>{propertiesData?.total ?? 0}</Text>
                <Text style={styles.statLabel}>Bất động sản</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: '#FDEBD0' }]}>
              <Card.Content>
                <Text style={styles.statValue}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Chờ thanh toán</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: '#FADBD8' }]}>
              <Card.Content>
                <Text style={styles.statValue}>{overdueCount}</Text>
                <Text style={styles.statLabel}>Quá hạn</Text>
              </Card.Content>
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg },
  greeting: { ...typography.headingMedium, marginBottom: spacing.lg },
  loader: { marginTop: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, borderRadius: 12 },
  statValue: { ...typography.headingLarge, textAlign: 'center' },
  statLabel: { ...typography.bodySmall, textAlign: 'center', color: theme.colors.onSurfaceVariant },
});
