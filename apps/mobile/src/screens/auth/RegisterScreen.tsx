import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';
import type { UserRole } from '@rentapp/shared';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  phone: z.string().regex(/^(0|\+84)[0-9]{8,9}$/, 'Số điện thoại không hợp lệ'),
  role: z.enum(['chu_nha', 'nguoi_thue']),
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const { setUser, saveTokens } = useAuthStore();

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'chu_nha' },
  });

  const role = watch('role');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: res } = await api.post('/auth/register', data);
      await saveTokens(res);
      const { data: me } = await api.get('/auth/me');
      setUser(me);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Đăng Ký</Text>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Họ và tên"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={styles.input}
              error={!!errors.fullName}
            />
          )}
        />
        {errors.fullName && <Text style={styles.error}>{errors.fullName.message}</Text>}

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Số điện thoại"
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
              error={!!errors.phone}
            />
          )}
        />
        {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Email"
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              style={styles.input}
              error={!!errors.email}
            />
          )}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Mật khẩu"
              value={value}
              onChangeText={onChange}
              secureTextEntry
              mode="outlined"
              style={styles.input}
              error={!!errors.password}
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

        <Text style={styles.roleLabel}>Bạn là:</Text>
        <View style={styles.roleRow}>
          {(['chu_nha', 'nguoi_thue'] as UserRole[]).map((r) => (
            <Button
              key={r}
              mode={role === r ? 'contained' : 'outlined'}
              onPress={() => setValue('role', r)}
              style={styles.roleButton}
            >
              {r === 'chu_nha' ? 'Chủ nhà' : 'Người thuê'}
            </Button>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.button}
        >
          Tạo tài khoản
        </Button>

        <Button mode="text" onPress={() => navigation.goBack()} style={styles.link}>
          Đã có tài khoản? Đăng nhập
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  inner: { padding: spacing.lg, paddingTop: spacing.xxl },
  title: { ...typography.headingLarge, color: theme.colors.primary, marginBottom: spacing.xl },
  input: { marginBottom: spacing.sm },
  error: {
    ...typography.bodySmall,
    color: theme.colors.error,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  roleLabel: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  roleButton: { flex: 1 },
  button: { marginTop: spacing.md, paddingVertical: spacing.xs },
  link: { marginTop: spacing.sm },
});
