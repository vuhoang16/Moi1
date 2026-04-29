import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { theme, spacing, typography } from '../theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'inbox-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconButton
          icon={icon}
          size={48}
          iconColor={theme.colors.primary}
          style={styles.icon}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button mode="contained" onPress={onAction} style={styles.button}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  icon: { margin: 0 },
  title: {
    ...typography.headingMedium,
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: theme.colors.onSurface,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  button: {
    borderRadius: 12,
    marginTop: spacing.sm,
  },
});
