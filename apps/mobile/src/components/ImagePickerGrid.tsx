import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { IconButton, ActivityIndicator } from 'react-native-paper';
import { pickAndUploadImage } from '../utils/upload';
import { theme, spacing } from '../theme';

interface Props {
  bucket: string;
  folder: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

export default function ImagePickerGrid({ bucket, folder, urls, onChange, max = 6 }: Props) {
  const [uploading, setUploading] = useState(false);

  const add = async () => {
    if (urls.length >= max) return;
    setUploading(true);
    try {
      const url = await pickAndUploadImage(bucket, folder);
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
        <TouchableOpacity style={styles.add} onPress={add} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <IconButton icon="plus" size={28} iconColor={theme.colors.primary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: 90, height: 90, borderRadius: 8, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  remove: { position: 'absolute', top: -4, right: -4, backgroundColor: 'rgba(0,0,0,0.5)', margin: 0 },
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
});
