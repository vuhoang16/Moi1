import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { useInvoices } from '../../queries/invoices';
import { theme, spacing, typography } from '../../theme';

export default function TenantHomeScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const { data: invoices } = useInvoices();

  const latestInvoice = invoices?.[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Xin chào, {user?.fullName}!</Text>

        {latestInvoice && (
          <Card style={styles.card} onPress={() => navigation.navigate('InvoiceDetail', { id: latestInvoice.id })}>
            <Card.Title title="Hóa đơn mới nhất" />
            <Card.Content>
              <Text style={styles.amount}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                  latestInvoice.totalAmount,
                )}
              </Text>
              <Text style={styles.status}>Trạng thái: {latestInvoice.status}</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg },
  greeting: { ...typography.headingMedium, marginBottom: spacing.lg },
  card: { borderRadius: 12 },
  amount: { ...typography.headingMedium, color: theme.colors.primary },
  status: { ...typography.body, color: theme.colors.onSurfaceVariant, marginTop: spacing.xs },
});
