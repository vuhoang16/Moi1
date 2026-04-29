import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import { theme, spacing, typography } from '../../../theme';
import type { ContractDraft } from './index';

interface Props {
  draft: ContractDraft;
  merge: (p: Partial<ContractDraft>) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

export default function Step5Terms({ draft, merge, onBack, onSubmit, submitting }: Props) {
  const { control, handleSubmit } = useForm({
    defaultValues: { terms: draft.terms },
  });

  const onValid = ({ terms }: { terms: string }) => {
    merge({ terms });
    onSubmit();
  };

  const fmt = (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '—');
  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Xem lại & Điều khoản</Text>

      <Card style={styles.summary}>
        <Card.Content>
          {[
            ['Phòng', draft.roomLabel],
            ['Người thuê', draft.tenantLabel],
            ['Bắt đầu', fmt(draft.startDate)],
            ['Kết thúc', fmt(draft.endDate)],
            ['Tiền thuê', money(draft.monthlyRent)],
            ['Đặt cọc', money(draft.depositAmount)],
            ['Ngày TT', `Ngày ${draft.paymentDueDay} hàng tháng`],
          ].map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.key}>{k}</Text>
              <Text style={styles.val}>{v}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Text style={styles.section}>Điều khoản hợp đồng</Text>
      <Controller
        control={control}
        name="terms"
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            mode="outlined"
            multiline
            numberOfLines={10}
            style={styles.terms}
          />
        )}
      />

      <View style={styles.navRow}>
        <Button mode="outlined" onPress={onBack}>Quay lại</Button>
        <Button mode="contained" onPress={handleSubmit(onValid)} loading={submitting}>
          Tạo hợp đồng
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: { ...typography.headingMedium, marginBottom: spacing.md },
  summary: { borderRadius: 12, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  key: { ...typography.body, color: theme.colors.onSurfaceVariant },
  val: { ...typography.body, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  section: { ...typography.headingSmall, marginBottom: spacing.sm },
  terms: { marginBottom: spacing.md },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
});
