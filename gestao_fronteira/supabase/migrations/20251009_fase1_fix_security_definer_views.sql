-- FASE 1.2: Corrigir Security Definer Views
-- Prioridade: CRÍTICA 🔴
-- Tempo estimado: 1.5 horas
-- Issue: 2 views com SECURITY DEFINER sem search_path fixo - risco de privilege escalation

-- ============================================================================
-- 1. RECRIAR vw_frequencia_completa COM SECURITY INVOKER
-- ============================================================================

DROP VIEW IF EXISTS public.vw_frequencia_completa;

CREATE VIEW public.vw_frequencia_completa
WITH (security_invoker = true)  -- ✅ Usa permissões do usuário atual
AS
SELECT
  f.id,
  f.aula_id,
  f.matricula_id,
  f.status,
  f.observacao,
  f.marcado_por,
  f.data_marcacao,
  f.bloqueado,
  f.data_bloqueio,
  f.bloqueado_por,
  m.aluno_id,
  m.turma_id,
  a.nome as aluno_nome,
  a.cpf as aluno_cpf,
  t.nome as turma_nome,
  t.escola_id,
  e.nome as escola_nome
FROM public.frequencia f
INNER JOIN public.matriculas m ON f.matricula_id = m.id
INNER JOIN public.alunos a ON m.aluno_id = a.id
INNER JOIN public.turmas t ON m.turma_id = t.id
INNER JOIN public.escolas e ON t.escola_id = e.id;

-- Grant explícito para roles necessários
GRANT SELECT ON public.vw_frequencia_completa TO authenticated;

COMMENT ON VIEW public.vw_frequencia_completa IS
'View de frequência completa com dados de aluno, turma e escola.
Usa SECURITY INVOKER para respeitar RLS policies das tabelas base.
Acesso controlado por RLS nas tabelas subjacentes.';

-- ============================================================================
-- 2. RECRIAR audit_summary COM SECURITY INVOKER
-- ============================================================================

DROP VIEW IF EXISTS public.audit_summary;

CREATE VIEW public.audit_summary
WITH (security_invoker = true)  -- ✅ Usa permissões do usuário atual
AS
SELECT
  al.tabela_afetada,
  al.operacao,
  COUNT(*) as total_operacoes,
  MIN(al.data_hora) as primeira_operacao,
  MAX(al.data_hora) as ultima_operacao,
  COUNT(DISTINCT al.usuario_id) as usuarios_distintos
FROM public.audit_logs al
GROUP BY al.tabela_afetada, al.operacao;

-- Grant explícito para roles necessários (apenas admins devem ver audit)
GRANT SELECT ON public.audit_summary TO authenticated;

COMMENT ON VIEW public.audit_summary IS
'Sumário de logs de auditoria agrupado por tabela e operação.
Usa SECURITY INVOKER para respeitar RLS policies de audit_logs.
Acesso restrito a administradores via RLS.';

-- ============================================================================
-- VALIDAÇÃO
-- ============================================================================

-- Verificar se views foram recriadas corretamente
SELECT
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('vw_frequencia_completa', 'audit_summary');

-- Testar query com usuário não-admin (deve respeitar RLS)
-- (Executar após login com usuário professor)
-- SELECT * FROM vw_frequencia_completa LIMIT 5;
