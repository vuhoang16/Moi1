import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Button, Divider, Surface, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { theme, spacing, typography } from '../../theme';

const APP_VERSION = '1.0.0';

interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export default function ProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const mutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      api.patch('/auth/profile', payload).then((r) => r.data),
    onSuccess: (updated) => {
      setUser({ ...user!, ...updated });
      Alert.alert('Thành công', 'Thông tin đã được cập nhật.');
    },
    onError: () => {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin. Vui lòng thử lại.');
    },
  });

  const handleSave = () => {
    mutation.mutate({ fullName: fullName.trim(), phone: phone.trim() });
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để thay đổi ảnh đại diện.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      mutation.mutate({ avatarUrl: result.assets[0].uri });
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => useAuthStore.getState().clearAuth() },
    ]);
  };

  const initials = (user?.fullName ?? '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar}>
          {user?.avatarUrl ? (
            <Avatar.Image size={88} source={{ uri: user.avatarUrl }} />
          ) : (
            <Avatar.Text size={88} label={initials || '?'} style={styles.avatarText} />
          )}
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>Sửa</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.emailText}>{user?.email}</Text>

        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>THÔNG TIN CÁ NHÂN</Text>
          <TextInput
            label="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            outlineColor={theme.colors.surfaceVariant}
            activeOutlineColor={theme.colors.primary}
          />
          <TextInput
            label="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            outlineColor={theme.colors.surfaceVariant}
            activeOutlineColor={theme.colors.primary}
          />
          <Button
            mode="contained"
            onPress={handleSave}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            style={styles.saveButton}
            buttonColor={theme.colors.primary}
          >
            Lưu thay đổi
          </Button>
        </Surface>

        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>CÀI ĐẶT ỨNG DỤNG</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phiên bản</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vai trò</Text>
            <Text style={styles.infoValue}>
              {user?.role === 'chu_nha' ? 'Chủ nhà' : 'Người thuê'}
            </Text>
          </View>
        </Surface>

        <Surface style={[styles.section, styles.dangerSection]} elevation={1}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>KHU VỰC NGUY HIỂM</Text>
          <Button
            mode="outlined"
            onPress={handleLogout}
            textColor={theme.colors.error}
            style={styles.logoutButton}
          >
            Đăng xuất
          </Button>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  avatarWrapper: { alignSelf: 'center', marginBottom: spacing.xs },
  avatarText: { backgroundColor: theme.colors.primary },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.secondary,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  avatarBadgeText: { ...typography.label, color: theme.colors.onSecondary },
  emailText: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  section: {
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  input: { marginBottom: spacing.sm, backgroundColor: theme.colors.surface },
  saveButton: { marginTop: spacing.xs, borderRadius: 8 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: { ...typography.body, color: theme.colors.onSurfaceVariant },
  infoValue: { ...typography.body, fontWeight: '500' },
  divider: { marginVertical: spacing.xs },
  dangerSection: { borderWidth: 1, borderColor: '#FADBD8' },
  dangerTitle: { color: theme.colors.error },
  logoutButton: { borderColor: theme.colors.error, borderRadius: 8 },
});
