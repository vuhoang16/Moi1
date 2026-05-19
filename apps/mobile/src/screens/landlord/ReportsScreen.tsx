import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, FlatList } from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  SegmentedButtons,
  Divider,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api } from '../../api/client';
import { useProperties } from '../../queries/properties';
import { theme, spacing, typography } from '../../theme';

const RANGE_MONTHS = { '3m': 3, '6m': 6, '12m': 12 } as const;
type Range = keyof typeof RANGE_MONTHS;

const STATUS_LABEL: Record<string, string> = {
  da_thanh_toan: 'Đã thanh toán',
  chua_thanh_toan: 'Chưa TT',
  qua_han: 'Quá hạn',
};

const STATUS_COLOR: Record<string, string> = {
  da_thanh_toan: '#27AE60',
  chua_thanh_toan: '#E67E22',
  qua_han: '#C0392B',
};

export default function ReportsScreen() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('6m');
  const [exporting, setExporting] = useState(false);

  const { data: propertiesData, isLoading: loadingProps } = useProperties();
  const properties = propertiesData?.items ?? [];

  const from = dayjs()
    .subtract(RANGE_MONTHS[range], 'month')
    .format('YYYY-MM-01');
  const to = dayjs().format('YYYY-MM-DD');

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['report', propertyId, from, to],
    queryFn: () =>
      api.get(`/reports/financial/${propertyId}`, { params: { from, to } }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact', maximumFractionDigits: 1 }).format(n);

  const exportPDF = async () => {
    if (!propertyId) return;
    setExporting(true);
    try {
      const url = `${api.defaults.baseURL}/reports/export/${propertyId}?from=${from}&to=${to}`;
      const token = api.defaults.headers.common['Authorization'];
      const fileUri = `${FileSystem.documentDirectory}Bao_Cao_${dayjs().format('YYYYMMDD')}.pdf`;
      const { uri, status } = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: token as string },
      });
      if (status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) await Sharing.shareAsync(uri);
        else Alert.alert('Thành công', 'Đã lưu PDF.');
      } else {
        Alert.alert('Lỗi', 'Không thể tải báo cáo PDF');
      }
    } catch {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi xuất PDF');
    } finally {
      setExporting(false);
    }
  };

  const maxBar = report?.byMonth?.length
    ? Math.max(...report.byMonth.map((m: any) => m.total), 1)
    : 1;

  const occupancyPct = report
    ? Math.round((report.occupancy.occupied / Math.max(report.occupancy.total, 1)) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Báo Cáo Tài Chính</Text>
          {propertyId && (
            <Button
              mode="contained-tonal"
              icon="file-pdf-box"
              loading={exporting}
              onPress={exportPDF}
              compact
            >
              Xuất PDF
            </Button>
          )}
        </View>

        {/* Property picker */}
        {loadingProps ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propScroll}>
            <View style={styles.propRow}>
              {properties.map((p: any) => (
                <Chip
                  key={p.id}
                  selected={propertyId === p.id}
                  onPress={() => setPropertyId(p.id)}
                  style={styles.propChip}
                  selectedColor={theme.colors.primary}
                >
                  {p.name}
                </Chip>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Range selector */}
        <SegmentedButtons
          value={range}
          onValueChange={(v) => setRange(v as Range)}
          buttons={[
            { value: '3m', label: '3 tháng' },
            { value: '6m', label: '6 tháng' },
            { value: '12m', label: '12 tháng' },
          ]}
          style={styles.segment}
        />

        {!propertyId && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Chọn bất động sản để xem báo cáo</Text>
          </View>
        )}

        {propertyId && loadingReport && (
          <ActivityIndicator style={styles.loader} />
        )}

        {report && (
          <>
            {/* KPI row */}
            <View style={styles.kpiRow}>
              <Card style={[styles.kpiCard, { backgroundColor: theme.colors.primaryContainer }]}>
                <Card.Content style={styles.kpiContent}>
                  <Text style={styles.kpiValue}>{fmt(report.totalRevenue)}</Text>
                  <Text style={styles.kpiLabel}>Tổng thu</Text>
                </Card.Content>
              </Card>
              <Card style={[styles.kpiCard, { backgroundColor: '#D5F5E3' }]}>
                <Card.Content style={styles.kpiContent}>
                  <Text style={styles.kpiValue}>{occupancyPct}%</Text>
                  <Text style={styles.kpiLabel}>Lấp đầy</Text>
                </Card.Content>
              </Card>
              <Card style={[styles.kpiCard, { backgroundColor: '#FDEBD0' }]}>
                <Card.Content style={styles.kpiContent}>
                  <Text style={styles.kpiValue}>{report.invoiceCount}</Text>
                  <Text style={styles.kpiLabel}>Hóa đơn</Text>
                </Card.Content>
              </Card>
            </View>

            {/* Bar chart */}
            {report.byMonth?.length > 0 && (
              <Card style={styles.card}>
                <Card.Title
                  title="Doanh thu theo tháng"
                  titleStyle={styles.cardTitle}
                />
                <Card.Content>
                  {report.byMonth.map((m: any) => {
                    const pct = (m.total / maxBar) * 100;
                    return (
                      <View key={m.month} style={styles.barRow}>
                        <Text style={styles.barLabel}>{dayjs(m.month).format('MM/YY')}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.barAmount}>{fmt(m.total)}</Text>
                      </View>
                    );
                  })}
                </Card.Content>
              </Card>
            )}

            {/* Revenue breakdown */}
            <Card style={styles.card}>
              <Card.Title title="Phân tích doanh thu" titleStyle={styles.cardTitle} />
              <Card.Content>
                {[
                  { label: 'Tiền thuê', value: report.totalRent, icon: '🏠' },
                  { label: 'Tiền điện', value: report.totalElectricity, icon: '⚡' },
                  { label: 'Tiền nước', value: report.totalWater, icon: '💧' },
                ].map(({ label, value, icon }) => (
                  <View key={label}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownIcon}>{icon}</Text>
                      <Text style={styles.rowLabel}>{label}</Text>
                      <Text style={styles.rowValue}>{fmt(value)}</Text>
                    </View>
                    <View style={styles.breakdownBar}>
                      <View
                        style={[
                          styles.breakdownFill,
                          { width: `${(value / Math.max(report.totalRevenue, 1)) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                ))}
                <Divider style={styles.divider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tổng cộng</Text>
                  <Text style={styles.totalValue}>{fmt(report.totalRevenue)}</Text>
                </View>
              </Card.Content>
            </Card>

            {/* Occupancy */}
            <Card style={styles.card}>
              <Card.Title title="Tình trạng phòng" titleStyle={styles.cardTitle} />
              <Card.Content>
                <View style={styles.occupancyBar}>
                  <View
                    style={[
                      styles.occupancyFill,
                      { width: `${occupancyPct}%` },
                    ]}
                  />
                </View>
                <View style={styles.occupancyLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                    <Text style={styles.legendText}>Đang thuê: {report.occupancy.occupied}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: theme.colors.surfaceVariant }]} />
                    <Text style={styles.legendText}>Trống: {report.occupancy.vacant}</Text>
                  </View>
                </View>
                {[
                  { label: 'Tổng số phòng', value: String(report.occupancy.total) },
                  { label: 'Tỷ lệ lấp đầy', value: `${occupancyPct}%` },
                ].map(({ label, value }) => (
                  <View key={label} style={styles.row}>
                    <Text style={styles.rowLabel}>{label}</Text>
                    <Text style={styles.rowValue}>{value}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>

            {/* Invoice list */}
            {report.invoices?.length > 0 && (
              <Card style={styles.card}>
                <Card.Title title={`Hóa đơn (${report.invoices.length})`} titleStyle={styles.cardTitle} />
                <Card.Content>
                  {report.invoices.map((inv: any, idx: number) => (
                    <View key={inv.id ?? idx}>
                      <View style={styles.invoiceRow}>
                        <View style={styles.invoiceLeft}>
                          <Text style={styles.invoiceRoom}>Phòng {inv.room?.roomNumber}</Text>
                          <Text style={styles.invoiceMonth}>{inv.billingMonth}</Text>
                        </View>
                        <View style={styles.invoiceRight}>
                          <Text style={styles.invoiceAmount}>{fmt(inv.totalAmount)}</Text>
                          <Chip
                            compact
                            style={[
                              styles.statusChip,
                              { backgroundColor: STATUS_COLOR[inv.status] + '22' },
                            ]}
                            textStyle={{ color: STATUS_COLOR[inv.status], fontSize: 10 }}
                          >
                            {STATUS_LABEL[inv.status] ?? inv.status}
                          </Chip>
                        </View>
                      </View>
                      {idx < report.invoices.length - 1 && <Divider />}
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...typography.headingLarge, color: theme.colors.primary },
  propScroll: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  propRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  propChip: { backgroundColor: theme.colors.surfaceVariant },
  segment: {},
  loader: { marginTop: spacing.xl },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: theme.colors.onSurfaceVariant },
  // KPI
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpiCard: { flex: 1, borderRadius: 12 },
  kpiContent: { alignItems: 'center', paddingVertical: spacing.sm },
  kpiValue: { ...typography.headingSmall, textAlign: 'center' },
  kpiLabel: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  // Cards
  card: { borderRadius: 12 },
  cardTitle: { ...typography.headingSmall, color: theme.colors.primary },
  // Bar chart
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  barLabel: { ...typography.bodySmall, width: 36, color: theme.colors.onSurfaceVariant },
  barTrack: {
    flex: 1,
    height: 18,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  barFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  barAmount: { ...typography.bodySmall, width: 64, textAlign: 'right', color: theme.colors.primary, fontWeight: '600' },
  // Breakdown
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  breakdownIcon: { fontSize: 16, marginRight: spacing.sm },
  breakdownBar: {
    height: 4,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 2,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  breakdownFill: { height: '100%', backgroundColor: theme.colors.secondary, borderRadius: 2 },
  rowLabel: { ...typography.body, color: theme.colors.onSurfaceVariant, flex: 1 },
  rowValue: { ...typography.body, fontWeight: '500' },
  divider: { marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs },
  totalLabel: { ...typography.headingSmall },
  totalValue: { ...typography.headingSmall, color: theme.colors.primary },
  // Occupancy
  occupancyBar: {
    height: 12,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  occupancyFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 6 },
  occupancyLegend: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  // Invoice list
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  invoiceLeft: { flex: 1 },
  invoiceRoom: { ...typography.body, fontWeight: '600' },
  invoiceMonth: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant },
  invoiceRight: { alignItems: 'flex-end', gap: spacing.xs },
  invoiceAmount: { ...typography.body, color: theme.colors.primary, fontWeight: '600' },
  statusChip: { height: 22 },
});
