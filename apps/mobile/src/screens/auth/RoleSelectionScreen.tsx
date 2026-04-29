import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { theme, spacing, typography } from '../../theme';

export default function RoleSelectionScreen({ navigation, route }: any) {
  const { onSelect } = route.params ?? {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bạn là ai?</Text>
      <Text style={styles.subtitle}>Chọn vai trò để tiếp tục</Text>

      <Card style={styles.card} onPress={() => onSelect?.('chu_nha')}>
        <Card.Content>
          <Text style={styles.roleTitle}>🏠 Chủ nhà</Text>
          <Text style={styles.roleDesc}>
            Quản lý bất động sản, phòng, hợp đồng và theo dõi thanh toán
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} onPress={() => onSelect?.('nguoi_thue')}>
        <Card.Content>
          <Text style={styles.roleTitle}>🔑 Người thuê</Text>
          <Text style={styles.roleDesc}>
            Xem hóa đơn, thanh toán tiền thuê và gửi yêu cầu bảo trì
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    ...typography.headingLarge,
    color: theme.colors.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: 16,
  },
  roleTitle: {
    ...typography.headingMedium,
    marginBottom: spacing.xs,
  },
  roleDesc: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
  },
});
