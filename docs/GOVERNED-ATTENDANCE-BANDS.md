# Faixas gerais de frequência governadas

Contrato implementado para [F10 / issue 235](https://github.com/shishiv/EDUCA/issues/235). As faixas servem ao acompanhamento geral, não à aprovação escolar nem à elegibilidade Bolsa Família.

## Persistência e autoridade

A migration `supabase/migrations/20260919000000_governed_attendance_bands.sql` guarda o par `{reference, attention}` em `configs.attendance_alert_bands`. O seed municipal é 80/85. O override da escola substitui **o par inteiro**; sem override ativo, o getter lê o default persistido. Ausência dos dois produz erro, nunca um default em TypeScript. A validação no banco e na aplicação exige números finitos, `0 < reference < attention <= 100`, sem chaves extras. A escola precisa existir.

A autoridade foi decidida pela coordenação antes da implementação, a partir da pesquisa da issue 234 e do contrato municipal existente:

- `admin` ou `secretario`, ativos e com `escola_id IS NULL`, escrevem default e override de qualquer escola existente.
- Direção e professor apenas leem o escopo escolar permitido, com fallback municipal. Secretário vinculado a escola não escreve.
- O mesmo `set_municipal_settings` recebeu o parâmetro obrigatório `p_attendance_bands`. Sua assinatura anterior foi removida, sem overload, novo RPC, endpoint HTTP ou escritor.
- A substituição de assinatura foi expressamente autorizada em `f10-rpc-signature-acl`: restaura exatamente `REVOKE ALL FROM PUBLIC, anon, service_role` e `GRANT EXECUTE TO authenticated`, com `pilot_is_secretariat()` e fechamento por padrão no setter. Isso não concede nova autoridade.
- A policy municipal existente foi estendida para a nova chave. Nenhuma policy de Bolsa Família foi copiada. O getter escolar fecha por padrão também para perfil ausente/inativo.
- As gravações conservam o caminho de auditoria municipal existente e acrescentam o par anterior/novo em `audit_trail`, com ator, escola e identificador da configuração, na mesma transação.

`app/types/database.ts` foi regenerado contra a cadeia completa de migrations em Supabase local descartável. Não foi usado projeto remoto.

## Resolução e propagação

`app/lib/attendance/resolve-attendance-bands.ts` chama o getter municipal com o cliente autenticado e valida o JSON com `attendanceBandsSchema`. O banco é a autoridade para precedência e isolamento. `use-attendance-bands.ts` é apenas o adaptador React Query dessa resolução, com chave por ator/escola e erro visível. Salvar na tela municipal invalida tanto as leituras municipais quanto as faixas.

`loadCanonicalAttendanceSummaries` agrupa matrículas por escola antes de resolver as faixas. Relatórios carregam a política da escola da turma; PDF e Excel recebem esse mesmo par no relatório gerado. Nenhum export busca um default próprio. Erros não viram 80/85, métricas zero válidas ou um relatório de sucesso.

O schema e os classificadores puros permanecem em `attendance-policy.ts`, mas não exportam números municipais. Todos os chamadores agora fornecem a política resolvida. O setter é uma alteração de contrato coordenada com seus consumidores: aplicar a migration junto com a versão da aplicação, não manter clientes antigos escrevendo a assinatura removida.

## Varredura dos consumidores e classificação

Caminhos relativos a `app/`, exceto onde indicado. A coluna de evidência indica o proprietário da decisão, não apenas a existência de um import.

### Faixa geral: migrada para configuração persistida

| Sítio | Evidência e tratamento |
| --- | --- |
| `app/(dashboard)/dashboard/page.tsx` | `DashboardMetrics`: cor e texto da frequência média usam `bands.reference` via `useAttendanceBands(escolaId)`. |
| `app/(dashboard)/dashboard/turmas/[id]/page.tsx` | `bands.reference` governa a apresentação da média da turma; erro de configuração aparece como alerta. |
| `app/(dashboard)/dashboard/turmas/[id]/chamada/page.tsx` | Resolve a escola da turma; cabeçalhos e classificação recebem o par. |
| `components/attendance/AttendanceGrid.tsx` | Resolve pela escola da turma antes de apresentar a grade. |
| `components/attendance/AttendanceGridHeader.tsx` | `getAttendanceRateBadgeClass` classifica com as faixas recebidas. |
| `components/attendance/ChamadaHeader.tsx` | Indicador de presença recebe `bands`, sem piso próprio. |
| `components/diary/LessonCard.tsx` | Indicador de frequência recebe `bands` da sessão. |
| `components/diary/LessonDetailPanel.tsx` | Rótulos e cores de referência municipal usam as faixas carregadas. |
| `components/diary/FrequencyControls.tsx` | Classificação geral recebe a política da sessão. |
| `components/diary/ClassDiaryList.tsx` | Percentual de cada entrada é classificado com `entry.bands`, resolvido pela escola daquela entrada. |
| `components/diary/ClassDiaryDetail.tsx` | `AttendancePolicy`: as frases antigas “Não conformidade Bolsa Família” e “condicionalidade atendida” foram substituídas por referência municipal e atenção preventiva. Não declara status do benefício. |
| `app/(dashboard)/dashboard/matriculas/[id]/page.tsx` | `MatriculaAttendanceCard`: as mesmas duas afirmações sobre benefício foram removidas. O texto agora descreve somente a referência municipal ou a atenção preventiva. |
| `components/students/StudentInfoGrid.tsx` | `FrequencyStatus`: “Condicionalidade Bolsa Família atendida” foi substituída por “Referência municipal atendida”. |
| `app/(dashboard)/dashboard/alunos/[id]/page.tsx` | Carrega o par da escola para a frequência apresentada no perfil. |
| `app/(dashboard)/dashboard/alunos/[id]/boletim/page.tsx` | Propaga `summary.bands` para a apresentação geral do boletim, não para o resultado final. |
| `components/reports/StudentReport.tsx` (cartão Frequência) | A cor/advertência geral usa `attendance.bands`; separada do resultado final descrito abaixo. |
| `components/reports/AttendanceReportTable.tsx` | Tabela, rótulos, cores e contagem de risco recebem `bands`; removidos defaults de props. |
| `app/(dashboard)/relatorios/frequencia/page.tsx` | Propaga `report.bands` à tabela e o relatório completo aos exports. |
| `lib/export/attendance-excel.ts` (relatório geral) | Status, preenchimento e legenda usam `report.bands`. |
| `lib/export/attendance-pdf.ts` (relatório geral) | Status e legenda usam `report.bands`; relatório individual usa faixas gerais somente na ausência de campos próprios do benefício. |
| `app/api/attendance/trends/route.ts` | `getTrendStatistics` recebe as faixas da escola; os indicadores se chamam `conformePoliticaGeral` e `atencaoPreventiva`. |
| `lib/api/students.ts` | `getAtRiskStudents` resolve a referência pela escola de cada aluno e respeita o filtro escolar; a contagem sem classificação não precisa de política. |
| `lib/api/canonical-attendance-facts.ts` | `loadCanonicalAttendanceSummaries` resolve cada escola; `summarizeCanonicalAttendanceFacts` exige o par. Os fatos canônicos permanecem por sessão/matrícula. |
| `lib/api/class-diary.ts` | Resolve por escola e inclui `bands` nas entradas e detalhes do diário. |
| `lib/api/classes.ts` | `getClassWithSchool` expõe o `escola_id` já persistido, permitindo resolver a chamada na escola correta. |
| `lib/attendance/attendance-calculations.ts` | `summarizeAttendanceCounts` exige faixas; a contagem P/F/A permanece independente. |
| `lib/reports/attendance-reports.ts` | Relatórios individuais/turma incluem a política resolvida; nenhuma opção de threshold substitui o banco. |
| `lib/validation/brazilian.ts:getAttendanceStatus` | Classificador geral exige `AttendanceBands`. Não é o validador do benefício abaixo. |
| `components/settings/municipal-settings.tsx`, `hooks/use-municipal-settings.ts`, `lib/services/municipal-settings.ts`, `app/api/school-settings/municipal/handler.ts` | Leitura/edição do par pelo contrato municipal existente; schema obrigatório, sem fallback silencioso. |

### Aprovação ou benefício: não governados pela configuração geral

A decisão `f10-grade-status-coupling` determinou preservar número e efeito destes contratos, retirando apenas o vínculo com as constantes gerais. **Preservar não significa validar juridicamente os números ou as mensagens legadas.** Uma mudança nesses contratos exige decisão própria.

| Sítio | Evidência e tratamento |
| --- | --- |
| `components/reports/StudentReport.tsx:calculateStatus` e Resultado Final | Mantido o piso anterior de 80 em `REPORT_CARD_ATTENDANCE_FLOOR`, com comentário de separação deliberada. A configuração de alerta não aprova nem reprova aluno. |
| `lib/validation/brazilian.ts:validateMinimumAttendance` | O contrato declara condicionalidade Bolsa Família. Mantido seu valor anterior em `LEGACY_BOLSA_FAMILIA_ATTENDANCE_FLOOR`, sem import da faixa geral. |
| `lib/validation/brazilian-educational.ts:validateAttendancePercentage` | Declara LDB/condicionalidade do benefício. Preservados mensagem, status e números anteriores em constantes próprias `LEGACY_EDUCATIONAL_ATTENDANCE_*`. Não é apresentado como implementação dos pisos legais atuais. |
| `lib/reports/bolsa-familia-reports.ts` | O relatório continua vindo de `getAttendanceConditionality`. `calculateFaltasParaCritico` perdeu somente o default geral implícito; seu chamador já passa a margem específica resolvida pelo banco. |
| `lib/reports/attendance-conditionality.ts`, `app/api/compliance/warnings/route.ts`, `app/api/dashboard/alerts/route.ts` | Permanecem no read model de condicionalidade autorizado, distinto das faixas gerais. Nenhuma alteração em pisos legais ou margens desse modelo. |
| `components/reports/BolsaFamiliaAlert.tsx`, `app/(dashboard)/relatorios/bolsa-familia/page.tsx` | Apresentam o relatório específico, não a resolução geral. Sem mudança de status/texto a partir da nova configuração. |
| Exports de Bolsa Família em `lib/export/attendance-{excel,pdf}.ts` | Continuam usando os campos legais e de margem do relatório específico. A classificação individual PDF preserva a prioridade explícita de margem própria/piso legal antes da apresentação geral. |

A infraestrutura do demo (`supabase/seed-demo/`) não decide elegibilidade: gera um caso sintético e compara com o marcador persistido `demo_alert_threshold`. O alias de constante geral foi removido. O reset repõe `attendance_alert_bands` como dado SQL, sem duplicar o default quando a migration já o inseriu.

## Evidência executada

Resultados em [`artifacts/attendance-bands/validation.log`](../artifacts/attendance-bands/validation.log), em 2026-09-19 UTC, usando Node nativo 26.8.1, ABI 147 e pnpm 9.15.9:

| Gate | Resultado |
| --- | --- |
| `pnpm typecheck` | Passou. |
| `pnpm lint` | Passou: complexity max10, anti-slop e ESLint com zero warnings. |
| `pnpm run test --maxWorkers=2` | Suíte completa: 134 arquivos / 1388 testes passaram; 5 arquivos / 29 testes já desabilitados pelo projeto, não excluídos nesta tarefa. |
| `pnpm build` | Passou com variáveis do Supabase local sintético. |
| `supabase/tests/database/run.sh` | Cadeia completa de migrations e contratos SQL passou. |
| `pnpm demo:verify-sql` | Seed, controles negativos e repetição de reset passaram. |
| Dois specs E2E abaixo, `--project=chromium --workers=1` | 27/27 passaram, incluindo setup. Chromium instalado no sistema; sem retries e sem aumentar timeout. |

Provas relevantes:

- `supabase/tests/database/attendance_alert_bands.test.sql`: seed, escrita municipal/admin, override completo, edição posterior do default, isolamento, escola inexistente, ator negado (direção/professor/secretário escolar/inativo/ausente), ACL, escrita direta negada, validação, auditoria e ausência de configuração.
- `supabase/tests/database/attendance_conditionality.contract.sql`: compara as **54 linhas completas** do RPC de Bolsa Família antes/depois de gravações gerais 10/20 e 95/99, tanto no default quanto no override. As gravações realmente persistem; pisos, status e margens do benefício permanecem idênticos.
- `frequency-policy-contract.test.ts` e `governed-bands.test.ts`: 79.99/80/84.99/85; mudança real da classificação com outro par; configuração ausente/malformada/negada; mensagens legadas do benefício invariantes quando a faixa geral atravessa o mesmo percentual.
- `student-report-attendance-bands.test.tsx`: 78% pode ter alerta geral verde e continuar reprovado; 82% pode ter alerta geral vermelho e continuar aprovado. O Resultado Final permanece independente.
- `governed-attendance-report.test.ts`: o mesmo conjunto 17/20 é crítico com override 90/95 na leitura canônica e no relatório, PDF e bytes Excel; sem configuração, relatório falha.
- `app/tests/e2e/flows/dashboard-metrics.spec.ts`: gravação autenticada do override; mudança da cor real do painel em 33.3%; persistência por reload; outra escola não herda o override; configuração ausente apresenta erro, não métricas válidas. O teste F09 de dois anos também passou.
- `app/tests/e2e/reports/frequency.spec.ts`: gravação autenticada de 60/65; o aluno com 67% muda para referência atendida nos downloads PDF/Excel reais, incluindo legendas com 60/65; restauração ao final. O teste responsivo de 390px também passou.

As capturas em `artifacts/attendance-bands/browser/` mostram o default 80/85 e o fallback escolar após salvar 78/88. O bloqueio `STALE_REF` do driver manual foi reportado e encerrado por instrução da coordenação; não foi tratado como PASS. As provas restantes foram ancoradas nos testes existentes, sem wrapper/retry daquele driver.

Recursos exclusivos `educa-f10-browser` e `educa-f10-general` foram encerrados; a verificação de cleanup confirmou ausência de recursos remanescentes para cada projeto. Os clusters PostgreSQL dos contratos também usam o cleanup próprio dos runners.

Não houve dados reais, deploy, execução da suíte E2E geral inteira ou do agregado R3 inteiro, mudança de autorização de notas/benefício, promoção para `main` ou merge. O resultado é uma entrega para revisão em `dev`, não uma aprovação jurídica ou de produção.
