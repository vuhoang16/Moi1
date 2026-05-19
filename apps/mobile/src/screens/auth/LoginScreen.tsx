import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../api/client';
import { spacing, typography } from '../../theme';

const ACCENT = '#2E86C1';
const TEXT_DARK = '#1A1A2E';
const TEXT_GRAY = '#888888';
const TEXT_LABEL = '#AAAAAA';
const BORDER_COLOR = '#E0E0E0';
const ERROR_COLOR = '#C0392B';

const schema = z.object({
  email: z.string().min(1, 'Vui lòng nhập số điện thoại hoặc email'),
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.kavContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={styles.pillLabel}>
              <Text style={styles.pillText}>RESIDENT EXPERIENCE</Text>
            </View>

            <Text style={styles.brandTitle}>L'Héritage</Text>
            <Text style={styles.brandSubtitle}>Chào mừng quý cư dân trở về nhà</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>SỐ ĐIỆN THOẠI HOẶC EMAIL</Text>
                  <TextInput
                    style={[styles.underlineInput, errors.email && styles.underlineInputError]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="09xx xxx xxx"
                    placeholderTextColor={TEXT_LABEL}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

            <View style={styles.fieldBlock}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>MẬT KHẨU</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => {}}>
                  <Text style={styles.forgotLink}>QUÊN MẬT KHẨU?</Text>
                </TouchableOpacity>
              </View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <>
                    <View style={[styles.passwordRow, errors.password && styles.underlineInputError]}>
                      <TextInput
                        style={styles.passwordInput}
                        value={value}
                        onChangeText={onChange}
                        secureTextEntry={!showPassword}
                        placeholder="••••••••"
                        placeholderTextColor={TEXT_LABEL}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword((v) => !v)}
                        activeOpacity={0.7}
                        style={styles.eyeToggle}
                      >
                        <MaterialCommunityIcons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={TEXT_GRAY}
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.password && (
                      <Text style={styles.errorText}>{errors.password.message}</Text>
                    )}
                  </>
                )}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'ĐANG ĐĂNG NHẬP...' : 'Đăng nhập'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.faceIdButton} activeOpacity={0.8}>
              <MaterialCommunityIcons
                name="face-recognition"
                size={20}
                color={TEXT_DARK}
                style={styles.faceIdIcon}
              />
              <Text style={styles.faceIdText}>Đăng nhập bằng Face ID</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Chưa có tài khoản cư dân?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Đăng ký mới</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>HỖ TRỢ  ·  BẢO MẬT  ·  ĐIỀU KHOẢN</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  kavContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
  },
  topSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pillLabel: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#999999',
    letterSpacing: 1.2,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  brandSubtitle: {
    ...typography.body,
    color: TEXT_GRAY,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  fieldBlock: {
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: TEXT_LABEL,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 0,
    fontSize: 15,
    color: TEXT_DARK,
  },
  underlineInputError: {
    borderBottomColor: ERROR_COLOR,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: ACCENT,
    letterSpacing: 0.8,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 0,
    fontSize: 15,
    color: TEXT_DARK,
  },
  eyeToggle: {
    padding: 4,
  },
  errorText: {
    ...typography.bodySmall,
    color: ERROR_COLOR,
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: TEXT_DARK,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  faceIdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  faceIdIcon: {
    marginRight: spacing.sm,
  },
  faceIdText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: TEXT_DARK,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  registerPrompt: {
    ...typography.body,
    color: TEXT_GRAY,
  },
  registerLink: {
    ...typography.body,
    color: ACCENT,
    fontWeight: '600' as const,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontSize: 10,
    color: TEXT_LABEL,
    letterSpacing: 1.2,
  },
});
