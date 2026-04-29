import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const { setUser, saveTokens } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: res } = await api.post('/auth/login', data);
      await saveTokens(res);
      const { data: me } = await api.get('/auth/me');
      setUser(me);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Đăng Nhập</Text>
        <Text style={styles.subtitle}>App Quản Lý Cho Thuê Nhà</Text>

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

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.button}
        >
          Đăng nhập
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          style={styles.link}
        >
          Chưa có tài khoản? Đăng ký
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  inner: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    ...typography.headingLarge,
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.bodySmall,
    color: theme.colors.error,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  link: {
    marginTop: spacing.sm,
  },
});
