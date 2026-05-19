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
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { spacing, typography } from '../../theme';

const { width } = Dimensions.get('window');

const PRIMARY = '#1B4F72';
const ACCENT = '#00BFA5';
const ERROR_RED = '#EF5350';
const SUCCESS_GREEN = '#27AE60';
const TEXT_MAIN = '#1A2B3C';
const TEXT_GRAY = '#7F8C8D';
const BORDER_COLOR = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#FFFFFF';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high:       { label: 'CAO',       color: '#FFFFFF', bg: '#EF5350' },
  cao:        { label: 'CAO',       color: '#FFFFFF', bg: '#EF5350' },
  khan_cap:   { label: 'KHẨN CẤP', color: '#FFFFFF', bg: '#C62828' },
  medium:     { label: 'TRUNG BÌNH', color: '#FFFFFF', bg: '#E67E22' },
  trung_binh: { label: 'TRUNG BÌNH', color: '#FFFFFF', bg: '#E67E22' },
  low:        { label: 'THẤP',      color: '#FFFFFF', bg: '#27AE60' },
  thap:       { label: 'THẤP',      color: '#FFFFFF', bg: '#27AE60' },
};

const STATUS_STEPS = [
  { value: 'pending',     label: 'Chờ Xử Lý' },
  { value: 'in_progress', label: 'Đang Xử Lý' },
  { value: 'completed',   label: 'Hoàn Thành' },
];

const STEP_NOTES: Record<string, string> = {
  pending:     'Yêu cầu đang chờ xử lý',
  in_progress: 'Kỹ thuật viên đang kiểm tra',
  completed:   'Yêu cầu đã hoàn thành',
};

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
  const normStatus = normaliseStatus(status);
  const activeIdx = getStepIndex(status);
  const isRejected = normStatus === 'rejected';
  const note = STEP_NOTES[normStatus] ?? '';

  return (
    <View>
      <View style={tlStyles.row}>
        {STATUS_STEPS.map((step, idx) => {
          const isPast = idx < activeIdx;
          const isActive = idx === activeIdx;
          const isLast = idx === STATUS_STEPS.length - 1;

          const circleBg = isPast || isActive
            ? isRejected && isActive
              ? ERROR_RED
              : PRIMARY
            : 'transparent';

          const circleBorder = isPast || isActive ? 'transparent' : '#BDC3C7';
          const lineColor = isPast ? PRIMARY : '#BDC3C7';

          return (
            <React.Fragment key={step.value}>
              <View style={tlStyles.stepCol}>
                <View style={[tlStyles.circle, { backgroundColor: circleBg, borderColor: circleBorder }]}>
                  {(isPast || isActive) ? (
                    <MaterialCommunityIcons
                      name={isRejected && isActive ? 'close' : 'check'}
                      size={14}
                      color="#FFFFFF"
                    />
                  ) : (
                    <View style={tlStyles.emptyInner} />
                  )}
                </View>
                <Text style={[tlStyles.stepLabel, (isPast || isActive) && tlStyles.stepLabelActive]}>
                  {step.label}
                </Text>
              </View>
              {!isLast && (
                <View style={[tlStyles.line, { backgroundColor: lineColor }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      {note ? (
        <Text style={tlStyles.note}>{note}</Text>
      ) : null}
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
    width: 72,
    gap: spacing.xs,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#BDC3C7',
  },
  line: {
    flex: 1,
    height: 2,
    marginTop: 14,
    marginHorizontal: -spacing.xs,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 16,
  },
  stepLabelActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    color: TEXT_GRAY,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

function StatusDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
          color={TEXT_GRAY}
        />
      </TouchableOpacity>
      {open && (
        <View style={ddStyles.menu}>
          {DROPDOWN_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[ddStyles.option, opt.value === value && ddStyles.optionActive]}
              onPress={() => { onChange(opt.value); setOpen(false); }}
            >
              <Text style={[ddStyles.optionText, opt.value === value && ddStyles.optionTextActive]}>
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
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingVertical: spacing.sm,
    backgroundColor: SURFACE,
  },
  triggerText: {
    ...typography.body,
    color: TEXT_MAIN,
  },
  menu: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    backgroundColor: SURFACE,
    overflow: 'hidden',
    elevation: 4,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  optionActive: {
    backgroundColor: '#EBF5FB',
  },
  optionText: {
    ...typography.body,
    color: TEXT_MAIN,
  },
  optionTextActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
});

export default function MaintenanceDetailScreen({ navigation, route }: any) {
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

  const completeMutation = useMutation({
    mutationFn: () =>
      api.patch(`/maintenance/${id}`, { status: 'completed' }).then((r) => r.data),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      Alert.alert('Thành công', 'Yêu cầu đã được đánh dấu hoàn thành');
    },
    onError: (err: any) =>
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Thao tác thất bại'),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.patch(`/maintenance/${id}`, { status: 'rejected' }).then((r) => r.data),
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      Alert.alert('Đã từ chối', 'Yêu cầu bảo trì đã bị từ chối');
    },
    onError: (err: any) =>
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Thao tác thất bại'),
  });

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1 }} color={PRIMARY} />;
  }
  if (!ticket) return null;

  const isLandlord = user?.role === 'chu_nha';
  const media: string[] = ticket.mediaUrls ?? [];
  const normStatus = normaliseStatus(ticket.status);
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] ?? null;
  const roomLabel = ticket.room?.roomNumber ? `Phòng ${ticket.room.roomNumber}` : '';
  const isResolved = normStatus === 'completed' || normStatus === 'rejected';

  const handleUpdate = () => {
    const payload: any = {};
    if (newStatus && newStatus !== normStatus) payload.status = newStatus;
    if (worker) payload.assignedWorker = worker;
    if (scheduledDate) {
      const parsed = dayjs(scheduledDate, 'DD/MM/YYYY');
      if (parsed.isValid()) payload.scheduledDate = parsed.toISOString();
    }
    if (Object.keys(payload).length === 0) {
      Alert.alert('Thông báo', 'Không có thay đổi nào để cập nhật');
      return;
    }
    updateMutation.mutate(payload);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={TEXT_MAIN} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chi tiết bảo trì</Text>
          {roomLabel ? <Text style={styles.headerSub}>{roomLabel}</Text> : null}
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          {roomLabel ? <Text style={styles.roomLabel}>{roomLabel}</Text> : null}

          <View style={styles.summaryTitleRow}>
            <Text style={styles.issueTitle} numberOfLines={3}>{ticket.title}</Text>
            {priorityCfg && (
              <View style={[styles.priorityPill, { backgroundColor: priorityCfg.bg }]}>
                <Text style={styles.priorityLabel}>{priorityCfg.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="clock-outline" size={14} color={TEXT_GRAY} />
            <Text style={styles.dateText}>
              {dayjs(ticket.createdAt).format('DD/MM/YYYY - HH:mm')}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Tiến độ</Text>
          <ProgressTimeline status={ticket.status} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Mô tả</Text>
          <Text style={styles.descText}>{ticket.description ?? 'Không có mô tả'}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Hình ảnh đính kèm</Text>
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
              <MaterialCommunityIcons name="image-off-outline" size={28} color={TEXT_GRAY} />
              <Text style={styles.placeholderText}>Không có hình ảnh</Text>
            </View>
          )}
        </View>

        {isLandlord && !isResolved && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Cập nhật nội bộ</Text>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Thợ phụ trách</Text>
              <TextInput
                value={worker}
                onChangeText={setWorker}
                mode="flat"
                placeholder="Nhập tên thợ"
                style={styles.flatInput}
                underlineColor={BORDER_COLOR}
                activeUnderlineColor={PRIMARY}
                dense
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Ngày hẹn</Text>
              <TextInput
                value={scheduledDate}
                onChangeText={setScheduledDate}
                mode="flat"
                placeholder="DD/MM/YYYY"
                keyboardType="numbers-and-punctuation"
                style={styles.flatInput}
                underlineColor={BORDER_COLOR}
                activeUnderlineColor={PRIMARY}
                dense
                right={<TextInput.Icon icon="calendar" color={TEXT_GRAY} />}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Trạng thái</Text>
              <StatusDropdown value={newStatus} onChange={setNewStatus} />
            </View>

            <Button
              mode="outlined"
              onPress={handleUpdate}
              loading={updateMutation.isPending}
              style={styles.updateBtn}
              contentStyle={styles.updateBtnContent}
              textColor={PRIMARY}
              theme={{ colors: { outline: PRIMARY } }}
            >
              Cập Nhật
            </Button>
          </View>
        )}
      </ScrollView>

      {isLandlord && !isResolved && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.bottomBtn, styles.completeBtn]}
            onPress={() =>
              Alert.alert('Xác nhận', 'Đánh dấu yêu cầu là hoàn thành?', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xác nhận', onPress: () => completeMutation.mutate() },
              ])
            }
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.completeBtnText}>Hoàn Thành</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBtn, styles.rejectBtn]}
            onPress={() =>
              Alert.alert('Xác nhận', 'Từ chối yêu cầu bảo trì này?', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Từ chối', style: 'destructive', onPress: () => rejectMutation.mutate() },
              ])
            }
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={18} color={ERROR_RED} />
            <Text style={styles.rejectBtnText}>Từ Chối</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    backgroundColor: SURFACE,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  headerSub: {
    fontSize: 12,
    color: TEXT_GRAY,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl + 70,
  },
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  roomLabel: {
    fontSize: 12,
    color: TEXT_GRAY,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  issueTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
    lineHeight: 26,
  },
  priorityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 13,
    color: TEXT_GRAY,
  },
  sectionCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 14,
    color: TEXT_MAIN,
    lineHeight: 22,
  },
  photoScroll: {
    marginTop: 4,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  photoPlaceholder: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  placeholderText: {
    fontSize: 12,
    color: TEXT_GRAY,
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: TEXT_GRAY,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  flatInput: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  updateBtn: {
    marginTop: spacing.xs,
    borderRadius: 8,
    borderColor: PRIMARY,
  },
  updateBtnContent: {
    paddingVertical: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 13,
    borderRadius: 10,
  },
  completeBtn: {
    backgroundColor: SUCCESS_GREEN,
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectBtn: {
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: ERROR_RED,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: ERROR_RED,
  },
});
