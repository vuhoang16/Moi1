import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Linking, Image, TouchableOpacity } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useInvoice, useInitiatePayment } from '../../queries/invoices';
import { useAuthStore } from '../../store/auth.store';
import { usePaymentReturn } from '../../hooks/usePaymentReturn';
import { theme, spacing, typography } from '../../theme';
import type { InvoiceStatus } from '@rentapp/shared';

type PaymentMethod = 'momo' | 'zalopay' | 'vietqr';

interface QRData {
  qrCodeUrl: string;
  transferRef: string;
  amount: number;
}

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  chua_thanh_toan: '#E67E22',
  da_thanh_toan: '#27AE60',
  qua_han: '#C0392B',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  chua_thanh_toan: 'Chưa Thanh Toán',
  da_thanh_toan: 'Đã Thanh Toán',
  qua_han: 'Quá Hạn',
};

const money = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

export default function InvoiceDetailScreen({ route }: any) {
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const { data: invoice, isLoading, refetch } = useInvoice(id);
  const initiatePayment = useInitiatePayment();
  const [method, setMethod] = useState<PaymentMethod>('momo');
  const [qrData, setQrData] = useState<QRData | null>(null);
  const { paymentReturnStatus, clearPaymentReturnStatus } = usePaymentReturn();

  if (isLoading) return <ActivityIndicator style={styles.loader} />;
  if (!invoice) return null;

  const isTenant = user?.id === invoice.tenantId;
  const canPay = isTenant && invoice.status !== 'da_thanh_toan';
  const status = invoice.status as InvoiceStatus;
  const otherFees = (invoice.otherFees as any[]) ?? [];

  const pay = async () => {
    try {
      const result = await initiatePayment.mutateAsync({ invoiceId: id, method });
      if (method === 'vietqr' && result.qrCodeUrl) {
        setQrData({
          qrCodeUrl: result.qrCodeUrl,
          transferRef: result.payment?.gatewayOrderId ?? '',
          amount: invoice.totalAmount,
        });
      } else if (result.deeplink) {
        await Linking.openURL(result.deeplink);
      } else if (result.payUrl) {
        await Linking.openURL(result.payUrl);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Không thể tạo giao dịch');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Room + period subtitle */}
        <Text style={styles.subtitle}>
          {invoice.billingMonth}
        </Text>

        {/* Payment return banner */}
        {paymentReturnStatus && (
          <Card
            style={[
              styles.card,
              { backgroundColor: paymentReturnStatus === 'success' ? '#D5F5E3' : '#FDEBD0' },
            ]}
          >
            <Card.Content style={styles.returnBanner}>
              <Text style={styles.returnIcon}>
                {paymentReturnStatus === 'success' ? '✅' : '❌'}
              </Text>
              <Text style={styles.returnText}>
                {paymentReturnStatus === 'success'
                  ? 'Thanh toán thành công! Hóa đơn đang được cập nhật.'
                  : 'Giao dịch không thành công. Vui lòng thử lại.'}
              </Text>
              <Button compact onPress={clearPaymentReturnStatus}>Đóng</Button>
            </Card.Content>
          </Card>
        )}

        {/* Status badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[status] }]}>
            <Text style={styles.statusLabel}>{STATUS_LABEL[status]}</Text>
          </View>
        </View>

        {/* Billing breakdown card */}
        <Card style={styles.card}>
          <Card.Content>
            <BillingRow label="Tiền thuê" value={money(invoice.baseRent)} />
            <BillingRow label="Tiền điện" value={money(invoice.electricityAmount)} />
            <BillingRow label="Tiền nước" value={money(invoice.waterAmount)} />
            {otherFees.filter((f: any) => f.amount > 0).map((f: any, i: number) => (
              <BillingRow key={i} label={f.name} value={money(f.amount)} />
            ))}
            <Divider style={styles.divider} />
            <BillingRow label="Tổng cộng" value={money(invoice.totalAmount)} bold />
          </Card.Content>
        </Card>

        {/* Due date row */}
        <View style={styles.dueDateRow}>
          <MaterialCommunityIcons
            name="calendar-outline"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={styles.dueDateText}>
            Hạn thanh toán: {dayjs(invoice.dueDate).format('DD/MM/YYYY')}
          </Text>
        </View>

        {/* Utility meter readings card */}
        <Card style={styles.card}>
          <Card.Title title="Chỉ số điện nước" titleStyle={styles.cardTitle} />
          <Card.Content>
            <BillingRow
              label={`Điện (${invoice.electricityUsage} kWh)`}
              value={money(invoice.electricityAmount)}
            />
            <BillingRow
              label={`Nước (${invoice.waterUsage} m³)`}
              value={money(invoice.waterAmount)}
            />
          </Card.Content>
        </Card>

        {/* Paid confirmation */}
        {status === 'da_thanh_toan' && invoice.paidAt && (
          <View style={styles.paidRow}>
            <MaterialCommunityIcons name="check-circle" size={28} color="#27AE60" />
            <Text style={styles.paidText}>
              Đã thanh toán lúc {dayjs(invoice.paidAt).format('DD/MM/YYYY HH:mm')}
            </Text>
          </View>
        )}

        {/* Payment section */}
        {canPay && !qrData && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.paymentHeading}>Chọn phương thức thanh toán</Text>
              <View style={styles.paymentOptionsRow}>
                <PaymentOption
                  label="MoMo"
                  icon="cellphone"
                  color="#A93DE6"
                  selected={method === 'momo'}
                  onPress={() => setMethod('momo')}
                />
                <PaymentOption
                  label="ZaloPay"
                  icon="lightning-bolt"
                  color="#0068FF"
                  selected={method === 'zalopay'}
                  onPress={() => setMethod('zalopay')}
                />
                <PaymentOption
                  label="VietQR"
                  icon="qrcode"
                  color="#0F8B8D"
                  selected={method === 'vietqr'}
                  onPress={() => setMethod('vietqr')}
                />
              </View>
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button
                mode="contained"
                onPress={pay}
                loading={initiatePayment.isPending}
                style={styles.payButton}
                contentStyle={styles.payButtonContent}
              >
                Thanh Toán
              </Button>
            </Card.Actions>
          </Card>
        )}

        {/* VietQR display */}
        {qrData && (
          <Card style={styles.card}>
            <Card.Title title="Quét mã VietQR để chuyển khoản" titleStyle={styles.cardTitle} />
            <Card.Content style={styles.qrContainer}>
              <Image
                source={{ uri: qrData.qrCodeUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrAmount}>{money(qrData.amount)}</Text>
              {!!qrData.transferRef && (
                <View style={styles.transferRefBox}>
                  <Text style={styles.transferRefLabel}>Nội dung chuyển khoản</Text>
                  <Text style={styles.transferRefValue}>{qrData.transferRef}</Text>
                </View>
              )}
              <Text style={styles.qrHint}>
                Mở app ngân hàng → Quét mã QR → Kiểm tra thông tin → Xác nhận
              </Text>
              <Button
                mode="contained-tonal"
                onPress={() => { setQrData(null); refetch(); }}
                style={{ marginTop: spacing.md }}
              >
                Đã chuyển khoản xong
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BillingRow({
  label,
  value,
  bold,
}: {
  label: string;
  value?: string;
  bold?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, bold && rowStyles.boldLabel]}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.boldValue]}>{value ?? '—'}</Text>
    </View>
  );
}

function PaymentOption({
  label,
  icon,
  color,
  selected,
  onPress,
}: {
  label: string;
  icon: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        paymentStyles.card,
        selected && { borderColor: color, backgroundColor: color + '14' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      <Text style={[paymentStyles.label, selected && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  label: { ...typography.body, color: theme.colors.onSurfaceVariant, flex: 1 },
  value: { ...typography.body, textAlign: 'right' },
  boldLabel: { ...typography.headingSmall, color: theme.colors.onSurface },
  boldValue: {
    ...typography.headingSmall,
    color: theme.colors.primary,
    textAlign: 'right',
  },
});

const paymentStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.surfaceVariant,
    borderRadius: theme.roundness,
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },

  subtitle: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },

  statusRow: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: 50,
  },
  statusLabel: {
    ...typography.headingSmall,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  card: {
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
  },
  cardTitle: { ...typography.headingSmall },
  cardActions: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },

  divider: {
    marginVertical: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
  },

  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  dueDateText: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
  },

  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#D5F5E3',
    borderRadius: theme.roundness,
    padding: spacing.md,
  },
  paidText: {
    ...typography.body,
    color: '#1E8449',
    flex: 1,
  },

  paymentHeading: {
    ...typography.headingSmall,
    color: theme.colors.onSurface,
    marginBottom: spacing.md,
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payButton: {
    flex: 1,
    borderRadius: theme.roundness,
  },
  payButtonContent: {
    paddingVertical: spacing.xs,
  },

  returnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  returnIcon: { fontSize: 20 },
  returnText: { ...typography.body, flex: 1 },

  qrContainer: { alignItems: 'center', paddingVertical: spacing.md },
  qrImage: { width: 220, height: 220, borderRadius: spacing.sm },
  qrAmount: {
    ...typography.headingMedium,
    color: theme.colors.primary,
    marginTop: spacing.md,
  },
  transferRefBox: {
    marginTop: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: spacing.sm,
    padding: spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  transferRefLabel: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  transferRefValue: {
    ...typography.body,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  qrHint: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
