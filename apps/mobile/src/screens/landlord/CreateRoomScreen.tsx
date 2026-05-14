import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
} from 'react-native';
import { Text, TextInput, Button, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import ImagePickerGrid from '../../components/ImagePickerGrid';
import { theme, spacing, typography } from '../../theme';
import { useAuthStore } from '../../store/auth.store';

const AMENITIES = [
  'Điều hoà', 'Nóng lạnh', 'Tủ lạnh', 'Máy giặt', 'Wifi',
  'Bãi xe máy', 'Ban công', 'Bếp riêng', 'Toilet riêng',
  'Thang máy', 'Khoá vân tay', 'Camera an ninh',
];

const schema = z.object({
  roomNumber: z.string().min(1, 'Nhập số phòng'),
  floor: z.coerce.number().min(0).optional(),
  area: z.coerce.number().positive('Diện tích phải > 0'),
  baseRent: z.coerce.number().positive('Tiền thuê phải > 0'),
  maxOccupants: z.coerce.number().min(1).max(20).default(2),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateRoomScreen({ route, navigation }: any) {
  const { propertyId } = route.params;
  const user = useAuthStore((s) => s.user);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const qc = useQueryClient();

  const createRoom = useMutation({
    mutationFn: (data: any) => api.post('/rooms', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      navigation.goBack();
    },
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { maxOccupants: 2 },
  });

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const onSubmit = async (data: FormData) => {
    try {
      await createRoom.mutateAsync({ ...data, propertyId, imageUrls, amenities });
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Tạo phòng thất bại');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Thêm Phòng</Text>

          <Controller
            control={control}
            name="roomNumber"
            render={({ field: { onChange, value } }) => (
              <TextInput label="Số phòng" value={value} onChangeText={onChange} mode="outlined" style={styles.input} error={!!errors.roomNumber} />
            )}
          />
          {errors.roomNumber && <Text style={styles.error}>{errors.roomNumber.message}</Text>}

          <View style={styles.row}>
            <Controller
              control={control}
              name="floor"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Tầng (tuỳ chọn)"
                  value={value !== undefined ? String(value) : ''}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, styles.half]}
                />
              )}
            />
            <Controller
              control={control}
              name="area"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Diện tích (m²)"
                  value={value ? String(value) : ''}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.input, styles.half]}
                  error={!!errors.area}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="baseRent"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Tiền thuê (VND/tháng)"
                value={value ? String(value) : ''}
                onChangeText={onChange}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                error={!!errors.baseRent}
              />
            )}
          />

          <Controller
            control={control}
            name="maxOccupants"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Số người tối đa"
                value={String(value)}
                onChangeText={onChange}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
            )}
          />

          <Text style={styles.section}>Tiện ích</Text>
          <View style={styles.chips}>
            {AMENITIES.map((a) => (
              <Chip
                key={a}
                selected={amenities.includes(a)}
                onPress={() => toggleAmenity(a)}
                style={styles.chip}
              >
                {a}
              </Chip>
            ))}
          </View>

          <Text style={styles.section}>Hình ảnh (tối đa 6)</Text>
          <ImagePickerGrid
            bucket="property-images"
            folder={`${user?.id}/rooms`}
            urls={imageUrls}
            onChange={setImageUrls}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Ghi chú (tuỳ chọn)"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={[styles.input, { marginTop: spacing.md }]}
              />
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={createRoom.isPending}
            style={styles.button}
          >
            Tạo phòng
          </Button>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.headingLarge, marginBottom: spacing.xl, color: theme.colors.primary },
  section: { ...typography.headingSmall, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  error: { ...typography.bodySmall, color: theme.colors.error, marginTop: -spacing.xs, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: { marginBottom: spacing.xs },
  button: { marginTop: spacing.xl, paddingVertical: spacing.xs },
});
