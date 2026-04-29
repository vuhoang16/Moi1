import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, Alert, Modal } from 'react-native';
import { Text, Button, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureCanvas from 'react-native-signature-canvas';
import dayjs from 'dayjs';
import { useContract, useSignContract } from '../../queries/contracts';
import { useAuthStore } from '../../store/auth.store';
import { theme, spacing, typography } from '../../theme';
import type { ContractStatus } from '@rentapp/shared';

const statusLabels: Record<ContractStatus, string> = {
  nhap: 'Nháp', cho_ky: 'Chờ ký', hieu_luc: 'Hiệu lực', het_han: 'Hết hạn', da_huy: 'Đã huỷ',
};
const statusColors: Record<ContractStatus, string> = {
  nhap: '#95A5A6', cho_ky: '#E67E22', hieu_luc: '#27AE60', het_han: '#7F8C8D', da_huy: '#C0392B',
};

export default function ContractDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const user = useAuthStore((s) => s.user);
  const { data: contract, isLoading, refetch } = useContract(id);
  const signContract = useSignContract();
  const [showSig, setShowSig] = useState(false);
  const sigRef = useRef<any>(null);

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!contract) return null;

  const fmt = (d: string) => dayjs(d).format('DD/MM/YYYY');
  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  const isLandlord = user?.id === contract.landlordId;
  const isTenant = user?.id === contract.tenantId;
  const canSignLandlord = isLandlord && contract.status === 'nhap';
  const canSignTenant = isTenant && contract.status === 'cho_ky';

  const handleSign = async (base64: string) => {
    setShowSig(false);
    try {
      await signContract.mutateAsync({
        contractId: id,
        role: isLandlord ? 'landlord' : 'tenant',
        signatureBase64: base64,
      });
      await refetch();
      Alert.alert('Thành công', isLandlord ? 'Đã ký — chờ người thuê ký' : 'Hợp đồng hiệu lực!');
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message ?? 'Ký thất bại');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Hợp Đồng</Text>
          <Chip
            style={{ backgroundColor: statusColors[contract.status as ContractStatus] + '22' }}
            textStyle={{ color: statusColors[contract.status as ContractStatus] }}
          >
            {statusLabels[contract.status as ContractStatus]}
          </Chip>
        </View>

        <Card style={styles.card}>
          <Card.Title title="Thông tin phòng" />
          <Card.Content>
            <Row label="Phòng" value={contract.room?.roomNumber} />
            <Row label="Toà nhà" value={contract.room?.property?.name} />
            <Row label="Từ ngày" value={fmt(contract.startDate)} />
            <Row label="Đến ngày" value={fmt(contract.endDate)} />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Tài chính" />
          <Card.Content>
            <Row label="Tiền thuê" value={money(contract.monthlyRent)} />
            <Row label="Đặt cọc" value={money(contract.depositAmount)} />
            <Row label="Ngày TT" value={`Ngày ${contract.paymentDueDay}`} />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Chữ ký" />
          <Card.Content>
            <Row label="Chủ nhà" value={contract.landlordSignedAt ? `Đã ký ${fmt(contract.landlordSignedAt)}` : 'Chưa ký'} />
            <Row label="Người thuê" value={contract.tenantSignedAt ? `Đã ký ${fmt(contract.tenantSignedAt)}` : 'Chưa ký'} />
          </Card.Content>
        </Card>

        {contract.pdfUrl && (
          <Button mode="outlined" icon="file-pdf-box" style={styles.btn} onPress={() => navigation.navigate('PDFViewer', { url: contract.pdfUrl, title: 'Hợp đồng' })}>
            Xem PDF hợp đồng
          </Button>
        )}

        {(canSignLandlord || canSignTenant) && (
          <Button mode="contained" icon="pen" style={styles.btn} onPress={() => setShowSig(true)} loading={signContract.isPending}>
            Ký hợp đồng
          </Button>
        )}
      </ScrollView>

      <Modal visible={showSig} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <Text style={styles.sigTitle}>Vẽ chữ ký của bạn</Text>
          <SignatureCanvas
            ref={sigRef}
            onOK={handleSign}
            onEmpty={() => Alert.alert('Vui lòng vẽ chữ ký')}
            descriptionText="Vẽ chữ ký"
            clearText="Xoá"
            confirmText="Xác nhận"
            webStyle={`.m-signature-pad { box-shadow: none; border: none; } .m-signature-pad--body { border: 1px solid #ddd; } `}
          />
          <Button onPress={() => setShowSig(false)} style={{ margin: spacing.md }}>Huỷ</Button>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value ?? '—'}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { ...typography.body, color: theme.colors.onSurfaceVariant },
  value: { ...typography.body, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { ...typography.headingLarge },
  card: { borderRadius: 12 },
  btn: { marginTop: spacing.sm },
  sigTitle: { ...typography.headingMedium, textAlign: 'center', padding: spacing.md },
});
