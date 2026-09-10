BEGIN;

-- Keep the existing admission signature while persisting every guardian field
-- accepted by the student form. The JSON payload remains optional so the
-- transaction and existing callers retain their current contract.
-- Preserve the existing DEFINER boundary introduced by the sensitive-family
-- policy: browser roles cannot select the full aluno row returned here.
-- pilot_can_manage_school below still derives authority from the caller.
CREATE OR REPLACE FUNCTION public.create_student_admission(
  p_nome_completo text,
  p_data_nascimento date,
  p_sexo text,
  p_escola_id uuid,
  p_cpf text DEFAULT NULL,
  p_rg text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_endereco text DEFAULT NULL,
  p_nome_mae text DEFAULT NULL,
  p_nome_pai text DEFAULT NULL,
  p_necessidades_especiais text DEFAULT NULL,
  p_responsavel jsonb DEFAULT NULL
)
RETURNS SETOF public.alunos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted_student public.alunos;
  inserted_responsavel_id uuid;
  responsavel_nome text;
  responsavel_telefone text;
  responsavel_email text;
  responsavel_parentesco text;
  responsavel_cpf text;
  responsavel_endereco text;
  responsavel_profissao text;
BEGIN
  IF p_escola_id IS NULL OR public.pilot_can_manage_school(p_escola_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'PILOT_STUDENT_SCHOOL_DENIED' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.alunos (
    nome_completo,
    data_nascimento,
    sexo,
    cpf,
    rg,
    email,
    telefone,
    endereco,
    nome_mae,
    nome_pai,
    necessidades_especiais,
    escola_id,
    ativo
  )
  VALUES (
    p_nome_completo,
    p_data_nascimento,
    p_sexo,
    p_cpf,
    p_rg,
    p_email,
    p_telefone,
    p_endereco,
    p_nome_mae,
    p_nome_pai,
    p_necessidades_especiais,
    p_escola_id,
    true
  )
  RETURNING * INTO inserted_student;

  IF p_responsavel IS NOT NULL THEN
    responsavel_nome := p_responsavel ->> 'nome';
    responsavel_telefone := p_responsavel ->> 'telefone';
    responsavel_email := p_responsavel ->> 'email';
    responsavel_parentesco := p_responsavel ->> 'grau_parentesco';
    responsavel_cpf := p_responsavel ->> 'cpf';
    responsavel_endereco := p_responsavel ->> 'endereco';
    responsavel_profissao := p_responsavel ->> 'profissao';

    INSERT INTO public.responsaveis (
      nome,
      telefone,
      email,
      parentesco,
      escola_id,
      cpf,
      endereco,
      profissao,
      ativo
    )
    VALUES (
      responsavel_nome,
      NULLIF(responsavel_telefone, ''),
      NULLIF(responsavel_email, ''),
      responsavel_parentesco,
      p_escola_id,
      COALESCE(responsavel_cpf, ''),
      NULLIF(responsavel_endereco, ''),
      NULLIF(responsavel_profissao, ''),
      true
    )
    RETURNING id INTO inserted_responsavel_id;

    INSERT INTO public.aluno_responsaveis (
      aluno_id,
      responsavel_id,
      tipo_responsabilidade,
      ativo
    )
    VALUES (
      inserted_student.id,
      inserted_responsavel_id,
      responsavel_parentesco,
      true
    );
  END IF;

  RETURN NEXT inserted_student;
END;
$$;

COMMIT;
