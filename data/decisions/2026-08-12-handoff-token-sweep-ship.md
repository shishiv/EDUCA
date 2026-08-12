# Ship handoff - canonical token sweep (the 240 hardcoded green usages)

Spun off from `fm/educa-captain-iteration-front` on 2026-08-12 (captain: "passa
pra frente os 240 usos pra serem feito em novo ship"). The canonical token
foundation is already merged/committed on that front; this ship does the sweep.

## Context (already done - do not redo)

- Canonical shadcn token source established: `tailwind.config.js` `primary`/
  `secondary` now map to `hsl(var(--primary|--secondary))`; `--primary`/`--ring`
  are the brand **emerald** (`161 94% 30%` / dark `160 84% 39%`); `--secondary`
  is a neutral surface; dead `--space-*` tokens removed. Commit `83788e3`.
- Core components migrated to semantic tokens as the reference pattern:
  `components/ui/button.tsx`, `card.tsx`, `input.tsx`.
- Full rationale + measured evidence: `data/decisions/2026-08-12-educa-captain-
  iteration-mobile-scope.md` and `data/decisions/evidence/2026-08-12-canonical-
  tokens/`.

## Scope of this ship

1. Sweep the ~240 hardcoded brand-color usages onto the semantic tokens:
   - `rg 'green-[0-9]' app components --glob '*.tsx'` (~240) - brand action /
     accent greens -> `bg-primary` / `text-primary` / `border-primary` /
     `hover:bg-primary/90` / `ring-ring`, etc.
   - `rg 'municipal-' app components --glob '*.tsx'` (~22) -> map to the
     semantic tokens or fold into the canonical primitives.
   - Neutral `gray-*` used as borders/surfaces on card-like elements ->
     `border-border` / `bg-card` / `bg-muted` / `text-muted-foreground`.
2. Reconcile the remaining semantic tokens: `--accent` is currently amber and
   barely used - decide its brand role (subtle emerald hover tint recommended)
   and wire hover states to it. Keep `--destructive` red.
3. Keep the domain palettes as intentional semantic tokens: the `campo-*` (BNCC
   campos de experiencia) and module colors (alunos/turmas/notas/...) and the
   attendance/performance/educational-level scales are meaningful - do NOT
   flatten them into the brand primary.

## Acceptance criteria

- No hardcoded brand green (`green-500/600/700`, `emerald-*` used as the action
  color) remains for buttons, links, badges, controls, focus rings; they read
  the tokens.
- Light and dark render the emerald brand consistently; visual parity or a
  deliberate, evidenced correction elsewhere.
- `pnpm typecheck`, `pnpm lint`, and the impeccable detector are clean.
- Material visual changes carry before/after evidence for captain acceptance
  (same contract as the mobile-scope decision file).

## Guardrails

- Preserve behavior and contracts (RLS, attendance immutability, pilot/demo
  gates, copy semantics). Token/appearance only.
- Do not re-open the dashboard hero propagation - that remains evidence-only.
- Work on a fresh ship branch off the merged trunk; do not reuse
  `fm/educa-captain-iteration-front`.
