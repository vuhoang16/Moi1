import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { IconButton, ActivityIndicator, Text } from 'react-native-paper';
import { pickAndUploadImage, takePhotoAndUpload } from '../utils/upload';
import { theme, spacing, typography } from '../theme';

interface Props {
  bucket: string;
  folder: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export default function ImagePickerGrid({ bucket, folder, urls, onChange, max = 6 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  const upload = async (source: 'camera' | 'gallery') => {
    setShowSheet(false);
    setUploading(true);
    try {
      const url =
        source === 'camera'
          ? await takePhotoAndUpload(bucket, folder)
          : await pickAndUploadImage(bucket, folder);
      if (url) onChange([...urls, url]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  return (
    <>
      <View style={styles.grid}>
        {urls.map((url, i) => (
          <View key={url} style={styles.thumb}>
            <Image source={{ uri: url }} style={styles.img} />
            <IconButton
              icon="close-circle"
              size={18}
              iconColor="#fff"
              style={styles.remove}
              onPress={() => remove(i)}
            />
          </View>
        ))}
        {urls.length < max && (
          <TouchableOpacity
            style={styles.add}
            onPress={() => setShowSheet(true)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <IconButton icon="plus" size={28} iconColor={theme.colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowSheet(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Thêm ảnh</Text>

            <TouchableOpacity style={styles.sheetRow} onPress={() => upload('camera')}>
              <IconButton icon="camera" size={22} iconColor={theme.colors.primary} style={styles.sheetIcon} />
              <Text style={styles.sheetLabel}>Chụp ảnh mới</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetRow} onPress={() => upload('gallery')}>
              <IconButton icon="image-multiple" size={22} iconColor={theme.colors.primary} style={styles.sheetIcon} />
              <Text style={styles.sheetLabel}>Chọn từ thư viện</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.sheetRow, styles.cancel]} onPress={() => setShowSheet(false)}>
              <Text style={styles.cancelLabel}>Huỷ</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 90, height: 90, borderRadius: 8, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  remove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    margin: 0,
  },
  add: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sheetTitle: {
    ...typography.headingSmall,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  sheetIcon: { margin: 0, marginRight: spacing.sm },
  sheetLabel: { ...typography.body, color: '#1a1a1a' },
  cancel: {
    marginTop: spacing.sm,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: spacing.md,
  },
  cancelLabel: { ...typography.body, color: theme.colors.error, textAlign: 'center', flex: 1 },
});
