import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, View, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, SegmentedButtons, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useChecklistsByContract } from '../../queries/checklists';
import { theme, spacing, typography } from '../../theme';

interface Item {
  name: string;
  category: string;
  quantity: number;
  conditionOnCheckin: string;
  conditionOnCheckout?: string;
}

const CATEGORIES = ['Nội thất', 'Điện tử', 'Vệ sinh', 'Kết cấu', 'Khác'];
const TEMPLATES: Item[] = [
  { name: 'Giường', category: 'Nội thất', quantity: 1, conditionOnCheckin: 'Tốt' },
  { name: 'Tủ quần áo', category: 'Nội thất', quantity: 1, conditionOnCheckin: 'Tốt' },
  { name: 'Bàn + ghế', category: 'Nội thất', quantity: 1, conditionOnCheckin: 'Tốt' },
  { name: 'Điều hoà', category: 'Điện tử', quantity: 1, conditionOnCheckin: 'Hoạt động tốt' },
  { name: 'Nóng lạnh', category: 'Điện tử', quantity: 1, conditionOnCheckin: 'Hoạt động tốt' },
  { name: 'Bóng đèn', category: 'Điện tử', quantity: 2, conditionOnCheckin: 'Sáng' },
  { name: 'Vòi nước', category: 'Vệ sinh', quantity: 1, conditionOnCheckin: 'Không rỉ' },
  { name: 'Cửa phòng + khoá', category: 'Kết cấu', quantity: 1, conditionOnCheckin: 'Đóng mở tốt' },
  { name: 'Cửa sổ', category: 'Kết cấu', quantity: 1, conditionOnCheckin: 'Không nứt' },
];

export default function CreateChecklistScreen({ route, navigation }: any) {
  const { contractId } = route.params;
  const qc = useQueryClient();
  const [phase, setPhase] = useState<'ban_giao' | 'tra_phong'>('ban_giao');
  const [items, setItems] = useState<Item[]>(TEMPLATES);
  const [notes, setNotes] = useState('');

  const { data: checklists } = useChecklistsByContract(contractId);

  useEffect(() => {
    if (phase === 'tra_phong' && checklists?.length) {
      const banGiao = checklists.find((c: any) => c.phase === 'ban_giao');
      if (banGiao?.records) {
        setItems(
          banGiao.records.map((r: any) => ({
            name: r.name,
            category: r.category,
            quantity: r.quantity,
            conditionOnCheckin: r.conditionOnCheckin,
            conditionOnCheckout: '',
          }))
        );
      }
    }
  }, [phase, checklists]);

  const create = useMutation({
    mutationFn: (data: any) => api.post('/checklists', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklists', contractId] });
      navigation.goBack();
    },
    onError: (err: any) => Alert.alert('Lỗi', err.response?.data?.message),
  });

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { name: '', category: 'Khác', quantity: 1, conditionOnCheckin: '' }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = () => {
    const invalid = items.some((i) => !i.name.trim());
    if (invalid) { Alert.alert('Lỗi', 'Vui lòng nhập tên cho tất cả đồ vật'); return; }
    create.mutate({ contractId, phase, notes, records: items });
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Tạo Biên Bản Bàn Giao</Text>
            <SegmentedButtons
              value={phase}
              onValueChange={(v) => setPhase(v as any)}
              buttons={[
                { value: 'ban_giao', label: 'Bàn giao phòng' },
                { value: 'tra_phong', label: 'Trả phòng' },
              ]}
              style={styles.segment}
            />
            <Text style={styles.section}>Danh sách đồ vật</Text>
          </>
        }
        renderItem={({ item, index }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.itemRow}>
                <TextInput
                  label="Tên đồ vật"
                  value={item.name}
                  onChangeText={(v) => updateItem(index, 'name', v)}
                  mode="outlined"
                  dense
                  disabled={phase === 'tra_phong'}
                  style={styles.nameFld}
                />
                <TextInput
                  label="SL"
                  value={String(item.quantity)}
                  onChangeText={(v) => updateItem(index, 'quantity', Number(v) || 1)}
                  keyboardType="numeric"
                  mode="outlined"
                  dense
                  disabled={phase === 'tra_phong'}
                  style={styles.qtyFld}
                />
                <IconButton icon="close" onPress={() => removeItem(index)} size={18} />
              </View>
              <TextInput
                label="Tình trạng khi bàn giao"
                value={item.conditionOnCheckin}
                onChangeText={(v) => updateItem(index, 'conditionOnCheckin', v)}
                mode="outlined"
                dense
                disabled={phase === 'tra_phong'}
                style={styles.condition}
              />
              {phase === 'tra_phong' && (
                <TextInput
                  label="Tình trạng khi trả phòng"
                  value={item.conditionOnCheckout}
                  onChangeText={(v) => updateItem(index, 'conditionOnCheckout', v)}
                  mode="outlined"
                  dense
                  style={styles.condition}
                />
              )}
            </Card.Content>
          </Card>
        )}
        ListFooterComponent={
          <>
            <Button mode="outlined" icon="plus" onPress={addItem} style={styles.addBtn}>
              Thêm đồ vật
            </Button>
            <TextInput
              label="Ghi chú chung (tuỳ chọn)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.notes}
            />
            <Button mode="contained" onPress={submit} loading={create.isPending} style={styles.submit}>
              Tạo biên bản
            </Button>
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.headingLarge, marginBottom: spacing.md, color: theme.colors.primary },
  segment: { marginBottom: spacing.md },
  section: { ...typography.headingSmall, marginBottom: spacing.sm },
  card: { borderRadius: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  nameFld: { flex: 1 },
  qtyFld: { width: 60 },
  condition: { marginBottom: spacing.xs },
  addBtn: { marginTop: spacing.sm },
  notes: { marginTop: spacing.lg },
  submit: { marginTop: spacing.md, paddingVertical: spacing.xs },
});
