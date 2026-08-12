# EDUCA G1 operational PDF V1 evidence

## Outcome

The bounded descriptive-report rehearsal now emits a readable operational PDF with explicit provenance.

The PDF remains restricted to the local synthetic pilot gate, the synthetic marker, the isolated database, and the authenticated RLS context.

It does not add certificate behavior, legal status, official municipal issuance, compliance proof, or Educacenso export behavior.

## Source revision and rehearsal

- Source revision used: `d0c6cde6bc2f7a2d701f84ec5801c2095db2d5cc`
- Environment: `local synthetic pilot rehearsal`
- Scope: `Escola Descritiva Sintética` / `Pré II Sintético` / student `23000000-0000-0000-0000-000000000001`
- Scope IDs: school `21000000-0000-0000-0000-000000000001`, class `22000000-0000-0000-0000-000000000001`
- Reporting period: `2026-02-01` to `2026-07-31`, first semester of 2026
- Canonical source: `public.conteudo_aula via generateContentReport (from('conteudo_aula'))`
- Canonical source rows: `2`
- Canonical fingerprint: `MD5 5b197cac1ee74fd588edafa4f8558d85`
- Responsible issuer: authenticated synthetic professor linked to report `28000000-0000-0000-0000-000000000001`
- Issuer receipt: `actorId` equals `reportProfessorId`; email is `professora.descritivo@synthetic.invalid`

## Validation commands

Commands run from the repository root or `app/` as shown:

```bash
cd app && pnpm typecheck
cd app && pnpm lint
cd app && pnpm test
cd app && EDUCA_RELEASE_REVISION=d0c6cde6bc2f7a2d701f84ec5801c2095db2d5cc pnpm test:e2e:pilot:descriptive
```

The final isolated rehearsal reset PostgreSQL, applied the pilot gates, seeded synthetic rows, ran independent validation, built Next.js, started a named Portless URL, authenticated the synthetic teacher, emitted the PDF, ran the deliberate break, restored the rows, and reran validation.

Result: `4 passed` in the final descriptive-report browser E2E.

Unit and repository receipts:

- Typecheck: passed.
- Lint: passed with the repository's existing warning baseline and zero errors.
- Full Vitest suite: `767 passed`, `19 skipped`, `57 passed files`, `2 skipped files`.
- Final isolated database validation: `PASS` in [validation-receipt.json](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/validation-receipt.json).

## Deliberate break

The E2E removed both canonical `conteudo_aula` rows from the isolated database.

Before restoration, the independent validator reported `[FAIL] count_canonical_content`, and the browser emission returned HTTP `422` with the empty-content error.

The E2E restored the exact snapshot and reran validation, which reported `[PASS] count_canonical_content`.

The source fingerprint unit test also proves that changing a canonical source row changes the fingerprint.

## PDF artifact and visual evidence

- Real downloaded PDF before the change: [before.pdf](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/before.pdf)
- Real downloaded PDF after the change: [after.pdf](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/after.pdf)
- Before PDF page image: [before-page-1.png](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/before-page-1.png)
- After PDF page one: [after-page-1.png](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/after-page-1.png)
- After PDF page two: [after-page-2.png](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/after-page-2.png)
- Extracted after-PDF text: [after-text.txt](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/after-text.txt)
- Browser report-page evidence: [browser-report-page.png](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/browser-report-page.png)
- Browser post-emission evidence: [browser-report-after-emission.png](https://github.com/shishiv/EDUCA/blob/e1fb9d5/data/decisions/evidence/2026-08-12-educa-g1-operational-pdf-v1/browser-report-after-emission.png)

The before image shows the original one-page report. The after images show the new boundary and provenance block on page one, with the taught-content section preserved on page two.

The after PDF SHA-256 is `6c44ae27f33f96864cbf9d353076a6f849ad5952f6e188bb03bb4d4ced8b`.

## Chrome DevTools evidence

The real authenticated browser rehearsal used this named Portless URL:

`https://educa-g1-operational-pdf-v1.educa-g1-chrome.localhost`

Commands used:

```bash
CHROME_DEVTOOLS_AXI_SESSION=educa-g1-final chrome-devtools-axi open https://educa-g1-operational-pdf-v1.educa-g1-chrome.localhost/login
CHROME_DEVTOOLS_AXI_SESSION=educa-g1-final chrome-devtools-axi open https://educa-g1-operational-pdf-v1.educa-g1-chrome.localhost/diario/relatorios/23000000-0000-0000-0000-000000000001
CHROME_DEVTOOLS_AXI_SESSION=educa-g1-final chrome-devtools-axi click @g8:8_39
CHROME_DEVTOOLS_AXI_SESSION=educa-g1-final chrome-devtools-axi eval "performance.getEntriesByType('resource').map(entry => entry.name).filter(name => name.includes('/api/pilot/descriptive-reports/'))"
```

The browser evaluation returned the PDF resource URL for report `28000000-0000-0000-0000-000000000001`.

## Cleanup

The rehearsal cleanup removed the isolated Supabase project, its auth state, its generated database directory, and its named app process.

No public demo database, real data, public infrastructure, external credentials, deployment workflow, certificate export, or government export was touched.
