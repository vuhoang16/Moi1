import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/client';
import { spacing, typography } from '../../theme';

const DARK_BG = '#0A1628';
const DARK_SURFACE = '#1A2A3A';
const DARK_BORDER = '#2C3E50';
const ACCENT = '#1B4F72';
const ACCENT_BRIGHT = '#2E86C1';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#8FA8C0';
const TEXT_PLACEHOLDER = '#5D7A96';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="home-city" size={56} color={ACCENT_BRIGHT} />
          <Text style={styles.appName}>Quản Lý Cho Thuê</Text>
          <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputWrapper}>
                <TextInput
                  label="Email hoặc số điện thoại"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  mode="outlined"
                  left={
                    <TextInput.Icon
                      icon={() => (
                        <MaterialCommunityIcons name="email-outline" size={20} color={TEXT_SECONDARY} />
                      )}
                    />
                  }
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  textColor={TEXT_PRIMARY}
                  placeholderTextColor={TEXT_PLACEHOLDER}
                  outlineColor={DARK_BORDER}
                  activeOutlineColor={ACCENT_BRIGHT}
                  error={!!errors.email}
                  theme={{
                    colors: {
                      background: DARK_SURFACE,
                      onSurfaceVariant: TEXT_PLACEHOLDER,
                    },
                  }}
                />
                {errors.email && (
                  <Text style={styles.error}>{errors.email.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputWrapper}>
                <TextInput
                  label="Mật khẩu"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={!showPassword}
                  mode="outlined"
                  left={
                    <TextInput.Icon
                      icon={() => (
                        <MaterialCommunityIcons name="lock-outline" size={20} color={TEXT_SECONDARY} />
                      )}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={() => (
                        <MaterialCommunityIcons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={TEXT_SECONDARY}
                        />
                      )}
                      onPress={() => setShowPassword((v) => !v)}
                    />
                  }
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  contentStyle={styles.inputContent}
                  textColor={TEXT_PRIMARY}
                  placeholderTextColor={TEXT_PLACEHOLDER}
                  outlineColor={DARK_BORDER}
                  activeOutlineColor={ACCENT_BRIGHT}
                  error={!!errors.password}
                  theme={{
                    colors: {
                      background: DARK_SURFACE,
                      onSurfaceVariant: TEXT_PLACEHOLDER,
                    },
                  }}
                />
                {errors.password && (
                  <Text style={styles.error}>{errors.password.message}</Text>
                )}
              </View>
            )}
          />

          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.loginButtonText}>ĐANG ĐĂNG NHẬP...</Text>
            ) : (
              <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.faceIdButton} activeOpacity={0.8}>
            <MaterialCommunityIcons name="face-recognition" size={20} color={TEXT_SECONDARY} style={styles.faceIdIcon} />
            <Text style={styles.faceIdText}>Đăng nhập bằng Face ID</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
            <Text style={styles.registerLink}>Đăng ký</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hỗ trợ · Bảo mật · Điều khoản</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    marginTop: spacing.md,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...typography.body,
    color: TEXT_SECONDARY,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.xs,
  },
  inputWrapper: {
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: DARK_SURFACE,
  },
  inputOutline: {
    borderRadius: 12,
  },
  inputContent: {
    backgroundColor: DARK_SURFACE,
  },
  error: {
    ...typography.bodySmall,
    color: '#E74C3C',
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  forgotText: {
    ...typography.bodySmall,
    color: ACCENT_BRIGHT,
    fontWeight: '500' as const,
  },
  loginButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TEXT_PRIMARY,
    letterSpacing: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DARK_BORDER,
  },
  dividerText: {
    ...typography.bodySmall,
    color: TEXT_SECONDARY,
    marginHorizontal: spacing.md,
  },
  faceIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DARK_BORDER,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  faceIdIcon: {
    marginRight: spacing.sm,
  },
  faceIdText: {
    ...typography.body,
    color: TEXT_SECONDARY,
    fontWeight: '500' as const,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  registerPrompt: {
    ...typography.body,
    color: TEXT_SECONDARY,
  },
  registerLink: {
    ...typography.body,
    color: ACCENT_BRIGHT,
    fontWeight: '600' as const,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.bodySmall,
    color: TEXT_PLACEHOLDER,
  },
});
