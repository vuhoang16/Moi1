import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import SkeletonLoader from './SkeletonLoader';
import { spacing } from '../theme';

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <SkeletonLoader width="60%" height={24} />
              <SkeletonLoader width="20%" height={24} borderRadius={12} />
            </View>
            <SkeletonLoader width="40%" height={16} style={{ marginTop: spacing.sm }} />
            <SkeletonLoader width="80%" height={16} style={{ marginTop: spacing.sm }} />
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
