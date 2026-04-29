import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';

export default function MaintenanceListScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => api.get('/maintenance').then((r) => r.data),
  });

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => navigation.navigate('MaintenanceDetail', { id: item.id })}>
              <Card.Content>
                <View style={styles.row}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Chip compact>{item.status}</Chip>
                </View>
                <Text style={styles.desc}>{item.room?.roomNumber}</Text>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Không có yêu cầu bảo trì nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loader: { flex: 1, marginTop: spacing.xl },
  list: { padding: spacing.md, gap: spacing.sm },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  title: { ...typography.headingSmall, flex: 1 },
  desc: { ...typography.body, color: theme.colors.onSurfaceVariant },
  empty: { alignItems: 'center', marginTop: spacing.xxl },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
});
