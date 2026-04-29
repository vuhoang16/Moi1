import React, { useState } from 'react';
import { FlatList, StyleSheet, View, Alert } from 'react-native';
import { Text, Card, Button, Checkbox, TextInput, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import ImagePickerGrid from '../../components/ImagePickerGrid';
import { theme, spacing, typography } from '../../theme';

export default function ChecklistScreen({ route, navigation }: any) {
  const { contractId } = route.params;
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists', contractId],
    queryFn: () => api.get(`/checklists/by-contract/${contractId}`).then((r) => r.data),
  });

  const confirm = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'tenant' | 'landlord' }) =>
      api.patch(`/checklists/${id}/confirm-${role}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklists', contractId] }),
    onError: (err: any) => Alert.alert('Lỗi', err.response?.data?.message),
  });

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;

  const isLandlord = user?.role === 'chu_nha';
  const isTenant = user?.role === 'nguoi_thue';

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={checklists ?? []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.title}>Biên Bản Bàn Giao</Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title
              title={item.phase === 'ban_giao' ? 'Bàn giao phòng' : 'Trả phòng'}
              right={() => (
                <View style={styles.badges}>
                  {item.confirmedByLandlordAt && <Chip compact icon="check" style={styles.confirmed}>Chủ nhà ✓</Chip>}
                  {item.confirmedByTenantAt && <Chip compact icon="check" style={styles.confirmed}>Thuê ✓</Chip>}
                </View>
              )}
            />
            <Card.Content>
              {(item.records ?? []).map((r: any, idx: number) => (
                <View key={idx} style={styles.record}>
                  <Text style={styles.recordName}>{r.name}</Text>
                  <Text style={styles.recordSub}>
                    {r.category} · SL: {r.quantity}
                    {r.conditionOnCheckin ? ` · Tình trạng: ${r.conditionOnCheckin}` : ''}
                  </Text>
                </View>
              ))}
            </Card.Content>
            <Card.Actions>
              {isTenant && !item.confirmedByTenantAt && (
                <Button
                  mode="contained"
                  onPress={() => confirm.mutate({ id: item.id, role: 'tenant' })}
                  loading={confirm.isPending}
                >
                  Xác nhận (người thuê)
                </Button>
              )}
              {isLandlord && item.confirmedByTenantAt && !item.confirmedByLandlordAt && (
                <Button
                  mode="contained"
                  onPress={() => confirm.mutate({ id: item.id, role: 'landlord' })}
                  loading={confirm.isPending}
                >
                  Xác nhận (chủ nhà)
                </Button>
              )}
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Chưa có biên bản bàn giao</Text>
            {isLandlord && (
              <Button
                mode="contained"
                onPress={() => navigation.navigate('CreateChecklist', { contractId })}
                style={{ marginTop: spacing.md }}
              >
                Tạo biên bản
              </Button>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.headingLarge, marginBottom: spacing.md },
  card: { borderRadius: 12 },
  badges: { flexDirection: 'row', gap: spacing.xs, marginRight: spacing.sm },
  confirmed: { backgroundColor: '#D5F5E3' },
  record: { paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.surfaceVariant },
  recordName: { ...typography.body, fontWeight: '600' },
  recordSub: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
});
