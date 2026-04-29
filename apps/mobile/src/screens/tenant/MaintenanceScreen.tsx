import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';

export default function TenantMaintenanceScreen({ navigation }: any) {
  const qc = useQueryClient();
  const { control, handleSubmit } = useForm<{ title: string; description: string }>();

  const submit = useMutation({
    mutationFn: (data: { title: string; description: string; contractId: string }) =>
      api.post('/maintenance', data).then((r) => r.data),
    onSuccess: () => {
      Alert.alert('Thành công', 'Yêu cầu bảo trì đã được gửi');
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Lỗi', 'Không thể gửi yêu cầu'),
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Gửi Yêu Cầu Bảo Trì</Text>

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Tiêu đề"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={styles.input}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Mô tả chi tiết"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              multiline
              numberOfLines={5}
              style={styles.input}
            />
          )}
        />

        <Button
          mode="contained"
          onPress={handleSubmit((data) => submit.mutate({ ...data, contractId: '' }))}
          loading={submit.isPending}
          style={styles.button}
        >
          Gửi yêu cầu
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.headingLarge, marginBottom: spacing.xl },
  input: { marginBottom: spacing.md },
  button: { marginTop: spacing.md },
});
