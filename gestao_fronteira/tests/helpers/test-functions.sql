-- Test Helper Functions for Database Testing
-- These functions support the integration tests for Enhanced Abrir Aula Workflow

-- Function to get foreign key information
CREATE OR REPLACE FUNCTION get_foreign_key_info(p_table_name text)
RETURNS TABLE (
    column_name text,
    foreign_table_name text,
    foreign_column_name text,
    constraint_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        kcu.column_name::text,
        ccu.table_name::text as foreign_table_name,
        ccu.column_name::text as foreign_column_name,
        tc.constraint_name::text
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = p_table_name
        AND tc.table_schema = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table index information
CREATE OR REPLACE FUNCTION get_table_index_info(p_table_name text)
RETURNS TABLE (
    indexname text,
    indexdef text,
    is_unique boolean,
    column_names text[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.relname::text as indexname,
        pg_get_indexdef(i.oid)::text as indexdef,
        ix.indisunique as is_unique,
        ARRAY(
            SELECT a.attname
            FROM pg_attribute a
            WHERE a.attrelid = i.oid
            AND a.attnum = ANY(ix.indkey)
            ORDER BY a.attnum
        ) as column_names
    FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_namespace n
    WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND t.relnamespace = n.oid
        AND n.nspname = 'public'
        AND t.relname = p_table_name
    ORDER BY i.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table columns with enhanced information
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name text)
RETURNS TABLE (
    column_name text,
    data_type text,
    is_nullable text,
    column_default text,
    character_maximum_length integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.column_name::text,
        c.data_type::text,
        c.is_nullable::text,
        c.column_default::text,
        c.character_maximum_length
    FROM
        information_schema.columns c
    WHERE
        c.table_name = p_table_name
        AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get table policies
CREATE OR REPLACE FUNCTION get_table_policies(p_table_name text)
RETURNS TABLE (
    policyname text,
    cmd text,
    qual text,
    with_check text,
    roles text[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.policyname::text,
        p.cmd::text,
        p.qual::text,
        p.with_check::text,
        p.roles::text[]
    FROM
        pg_policies p
    WHERE
        p.tablename = p_table_name
        AND p.schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get database functions
CREATE OR REPLACE FUNCTION get_database_functions(p_function_name text DEFAULT NULL)
RETURNS TABLE (
    routine_name text,
    routine_type text,
    routine_definition text,
    is_trigger boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.routine_name::text,
        r.routine_type::text,
        r.routine_definition::text,
        CASE
            WHEN r.routine_name LIKE '%_trigger%' OR r.routine_name LIKE 'fn_%'
            THEN true
            ELSE false
        END as is_trigger
    FROM
        information_schema.routines r
    WHERE
        r.routine_schema = 'public'
        AND (p_function_name IS NULL OR r.routine_name = p_function_name)
    ORDER BY r.routine_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test performance of queries
CREATE OR REPLACE FUNCTION test_query_performance(p_query text)
RETURNS TABLE (
    execution_time_ms numeric,
    rows_affected bigint
) AS $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    rows_count bigint;
BEGIN
    start_time := clock_timestamp();

    EXECUTE p_query;
    GET DIAGNOSTICS rows_count = ROW_COUNT;

    end_time := clock_timestamp();

    RETURN QUERY
    SELECT
        EXTRACT(epoch FROM (end_time - start_time)) * 1000 as execution_time_ms,
        rows_count as rows_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate hash format (for legal compliance)
CREATE OR REPLACE FUNCTION validate_legal_hash(p_hash text)
RETURNS boolean AS $$
BEGIN
    -- SHA-256 hash should be exactly 64 hexadecimal characters
    RETURN p_hash ~ '^[a-f0-9]{64}$';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check timezone compliance
CREATE OR REPLACE FUNCTION check_timezone_compliance()
RETURNS TABLE (
    current_timezone text,
    sao_paulo_time timestamp with time zone,
    is_business_hours boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        current_setting('timezone')::text as current_timezone,
        NOW() AT TIME ZONE 'America/Sao_Paulo' as sao_paulo_time,
        CASE
            WHEN EXTRACT(hour FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) BETWEEN 7 AND 18
            THEN true
            ELSE false
        END as is_business_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to simulate teacher dashboard query (for performance testing)
CREATE OR REPLACE FUNCTION simulate_teacher_dashboard_query(p_professor_id uuid)
RETURNS TABLE (
    session_count bigint,
    query_time_ms numeric
) AS $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    count_result bigint;
BEGIN
    start_time := clock_timestamp();

    SELECT COUNT(*)
    INTO count_result
    FROM sessoes_aula s
    WHERE s.professor_id = p_professor_id
    AND s.status IN ('PLANEJADA', 'ABERTA')
    AND s.data_aula = CURRENT_DATE;

    end_time := clock_timestamp();

    RETURN QUERY
    SELECT
        count_result as session_count,
        EXTRACT(epoch FROM (end_time - start_time)) * 1000 as query_time_ms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test audit trail integrity
CREATE OR REPLACE FUNCTION verify_audit_integrity(p_sessao_id uuid)
RETURNS TABLE (
    total_audit_records bigint,
    has_create_record boolean,
    has_valid_hashes boolean,
    chronological_order boolean
) AS $$
DECLARE
    audit_count bigint;
    create_exists boolean;
    hashes_valid boolean;
    order_correct boolean;
BEGIN
    -- Count audit records
    SELECT COUNT(*) INTO audit_count
    FROM audit_sessoes_aula
    WHERE sessao_id = p_sessao_id;

    -- Check for CREATE record
    SELECT EXISTS(
        SELECT 1 FROM audit_sessoes_aula
        WHERE sessao_id = p_sessao_id AND acao = 'CRIAR'
    ) INTO create_exists;

    -- Check hash validity
    SELECT NOT EXISTS(
        SELECT 1 FROM audit_sessoes_aula
        WHERE sessao_id = p_sessao_id
        AND (hash_verificacao IS NULL OR hash_verificacao = '')
    ) INTO hashes_valid;

    -- Check chronological order
    SELECT NOT EXISTS(
        SELECT 1
        FROM (
            SELECT timestamp_acao,
                   LAG(timestamp_acao) OVER (ORDER BY timestamp_acao) as prev_timestamp
            FROM audit_sessoes_aula
            WHERE sessao_id = p_sessao_id
        ) t
        WHERE prev_timestamp > timestamp_acao
    ) INTO order_correct;

    RETURN QUERY
    SELECT
        audit_count as total_audit_records,
        create_exists as has_create_record,
        hashes_valid as has_valid_hashes,
        order_correct as chronological_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;