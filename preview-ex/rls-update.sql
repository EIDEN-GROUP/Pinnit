-- Run this in your Supabase SQL editor to allow the extension to auto-create sites
-- This lets any authenticated user insert into the sites table (needed for "any website" pinning)

CREATE POLICY "Authenticated users can insert sites"
  ON sites FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Also ensure the storage bucket policy allows authenticated uploads
-- (should already exist from the web app setup)
