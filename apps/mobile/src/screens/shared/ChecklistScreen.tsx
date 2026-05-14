import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Text, Card, Button, Checkbox, TextInput, ActivityIndicator, Chip } from 'react-native-paper';
import { Image } from 'expo-image';
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
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [itemPhotos, setItemPhotos] = useState<Record<string, string[]>>({});

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

  const patchItemPhotos = useMutation({
    mutationFn: ({ checklistId, itemId, photoUrls }: { checklistId: string; itemId: string; photoUrls: string[] }) =>
      api.patch(`/checklists/${checklistId}/items/${itemId}`, { photoUrls }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklists', contractId] }),
    onError: (err: any) => Alert.alert('Lỗi', err.response?.data?.message),
  });

  const handlePhotosChange = (checklistId: string, itemId: string, urls: string[]) => {
    setItemPhotos((prev) => ({ ...prev, [itemId]: urls }));
    patchItemPhotos.mutate({ checklistId, itemId, photoUrls: urls });
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItem((prev) => (prev === itemId ? null : itemId));
  };

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
        renderItem={({ item: checklist }) => (
          <Card style={styles.card}>
            <Card.Title
              title={checklist.phase === 'ban_giao' ? 'Bàn giao phòng' : 'Trả phòng'}
              right={() => (
                <View style={styles.badges}>
                  {checklist.confirmedByLandlordAt && <Chip compact icon="check" style={styles.confirmed}>Chủ nhà ✓</Chip>}
                  {checklist.confirmedByTenantAt && <Chip compact icon="check" style={styles.confirmed}>Thuê ✓</Chip>}
                </View>
              )}
            />
            <Card.Content>
              {(checklist.records ?? []).map((r: any, idx: number) => {
                const itemKey = r.id ?? `${checklist.id}-${idx}`;
                const isExpanded = expandedItem === itemKey;
                const photos: string[] = itemPhotos[itemKey] ?? r.photoUrls ?? [];

                return (
                  <View key={itemKey}>
                    <View
                      style={[
                        styles.record,
                        idx < (checklist.records ?? []).length - 1 && styles.recordBorder,
                      ]}
                    >
                      <View style={styles.recordHeader}>
                        <View style={styles.recordInfo}>
                          <Text style={styles.recordName}>{r.name}</Text>
                          <Text style={styles.recordSub}>
                            {r.category} · SL: {r.quantity}
                            {r.conditionOnCheckin ? ` · Tình trạng: ${r.conditionOnCheckin}` : ''}
                          </Text>
                        </View>
                        <Button
                          compact
                          mode="text"
                          icon={isExpanded ? 'chevron-up' : 'image-outline'}
                          onPress={() => toggleExpand(itemKey)}
                          style={styles.photoBtn}
                        >
                          {photos.length > 0 ? `${photos.length} ảnh` : 'Ảnh'}
                        </Button>
                      </View>

                      {isExpanded && (
                        <View style={styles.photoSection}>
                          {photos.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                              {photos.map((url: string) => (
                                <Image
                                  key={url}
                                  source={{ uri: url }}
                                  style={styles.thumbnail}
                                  contentFit="cover"
                                />
                              ))}
                            </ScrollView>
                          )}
                          <ImagePickerGrid
                            bucket="checklists"
                            folder={`${checklist.id}/${itemKey}`}
                            urls={photos}
                            onChange={(urls) => handlePhotosChange(checklist.id, itemKey, urls)}
                            max={6}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </Card.Content>
            <Card.Actions>
              {isTenant && !checklist.confirmedByTenantAt && (
                <Button
                  mode="contained"
                  onPress={() => confirm.mutate({ id: checklist.id, role: 'tenant' })}
                  loading={confirm.isPending}
                >
                  Xác nhận (người thuê)
                </Button>
              )}
              {isLandlord && checklist.confirmedByTenantAt && !checklist.confirmedByLandlordAt && (
                <Button
                  mode="contained"
                  onPress={() => confirm.mutate({ id: checklist.id, role: 'landlord' })}
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
  record: { paddingVertical: spacing.sm },
  recordBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.surfaceVariant },
  recordHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  recordInfo: { flex: 1 },
  recordName: { ...typography.body, fontWeight: '600' },
  recordSub: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
  photoBtn: { marginLeft: spacing.xs },
  photoSection: { marginTop: spacing.sm, gap: spacing.sm },
  thumbRow: { marginBottom: spacing.xs },
  thumbnail: { width: 60, height: 60, borderRadius: 6, marginRight: spacing.xs },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
});
