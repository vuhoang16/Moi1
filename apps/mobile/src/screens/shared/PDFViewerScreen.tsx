import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import { theme } from '../../theme';

export default function PDFViewerScreen({ route }: any) {
  const { url } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <Pdf
        source={{ uri: url, cache: true }}
        style={styles.pdf}
        onError={(err: any) => console.warn('PDF error:', err)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pdf: { flex: 1, width: '100%' },
});
