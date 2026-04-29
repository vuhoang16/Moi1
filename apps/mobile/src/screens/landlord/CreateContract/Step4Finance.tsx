import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { theme, spacing, typography } from '../../../theme';
import type { ContractDraft } from './index';

const schema = z.object({
  monthlyRent: z.coerce.number().positive('Tiền thuê phải > 0'),
  depositAmount: z.coerce.number().min(0),
  paymentDueDay: z.coerce.number().min(1).max(28),
  electricityStartReading: z.coerce.number().min(0),
  waterStartReading: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface Props {
  draft: ContractDraft;
  merge: (p: Partial<ContractDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4Finance({ draft, merge, onNext, onBack }: Props) {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      monthlyRent: draft.monthlyRent || 0,
      depositAmount: draft.depositAmount || 0,
      paymentDueDay: draft.paymentDueDay || 5,
      electricityStartReading: draft.electricityStartReading || 0,
      waterStartReading: draft.waterStartReading || 0,
    },
  });

  const onValid = (data: FormData) => {
    merge(data);
    onNext();
  };

  const fields: { name: keyof FormData; label: string; hint?: string }[] = [
    { name: 'monthlyRent', label: 'Tiền thuê (VND/tháng)' },
    { name: 'depositAmount', label: 'Tiền đặt cọc (VND)' },
    { name: 'paymentDueDay', label: 'Ngày thanh toán hàng tháng (1–28)', hint: 'VD: 5 = mỗi tháng ngày 5' },
    { name: 'electricityStartReading', label: 'Chỉ số điện kế bàn giao (kWh)' },
    { name: 'waterStartReading', label: 'Chỉ số nước kế bàn giao (m³)' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {fields.map(({ name, label, hint }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                label={label}
                value={String(value)}
                onChangeText={onChange}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                error={!!errors[name]}
              />
              {hint && <Text style={styles.hint}>{hint}</Text>}
              {errors[name] && <Text style={styles.error}>{errors[name]?.message}</Text>}
            </>
          )}
        />
      ))}

      <View style={styles.navRow}>
        <Button mode="outlined" onPress={onBack}>Quay lại</Button>
        <Button mode="contained" onPress={handleSubmit(onValid)}>Tiếp theo</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  input: { marginBottom: spacing.xs },
  hint: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm },
  error: { ...typography.bodySmall, color: theme.colors.error, marginBottom: spacing.sm },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
});
