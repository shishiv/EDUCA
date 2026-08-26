SELECT 'relation|' || class.relname || '|' || class.relkind::text || '|' || class.relpersistence::text || '|' || class.relrowsecurity || '|' || class.relforcerowsecurity || '|' || owner.rolname
FROM pg_class AS class
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
JOIN pg_roles AS owner ON owner.oid = class.relowner
WHERE namespace.nspname = :'schema'
  AND class.relkind IN ('r', 'i')
UNION ALL
SELECT 'column|' || table_name || '|' || ordinal_position || '|' || column_name || '|' || data_type || '|' || udt_name || '|' || is_nullable || '|' || coalesce(replace(column_default, :'schema', '__tenant__'), '')
FROM information_schema.columns
WHERE table_schema = :'schema'
UNION ALL
SELECT 'constraint|' || class.relname || '|' || constraint_record.conname || '|' || constraint_record.contype::text || '|' || replace(replace(pg_get_constraintdef(constraint_record.oid, true), :'schema', '__tenant__'), :'school_id', '__school__')
FROM pg_constraint AS constraint_record
JOIN pg_class AS class ON class.oid = constraint_record.conrelid
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
WHERE namespace.nspname = :'schema'
UNION ALL
SELECT 'index|' || table_record.relname || '|' || index_record.relname || '|' || replace(pg_get_indexdef(index_record.oid), :'schema', '__tenant__')
FROM pg_index AS index_metadata
JOIN pg_class AS table_record ON table_record.oid = index_metadata.indrelid
JOIN pg_class AS index_record ON index_record.oid = index_metadata.indexrelid
JOIN pg_namespace AS namespace ON namespace.oid = table_record.relnamespace
WHERE namespace.nspname = :'schema'
UNION ALL
SELECT 'policy|' || tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ',') || '|' || replace(replace(coalesce(qual, ''), :'schema', '__tenant__'), :'school_id', '__school__') || '|' || replace(replace(coalesce(with_check, ''), :'schema', '__tenant__'), :'school_id', '__school__')
FROM pg_policies
WHERE schemaname = :'schema'
UNION ALL
SELECT 'grant|' || table_name || '|' || grantee || '|' || privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = :'schema'
ORDER BY 1;
