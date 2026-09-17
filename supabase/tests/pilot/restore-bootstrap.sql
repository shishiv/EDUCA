-- Bounded compatibility shim, not a Supabase Auth/Storage service restore.
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz
);

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY,
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  metadata jsonb,
  created_at timestamptz
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/') $$;
GRANT USAGE ON SCHEMA auth, storage TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;
GRANT ALL ON auth.users, storage.buckets, storage.objects TO service_role;
GRANT SELECT ON storage.buckets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON storage.objects TO authenticated;
