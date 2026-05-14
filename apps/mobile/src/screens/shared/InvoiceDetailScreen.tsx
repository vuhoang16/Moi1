import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Linking, Image } from 'react-native';
import { Text, Card, Button, Chip, RadioButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  chua_thanh_toan: 'Chưa thanh toán',
  da_thanh_toan: 'Đã thanh toán',
  qua_han: 'Quá hạn',
};

export default function InvoiceDetailScreen({ route }: any) {
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const { data: invoice, isLoading, refetch } = useInvoice(id);
  const initiatePayment = useInitiatePayment();
  const [method, setMethod] = useState<PaymentMethod>('momo');
  const [qrData, setQrData] = useState<QRData | null>(null);
  const { paymentReturnStatus, clearPaymentReturnStatus } = usePaymentReturn();

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!invoice) return null;

  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const isTenant = user?.id === invoice.tenantId;
  const canPay = isTenant && invoice.status !== 'da_thanh_toan';

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

  const otherFees = (invoice.otherFees as any[]) ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

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

        <View style={styles.titleRow}>
          <Text style={styles.title}>Hóa đơn {invoice.billingMonth}</Text>
          <Chip
            style={{ backgroundColor: STATUS_COLOR[invoice.status as InvoiceStatus] + '22' }}
            textStyle={{ color: STATUS_COLOR[invoice.status as InvoiceStatus] }}
          >
            {STATUS_LABEL[invoice.status as InvoiceStatus]}
          </Chip>
        </View>

        <Card style={styles.card}>
          <Card.Title title="Chi tiết" />
          <Card.Content>
            <Row label="Tiền thuê" value={money(invoice.baseRent)} />
            <Row
              label={`Điện (${invoice.electricityUsage} kWh)`}
              value={money(invoice.electricityAmount)}
            />
            <Row
              label={`Nước (${invoice.waterUsage} m³)`}
              value={money(invoice.waterAmount)}
            />
            {otherFees.map((f: any, i: number) => (
              <Row key={i} label={f.name} value={money(f.amount)} />
            ))}
            <View style={styles.divider} />
            <Row label="Tổng cộng" value={money(invoice.totalAmount)} bold />
            <Row label="Hạn thanh toán" value={dayjs(invoice.dueDate).format('DD/MM/YYYY')} />
            {invoice.paidAt && (
              <Row
                label="Đã thanh toán lúc"
                value={dayjs(invoice.paidAt).format('DD/MM/YYYY HH:mm')}
              />
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Chỉ số điện nước" />
          <Card.Content>
            <Row label="Điện kỳ trước" value={`${invoice.electricityPrevReading} kWh`} />
            <Row label="Điện kỳ này" value={`${invoice.electricityCurrentReading} kWh`} />
            <Row label="Nước kỳ trước" value={`${invoice.waterPrevReading} m³`} />
            <Row label="Nước kỳ này" value={`${invoice.waterCurrentReading} m³`} />
          </Card.Content>
        </Card>

        {/* Payment method selector */}
        {canPay && !qrData && (
          <Card style={styles.card}>
            <Card.Title title="Chọn phương thức thanh toán" />
            <Card.Content>
              {(
                [
                  { value: 'momo', label: 'MoMo' },
                  { value: 'zalopay', label: 'ZaloPay' },
                  { value: 'vietqr', label: 'VietQR (chuyển khoản)' },
                ] as { value: PaymentMethod; label: string }[]
              ).map(({ value, label }) => (
                <View key={value} style={styles.radioRow}>
                  <RadioButton
                    value={value}
                    status={method === value ? 'checked' : 'unchecked'}
                    onPress={() => setMethod(value)}
                  />
                  <Text style={styles.radioLabel} onPress={() => setMethod(value)}>
                    {label}
                  </Text>
                </View>
              ))}
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={pay}
                loading={initiatePayment.isPending}
                style={{ flex: 1, marginHorizontal: spacing.sm }}
              >
                Thanh toán {money(invoice.totalAmount)}
              </Button>
            </Card.Actions>
          </Card>
        )}

        {/* VietQR display */}
        {qrData && (
          <Card style={styles.card}>
            <Card.Title title="Quét mã VietQR để chuyển khoản" />
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
                onPress={() => {
                  setQrData(null);
                  refetch();
                }}
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

function Row({ label, value, bold }: { label: string; value?: string; bold?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold]}>{value ?? '—'}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { ...typography.body, color: theme.colors.onSurfaceVariant },
  value: { ...typography.body, maxWidth: '55%', textAlign: 'right' },
  bold: { fontWeight: '700', color: theme.colors.primary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, gap: spacing.md },

  // Return banner
  returnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  returnIcon: { fontSize: 20 },
  returnText: { ...typography.body, flex: 1 },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.headingLarge },
  card: { borderRadius: 12 },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceVariant,
    marginVertical: spacing.sm,
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  radioLabel: { ...typography.body, flex: 1 },

  // VietQR
  qrContainer: { alignItems: 'center', paddingVertical: spacing.md },
  qrImage: { width: 220, height: 220, borderRadius: 8 },
  qrAmount: {
    ...typography.headingMedium,
    color: theme.colors.primary,
    marginTop: spacing.md,
  },
  transferRefBox: {
    marginTop: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
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
