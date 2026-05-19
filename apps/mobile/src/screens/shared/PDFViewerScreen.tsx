import React, { useCallback, useLayoutEffect } from 'react';
import { StyleSheet, View, Linking } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, spacing, typography } from '../../theme';

export default function PDFViewerScreen({ route, navigation }: any) {
  const { url, title } = route.params as { url: string; title?: string };

  const handleOpen = useCallback(() => {
    Linking.openURL(url);
  }, [url]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title ?? 'Tài liệu',
      headerRight: () => (
        <IconButton
          icon="open-in-new"
          size={22}
          iconColor={theme.colors.primary}
          onPress={handleOpen}
        />
      ),
    });
  }, [navigation, title, handleOpen]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <IconButton icon="file-pdf-box" size={64} iconColor={theme.colors.primary} />
        <Text style={styles.title}>Xem PDF</Text>
        <Text style={styles.subtitle}>
          Xem PDF trong trình duyệt hoặc ứng dụng đầy đủ
        </Text>
        <Button mode="contained" onPress={handleOpen} style={styles.button}>
          Mở trong trình duyệt
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    ...typography.headingSmall,
    color: theme.colors.onBackground,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: { marginTop: spacing.sm },
});
