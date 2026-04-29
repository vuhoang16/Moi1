-- Run in Supabase SQL Editor after creating the project
-- Creates storage buckets with correct public/private settings and size limits

-- ─── Buckets ─────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',            'avatars',            TRUE,  5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('property-images',    'property-images',    TRUE,  10485760,  ARRAY['image/jpeg','image/png','image/webp']),
  ('contracts',          'contracts',          FALSE, 20971520,  ARRAY['application/pdf','image/png']),
  ('maintenance-media',  'maintenance-media',  FALSE, 52428800,  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- ─── Storage RLS Policies ────────────────────────────────────────

-- avatars: anyone can read; owner can write
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- property-images: authenticated read; landlord writes
CREATE POLICY "property_images_auth_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "property_images_owner_write"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- contracts: only landlord and tenant of that contract can read/write
-- (NestJS API uploads using service key; RLS here is extra defense)
CREATE POLICY "contracts_service_only"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'contracts'
    AND auth.role() = 'service_role'
  );

-- maintenance-media: tenant uploads; landlord + tenant of same property read
CREATE POLICY "maintenance_media_service_only"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'maintenance-media'
    AND auth.role() = 'service_role'
  );
