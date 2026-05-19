import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { theme, spacing, typography } from '../../theme';

const { width } = Dimensions.get('window');

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high:       { label: 'CAO',      color: '#C0392B', bg: '#FDEDEC' },
  cao:        { label: 'CAO',      color: '#C0392B', bg: '#FDEDEC' },
  khan_cap:   { label: 'KHẨN CẤP',color: '#922B21', bg: '#F9EBEA' },
  medium:     { label: 'TRUNG BÌNH', color: '#E67E22', bg: '#FEF3E2' },
  trung_binh: { label: 'TRUNG BÌNH', color: '#E67E22', bg: '#FEF3E2' },
  low:        { label: 'THẤP',     color: '#27AE60', bg: '#EAFAF1' },
  thap:       { label: 'THẤP',     color: '#27AE60', bg: '#EAFAF1' },
};

const STATUS_STEPS = [
  { value: 'pending',     label: 'Chờ xử lý' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'completed',   label: 'Hoàn thành' },
];

const LEGACY_TO_STANDARD: Record<string, string> = {
  cho_xu_ly:   'pending',
  dang_xu_ly:  'in_progress',
  da_giao_tho: 'in_progress',
  hoan_thanh:  'completed',
};

const DROPDOWN_OPTIONS = [
  { value: 'pending',     label: 'Chờ xử lý' },
  { value: 'in_progress', label: 'Đang xử lý' },
  { value: 'completed',   label: 'Hoàn thành' },
  { value: 'rejected',    label: 'Từ chối' },
];

function normaliseStatus(raw: string): string {
  return LEGACY_TO_STANDARD[raw] ?? raw;
}

function getStepIndex(status: string): number {
  const normalised = normaliseStatus(status);
  if (normalised === 'rejected') return 2;
  const idx = STATUS_STEPS.findIndex((s) => s.value === normalised);
  return idx === -1 ? 0 : idx;
}

function ProgressTimeline({ status }: { status: string }) {
  const activeIdx = getStepIndex(status);
  const isRejected = normaliseStatus(status) === 'rejected';

  return (
    <View style={tlStyles.row}>
      {STATUS_STEPS.map((step, idx) => {
        const isActive = idx <= activeIdx;
        const isLast = idx === STATUS_STEPS.length - 1;
        const circleColor = isActive
          ? isRejected && idx === activeIdx
            ? theme.colors.error
            : theme.colors.primary
          : '#D5D8DC';
        const lineColor = idx < activeIdx ? theme.colors.primary : '#D5D8DC';

        return (
          <React.Fragment key={step.value}>
            <View style={tlStyles.stepCol}>
              <View style={[tlStyles.circle, { backgroundColor: circleColor }]}>
                {isActive ? (
                  <MaterialCommunityIcons
                    name={isRejected && idx === activeIdx ? 'close' : 'check'}
                    size={12}
                    color="#fff"
                  />
                ) : (
                  <View style={tlStyles.emptyInner} />
                )}
              </View>
              <Text style={tlStyles.stepLabel} numberOfLines={2}>{step.label}</Text>
            </View>
            {!isLast && (
              <View style={[tlStyles.line, { backgroundColor: lineColor }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const tlStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  stepCol: {
    alignItems: 'center',
    width: 64,
    gap: spacing.xs,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  line: {
    flex: 1,
    height: 2,
    marginTop: 13,
    marginHorizontal: -spacing.xs,
  },
  stepLabel: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

function StatusDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = DROPDOWN_OPTIONS.find((o) => o.value === value);

  return (
    <View>
      <TouchableOpacity
        style={ddStyles.trigger}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.85}
      >
        <Text style={ddStyles.triggerText}>{selected?.label ?? 'Chọn trạng thái'}</Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>
      {open && (
        <View style={ddStyles.menu}>
          {DROPDOWN_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[ddStyles.option, opt.value === value && ddStyles.optionActive]}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  ddStyles.optionText,
                  opt.value === value && ddStyles.optionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const ddStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: theme.roundness,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  triggerText: {
    ...typography.body,
    color: theme.colors.onSurface,
  },
  menu: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: theme.roundness,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    elevation: 4,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  optionActive: {
    backgroundColor: theme.colors.primaryContainer,
  },
  optionText: {
    ...typography.body,
    color: theme.colors.onSurface,
  },
  optionTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

function StarRating({
  value,
  onSelect,
}: {
  value: number | null;
  onSelect: (v: number) => void;
}) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onSelect(s)} activeOpacity={0.7}>
          <MaterialCommunityIcons
            name={value && s <= value ? 'star' : 'star-outline'}
            size={36}
            color={value && s <= value ? '#F4D03F' : '#BDC3C7'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
});

export default function MaintenanceDetailScreen({ route }: any) {
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: ticket, isLoading, refetch } = useQuery({
    queryKey: ['maintenance-detail', id],
    queryFn: () => api.get(`/maintenance/${id}`).then((r) => r.data),
  });

  const [newStatus, setNewStatus] = useState<string>('');
  const [worker, setWorker] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  React.useEffect(() => {
    if (ticket) {
      setNewStatus(normaliseStatus(ticket.status));
      if (ticket.assignedWorker) setWorker(ticket.assignedWorker);
      if (ticket.scheduledDate) {
        setScheduledDate(dayjs(ticket.scheduledDate).format('DD/MM/YYYY'));
      }
    }
  }, [ticket?.id]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      api.patch(`/maintenance/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      Alert.alert('Thành công', 'Đã cập nhật yêu cầu bảo trì');
    },
    onError: (err: any) =>
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  const rateMutation = useMutation({
    mutationFn: () =>
      api
        .patch(`/maintenance/${id}/rate`, { tenantRating: rating, tenantFeedback: feedback })
        .then((r) => r.data),
    onSuccess: () => {
      refetch();
      Alert.alert('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận');
    },
    onError: (err: any) =>
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Gửi đánh giá thất bại'),
  });

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.primary} />;
  }
  if (!ticket) return null;

  const isLandlord = user?.role === 'chu_nha';
  const isTenant = user?.role === 'nguoi_thue';
  const media: string[] = ticket.mediaUrls ?? [];
  const normStatus = normaliseStatus(ticket.status);
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? null;
  const responses: any[] = ticket.responses ?? ticket.updates ?? [];

  const handleUpdate = () => {
    const payload: any = {};
    if (newStatus && newStatus !== normStatus) payload.status = newStatus;
    if (worker) payload.assignedWorker = worker;
    if (scheduledDate) {
      const parsed = dayjs(scheduledDate, 'DD/MM/YYYY');
      if (parsed.isValid()) payload.scheduledDate = parsed.toISOString();
    }
    updateMutation.mutate(payload);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.roomSub}>
            {ticket.room?.roomNumber ? `Phòng ${ticket.room.roomNumber}` : ''}
          </Text>
          <Text style={styles.titleText}>{ticket.title}</Text>
        </View>

        {priorityCfg && (
          <View style={[styles.priorityPill, { backgroundColor: priorityCfg.bg }]}>
            <Text style={[styles.priorityLabel, { color: priorityCfg.color }]}>
              {priorityCfg.label}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <ProgressTimeline status={ticket.status} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Mô tả</Text>
          <Text style={styles.descText}>{ticket.description}</Text>
          <Text style={styles.metaText}>
            {dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Hình ảnh</Text>
          {media.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoScroll}
            >
              {media.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialCommunityIcons
                name="image-off-outline"
                size={32}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={styles.photoPlaceholderText}>Không có hình ảnh</Text>
            </View>
          )}
        </View>

        {isLandlord && normStatus !== 'completed' && normStatus !== 'rejected' && (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Cập nhật trạng thái</Text>

            <Text style={styles.fieldLabel}>Trạng thái</Text>
            <StatusDropdown value={newStatus} onChange={setNewStatus} />

            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Thợ phụ trách</Text>
            <TextInput
              value={worker}
              onChangeText={setWorker}
              mode="outlined"
              placeholder="Tên thợ phụ trách"
              style={styles.textInput}
              outlineStyle={styles.inputOutline}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Ngày hẹn</Text>
            <TextInput
              value={scheduledDate}
              onChangeText={setScheduledDate}
              mode="outlined"
              placeholder="DD/MM/YYYY"
              keyboardType="numbers-and-punctuation"
              style={styles.textInput}
              outlineStyle={styles.inputOutline}
              right={<TextInput.Icon icon="calendar" />}
            />

            <Button
              mode="contained"
              onPress={handleUpdate}
              loading={updateMutation.isPending}
              style={styles.updateBtn}
              contentStyle={styles.updateBtnContent}
            >
              Cập Nhật
            </Button>
          </View>
        )}

        {responses.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Lịch sử phản hồi</Text>
            <View style={styles.responseList}>
              {responses.map((resp: any, idx: number) => (
                <View key={idx} style={styles.responseBubble}>
                  <View style={styles.responseHeader}>
                    <Text style={styles.responderName}>
                      {resp.responderName ?? resp.author ?? 'Hệ thống'}
                    </Text>
                    <Text style={styles.responseTime}>
                      {dayjs(resp.createdAt ?? resp.timestamp).format('DD/MM HH:mm')}
                    </Text>
                  </View>
                  <Text style={styles.responseMsg}>
                    {resp.message ?? resp.content ?? ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {isTenant && normStatus === 'completed' && !ticket.tenantRating && (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Đánh giá dịch vụ</Text>
            <StarRating value={rating} onSelect={setRating} />
            <TextInput
              value={feedback}
              onChangeText={setFeedback}
              mode="outlined"
              label="Nhận xét (tuỳ chọn)"
              multiline
              numberOfLines={3}
              style={styles.textInput}
              outlineStyle={styles.inputOutline}
            />
            <Button
              mode="contained"
              onPress={() => rateMutation.mutate()}
              loading={rateMutation.isPending}
              disabled={!rating}
              style={styles.updateBtn}
              contentStyle={styles.updateBtnContent}
            >
              Gửi đánh giá
            </Button>
          </View>
        )}

        {ticket.tenantRating && (
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Đánh giá của bạn</Text>
            <View style={starStyles.row}>
              {[1, 2, 3, 4, 5].map((s) => (
                <MaterialCommunityIcons
                  key={s}
                  name={s <= ticket.tenantRating ? 'star' : 'star-outline'}
                  size={32}
                  color={s <= ticket.tenantRating ? '#F4D03F' : '#BDC3C7'}
                />
              ))}
            </View>
            {ticket.tenantFeedback ? (
              <Text style={styles.descText}>{ticket.tenantFeedback}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  titleSection: {
    gap: spacing.xs,
  },
  roomSub: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  titleText: {
    ...typography.headingLarge,
    color: theme.colors.onSurface,
  },
  priorityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
  },
  priorityLabel: {
    ...typography.label,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    padding: spacing.md,
    gap: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeading: {
    ...typography.headingSmall,
    color: theme.colors.primary,
  },
  descText: {
    ...typography.body,
    color: theme.colors.onSurface,
  },
  metaText: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  photoScroll: {
    marginTop: spacing.xs,
  },
  photo: {
    width: width * 0.6,
    height: 180,
    borderRadius: theme.roundness,
    marginRight: spacing.sm,
  },
  photoPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  photoPlaceholderText: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  fieldLabel: {
    ...typography.label,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 2,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
  },
  inputOutline: {
    borderRadius: theme.roundness,
  },
  updateBtn: {
    marginTop: spacing.sm,
    borderRadius: theme.roundness,
  },
  updateBtnContent: {
    paddingVertical: spacing.xs,
  },
  responseList: {
    gap: spacing.sm,
  },
  responseBubble: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.roundness,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responderName: {
    ...typography.label,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  responseTime: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },
  responseMsg: {
    ...typography.body,
    color: theme.colors.onSurface,
  },
});
