CREATE OR REPLACE FUNCTION public.formata_cpf(cpf numeric)
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
    cpf_text text;
    cpf_formatado varchar(14);
BEGIN
  IF cpf IS NULL THEN
    RETURN '';
  END IF;

  -- Converte o CPF numérico para texto e preenche com zeros à esquerda
  cpf_text := lpad(TRIM(TO_CHAR(cpf, 'FM99999999999')), 11, '0');

  cpf_formatado := SUBSTR(cpf_text, 1, 3) || '.' ||
                   SUBSTR(cpf_text, 4, 3) || '.' ||
                   SUBSTR(cpf_text, 7, 3) || '-' ||
                   SUBSTR(cpf_text, 10, 2);

  RETURN cpf_formatado;
END;
$function$;
