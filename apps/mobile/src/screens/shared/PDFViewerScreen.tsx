import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import * as Sharing from 'expo-sharing';
import { theme, spacing, typography } from '../../theme';

export default function PDFViewerScreen({ route, navigation }: any) {
  const { url, title } = route.params as { url: string; title?: string };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const handleShare = useCallback(async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(url);
      }
    } catch {
      // sharing not available on this platform
    }
  }, [url]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title ?? 'Tài liệu',
      headerRight: () => (
        <IconButton
          icon="share-variant"
          size={22}
          iconColor={theme.colors.primary}
          onPress={handleShare}
        />
      ),
    });
  }, [navigation, title, handleShare]);

  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [retryKey]);

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          mode="contained"
          onPress={() => setRetryKey((k) => k + 1)}
          style={styles.retryButton}
        >
          Thử lại
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pdf
        key={retryKey}
        source={{ uri: url, cache: true }}
        style={styles.pdf}
        onLoadComplete={(numPages) => {
          setTotalPages(numPages);
          setLoading(false);
        }}
        onPageChanged={(page) => {
          setCurrentPage(page);
        }}
        onError={() => {
          setLoading(false);
          setError('Không thể tải tài liệu. Vui lòng kiểm tra kết nối và thử lại.');
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {!loading && totalPages > 0 && (
        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>
            Trang {currentPage} / {totalPages}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pdf: { flex: 1, width: '100%' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },

  pageIndicator: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
  },
  pageText: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    ...typography.body,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: { marginTop: spacing.sm },
});
