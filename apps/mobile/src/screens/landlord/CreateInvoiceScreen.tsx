import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Divider,
  IconButton,
  ActivityIndicator,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useContracts } from '../../queries/contracts';
import { useCreateInvoice } from '../../queries/invoices';
import { theme, spacing, typography } from '../../theme';
import dayjs from 'dayjs';

interface OtherFee {
  name: string;
  amount: string;
}

export default function CreateInvoiceScreen({ navigation }: any) {
  const { data: contracts, isLoading } = useContracts();
  const createInvoice = useCreateInvoice();

  // Active contracts only
  const activeContracts = useMemo(
    () => contracts?.filter((c: any) => c.status === 'hieu_luc') ?? [],
    [contracts],
  );

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [electricityReading, setElectricityReading] = useState('');
  const [waterReading, setWaterReading] = useState('');
  const [otherFees, setOtherFees] = useState<OtherFee[]>([]);
  const [notes, setNotes] = useState('');

  const selectedContract = useMemo(
    () => activeContracts.find((c: any) => c.id === selectedContractId),
    [activeContracts, selectedContractId],
  );

  const billingMonth = dayjs().format('YYYY-MM');
  const dueDate = dayjs().date(selectedContract?.paymentDueDay ?? 5).add(1, 'month').format('YYYY-MM-DD');

  // Calculations
  const electricityVal = parseFloat(electricityReading) || 0;
  const waterVal = parseFloat(waterReading) || 0;
  const electricityPrev = selectedContract?.room?.property?.electricityRate ? 0 : 0; // Will be auto-calculated server-side
  const electricityRate = selectedContract?.room?.property?.electricityRate ?? 0;
  const waterRate = selectedContract?.room?.property?.waterRate ?? 0;

  const otherFeesTotal = otherFees.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

  const handleAddFee = () => {
    setOtherFees([...otherFees, { name: '', amount: '' }]);
  };

  const handleRemoveFee = (index: number) => {
    setOtherFees(otherFees.filter((_, i) => i !== index));
  };

  const handleUpdateFee = (index: number, field: 'name' | 'amount', value: string) => {
    const updated = [...otherFees];
    updated[index] = { ...updated[index], [field]: value };
    setOtherFees(updated);
  };

  const handleSubmit = () => {
    if (!selectedContractId) {
      Alert.alert('Lỗi', 'Vui lòng chọn hợp đồng');
      return;
    }
    if (!electricityReading || !waterReading) {
      Alert.alert('Lỗi', 'Vui lòng nhập chỉ số điện và nước');
      return;
    }

    const parsedOtherFees = otherFees
      .filter((f) => f.name && f.amount)
      .map((f) => ({ name: f.name, amount: parseFloat(f.amount) || 0 }));

    createInvoice.mutate(
      {
        contractId: selectedContractId,
        billingMonth,
        dueDate,
        electricityCurrentReading: electricityVal,
        waterCurrentReading: waterVal,
        otherFees: parsedOtherFees.length > 0 ? parsedOtherFees : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          Alert.alert('Thành công', 'Hóa đơn đã được tạo', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? 'Không thể tạo hóa đơn';
          Alert.alert('Lỗi', typeof msg === 'string' ? msg : JSON.stringify(msg));
        },
      },
    );
  };

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Tạo hóa đơn tháng {billingMonth}</Text>

          {/* Contract Selection */}
          <Text style={styles.sectionTitle}>Chọn hợp đồng</Text>
          {activeContracts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>Chưa có hợp đồng hiệu lực nào</Text>
              </Card.Content>
            </Card>
          ) : (
            activeContracts.map((contract: any) => (
              <Card
                key={contract.id}
                style={[
                  styles.contractCard,
                  selectedContractId === contract.id && styles.contractCardSelected,
                ]}
                onPress={() => setSelectedContractId(contract.id)}
              >
                <Card.Content>
                  <Text style={styles.contractRoom}>
                    {contract.room?.property?.name} — Phòng {contract.room?.roomNumber}
                  </Text>
                  <Text style={styles.contractTenant}>
                    Người thuê: {contract.tenant?.fullName}
                  </Text>
                </Card.Content>
              </Card>
            ))
          )}

          {selectedContract && (
            <>
              <Divider style={styles.divider} />

              {/* Meter Readings */}
              <Text style={styles.sectionTitle}>Chỉ số đồng hồ</Text>

              <View style={styles.meterRow}>
                <View style={styles.meterField}>
                  <TextInput
                    label="Chỉ số điện hiện tại (kWh)"
                    value={electricityReading}
                    onChangeText={setElectricityReading}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                  />
                  <HelperText type="info">
                    Giá điện: {electricityRate.toLocaleString('vi-VN')} VND/kWh
                  </HelperText>
                </View>
              </View>

              <View style={styles.meterRow}>
                <View style={styles.meterField}>
                  <TextInput
                    label="Chỉ số nước hiện tại (m³)"
                    value={waterReading}
                    onChangeText={setWaterReading}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.input}
                  />
                  <HelperText type="info">
                    Giá nước: {waterRate.toLocaleString('vi-VN')} VND/m³
                  </HelperText>
                </View>
              </View>

              <Divider style={styles.divider} />

              {/* Other Fees */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Phí khác</Text>
                <IconButton icon="plus-circle" onPress={handleAddFee} size={24} />
              </View>

              {otherFees.map((fee, index) => (
                <View key={index} style={styles.feeRow}>
                  <TextInput
                    label="Tên phí"
                    value={fee.name}
                    onChangeText={(v) => handleUpdateFee(index, 'name', v)}
                    mode="outlined"
                    style={[styles.input, { flex: 2 }]}
                  />
                  <TextInput
                    label="Số tiền"
                    value={fee.amount}
                    onChangeText={(v) => handleUpdateFee(index, 'amount', v)}
                    keyboardType="numeric"
                    mode="outlined"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <IconButton icon="close-circle" onPress={() => handleRemoveFee(index)} size={20} />
                </View>
              ))}

              <Divider style={styles.divider} />

              {/* Notes */}
              <TextInput
                label="Ghi chú (tùy chọn)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              {/* Summary */}
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <Text style={styles.summaryTitle}>Tổng kết</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tiền thuê:</Text>
                    <Text style={styles.summaryValue}>
                      {(selectedContract.monthlyRent ?? 0).toLocaleString('vi-VN')} VND
                    </Text>
                  </View>
                  {otherFeesTotal > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Phí khác:</Text>
                      <Text style={styles.summaryValue}>
                        {otherFeesTotal.toLocaleString('vi-VN')} VND
                      </Text>
                    </View>
                  )}
                  <HelperText type="info" style={{ paddingHorizontal: 0 }}>
                    Tiền điện và nước sẽ được tính tự động dựa trên chỉ số
                  </HelperText>
                </Card.Content>
              </Card>

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={createInvoice.isPending}
                disabled={createInvoice.isPending}
                style={styles.submitButton}
                contentStyle={styles.submitContent}
              >
                Tạo hóa đơn
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: { ...typography.headingLarge, marginBottom: spacing.lg },
  sectionTitle: { ...typography.headingSmall, marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { marginVertical: spacing.md },
  input: { marginBottom: spacing.sm },
  emptyCard: { borderRadius: 12 },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  contractCard: {
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  contractCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  contractRoom: { ...typography.headingSmall },
  contractTenant: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  meterRow: { marginBottom: spacing.xs },
  meterField: { flex: 1 },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  summaryCard: { borderRadius: 12, marginVertical: spacing.md, backgroundColor: theme.colors.primaryContainer },
  summaryTitle: { ...typography.headingSmall, marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  summaryLabel: { ...typography.body },
  summaryValue: { ...typography.body, fontWeight: '600' },
  submitButton: { marginTop: spacing.md, borderRadius: 12 },
  submitContent: { paddingVertical: spacing.sm },
});
