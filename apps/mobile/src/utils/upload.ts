import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function pickAndUploadImage(bucket: string, folder: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const compressed = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(compressed.uri);
  const blob = await response.blob();
  const ext = 'jpg';
  const path = `${folder}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function pickAndUploadVideo(bucket: string, folder: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    videoMaxDuration: 30,
    quality: 0.6,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > 52_428_800) {
    throw new Error('Video phải nhỏ hơn 50MB');
  }

  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const path = `${folder}/${Date.now()}.mp4`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'video/mp4',
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
