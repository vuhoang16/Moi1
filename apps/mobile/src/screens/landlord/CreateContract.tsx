import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  Text,
  ProgressBar,
  Card,
  Button,
  ActivityIndicator,
  Searchbar,
  TextInput,
} from 'react-native-paper';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';

const STEP_TITLES = ['Chọn phòng', 'Người thuê', 'Thời hạn', 'Tài chính & Tiện ích', 'Xem lại & Điều khoản'];

interface ContractDraft {
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

// ─── Date picker helpers ───────────────────────────────────────────────────────

function isoToDate(iso: string): Date {
  return iso ? dayjs(iso).toDate() : new Date();
}

function dateToIso(d: Date): string {
  return dayjs(d).format('YYYY-MM-DD');
}

function formatDisplay(iso: string): string {
  return iso ? dayjs(iso).format('DD/MM/YYYY') : '';
}

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
  error?: boolean;
}

function DatePickerField({ label, value, onChange, minimumDate, error }: DatePickerFieldProps) {
  const [showIos, setShowIos] = useState(false);

  const openPicker = () => {
    const current = isoToDate(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        display: 'calendar',
        minimumDate,
        onChange: (_e, date) => {
          if (date) onChange(dateToIso(date));
        },
      });
    } else {
      setShowIos(true);
    }
  };

  return (
    <View style={dpStyles.wrapper}>
      <Text
        variant="bodySmall"
        style={[dpStyles.label, error && { color: theme.colors.error }]}
      >
        {label}
      </Text>
      <TouchableOpacity
        style={[dpStyles.row, error && { borderColor: theme.colors.error }]}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Text style={[dpStyles.text, !value && dpStyles.placeholder]}>
          {value ? formatDisplay(value) : 'Chọn ngày'}
        </Text>
        <Text style={dpStyles.icon}>📅</Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && showIos && (
        <DateTimePicker
          value={isoToDate(value)}
          mode="date"
          display="spinner"
          locale="vi"
          minimumDate={minimumDate}
          onChange={(_e, date) => {
            if (date) onChange(dateToIso(date));
            setShowIos(false);
          }}
        />
      )}
    </View>
  );
}

const dpStyles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { color: theme.colors.onSurfaceVariant, marginBottom: 4, marginLeft: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
  },
  text: { ...typography.body },
  placeholder: { color: theme.colors.onSurfaceVariant },
  icon: { fontSize: 16 },
});

// ─── Step 1: Room selection ────────────────────────────────────────────────────

interface StepProps {
  draft: ContractDraft;
  merge: (p: Partial<ContractDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step1Room({ draft, merge, onNext, onBack }: StepProps) {
  const { data: propertiesData, isLoading } = useQuery({
    queryKey: ['properties-for-contract'],
    queryFn: () => api.get('/properties').then((r) => r.data),
  });

  const rooms =
    propertiesData?.items?.flatMap((p: any) =>
      (p.rooms ?? [])
        .filter((r: any) => r.status === 'trong')
        .map((r: any) => ({
          ...r,
          label: `${p.name} — Phòng ${r.roomNumber}`,
        })),
    ) ?? [];

  const select = (room: any) => {
    merge({ roomId: room.id, roomLabel: room.label, monthlyRent: room.baseRent, depositAmount: room.baseRent });
    onNext();
  };

  return (
    <View style={s.flex}>
      <Text style={s.hint}>Chọn phòng trống để tạo hợp đồng</Text>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      ) : rooms.length === 0 ? (
        <Text style={s.empty}>Không có phòng trống nào</Text>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, padding: spacing.lg, paddingTop: 0 }}
          renderItem={({ item }) => (
            <Card
              style={[s.card, draft.roomId === item.id && s.selected]}
              onPress={() => select(item)}
            >
              <Card.Content>
                <Text style={s.cardTitle}>{item.label}</Text>
                <Text style={s.cardSub}>
                  {item.baseRent?.toLocaleString('vi-VN')} VND/tháng · {item.area} m²
                </Text>
              </Card.Content>
            </Card>
          )}
        />
      )}
      <View style={s.padded}>
        <Button mode="outlined" onPress={onBack}>Huỷ</Button>
      </View>
    </View>
  );
}

// ─── Step 2: Tenant search ─────────────────────────────────────────────────────

function Step2Tenant({ draft, merge, onNext, onBack }: StepProps) {
  const [search, setSearch] = useState('');

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants-search', search],
    queryFn: () =>
      api.get('/users', { params: { role: 'nguoi_thue', search: search || undefined } }).then((r) => r.data),
  });

  const select = (tenant: any) => {
    merge({ tenantId: tenant.id, tenantLabel: tenant.fullName });
    onNext();
  };

  return (
    <View style={s.flex}>
      <View style={s.padded}>
        <Searchbar
          placeholder="Tìm người thuê theo tên hoặc email..."
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: spacing.md }}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={tenants ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <Card
              style={[s.card, draft.tenantId === item.id && s.selected]}
              onPress={() => select(item)}
            >
              <Card.Content>
                <Text style={s.cardTitle}>{item.fullName}</Text>
                <Text style={s.cardSub}>{item.email} · {item.phone}</Text>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <Text style={s.empty}>
              {search ? 'Không tìm thấy người thuê' : 'Nhập tên hoặc email để tìm'}
            </Text>
          }
        />
      )}
      <View style={[s.navRow, s.padded]}>
        <Button mode="outlined" onPress={onBack}>Quay lại</Button>
        <Button mode="contained" onPress={onNext} disabled={!draft.tenantId}>Tiếp theo</Button>
      </View>
    </View>
  );
}

// ─── Step 3: Contract dates ────────────────────────────────────────────────────

function Step3Dates({ draft, merge, onNext, onBack }: StepProps) {
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');

  const handleNext = () => {
    let valid = true;
    if (!draft.startDate) {
      setStartDateError('Vui lòng chọn ngày bắt đầu');
      valid = false;
    } else {
      setStartDateError('');
    }
    if (!draft.endDate) {
      setEndDateError('Vui lòng chọn ngày kết thúc');
      valid = false;
    } else if (!dayjs(draft.endDate).isAfter(dayjs(draft.startDate))) {
      setEndDateError('Ngày kết thúc phải sau ngày bắt đầu');
      valid = false;
    } else {
      setEndDateError('');
    }
    if (valid) onNext();
  };

  return (
    <View style={[s.flex, s.padded]}>
      <Text style={s.hint}>Chọn ngày bắt đầu và kết thúc hợp đồng</Text>

      <DatePickerField
        label="Ngày bắt đầu"
        value={draft.startDate}
        onChange={(iso) => {
          merge({ startDate: iso });
          setStartDateError('');
        }}
        minimumDate={new Date()}
        error={!!startDateError}
      />
      {!!startDateError && <Text style={s.errorText}>{startDateError}</Text>}

      <DatePickerField
        label="Ngày kết thúc"
        value={draft.endDate}
        onChange={(iso) => {
          merge({ endDate: iso });
          setEndDateError('');
        }}
        minimumDate={draft.startDate ? dayjs(draft.startDate).add(1, 'day').toDate() : new Date()}
        error={!!endDateError}
      />
      {!!endDateError && <Text style={s.errorText}>{endDateError}</Text>}

      <View style={[s.navRow, { marginTop: 'auto' }]}>
        <Button mode="outlined" onPress={onBack}>Quay lại</Button>
        <Button mode="contained" onPress={handleNext}>Tiếp theo</Button>
      </View>
    </View>
  );
}

// ─── Step 4: Finance & utilities ──────────────────────────────────────────────

const financeSchema = z.object({
  monthlyRent: z.coerce.number().positive('Tiền thuê phải > 0'),
  depositAmount: z.coerce.number().min(0),
  paymentDueDay: z.coerce.number().min(1).max(28),
  electricityStartReading: z.coerce.number().min(0),
  waterStartReading: z.coerce.number().min(0),
});
type FinanceForm = z.infer<typeof financeSchema>;

function Step4Finance({ draft, merge, onNext, onBack }: StepProps) {
  const { control, handleSubmit, formState: { errors } } = useForm<FinanceForm>({
    resolver: zodResolver(financeSchema),
    defaultValues: {
      monthlyRent: draft.monthlyRent || 0,
      depositAmount: draft.depositAmount || 0,
      paymentDueDay: draft.paymentDueDay || 5,
      electricityStartReading: draft.electricityStartReading || 0,
      waterStartReading: draft.waterStartReading || 0,
    },
  });

  const onValid = (data: FinanceForm) => {
    merge(data);
    onNext();
  };

  const fields: { name: keyof FinanceForm; label: string; hint?: string }[] = [
    { name: 'monthlyRent', label: 'Tiền thuê (VND/tháng)' },
    { name: 'depositAmount', label: 'Tiền đặt cọc (VND)' },
    { name: 'paymentDueDay', label: 'Ngày thanh toán hàng tháng (1–28)', hint: 'VD: 5 = mỗi tháng ngày 5' },
    { name: 'electricityStartReading', label: 'Chỉ số điện kế bàn giao (kWh)' },
    { name: 'waterStartReading', label: 'Chỉ số nước kế bàn giao (m³)' },
  ];

  return (
    <ScrollView contentContainerStyle={s.padded} keyboardShouldPersistTaps="handled">
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
                style={{ marginBottom: spacing.xs }}
                error={!!errors[name]}
              />
              {hint && <Text style={s.hint}>{hint}</Text>}
              {errors[name] && <Text style={s.errorText}>{errors[name]?.message}</Text>}
            </>
          )}
        />
      ))}
      <View style={[s.navRow, { marginTop: spacing.xl }]}>
        <Button mode="outlined" onPress={onBack}>Quay lại</Button>
        <Button mode="contained" onPress={handleSubmit(onValid)}>Tiếp theo</Button>
      </View>
    </ScrollView>
  );
}

// ─── Step 5: Review & terms ────────────────────────────────────────────────────

interface Step5Props extends StepProps {
  onSubmit: () => void;
  submitting: boolean;
}

function Step5Terms({ draft, merge, onBack, onSubmit, submitting }: Step5Props) {
  const { control, handleSubmit } = useForm({
    defaultValues: { terms: draft.terms },
  });

  const onValid = ({ terms }: { terms: string }) => {
    merge({ terms });
    onSubmit();
  };

  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const summaryRows: [string, string][] = [
    ['Phòng', draft.roomLabel],
    ['Người thuê', draft.tenantLabel],
    ['Bắt đầu', formatDisplay(draft.startDate)],
    ['Kết thúc', formatDisplay(draft.endDate)],
    ['Tiền thuê', money(draft.monthlyRent)],
    ['Đặt cọc', money(draft.depositAmount)],
    ['Ngày TT', `Ngày ${draft.paymentDueDay} hàng tháng`],
  ];

  return (
    <ScrollView contentContainerStyle={s.padded} keyboardShouldPersistTaps="handled">
      <Text style={s.sectionHeading}>Xem lại thông tin</Text>
      <Card style={{ borderRadius: 12, marginBottom: spacing.lg }}>
        <Card.Content>
          {summaryRows.map(([k, v]) => (
            <View key={k} style={s.summaryRow}>
              <Text style={s.summaryKey}>{k}</Text>
              <Text style={s.summaryVal}>{v}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Text style={s.sectionHeading}>Điều khoản hợp đồng</Text>
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
            style={{ marginBottom: spacing.md }}
          />
        )}
      />

      <View style={s.navRow}>
        <Button mode="outlined" onPress={onBack}>Quay lại</Button>
        <Button mode="contained" onPress={handleSubmit(onValid)} loading={submitting}>
          Tạo hợp đồng
        </Button>
      </View>
    </ScrollView>
  );
}

// ─── Root screen ───────────────────────────────────────────────────────────────

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

  const next = () => setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  const back = () => (step === 0 ? navigation.goBack() : setStep((s) => s - 1));

  const submit = () => {
    const { roomLabel, tenantLabel, ...payload } = draft;
    createContract.mutate(payload);
  };

  const stepProps = { draft, merge, onNext: next, onBack: back };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.stepLabel}>
          Bước {step + 1}/{STEP_TITLES.length} — {STEP_TITLES[step]}
        </Text>
        <ProgressBar
          progress={(step + 1) / STEP_TITLES.length}
          color={theme.colors.primary}
          style={s.progress}
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

// ─── Shared styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  stepLabel: { ...typography.headingSmall, color: theme.colors.primary, marginBottom: spacing.sm },
  progress: { height: 4, borderRadius: 2 },
  padded: { padding: spacing.lg },
  hint: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm },
  errorText: { ...typography.bodySmall, color: theme.colors.error, marginBottom: spacing.sm, marginTop: -spacing.xs },
  navRow: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { borderRadius: 12 },
  selected: { borderWidth: 2, borderColor: theme.colors.primary },
  cardTitle: { ...typography.headingSmall },
  cardSub: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginTop: spacing.xs },
  empty: { ...typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xxl },
  sectionHeading: { ...typography.headingSmall, marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryKey: { ...typography.body, color: theme.colors.onSurfaceVariant },
  summaryVal: { ...typography.body, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});
