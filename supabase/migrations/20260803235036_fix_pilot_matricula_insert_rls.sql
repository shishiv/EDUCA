-- Keep enrollment write authorization outside the RLS-protected table joins.
-- The previous policy joined alunos while alunos has a policy that reads
-- matriculas, which made authenticated enrollment inserts recurse forever.

CREATE OR REPLACE FUNCTION public.pilot_can_insert_matricula(
  target_aluno_id uuid,
  target_turma_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.alunos AS a
      JOIN public.turmas AS t ON t.escola_id = a.escola_id
      WHERE a.id = target_aluno_id
        AND t.id = target_turma_id
        AND public.pilot_can_manage_school(t.escola_id)
    )
$$;

REVOKE ALL ON FUNCTION public.pilot_can_insert_matricula(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pilot_can_insert_matricula(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS pilot_matriculas_insert ON public.matriculas;
CREATE POLICY pilot_matriculas_insert ON public.matriculas
FOR INSERT TO authenticated
WITH CHECK (public.pilot_can_insert_matricula(aluno_id, turma_id));
