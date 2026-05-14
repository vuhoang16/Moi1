import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateProperty } from '../../queries/properties';
import ImagePickerGrid from '../../components/ImagePickerGrid';
import { theme, spacing, typography } from '../../theme';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  address: z.string().min(5, 'Địa chỉ không hợp lệ'),
  ward: z.string().min(1, 'Nhập phường/xã'),
  district: z.string().min(1, 'Nhập quận/huyện'),
  city: z.string().min(1, 'Nhập tỉnh/thành phố'),
  description: z.string().optional(),
  electricityRate: z.coerce.number().positive('Giá điện phải > 0'),
  waterRate: z.coerce.number().positive('Giá nước phải > 0'),
});

type FormData = z.infer<typeof schema>;

export default function CreatePropertyScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const createProperty = useCreateProperty();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { electricityRate: 4000, waterRate: 15000 },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createProperty.mutateAsync({ ...data, imageUrls });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Tạo bất động sản thất bại');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Thêm Bất Động Sản</Text>

          {[
            { name: 'name' as const, label: 'Tên toà nhà / khu nhà trọ' },
            { name: 'address' as const, label: 'Địa chỉ (số nhà, tên đường)' },
            { name: 'ward' as const, label: 'Phường / Xã' },
            { name: 'district' as const, label: 'Quận / Huyện' },
            { name: 'city' as const, label: 'Tỉnh / Thành phố' },
          ].map(({ name, label }) => (
            <Controller
              key={name}
              control={control}
              name={name}
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    label={label}
                    value={value}
                    onChangeText={onChange}
                    mode="outlined"
                    style={styles.input}
                    error={!!errors[name]}
                  />
                  {errors[name] && (
                    <Text style={styles.error}>{errors[name]?.message}</Text>
                  )}
                </>
              )}
            />
          ))}

          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Mô tả (tuỳ chọn)"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="VD: Sleepbox cao cấp mới 100%, có thang máy. Gần trường đại học, cách chợ 500m. Cửa khoá riêng tư, đầy đủ tiện nghi."
              />
            )}
          />

          <Text style={styles.section}>Giá điện & nước</Text>
          <Controller
            control={control}
            name="electricityRate"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Giá điện (VND/kWh)"
                value={String(value)}
                onChangeText={onChange}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                error={!!errors.electricityRate}
              />
            )}
          />
          <Controller
            control={control}
            name="waterRate"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Giá nước (VND/m³)"
                value={String(value)}
                onChangeText={onChange}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                error={!!errors.waterRate}
              />
            )}
          />

          <Text style={styles.section}>Hình ảnh (tối đa 6)</Text>
          <ImagePickerGrid
            bucket="property-images"
            folder={`${user?.id}`}
            urls={imageUrls}
            onChange={setImageUrls}
            max={6}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={createProperty.isPending}
            style={styles.button}
          >
            Tạo bất động sản
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
  error: { ...typography.bodySmall, color: theme.colors.error, marginTop: -spacing.xs, marginBottom: spacing.sm },
  button: { marginTop: spacing.xl, paddingVertical: spacing.xs },
});
