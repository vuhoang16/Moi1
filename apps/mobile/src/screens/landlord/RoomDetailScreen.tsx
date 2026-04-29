import React from 'react';
import { ScrollView, StyleSheet, View, Image, Dimensions } from 'react-native';
import { Text, Card, Chip, Button, Divider, ActivityIndicator, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { theme, spacing, typography } from '../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  trong: { label: 'Trống', color: '#27AE60', icon: 'check-circle' },
  da_thue: { label: 'Đã thuê', color: theme.colors.primary, icon: 'account-check' },
  dang_sua_chua: { label: 'Đang sửa chữa', color: theme.colors.secondary, icon: 'wrench' },
};

function useRoom(propertyId: string, roomId: string) {
  return useQuery({
    queryKey: ['rooms', propertyId, roomId],
    queryFn: () => api.get(`/rooms/${roomId}`).then((r) => r.data),
    enabled: !!roomId,
  });
}

export default function RoomDetailScreen({ route, navigation }: any) {
  const { id, propertyId } = route.params;
  const { data: room, isLoading } = useRoom(propertyId, id);

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!room) return null;

  const statusInfo = STATUS_CONFIG[room.status] ?? { label: room.status, color: '#888', icon: 'help-circle' };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Room Images */}
        {room.imageUrls?.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroller}
          >
            {room.imageUrls.map((url: string, i: number) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={styles.roomImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Phòng {room.roomNumber}</Text>
            {room.floor && <Text style={styles.subtitle}>Tầng {room.floor}</Text>}
          </View>
          <Chip
            icon={statusInfo.icon}
            style={{ backgroundColor: statusInfo.color + '20' }}
            textStyle={{ color: statusInfo.color, fontWeight: '600' }}
          >
            {statusInfo.label}
          </Chip>
        </View>

        {/* Key Info Cards */}
        <View style={styles.infoRow}>
          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoCardContent}>
              <IconButton icon="ruler-square" size={20} iconColor={theme.colors.primary} style={styles.infoIcon} />
              <Text style={styles.infoValue}>{room.area} m²</Text>
              <Text style={styles.infoLabel}>Diện tích</Text>
            </Card.Content>
          </Card>
          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoCardContent}>
              <IconButton icon="cash" size={20} iconColor={theme.colors.secondary} style={styles.infoIcon} />
              <Text style={styles.infoValue}>{room.baseRent?.toLocaleString('vi-VN')}</Text>
              <Text style={styles.infoLabel}>VND/tháng</Text>
            </Card.Content>
          </Card>
          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoCardContent}>
              <IconButton icon="account-group" size={20} iconColor="#8E44AD" style={styles.infoIcon} />
              <Text style={styles.infoValue}>{room.maxOccupants}</Text>
              <Text style={styles.infoLabel}>Tối đa</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Amenities */}
        {room.amenities?.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.sectionTitle}>Tiện nghi</Text>
            <View style={styles.amenitiesWrap}>
              {room.amenities.map((amenity: string, i: number) => (
                <Chip key={i} style={styles.amenityChip} compact>
                  {amenity}
                </Chip>
              ))}
            </View>
          </>
        )}

        {/* Notes */}
        {room.notes && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.sectionTitle}>Ghi chú</Text>
            <Text style={styles.notes}>{room.notes}</Text>
          </>
        )}

        <Divider style={styles.divider} />

        {/* Actions */}
        <Text style={styles.sectionTitle}>Thao tác</Text>

        {room.status === 'trong' && (
          <Button
            mode="contained"
            icon="file-sign"
            onPress={() => navigation.navigate('CreateContract')}
            style={styles.actionButton}
            contentStyle={styles.actionContent}
          >
            Tạo hợp đồng mới
          </Button>
        )}

        {room.status === 'da_thue' && room.currentContractId && (
          <>
            <Button
              mode="contained"
              icon="file-document"
              onPress={() =>
                navigation.navigate('ContractDetail', { id: room.currentContractId })
              }
              style={styles.actionButton}
              contentStyle={styles.actionContent}
            >
              Xem hợp đồng
            </Button>
            <Button
              mode="contained-tonal"
              icon="receipt"
              onPress={() =>
                navigation.navigate('InvoiceList', { contractId: room.currentContractId, roomId: room.id })
              }
              style={styles.actionButton}
              contentStyle={styles.actionContent}
            >
              Danh sách hóa đơn
            </Button>
            <Button
              mode="contained-tonal"
              icon="cash-lock"
              onPress={() =>
                navigation.navigate('DepositDetail', { contractId: room.currentContractId })
              }
              style={styles.actionButton}
              contentStyle={styles.actionContent}
            >
              Quản lý tiền cọc
            </Button>
            <Button
              mode="contained-tonal"
              icon="clipboard-check"
              onPress={() =>
                navigation.navigate('CreateChecklist', {
                  contractId: room.currentContractId,
                  phase: 'ban_giao',
                })
              }
              style={styles.actionButton}
              contentStyle={styles.actionContent}
            >
              Tạo biên bản bàn giao
            </Button>
          </>
        )}

        <Button
          mode="outlined"
          icon="wrench"
          onPress={() =>
            navigation.navigate('MaintenanceDetail', { id: room.id })
          }
          style={styles.actionButton}
          contentStyle={styles.actionContent}
        >
          Yêu cầu bảo trì
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: spacing.xxl },
  imageScroller: { marginBottom: spacing.md },
  roomImage: {
    width: SCREEN_WIDTH - spacing.lg * 2,
    height: 220,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerLeft: {},
  title: { ...typography.headingLarge },
  subtitle: { ...typography.body, color: theme.colors.onSurfaceVariant, marginTop: 2 },
  infoRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  infoCard: { flex: 1, borderRadius: 12 },
  infoCardContent: { alignItems: 'center', paddingVertical: spacing.sm },
  infoIcon: { margin: 0 },
  infoValue: { ...typography.headingSmall, textAlign: 'center' },
  infoLabel: { ...typography.bodySmall, color: theme.colors.onSurfaceVariant, textAlign: 'center' },
  divider: { marginVertical: spacing.md, marginHorizontal: spacing.lg },
  sectionTitle: { ...typography.headingSmall, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  amenityChip: { borderRadius: 20 },
  notes: { ...typography.body, color: theme.colors.onSurfaceVariant, paddingHorizontal: spacing.lg },
  actionButton: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 12 },
  actionContent: { paddingVertical: spacing.xs },
});
