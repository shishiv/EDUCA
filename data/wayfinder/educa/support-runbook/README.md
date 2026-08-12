# Runbook interno de suporte EDUCA

Pacote versionado, local e **synthetic-only** para ensaiar um incidente de pilot-support sem contato externo. O fixture em `runbook.json` usa somente referências redigidas e não representa uma escola, secretaria, pessoa, produção ou implantação real.

## Contrato do pacote

- O fluxo transforma um incidente redigido em correlação, severidade, escopo, owner placeholder, primeira resposta, escalonamento, receipt reference, rollback e fechamento.
- A cobertura inclui `access`, `roles`, `chamada`, `Diário`, inconsistência observada, incidente de dados e rollback.
- `critical` significa chamada bloqueada, possível acesso entre escolas, perda ou alteração de frequência, ou contenção de dados.
- `ordinary` cobre perguntas, melhorias visuais e solicitações de funcionalidade quando nenhum critério crítico está presente.
- Todo receipt é redigido. O fixture não contém nome de aluno, CPF, NIS, telefone, email, conteúdo bruto ou instituição real.

## Limites e binding humano

Este pacote é um rehearsal local. Ele não faz contato, deployment, consulta de telemetria ou CRM. Também não altera banco, attendance, acesso ou dados reais.

O gate humano é **T12**. Owner, substituto, canal e calendário permanecem `a confirmar`. O validador rejeita a ausência desses placeholders e mantém a referência a T12. Targets técnicos existentes aparecem apenas como referência de rehearsal e não são promessas.

Não existe SLA, promessa de rollout, prazo de resposta, compromisso de remediação ou autorização de implantação neste pacote.

## Rehearsal do incidente sintético

1. Leia `runbook.json` localmente e não substitua os marcadores `[REDACTED]`.
2. Use `SYN-INC-001` e `SYN-CORR-001` para correlacionar o caso.
3. Classifique o caso como `critical` porque o fixture simula possível acesso entre escolas e risco de contenção de frequência.
4. Restrinja o escopo às superfícies redigidas de acesso, roles, chamada e Diário.
5. Faça a primeira resposta sem copiar conteúdo bruto e sem tentar ampliar acesso.
6. Registre a referência `receipt-redacted-incident-001` e escale para `a confirmar - T12`.
7. Rehearse o rollback apenas no fixture local, usando `receipt-redacted-rollback-001`.
8. Feche o rehearsal com `receipt-redacted-closure-001`. O fechamento de produção continua bloqueado até T12.

Para uma solicitação ordinary, registre a categoria sem criar um incidente crítico. Perguntas, melhorias visuais e solicitações de funcionalidade não recebem SLA ou promessa de rollout.

## Validação

Execute da raiz do repositório:

```bash
pnpm --dir app validate:support-runbook
pnpm --dir app test -- tests/unit/wayfinder/support-runbook.test.ts
```

A validação imprime `SUPPORT_RUNBOOK_VALIDATION_RECEIPT` sem repetir o conteúdo do fixture. O teste focado prova que o fixture passa e que duas quebras deliberadas ficam inválidas:

```bash
SUPPORT_RUNBOOK_DELIBERATE_BREAK=owner pnpm --dir app validate:support-runbook
SUPPORT_RUNBOOK_DELIBERATE_BREAK=severity pnpm --dir app validate:support-runbook
```

Os dois comandos deliberadamente terminam com código diferente de zero. Eles removem, somente na memória, o owner placeholder ou a severidade do incidente. O arquivo local não é alterado.

O contrato não prova disponibilidade, segurança, SLA, rollout, implantação, contato, telemetry, CRM ou dados reais. T12 continua sendo a porta de binding humano.
