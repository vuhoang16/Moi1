import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, TextInput, Portal, Dialog } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDepositByContract, useUpdateDeposit } from '../../queries/deposits';
import { theme, spacing, typography } from '../../theme';
import dayjs from 'dayjs';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  dang_giu: { label: 'Đang giữ', color: theme.colors.primary },
  da_thu: { label: 'Đã thu', color: '#27AE60' },
  da_tru_mot_phan: { label: 'Đã trừ (hư hỏng)', color: theme.colors.secondary },
  da_hoan: { label: 'Đã hoàn trả', color: '#8E44AD' },
};

export default function DepositDetailScreen({ route, navigation }: any) {
  const { contractId } = route.params;
  const { data: deposit, isLoading } = useDepositByContract(contractId);
  const updateDeposit = useUpdateDeposit(contractId);

  const [deductVisible, setDeductVisible] = useState(false);
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!deposit) return null;

  const status = STATUS_LABELS[deposit.status] ?? { label: deposit.status, color: '#888' };
  const formatMoney = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + ' VND';

  const handleAction = (action: 'collect' | 'refund') => {
    Alert.alert(
      action === 'collect' ? 'Xác nhận thu cọc' : 'Xác nhận hoàn cọc',
      action === 'collect'
        ? 'Bạn xác nhận đã nhận đủ tiền cọc từ người thuê?'
        : 'Bạn xác nhận đã hoàn trả tiền cọc cho người thuê?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            updateDeposit.mutate(
              { action },
              {
                onError: (err: any) => Alert.alert('Lỗi', err.response?.data?.message),
              }
            );
          },
        },
      ]
    );
  };

  const handleDeduct = () => {
    const amount = Number(deductAmount);
    if (!amount || amount <= 0 || amount > deposit.amount) {
      Alert.alert('Lỗi', 'Số tiền không hợp lệ');
      return;
    }
    if (!deductReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do trừ tiền');
      return;
    }

    updateDeposit.mutate(
      { action: 'partial-deduct', deductedAmount: amount, deductionReason: deductReason },
      {
        onSuccess: () => setDeductVisible(false),
        onError: (err: any) => Alert.alert('Lỗi', err.response?.data?.message),
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Chi tiết tiền cọc</Text>
          <Chip
            style={{ backgroundColor: status.color + '20' }}
            textStyle={{ color: status.color, fontWeight: '600' }}
          >
            {status.label}
          </Chip>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>Tổng tiền cọc:</Text>
              <Text style={styles.valueTotal}>{formatMoney(deposit.amount)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Thời hạn hợp đồng:</Text>
              <Text style={styles.value}>
                {dayjs(deposit.contract?.startDate).format('DD/MM/YYYY')} -{' '}
                {dayjs(deposit.contract?.endDate).format('DD/MM/YYYY')}
              </Text>
            </View>

            {deposit.status === 'da_tru_mot_phan' && (
              <>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.label}>Đã trừ (hư hỏng):</Text>
                  <Text style={[styles.value, { color: theme.colors.error }]}>
                    - {formatMoney(deposit.deductedAmount ?? 0)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Lý do trừ:</Text>
                  <Text style={[styles.value, { flex: 1, textAlign: 'right', marginLeft: spacing.md }]}>
                    {deposit.deductionReason}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Còn lại phải hoàn:</Text>
                  <Text style={[styles.value, { fontWeight: '700' }]}>
                    {formatMoney(deposit.amount - (deposit.deductedAmount ?? 0))}
                  </Text>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          {deposit.status === 'dang_giu' && (
            <Button
              mode="contained"
              icon="cash-check"
              loading={updateDeposit.isPending}
              onPress={() => handleAction('collect')}
              style={styles.actionBtn}
            >
              Xác nhận đã thu tiền cọc
            </Button>
          )}

          {(deposit.status === 'da_thu' || deposit.status === 'da_tru_mot_phan') && (
            <>
              {deposit.status === 'da_thu' && (
                <Button
                  mode="outlined"
                  icon="cash-minus"
                  onPress={() => setDeductVisible(true)}
                  style={styles.actionBtn}
                >
                  Trừ tiền (hư hỏng tài sản)
                </Button>
              )}
              <Button
                mode="contained"
                icon="cash-refund"
                loading={updateDeposit.isPending}
                onPress={() => handleAction('refund')}
                style={styles.actionBtn}
              >
                Xác nhận đã hoàn cọc
              </Button>
            </>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={deductVisible} onDismiss={() => setDeductVisible(false)}>
          <Dialog.Title>Trừ tiền cọc</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Số tiền trừ (VND)"
              value={deductAmount}
              onChangeText={setDeductAmount}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: spacing.md }}
            />
            <TextInput
              label="Lý do trừ tiền"
              value={deductReason}
              onChangeText={setDeductReason}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeductVisible(false)}>Hủy</Button>
            <Button onPress={handleDeduct} loading={updateDeposit.isPending}>
              Xác nhận
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.headingLarge },
  card: { borderRadius: 12, marginBottom: spacing.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  label: { ...typography.body, color: theme.colors.onSurfaceVariant },
  value: { ...typography.body },
  valueTotal: { ...typography.headingMedium, color: theme.colors.primary },
  divider: { height: 1, backgroundColor: theme.colors.surfaceVariant, marginVertical: spacing.sm },
  actions: { gap: spacing.md },
  actionBtn: { borderRadius: 12, paddingVertical: 4 },
});
