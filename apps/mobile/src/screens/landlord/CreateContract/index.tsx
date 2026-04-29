import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { theme, spacing, typography } from '../../../theme';
import Step1Room from './Step1Room';
import Step2Tenant from './Step2Tenant';
import Step3Dates from './Step3Dates';
import Step4Finance from './Step4Finance';
import Step5Terms from './Step5Terms';

const STEPS = ['Chọn phòng', 'Người thuê', 'Thời hạn', 'Tài chính', 'Điều khoản'];

export interface ContractDraft {
  roomId: string;
  roomLabel: string;
  tenantId: string;
  tenantLabel: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  paymentDueDay: number;
  electricityStartReading: number;
  waterStartReading: number;
  terms: string;
}

const DEFAULT_TERMS = `1. Người thuê phải thanh toán tiền thuê trước ngày hết hạn mỗi tháng.
2. Không được tự ý cải tạo, sửa chữa phòng khi chưa có sự đồng ý của chủ nhà.
3. Giữ gìn vệ sinh chung và không gây mất trật tự.
4. Thông báo trước 30 ngày nếu muốn chấm dứt hợp đồng trước hạn.
5. Tiền đặt cọc sẽ được hoàn trả trong vòng 7 ngày sau khi trả phòng nếu không có hư hỏng.`;

const INITIAL: ContractDraft = {
  roomId: '',
  roomLabel: '',
  tenantId: '',
  tenantLabel: '',
  startDate: '',
  endDate: '',
  monthlyRent: 0,
  depositAmount: 0,
  paymentDueDay: 5,
  electricityStartReading: 0,
  waterStartReading: 0,
  terms: DEFAULT_TERMS,
};

export default function CreateContractScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ContractDraft>(INITIAL);
  const qc = useQueryClient();

  const merge = (partial: Partial<ContractDraft>) =>
    setDraft((prev) => ({ ...prev, ...partial }));

  const createContract = useMutation({
    mutationFn: (data: Omit<ContractDraft, 'roomLabel' | 'tenantLabel'>) =>
      api.post('/contracts', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      Alert.alert('Thành công', 'Hợp đồng đã được tạo. Vui lòng ký để kích hoạt.');
      navigation.goBack();
    },
    onError: (err: any) => {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Tạo hợp đồng thất bại');
    },
  });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => (step === 0 ? navigation.goBack() : setStep((s) => s - 1));

  const submit = () => {
    const { roomLabel, tenantLabel, ...payload } = draft;
    createContract.mutate(payload);
  };

  const stepProps = { draft, merge, onNext: next, onBack: back };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stepLabel}>
          Bước {step + 1}/{STEPS.length} — {STEPS[step]}
        </Text>
        <ProgressBar
          progress={(step + 1) / STEPS.length}
          color={theme.colors.primary}
          style={styles.progress}
        />
      </View>

      {step === 0 && <Step1Room {...stepProps} />}
      {step === 1 && <Step2Tenant {...stepProps} />}
      {step === 2 && <Step3Dates {...stepProps} />}
      {step === 3 && <Step4Finance {...stepProps} />}
      {step === 4 && (
        <Step5Terms
          {...stepProps}
          onSubmit={submit}
          submitting={createContract.isPending}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  stepLabel: { ...typography.headingSmall, color: theme.colors.primary, marginBottom: spacing.sm },
  progress: { height: 4, borderRadius: 2 },
});
