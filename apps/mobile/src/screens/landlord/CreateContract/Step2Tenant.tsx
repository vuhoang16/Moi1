import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, Searchbar, Card, Button, ActivityIndicator } from 'react-native-paper';
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

export default function Step2Tenant({ draft, merge, onNext, onBack }: Props) {
  const [search, setSearch] = useState('');

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants-search', search],
    queryFn: () =>
      api.get('/users', { params: { role: 'nguoi_thue', search: search || undefined } })
        .then((r) => r.data),
    enabled: true,
  });

  const select = (tenant: any) => {
    merge({ tenantId: tenant.id, tenantLabel: tenant.fullName });
    onNext();
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Tìm người thuê theo tên hoặc email..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={tenants ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              style={[styles.card, draft.tenantId === item.id && styles.selected]}
              onPress={() => select(item)}
            >
              <Card.Content>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.sub}>{item.email} · {item.phone}</Text>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? 'Không tìm thấy người thuê' : 'Nhập tên hoặc email để tìm'}
            </Text>
          }
        />
      )}
      <View style={styles.navRow}>
        <Button mode="outlined" onPress={onBack}>Quay lại</Button>
        <Button mode="contained" onPress={onNext} disabled={!draft.tenantId}>Tiếp theo</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  search: { marginBottom: spacing.md },
  list: { gap: spacing.sm },
  card: { borderRadius: 12 },
  selected: { borderWidth: 2, borderColor: theme.colors.primary },
  name: { ...typography.headingSmall },
  sub: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, marginTop: spacing.xs },
  empty: { ...typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xl },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
});
