import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { theme, spacing, typography } from '../../../theme';
import type { ContractDraft } from './index';

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
}).refine((d) => dayjs(d.endDate).isAfter(dayjs(d.startDate)), {
  message: 'Ngày kết thúc phải sau ngày bắt đầu',
  path: ['endDate'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  draft: ContractDraft;
  merge: (p: Partial<ContractDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Dates({ draft, merge, onNext, onBack }: Props) {
  const today = dayjs().format('YYYY-MM-DD');
  const oneYearLater = dayjs().add(1, 'year').format('YYYY-MM-DD');

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: draft.startDate || today,
      endDate: draft.endDate || oneYearLater,
    },
  });

  const onValid = (data: FormData) => {
    merge(data);
    onNext();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Nhập ngày bắt đầu và kết thúc hợp đồng</Text>

      <Controller
        control={control}
        name="startDate"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Ngày bắt đầu (YYYY-MM-DD)"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={styles.input}
            error={!!errors.startDate}
            placeholder={today}
          />
        )}
      />
      {errors.startDate && <Text style={styles.error}>{errors.startDate.message}</Text>}

      <Controller
        control={control}
        name="endDate"
        render={({ field: { onChange, value } }) => (
          <TextInput
            label="Ngày kết thúc (YYYY-MM-DD)"
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={styles.input}
            error={!!errors.endDate}
            placeholder={oneYearLater}
          />
        )}
      />
      {errors.endDate && <Text style={styles.error}>{errors.endDate.message}</Text>}

      <View style={styles.navRow}>
        <Button mode="outlined" onPress={onBack}>Quay lại</Button>
        <Button mode="contained" onPress={handleSubmit(onValid)}>Tiếp theo</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  hint: { ...typography.body, color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg },
  input: { marginBottom: spacing.sm },
  error: { ...typography.bodySmall, color: theme.colors.error, marginBottom: spacing.sm, marginTop: -spacing.xs },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
});
