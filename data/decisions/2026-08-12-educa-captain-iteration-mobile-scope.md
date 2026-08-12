# EDUCA captain iteration - mobile scope

- Decision date: 2026-08-12
- Front: `fm/educa-captain-iteration-front` (isolated worktree)
- Owner: captain (routed via firstmate)

## Decision

Captain requested a broad mobile-first refinement of EDUCA: simplify and improve
layout and adaptability (responsiveness) across the whole system, because a large
share of usage is on phones and tablets. The first "distill" pass was judged too
superficial; the mandate is real layout/responsiveness improvement across every
screen.

- 2026-08-12: after the systemic pass (4 commits), the captain chose **B**:
  continue the broad mobile-first pass across Diario, the grades matrix (notas),
  settings, and forms.

## Constraints (must hold)

- Preserve behavior and contracts: data access, RLS, attendance immutability and
  time-lock, pilot/demo gates, and copy semantics. Responsiveness and layout only.
- Any **material product or visual change** must return to the captain with
  complete **before/after evidence** before shipping. Record such proposals in
  the "Material change proposals" section below; do not apply them unilaterally.
- Keep the front isolated; push only `fm/educa-captain-iteration-front`.

## Reusable patterns established

- `responsive-stack-table` (`app/app/globals.css`): opt-in class on a `<Table>`;
  below 768px each row renders as a card so no column hides behind a horizontal
  scroll. Tablet and desktop keep the table.
- KPI grids: `grid-cols-2 ... lg:grid-cols-4` (or `md:grid-cols-4`) so metrics are
  2-up on phones; `StatCard` is compact and responsive.
- Detail headers: `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`;
  titles `text-2xl sm:text-3xl`.

## Material change proposals (before/after evidence for captain acceptance)

1. Dashboard: remove the duplicated quick-actions surface (IMPLEMENTED - captain
   explicitly authorized removing duplicated quick actions).
   - Before: two quick-action surfaces - the top "Acessos rapidos" row (Novo
     Aluno, Matricula, Frequencia, Diario, Nova Turma, Relatorios, Config) and a
     bottom-right "Acoes Rapidas" card (Nova Chamada, Lancar Notas, Ver
     Relatorios, Cadastrar Aluno) - on top of the full sidebar nav (triple
     redundancy).
   - After: the single top "Acessos rapidos" row remains; the right column is
     just Alertas. Every removed action stays reachable: Cadastrar Aluno = Novo
     Aluno, Ver Relatorios = Relatorios, Nova Chamada = Frequencia (both go to
     the turmas/chamada flow), Lancar Notas via the sidebar "Notas". No capacity
     or flow lost.
   - Evidence: before/after full-page desktop screenshots presented to the
     captain in the iteration report. Status: awaiting captain acceptance.

2. Typeset pass: unify the title voice (VISUAL change - captain requested a
   simplify/typeset pass).
   - Before: ~38 raw page-title `<h1>`s rendered in the body family (Inter),
     while titles via PageHeader/CardTitle and the dashboard used the display
     family (Lexend) - an inconsistent heading voice.
   - After: a base-layer rule makes h1/h2/h3 use the display family (Lexend), so
     every title shares one voice; utility classes still override per element.
     h1/h2 get -0.01em tracking and balanced wrapping; KPI numbers use tabular
     figures. Families unchanged (Inter body + Lexend display, already the
     committed identity).
   - Evidence: after screenshots (usuarios, dashboard) in the report. Status:
     awaiting captain acceptance.

3. Bold direction (captain: the layout/adapt/simplify pass was too timid/
   invisible - amplify). Flagship = dashboard. MATERIAL visual change.
   - Branded hero header using the brand's OWN identity gradient (the
     emerald->teal->sky gradient the sign-in surface already owns), with the
     compliance-critical Frequencia metric given the lead position; count
     metrics demoted to a secondary 3-up row. Greeting no longer a plain line.
   - Demo sandbox banner slimmed from a full Alert box to a one-line note
     (also drops an assertive live region that re-announced on every page).
   - Preserves all data and every action. Families/tokens unchanged; reuses the
     brand gradient and existing radii.
   - Evidence: before (generic dashboard) vs after (branded hero) full-page
     desktop + mobile screenshots in the report. Status: proposed as the bold
     direction to roll across screens - awaiting captain confirmation.

## Progress log

- 2026-08-12: systemic mobile pass committed (`f68e9d8..c93a731`): distill
  foundation, 2-up compact KPIs, list tables stack into cards on phones,
  detail-page headers stop clipping. Verified phone/tablet/desktop; gates green.
- 2026-08-12: continuing per decision B - Diario, notas, settings, forms.
