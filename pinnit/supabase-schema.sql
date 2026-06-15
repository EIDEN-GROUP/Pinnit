-- Run this in the Supabase SQL Editor

-- ============================================================
-- AFTER running the schema below, make YOURSELF an admin:
--   1. Sign up through the app at /auth/register
--   2. In Supabase SQL Editor, run:
--      UPDATE profiles SET is_admin = true WHERE id = '<your-user-uuid>';
--   3. Or get your UUID with:
--      SELECT id FROM auth.users WHERE email = '<your-email>';
-- ============================================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Sites table
CREATE TABLE IF NOT EXISTS sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sites are viewable by everyone"
  ON sites FOR SELECT USING (true);

CREATE POLICY "Sites are insertable by admins only"
  ON sites FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Sites are updatable by admins only"
  ON sites FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Sites are deletable by admins only"
  ON sites FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. Comments table
-- NOTE: user_id references profiles(id) (which cascades to auth.users)
-- so Supabase can resolve the `profiles` relationship in queries.
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE NOT NULL,
  page_url TEXT NOT NULL,
  x_pos FLOAT NOT NULL,
  y_pos FLOAT NOT NULL,
  scroll_x FLOAT DEFAULT 0,
  scroll_y FLOAT DEFAULT 0,
  text TEXT NOT NULL,
  image_url TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Comments are insertable by authenticated users"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Comments are deletable by owners and admins"
  ON comments FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. Storage bucket for comment images
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-images', 'comment-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Comment images are viewable by everyone"
  ON storage.objects FOR SELECT USING (bucket_id = 'comment-images');

CREATE POLICY "Comment images are uploadable by authenticated users"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'comment-images' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Comment images are deletable by owners"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'comment-images' AND auth.uid() = owner
  );
