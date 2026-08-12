# Dashboard hero - before/after evidence pack

- Change under review: commit **f28d304** "bolder: branded dashboard hero + slim demo chrome"
- Baseline (before): parent commit **e8608d0** (plain greeting, big Alert demo banner, 4 stat cards)
- Front: `fm/educa-captain-iteration-front` - **f28d304 left unchanged**; this pack only adds files under `data/`.
- Data equivalence: both states captured logged in as the same synthetic admin, same dataset
  (7 alunos, 5 turmas, 100% frequência, 2 professores).
- Regenerate: from `app/`, `STATE=after node ../data/decisions/evidence/2026-08-12-dashboard-hero/capture.mjs`
  (and `STATE=before` after reverting the two dashboard files to e8608d0). Requires the dev server on :3000.

## Artifacts

| File | What |
|---|---|
| `before-desktop-full.png`, `after-desktop-full.png` | Full dashboard, desktop 1280x860 @2x |
| `before-mobile-full.png`, `after-mobile-full.png` | Full dashboard, mobile 390x844 @2x |
| `after-desktop-hero.png`, `after-mobile-hero.png` | The hero band, cropped (before has no hero element - see note) |
| `after-desktop-hero.html`, `after-mobile-hero.html` | The hero's rendered outer HTML |
| `*-focus.png` | Viewport with a real action keyboard-focused (focus-ring proof) |
| `measurements-before.json`, `measurements-after.json` | Raw measured contrast / readability / hierarchy / focus / actions |
| `capture.mjs` | The reproducible Playwright capture + measurement script |

Note: in the "before" state the greeting was a `<div>`, not a `<header>`, so there is no cropped
before-hero image; the before full-page shots show the equivalent region (plain greeting + big banner).

## Before -> after (what changed)

- Plain dark-on-white greeting line -> a **branded hero band** in the brand's own identity gradient
  (`from-emerald-700 via-teal-700 to-sky-800`, already used on the sign-in surface).
- The compliance-critical **Frequência média** metric moves into the hero (lead position) with its
  conformity state; the three count metrics stay as a secondary row (4 cards -> hero + 3 cards).
- The demo banner shrinks from a full Alert box to a **one-line note** (and stops being an assertive
  live region that re-announced on every navigation).
- No action added or removed; no new font or color introduced.

## Measured findings

### 1. Contrast (WCAG 2.1, worst-case across the 3 gradient stops; translucent chip + text alpha composited)

| Hero text | Size | Role | Min ratio | Needs | Result |
|---|---|---|---|---|---|
| "Bom dia, Admin!" | 36/30px bold | large | **5.47** | 3.0 | PASS |
| "Rede Municipal... Ano Letivo 2024" | 16/14px | normal | **4.54** | 4.5 | PASS (tight) |
| "100%" | 36px bold | large | **4.50** | 3.0 | PASS |
| "Frequência média da rede" | 12px | normal | **3.97** | 4.5 | **FAIL** |
| "conforme" badge | 12px | normal | **3.38** | 4.5 | **FAIL** |

Two small (12px) labels inside the metric chip fall below AA for normal text. The primary content
(greeting, subtitle, the 100% value) passes. Desktop and mobile measure the same for the small text.

**Remediation (NOT applied - would change f28d304; awaiting the captain's decision):** raise the two
12px labels to `text-white` (white on the same chip measures >= 4.5), or drop them to a darker chip,
or promote them past 14px/bold. Smallest fix: `text-emerald-100 -> text-white` on the chip label and
`text-emerald-50 -> text-white` on the badge.

### 2. Text readability

| Run | Family | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| Greeting (h1) | Lexend | 36px / 40px (30px mobile) | 700 | -0.36px (from base -0.01em) |
| Subtitle (p) | Inter | 16px / 24px (14px mobile) | 400 | normal |
| Metric value | Lexend | 36px / 36px | 700 | normal (tabular figures) |
| Chip label / badge | Inter | 12px / 16px | 600 | 0.3px / normal |

Body-scale subtitle meets the 16px web body floor on desktop; the 12px runs are metadata labels.
The metric uses tabular figures so digits stay aligned.

### 3. Keyboard focus

- 14 interactive controls in `<main>`, **14 focusable** (before: 14/14 - unchanged).
- Focus walk: **13/16** tab stops show a visible ring; the 3 without a ring are `nextjs-portal`
  elements (the Next.js dev-tools overlay), not application UI. Every app control that received focus
  had a visible ring (`*-focus.png` shows the ring on the first action).
- The hero band itself is informational (no focusable elements), so it adds no tab stops or traps.

### 4. Hierarchy

- Page outline: `h1` "Bom dia, Admin!" (36px, primary) -> section `h3` "Minhas Turmas" (18px) /
  "Alertas" (16px). Sidebar brand is an `h2` (14px, pre-existing).
- The hero pairs the greeting `h1` (36px) with the metric value (36px) as a deliberate dual anchor;
  the metric is a data callout in a contained chip, not a heading, so it does not compete for the
  document outline.
- Pre-existing inconsistency (unchanged by this commit, noted for the record): the two section `h3`s
  differ (18px/400 vs 16px/600).

### 5. Action reachability

- Every dashboard action is present and reachable after the change; the hero neither adds nor removes
  any action. Quick-access row, turma links, and the "Fazer chamada" alert CTA are unchanged.
- Two hit targets are below the 44px touch guideline (pre-existing text links, not introduced here):
  "Ver todas as turmas" 40px, "Fazer chamada" 16px tall.

## Summary

The change is a visible, on-brand hierarchy upgrade that preserves every action and dataset. The one
substantive accessibility finding is the **two 12px chip labels failing AA contrast (3.97 / 3.38)**;
a one-line remediation exists but is intentionally not applied here, pending the captain's decision on
the hero direction.
