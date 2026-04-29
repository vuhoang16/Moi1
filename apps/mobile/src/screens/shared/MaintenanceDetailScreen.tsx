import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Image, Dimensions } from 'react-native';
import { Text, Card, Button, TextInput, SegmentedButtons, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { theme, spacing, typography } from '../../theme';

const STATUS_FLOW = [
  { value: 'cho_xu_ly', label: 'Chờ xử lý' },
  { value: 'dang_xu_ly', label: 'Đang xử lý' },
  { value: 'da_giao_tho', label: 'Đã giao thợ' },
  { value: 'hoan_thanh', label: 'Hoàn thành' },
];

const { width } = Dimensions.get('window');

export default function MaintenanceDetailScreen({ route }: any) {
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: ticket, isLoading, refetch } = useQuery({
    queryKey: ['maintenance-detail', id],
    queryFn: () => api.get(`/maintenance/${id}`).then((r) => r.data),
  });

  const [worker, setWorker] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  const updateStatus = useMutation({
    mutationFn: (data: any) => api.patch(`/maintenance/${id}`, data).then((r) => r.data),
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['maintenance'] }); },
    onError: (err: any) => Alert.alert('Lỗi', err.response?.data?.message),
  });

  const rateTicket = useMutation({
    mutationFn: () => api.patch(`/maintenance/${id}/rate`, { tenantRating: rating, tenantFeedback: feedback }).then((r) => r.data),
    onSuccess: () => { refetch(); Alert.alert('Cảm ơn!', 'Đánh giá của bạn đã được ghi nhận'); },
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!ticket) return null;

  const isLandlord = user?.role === 'chu_nha';
  const isTenant = user?.role === 'nguoi_thue';
  const media: string[] = ticket.mediaUrls ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{ticket.title}</Text>
          <Chip>{ticket.status}</Chip>
        </View>

        <Text style={styles.desc}>{ticket.description}</Text>
        <Text style={styles.meta}>
          Phòng {ticket.room?.roomNumber} · {dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}
        </Text>

        {media.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
            {media.map((url) => (
              <Image key={url} source={{ uri: url }} style={styles.media} resizeMode="cover" />
            ))}
          </ScrollView>
        )}

        {isLandlord && ticket.status !== 'hoan_thanh' && (
          <Card style={styles.card}>
            <Card.Title title="Cập nhật trạng thái" />
            <Card.Content>
              <SegmentedButtons
                value={ticket.status}
                onValueChange={(v) => updateStatus.mutate({ status: v })}
                buttons={STATUS_FLOW}
              />

              <TextInput
                label="Thợ phụ trách"
                value={worker}
                onChangeText={setWorker}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="SĐT thợ"
                value={workerPhone}
                onChangeText={setWorkerPhone}
                keyboardType="phone-pad"
                mode="outlined"
                style={styles.input}
              />
              <Button
                mode="contained"
                loading={updateStatus.isPending}
                onPress={() => updateStatus.mutate({
                  assignedWorker: worker || undefined,
                  workerPhone: workerPhone || undefined,
                })}
                style={styles.btn}
              >
                Lưu
              </Button>
            </Card.Content>
          </Card>
        )}

        {ticket.assignedWorker && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={typography.headingSmall}>Thợ phụ trách</Text>
              <Text>{ticket.assignedWorker} · {ticket.workerPhone}</Text>
            </Card.Content>
          </Card>
        )}

        {isTenant && ticket.status === 'hoan_thanh' && !ticket.tenantRating && (
          <Card style={styles.card}>
            <Card.Title title="Đánh giá dịch vụ" />
            <Card.Content>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Button
                    key={s}
                    mode={rating && s <= rating ? 'contained' : 'outlined'}
                    compact
                    onPress={() => setRating(s)}
                    style={styles.star}
                  >
                    {s}★
                  </Button>
                ))}
              </View>
              <TextInput
                label="Nhận xét (tuỳ chọn)"
                value={feedback}
                onChangeText={setFeedback}
                mode="outlined"
                multiline
                style={styles.input}
              />
              <Button mode="contained" onPress={() => rateTicket.mutate()} loading={rateTicket.isPending} disabled={!rating}>
                Gửi đánh giá
              </Button>
            </Card.Content>
          </Card>
        )}

        {ticket.tenantRating && (
          <Card style={styles.card}>
            <Card.Content>
              <Text>Đánh giá: {'★'.repeat(ticket.tenantRating)}{'☆'.repeat(5 - ticket.tenantRating)}</Text>
              {ticket.tenantFeedback && <Text style={styles.meta}>{ticket.tenantFeedback}</Text>}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...typography.headingLarge, flex: 1 },
  desc: { ...typography.body, color: theme.colors.onSurfaceVariant },
  meta: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
  mediaScroll: { marginVertical: spacing.sm },
  media: { width: width * 0.65, height: 200, borderRadius: 10, marginRight: spacing.sm },
  card: { borderRadius: 12 },
  input: { marginBottom: spacing.sm, marginTop: spacing.sm },
  btn: { marginTop: spacing.sm },
  stars: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  star: { flex: 1 },
});
