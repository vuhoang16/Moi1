import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Alert,
  Linking,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator, Divider } from 'react-native-paper';
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

const STATUS_BG: Record<InvoiceStatus, string> = {
  chua_thanh_toan: '#FFCDD2',
  da_thanh_toan: '#C8E6C9',
  qua_han: '#EF5350',
};

const STATUS_TEXT_COLOR: Record<InvoiceStatus, string> = {
  chua_thanh_toan: '#C62828',
  da_thanh_toan: '#2E7D32',
  qua_han: '#FFFFFF',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  chua_thanh_toan: 'Chưa Thanh Toán',
  da_thanh_toan: 'Đã Thanh Toán',
  qua_han: 'Quá Hạn',
};

const money = (n: number) => n.toLocaleString('vi-VN') + ' đ';

export default function InvoiceDetailScreen({ route }: any) {
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const { data: invoice, isLoading, refetch } = useInvoice(id);
  const initiatePayment = useInitiatePayment();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('vietqr');
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
      const result = await initiatePayment.mutateAsync({ invoiceId: id, method: selectedMethod });
      if (selectedMethod === 'vietqr' && result.qrCodeUrl) {
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

        {/* Payment return banner */}
        {paymentReturnStatus && (
          <View
            style={[
              styles.returnBanner,
              { backgroundColor: paymentReturnStatus === 'success' ? '#D5F5E3' : '#FDEBD0' },
            ]}
          >
            <Text style={styles.returnIcon}>
              {paymentReturnStatus === 'success' ? '✅' : '❌'}
            </Text>
            <Text style={styles.returnText}>
              {paymentReturnStatus === 'success'
                ? 'Thanh toán thành công! Hóa đơn đang được cập nhật.'
                : 'Giao dịch không thành công. Vui lòng thử lại.'}
            </Text>
            <TouchableOpacity onPress={clearPaymentReturnStatus} style={styles.returnClose}>
              <Text style={styles.returnCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Top section: room name + badge row, then month subtitle */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.roomName}>
              {invoice.roomName ?? `Phòng ${invoice.roomId}`}
            </Text>
            <Text style={styles.monthText}>{invoice.billingMonth}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[status] }]}>
            <Text style={[styles.statusLabel, { color: STATUS_TEXT_COLOR[status] }]}>
              {STATUS_LABEL[status]}
            </Text>
          </View>
        </View>

        {/* Billing table — no card border, rows with lines */}
        <View style={styles.billingTable}>
          <BillingRow label="Tiền thuê" value={money(invoice.baseRent)} />
          <BillingRow label="Tiền điện" value={money(invoice.electricityAmount)} />
          <BillingRow label="Tiền nước" value={money(invoice.waterAmount)} />
          {otherFees.filter((f: any) => f.amount > 0).map((f: any, i: number) => (
            <BillingRow key={i} label={f.name} value={money(f.amount)} />
          ))}
          <Divider style={styles.divider} />
          <BillingRow label="Tổng cộng" value={money(invoice.totalAmount)} bold />
        </View>

        {/* Paid confirmation */}
        {status === 'da_thanh_toan' && invoice.paidAt && (
          <View style={styles.paidRow}>
            <MaterialCommunityIcons name="check-circle" size={22} color="#2E7D32" />
            <Text style={styles.paidText}>
              Đã thanh toán lúc {dayjs(invoice.paidAt).format('DD/MM/YYYY HH:mm')}
            </Text>
          </View>
        )}

        {/* Payment method selection */}
        {canPay && (
          <>
            <Text style={styles.paymentHeading}>Chọn Phương Thức Thanh Toán</Text>
            <View style={styles.paymentMethodRow}>
              <PaymentMethodButton
                id="momo"
                label="MoMo"
                letter="M"
                circleColor="#A93DE6"
                selected={selectedMethod === 'momo'}
                onPress={() => setSelectedMethod('momo')}
              />
              <PaymentMethodButton
                id="zalopay"
                label="ZaloPay"
                letter="Z"
                circleColor="#0068FF"
                selected={selectedMethod === 'zalopay'}
                onPress={() => setSelectedMethod('zalopay')}
              />
              <PaymentMethodButton
                id="vietqr"
                label="VietQR"
                letter="Q"
                circleColor="#0F8B8D"
                selected={selectedMethod === 'vietqr'}
                onPress={() => setSelectedMethod('vietqr')}
                useQrIcon
              />
            </View>
          </>
        )}

        {/* QR display section — shown when vietqr selected */}
        {canPay && selectedMethod === 'vietqr' && (
          <View style={styles.qrSection}>
            {qrData ? (
              <>
                <Image
                  source={{ uri: qrData.qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </>
            ) : (
              <View style={styles.qrPlaceholder}>
                <MaterialCommunityIcons name="qrcode" size={120} color={theme.colors.onSurfaceVariant} />
              </View>
            )}
            <Text style={styles.bankName}>MB Bank</Text>
            <Text style={styles.accountNumber}>12345878</Text>
            <Text style={styles.holderName}>NGUYEN VAN A</Text>
          </View>
        )}

        {/* CTA button */}
        {canPay && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={pay}
            activeOpacity={0.8}
            disabled={initiatePayment.isPending}
          >
            <Text style={styles.ctaButtonText}>
              {initiatePayment.isPending ? 'Đang xử lý...' : 'Đã Chuyển Khoản →'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Show done button after QR displayed */}
        {qrData && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => { setQrData(null); refetch(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Đã chuyển khoản xong</Text>
          </TouchableOpacity>
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

function PaymentMethodButton({
  label,
  letter,
  circleColor,
  selected,
  onPress,
  useQrIcon,
}: {
  id: string;
  label: string;
  letter: string;
  circleColor: string;
  selected: boolean;
  onPress: () => void;
  useQrIcon?: boolean;
}) {
  return (
    <TouchableOpacity style={pmStyles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[pmStyles.circle, { backgroundColor: circleColor }]}>
        {useQrIcon ? (
          <MaterialCommunityIcons name="qrcode" size={22} color="#FFFFFF" />
        ) : (
          <Text style={pmStyles.letter}>{letter}</Text>
        )}
      </View>
      <Text style={[pmStyles.label, selected && pmStyles.labelSelected]}>{label}</Text>
      {selected && (
        <View style={pmStyles.checkDot} />
      )}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  label: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  value: {
    ...typography.body,
    color: theme.colors.onSurface,
    textAlign: 'right',
  },
  boldLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.onSurface,
  },
  boldValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.primary,
    textAlign: 'right',
  },
});

const pmStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  label: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  labelSelected: {
    color: theme.colors.onSurface,
    fontWeight: '600' as const,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loader: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },

  returnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: theme.roundness,
    padding: spacing.md,
    flexWrap: 'wrap',
  },
  returnIcon: { fontSize: 18 },
  returnText: { ...typography.body, flex: 1 },
  returnClose: { paddingHorizontal: spacing.sm },
  returnCloseText: { ...typography.body, color: theme.colors.primary, fontWeight: '600' as const },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  monthText: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 18,
  },

  billingTable: {
    backgroundColor: '#FFFFFF',
  },
  divider: {
    marginVertical: spacing.sm,
    backgroundColor: '#E0E0E0',
    height: 1,
  },

  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#C8E6C9',
    borderRadius: theme.roundness,
    padding: spacing.md,
  },
  paidText: {
    ...typography.body,
    color: '#2E7D32',
    flex: 1,
  },

  paymentHeading: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },

  qrSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrPlaceholder: {
    width: 160,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: spacing.sm,
  },
  qrImage: {
    width: 160,
    height: 200,
    borderRadius: spacing.sm,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: theme.colors.onSurface,
    marginTop: spacing.sm,
  },
  accountNumber: {
    ...typography.body,
    color: theme.colors.onSurface,
  },
  holderName: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
  },

  ctaButton: {
    backgroundColor: '#B2DFDB',
    borderRadius: theme.roundness,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.onSurface,
  },

  doneButton: {
    borderRadius: theme.roundness,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceVariant,
  },
  doneButtonText: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '600' as const,
  },
});
