import React from 'react';
import { FlatList, StyleSheet, View, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';
import { theme, spacing, typography } from '../../../theme';
import type { ContractDraft } from './index';

interface Props {
  draft: ContractDraft;
  merge: (p: Partial<ContractDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step1Room({ draft, merge, onNext, onBack }: Props) {
  const { data: propertiesData, isLoading } = useQuery({
    queryKey: ['properties-for-contract'],
    queryFn: () => api.get('/properties').then((r) => r.data),
  });

  const rooms = propertiesData?.items?.flatMap((p: any) =>
    (p.rooms ?? [])
      .filter((r: any) => r.status === 'trong')
      .map((r: any) => ({
        ...r,
        label: `${p.name} — Phòng ${r.roomNumber}`,
        propertyName: p.name,
      })),
  ) ?? [];

  const select = (room: any) => {
    merge({ roomId: room.id, roomLabel: room.label, monthlyRent: room.baseRent, depositAmount: room.baseRent });
    onNext();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Chọn phòng trống để tạo hợp đồng</Text>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      ) : rooms.length === 0 ? (
        <Text style={styles.empty}>Không có phòng trống nào</Text>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              style={[styles.card, draft.roomId === item.id && styles.selected]}
              onPress={() => select(item)}
            >
              <Card.Content>
                <Text style={styles.roomName}>{item.label}</Text>
                <Text style={styles.rent}>
                  {item.baseRent?.toLocaleString('vi-VN')} VND/tháng · {item.area} m²
                </Text>
              </Card.Content>
            </Card>
          )}
        />
      )}
      <Button mode="outlined" onPress={onBack} style={styles.back}>Huỷ</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  hint: { ...typography.body, color: theme.colors.onSurfaceVariant, marginBottom: spacing.md },
  list: { gap: spacing.sm },
  card: { borderRadius: 12 },
  selected: { borderWidth: 2, borderColor: theme.colors.primary },
  roomName: { ...typography.headingSmall },
  rent: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginTop: spacing.xs },
  empty: { ...typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xxl },
  back: { marginTop: spacing.md },
});
