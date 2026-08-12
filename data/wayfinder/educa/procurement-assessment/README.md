# Procurement assessment EDUCA

Pacote interno, versionado e **synthetic-only** para revisão G0. O arquivo começa sem fatos externos sobre uma escola ou secretaria.

## Contrato do pacote

- `assessment.json` enumera os campos de discovery, atores, perguntas, evidências, incerteza e próximo gate.
- Todo desconhecido usa exatamente `a confirmar`.
- Cada campo desconhecido registra evidência, fonte, data, incerteza, ator confirmador e gate seguinte.
- Identidades reais não entram no pacote. A identidade institucional fica `a confirmar`; a identidade de rehearsal usa apenas `@synthetic.invalid`.
- O pacote separa `procurement assessment`, `rehearsal sintético` e implantação municipal não autorizada.
- Não há mensagem, reunião, agenda, CRM, webhook, waitlist, dado de aluno, PII, preço, SLA, contrato ou compromisso comercial.

## G0

O próximo gate é `G0 - discovery privado`. O resultado continua `a confirmar`.

Os sete receipts ausentes aparecem em `assessment.json` com `status: "missing"`:

1. autorização exata de destinatário e pessoa;
2. problema de frequência, processo atual e escola candidata;
3. mapa de atores e autoridade;
4. procurement, owner, orçamento, calendário fiscal, instrumento e termo de referência;
5. hospedagem, segurança, dados, base legal, retenção e saída;
6. aceite, pagamento, preço, SLA, contrato, renovação e expansão;
7. revisão humana e próximo passo sem compromisso.

Não existe destinatário, escola, secretaria, owner ou calendário escolhido neste pacote.

## Validação e receipts

O validador segue o padrão local de receipt independente usado pelos validadores de piloto e pelo teste de import governado:

```bash
pnpm --dir app validate:procurement-assessment
pnpm --dir app test -- tests/unit/wayfinder/procurement-assessment.test.ts
```

O teste prova três coisas: o fixture sintético passa, a remoção de fonte obrigatória falha e uma identidade fora de `.invalid` falha. O comando imprime `PROCUREMENT_ASSESSMENT_VALIDATION_RECEIPT` sem repetir o conteúdo do pacote.

Fontes da decisão de formato:

- T02 e S01: seam `procurement assessment`, campos obrigatórios, G0 e exclusões.
- `CONTEXT.md`: fronteira synthetic-only e separação entre demo, rehearsal e implantação municipal.
- `docs/PILOT-DATA-IMPORT.md`: receipts, isolamento e deliberate-breaks como padrão de validação.
- `app/scripts/validate-pilot-*.ts` e `app/tests/unit/pilot/governed-csv-import.test.ts`: validação independente e prova negativa.
