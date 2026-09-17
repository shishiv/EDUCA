-- Migration-owned structure, NOT recovered data or provider-managed Auth/Storage ACLs.
SELECT record FROM (
  SELECT jsonb_build_array('policy', schemaname, tablename, policyname,
    permissive, roles, cmd, qual, with_check)::text AS record
  FROM pg_policies
  WHERE schemaname = 'public'
    OR (schemaname = 'storage' AND policyname LIKE 'pilot_%')
  UNION ALL
  SELECT jsonb_build_array('relation', n.nspname, c.relname,
    c.relrowsecurity, c.relforcerowsecurity, c.relacl)::text
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
  UNION ALL
  SELECT jsonb_build_array('column', c.relname, a.attname, a.attacl)::text
  FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
  UNION ALL
  SELECT jsonb_build_array('function', p.proname,
    pg_get_function_identity_arguments(p.oid), p.proacl)::text
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
) catalog ORDER BY record COLLATE "C";
