BEGIN;

DROP POLICY IF EXISTS pilot_aluno_responsaveis_select ON public.aluno_responsaveis;
CREATE POLICY pilot_aluno_responsaveis_select ON public.aluno_responsaveis
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.alunos AS student
    JOIN public.responsaveis AS guardian
      ON guardian.id = aluno_responsaveis.responsavel_id
     AND guardian.escola_id = student.escola_id
    WHERE student.id = aluno_responsaveis.aluno_id
      AND public.pilot_can_access_school(student.escola_id)
  )
);

COMMIT;
