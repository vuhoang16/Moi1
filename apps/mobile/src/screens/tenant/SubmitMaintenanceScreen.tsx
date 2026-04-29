import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import ImagePickerGrid from '../../components/ImagePickerGrid';
import { pickAndUploadVideo } from '../../utils/upload';
import { useAuthStore } from '../../store/auth.store';
import { theme, spacing, typography } from '../../theme';

const schema = z.object({
  title: z.string().min(3, 'Tiêu đề tối thiểu 3 ký tự'),
  description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự'),
  contractId: z.string().min(1, 'Chọn hợp đồng'),
});

type FormData = z.infer<typeof schema>;
type Priority = 'thap' | 'trung_binh' | 'cao' | 'khan_cap';

export default function SubmitMaintenanceScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('trung_binh');
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const { data: contracts } = useQuery({
    queryKey: ['contracts-for-maint'],
    queryFn: () => api.get('/contracts').then((r) => r.data),
  });

  const activeContracts = (contracts ?? []).filter((c: any) => c.status === 'hieu_luc');

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contractId: activeContracts[0]?.id ?? '' },
  });

  const submit = useMutation({
    mutationFn: (data: FormData & { priority: Priority; mediaUrls: string[] }) =>
      api.post('/maintenance', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      Alert.alert('Thành công', 'Yêu cầu đã được gửi đến chủ nhà');
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Lỗi', err.response?.data?.message ?? 'Gửi thất bại'),
  });

  const addVideo = async () => {
    setUploadingVideo(true);
    try {
      const url = await pickAndUploadVideo('maintenance-media', `${user?.id}`);
      if (url) setMediaUrls((prev) => [...prev, url]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  const onSubmit = (data: FormData) => {
    submit.mutate({ ...data, priority, mediaUrls });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Gửi Yêu Cầu Bảo Trì</Text>

        {activeContracts.length > 1 && (
          <Controller
            control={control}
            name="contractId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.contractPicker}>
                {activeContracts.map((c: any) => (
                  <Button
                    key={c.id}
                    mode={value === c.id ? 'contained' : 'outlined'}
                    compact
                    onPress={() => onChange(c.id)}
                    style={styles.contractBtn}
                  >
                    {c.room?.roomNumber}
                  </Button>
                ))}
              </View>
            )}
          />
        )}

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Tiêu đề (VD: Điều hoà không mát)"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={styles.input}
              error={!!errors.title}
            />
          )}
        />
        {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Mô tả chi tiết sự cố"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              multiline
              numberOfLines={5}
              style={styles.input}
              error={!!errors.description}
            />
          )}
        />
        {errors.description && <Text style={styles.error}>{errors.description.message}</Text>}

        <Text style={styles.section}>Mức độ ưu tiên</Text>
        <SegmentedButtons
          value={priority}
          onValueChange={(v) => setPriority(v as Priority)}
          buttons={[
            { value: 'thap', label: 'Thấp' },
            { value: 'trung_binh', label: 'TB' },
            { value: 'cao', label: 'Cao' },
            { value: 'khan_cap', label: 'Khẩn' },
          ]}
          style={styles.segment}
        />

        <Text style={styles.section}>Hình ảnh (tối đa 5)</Text>
        <ImagePickerGrid
          bucket="maintenance-media"
          folder={`${user?.id}`}
          urls={mediaUrls.filter((u) => !u.endsWith('.mp4'))}
          onChange={(imgs) => setMediaUrls((prev) => [...prev.filter((u) => u.endsWith('.mp4')), ...imgs])}
          max={5}
        />

        <Button
          mode="outlined"
          icon="video"
          onPress={addVideo}
          loading={uploadingVideo}
          disabled={mediaUrls.filter((u) => u.endsWith('.mp4')).length >= 1}
          style={styles.videoBtn}
        >
          {mediaUrls.some((u) => u.endsWith('.mp4')) ? 'Video đã thêm' : 'Thêm video (≤30s, 50MB)'}
        </Button>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={submit.isPending}
          style={styles.submit}
        >
          Gửi yêu cầu
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.headingLarge, marginBottom: spacing.xl, color: theme.colors.primary },
  contractPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  contractBtn: { marginBottom: 0 },
  section: { ...typography.headingSmall, marginTop: spacing.lg, marginBottom: spacing.sm },
  segment: { marginBottom: spacing.sm },
  input: { marginBottom: spacing.xs },
  error: { ...typography.bodySmall, color: theme.colors.error, marginBottom: spacing.sm },
  videoBtn: { marginTop: spacing.sm },
  submit: { marginTop: spacing.xl, paddingVertical: spacing.xs },
});
