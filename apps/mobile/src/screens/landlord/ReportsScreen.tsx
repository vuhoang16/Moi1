import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, SegmentedButtons, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import { useProperties } from '../../queries/properties';
import { theme, spacing, typography } from '../../theme';

export default function ReportsScreen() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [range, setRange] = useState<'3m' | '6m' | '12m'>('6m');
  const [exporting, setExporting] = useState(false);

  const { data: propertiesData, isLoading: loadingProps } = useProperties();
  const properties = propertiesData?.items ?? [];

  const from = dayjs()
    .subtract(range === '3m' ? 3 : range === '6m' ? 6 : 12, 'month')
    .format('YYYY-MM-01');
  const to = dayjs().format('YYYY-MM-DD');

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['report', propertyId, from, to],
    queryFn: () =>
      api.get(`/reports/financial/${propertyId}`, { params: { from, to } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { notation: 'compact', currency: 'VND' }).format(n) + '₫';

  const exportPDF = async () => {
    if (!propertyId) return;
    setExporting(true);
    try {
      const url = `${api.defaults.baseURL}/reports/export/${propertyId}?from=${from}&to=${to}`;
      const token = api.defaults.headers.common['Authorization'];
      
      const fileUri = `${(FileSystem as any).documentDirectory}Bao_Cao_${dayjs().format('YYYYMMDD')}.pdf`;
      
      const { uri, status } = await (FileSystem as any).downloadAsync(url, fileUri, {
        headers: { Authorization: token as string },
      });
      
      if (status === 200) {
        const canShare = await (Sharing as any).isAvailableAsync();
        if (canShare) {
          await (Sharing as any).shareAsync(uri);
        } else {
          Alert.alert('Thành công', 'Đã lưu PDF.');
        }
      } else {
        Alert.alert('Lỗi', 'Không thể tải báo cáo PDF');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi xuất PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Báo Cáo Tài Chính</Text>
          {propertyId && (
            <Button
              mode="contained-tonal"
              icon="file-pdf-box"
              loading={exporting}
              onPress={exportPDF}
              disabled={exporting}
            >
              Xuất PDF
            </Button>
          )}
        </View>

        {loadingProps ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.propRow}>
            {properties.map((p: any) => (
              <Button
                key={p.id}
                mode={propertyId === p.id ? 'contained' : 'outlined'}
                compact
                onPress={() => setPropertyId(p.id)}
                style={styles.propBtn}
              >
                {p.name}
              </Button>
            ))}
          </View>
        )}

        <SegmentedButtons
          value={range}
          onValueChange={(v) => setRange(v as any)}
          buttons={[
            { value: '3m', label: '3 tháng' },
            { value: '6m', label: '6 tháng' },
            { value: '12m', label: '12 tháng' },
          ]}
          style={styles.segment}
        />

        {!propertyId && (
          <Text style={styles.hint}>Chọn bất động sản để xem báo cáo</Text>
        )}

        {propertyId && loadingReport && <ActivityIndicator style={{ marginTop: spacing.xl }} />}

        {report && (
          <>
            <View style={styles.statsRow}>
              {[
                { label: 'Tổng thu', value: money(report.totalRevenue), color: theme.colors.primaryContainer },
                { label: 'Đang thuê', value: `${report.occupancy.occupied}/${report.occupancy.total}`, color: '#D5F5E3' },
                { label: 'Hóa đơn', value: String(report.invoiceCount), color: '#FDEBD0' },
              ].map(({ label, value, color }) => (
                <Card key={label} style={[styles.statCard, { backgroundColor: color }]}>
                  <Card.Content>
                    <Text style={styles.statValue}>{value}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </Card.Content>
                </Card>
              ))}
            </View>

            {report.byMonth.length > 0 && (
              <Card style={styles.card}>
                <Card.Title title="Doanh thu theo tháng" />
                <Card.Content>
                  {(() => {
                    const maxVal = Math.max(...report.byMonth.map((m: any) => m.total), 1);
                    return report.byMonth.map((m: any) => (
                      <View key={m.month} style={styles.barRow}>
                        <Text style={styles.barLabel}>{m.month.slice(5)}</Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${(m.total / maxVal) * 100}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.barValue}>{money(m.total)}</Text>
                      </View>
                    ));
                  })()}
                </Card.Content>
              </Card>
            )}

            <Card style={styles.card}>
              <Card.Title title="Phân tích doanh thu" />
              <Card.Content>
                {[
                  { label: 'Tiền thuê', value: money(report.totalRent) },
                  { label: 'Tiền điện', value: money(report.totalElectricity) },
                  { label: 'Tiền nước', value: money(report.totalWater) },
                ].map(({ label, value }) => (
                  <View key={label} style={styles.row}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowValue}>{value}</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { fontWeight: '700' }]}>Tổng cộng</Text>
                  <Text style={[styles.rowValue, { color: theme.colors.primary, fontWeight: '700' }]}>
                    {money(report.totalRevenue)}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Title title="Tình trạng phòng" />
              <Card.Content>
                {[
                  { label: 'Tổng số phòng', value: String(report.occupancy.total) },
                  { label: 'Đang thuê', value: String(report.occupancy.occupied) },
                  { label: 'Trống', value: String(report.occupancy.vacant) },
                  {
                    label: 'Tỷ lệ lấp đầy',
                    value: `${Math.round((report.occupancy.occupied / Math.max(report.occupancy.total, 1)) * 100)}%`,
                  },
                ].map(({ label, value }) => (
                  <View key={label} style={styles.row}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowValue}>{value}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { ...typography.headingLarge, color: theme.colors.primary },
  propRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  propBtn: {},
  segment: {},
  hint: { ...typography.body, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.xl },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, borderRadius: 12 },
  statValue: { ...typography.headingSmall, textAlign: 'center' },
  statLabel: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...typography.body, color: theme.colors.onSurfaceVariant },
  rowValue: { ...typography.body },
  divider: { height: 1, backgroundColor: theme.colors.surfaceVariant, marginVertical: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  barLabel: { ...typography.bodySmall, width: 28, textAlign: 'right', marginRight: spacing.xs },
  barTrack: { flex: 1, height: 16, backgroundColor: theme.colors.surfaceVariant, borderRadius: 4, overflow: 'hidden' as const },
  barFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  barValue: { ...typography.bodySmall, width: 60, textAlign: 'right', marginLeft: spacing.xs },
});
