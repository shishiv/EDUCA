# EDUCA — Design Tokens

**SSOT de implementação:** `app/app/globals.css` + `app/tailwind.config.js` + `app/components/identity/`  
**Brand Guidelines (referência no código):** v1.0 — Dezembro 2024  
**Consumidores:** produto (`app/`), marketing (`educa-site` herda — ADR-002)

> Este documento **descreve** os tokens. Em caso de divergência, o código vence.  
> Atualize este arquivo quando mudar CSS/Tailwind/logo.

---

## 1. Tipografia

### Famílias (`next/font` → CSS vars)

| Token | Fonte | Uso |
|-------|--------|-----|
| `--font-display` / `font-display` | **Lexend** (`--font-lexend`) | Títulos, logo, headings |
| `--font-body` / `font-sans` | **Inter** (`--font-inter`) | Corpo, UI, formulários |
| `--font-cursive` / `font-cursive` | **Caveat** (`--font-caveat`) | Elementos decorativos / infantil |
| `font-mono` | JetBrains Mono | Código / IDs técnicos |

**Pesos Lexend em uso:** 400, 500, 600, 700, 800  
**Pesos Caveat:** 400, 700

### Escala de tipo

| Token | Rem | px | Uso |
|-------|-----|-----|-----|
| `--text-display` | 3rem | 48 | Hero, logo grande |
| `--text-h1` | 2rem | 32 | Título de página |
| `--text-h2` | 1.5rem | 24 | Seção |
| `--text-h3` | 1.125rem | 18 | Card / subtítulo |
| `--text-body` | 1rem | 16 | Parágrafo |
| `--text-small` | 0.875rem | 14 | Caption / UI densa |
| `--text-caption` | 0.75rem | 12 | Metadata |

**Tailwind aliases:** `text-display`, `text-h1`, `text-h2`, `text-h3` (line-height 1.1–1.4).

### Escala educacional (legado / domínio)

| Classe Tailwind | Tamanho | Uso |
|-----------------|---------|-----|
| `text-attendance-status` | 0.875rem | Botões de frequência |
| `text-student-name` | 1rem | Nome do aluno |
| `text-student-id` | 0.75rem | Matrícula / ID |
| `text-grade-display` | 1.125rem | Nota / média |
| `text-official-doc` | 0.875rem | Documento oficial |
| `text-form-label` | 0.875rem | Label de form |
| `text-mobile-touch` | 1rem | Alvo touch mínimo |
| `text-2xs` | 0.625rem | UI compacta |

---

## 2. Cores — shadcn / semantic (HSL sem `hsl()`)

Usadas como `hsl(var(--token))` no Tailwind (`bg-primary`, `text-muted-foreground`, etc.).

### Light

| Token | HSL | Hex aprox. | Papel |
|-------|-----|------------|--------|
| `--background` | `0 0% 100%` | `#FFFFFF` | Fundo |
| `--foreground` | `222.2 84% 4.9%` | ~`#020817` | Texto |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card |
| `--card-foreground` | `222.2 84% 4.9%` | | |
| `--popover` | `0 0% 100%` | | |
| `--popover-foreground` | `222.2 84% 4.9%` | | |
| **`--primary`** | **`220 90% 56%`** | ~`#3B82F6` | Ação principal |
| `--primary-foreground` | `210 40% 98%` | | Texto em primary |
| **`--secondary`** | **`142 69% 58%`** | ~`#4ADE80` | Sucesso / 2º destaque |
| `--secondary-foreground` | `222.2 84% 4.9%` | | |
| `--muted` | `210 40% 96%` | | Superfície suave |
| `--muted-foreground` | `215.4 16.3% 46.9%` | | Texto secundário |
| **`--accent`** | **`38 92% 50%`** | ~`#F59E0B` | Destaque / atenção |
| `--accent-foreground` | `222.2 84% 4.9%` | | |
| `--destructive` | `0 84.2% 60.2%` | ~`#EF4444` | Erro / perigo |
| `--destructive-foreground` | `210 40% 98%` | | |
| `--border` | `214.3 31.8% 91.4%` | | Bordas |
| `--input` | `214.3 31.8% 91.4%` | | Inputs |
| `--ring` | `220 90% 56%` | = primary | Focus ring |
| `--radius` | `0.5rem` | 8px | Raio base |

### Charts (light)

| Token | HSL |
|-------|-----|
| `--chart-1` | `220 90% 56%` |
| `--chart-2` | `142 69% 58%` |
| `--chart-3` | `38 92% 50%` |
| `--chart-4` | `268 83% 57%` |
| `--chart-5` | `340 82% 52%` |

### Dark (classe `.dark`)

Primary permanece `220 90% 56%`. Secondary/accent/muted viram tons de superfície escura (`217.2 32.6% 17.5%` etc.) — ver `globals.css` bloco `.dark`.

---

## 3. Cores — marca EDUCA (Tailwind `educa.*`)

Tagline no código: *“A educação não é quadrada”*.

### Azul (`educa-blue`)

| Step | Hex | Nota |
|------|-----|------|
| 50 | `#EEF2FF` | |
| 100 | `#E0E7FF` | |
| 200 | `#C7D2FE` | |
| 300 | `#A5B4FC` | |
| 400 | `#818CF8` | |
| **500** | **`#4361EE`** | Ação (escala Tailwind educa) |
| 600 | `#3730A3` | |
| 700 | `#312E81` | |
| 800 | `#1E1B4B` | |
| 900 | `#0F0D29` | |

### Verde (`educa-green`)

| Step | Hex | Nota |
|------|-----|------|
| 50 | `#ECFDF5` | |
| 100 | `#D1FAE5` | |
| 200 | `#A7F3D0` | |
| 300 | `#6EE7B7` | |
| 400 | `#34D399` | Logo dark-bg start |
| **500** | **`#10B981`** | Success |
| **600** | **`#059669`** | **Logo gradient start** |
| 700 | `#047857` | |
| 800 | `#065F46` | |
| 900 | `#064E3B` | |

### Ouro (`educa-gold`)

| Step | Hex | Nota |
|------|-----|------|
| 50 | `#FFFBEB` | |
| 100 | `#FEF3C7` | |
| 200 | `#FDE68A` | |
| **300** | **`#FCD34D`** | **Underline do logo** |
| 400 | `#FBBF24` | |
| **500** | **`#F59E0B`** | Highlight / warning |
| 600–900 | … | |

### Coral (`educa-coral`)

| Step | Hex | Nota |
|------|-----|------|
| **500** | **`#EF6351`** | Alert |
| **600** | **`#DC2626`** | Danger |
| (50–900) | ver `tailwind.config.js` | |

### Aliases semânticos Tailwind

| Token | Hex principal |
|-------|----------------|
| `success-500/600` | `#10B981` / `#059669` |
| `warning-500/600` | `#F59E0B` / `#D97706` |
| `danger-500/600` | `#EF6351` / `#DC2626` |
| `primary-500` (legacy scale) | `#4361EE` |

---

## 4. Logo (Brand Guidelines v1.0)

**Implementação:** `app/components/identity/educa-logo-v2.tsx`  
**Marketing (cópia):** `educa-site/components/identity/educa-logo.tsx`

| Elemento | Valor |
|----------|--------|
| Wordmark | “EDUCA” · Lexend Bold |
| Gradiente default | `#059669` → `#0ea5e9` (verde → sky) |
| Gradiente dark-bg | `#34d399` → `#38bdf8` |
| Underline | path curvo · stroke `#fcd34d` · round caps |
| Monos | green `#059669` · dark `#1e293b` · white `#ffffff` |

### Tamanhos

| Size | Height (px) | Underline width |
|------|-------------|-----------------|
| xs | 24 | 2.5 |
| sm | 32 | 3 |
| md | 40 | 3.5 |
| lg | 56 | 4 |
| xl | 80 | 5 |

### Assets raster

| Arquivo | Uso |
|---------|-----|
| `app/public/logo_pref.png` | Brasão municipal (co-brand; placeholder 200×200) — **não** é o logo EDUCA |

---

## 5. Cores — municipal (implantação / brasão)

HSL space-separated (como shadcn).

| Token | HSL | Hex | Origem |
|-------|-----|-----|--------|
| `--municipal-red` | `220 76% 50%` | `#DC2626` | Brasão |
| `--municipal-green` | `166 77% 40%` | `#059669` | Brasão |
| `--municipal-blue` | `221 83% 53%` | `#1D4ED8` | Brasão |
| `--municipal-yellow` | `45 93% 58%` | `#FBBF24` | Brasão |
| `--municipal-primary` | `200 100% 34%` | ~`#0073AC` | Site oficial município |
| `--municipal-secondary` | `221 77% 20%` | `#1E3A8A` | Azul institucional |
| `--municipal-gray-50` | `216 50% 98%` | `#F8FAFC` | |
| `--municipal-gray-100` | `216 33% 97%` | `#F1F5F9` | |
| `--municipal-gray-500` | `215 20% 58%` | `#64748B` | |
| `--municipal-gray-900` | `222 67% 5%` | `#0F172A` | |

---

## 6. Módulos (UI do app)

| Módulo | Cor | Fundo claro |
|--------|-----|-------------|
| alunos | `#7C3AED` | `#F5F3FF` |
| turmas | `#0EA5E9` | `#F0F9FF` |
| frequencia | `#10B981` | `#ECFDF5` |
| notas | `#F97316` | `#FFF7ED` |
| relatorios | `#EC4899` | `#FDF2F8` |
| escolas | `#6366F1` | `#EEF2FF` |
| matriculas | `#14B8A6` | `#F0FDFA` |
| config | `#6B7280` | `#F9FAFB` |

**Tailwind:** `module.alunos`, `module-bg.alunos`, etc.

---

## 7. BNCC — campos de experiência

| Campo | Cor | BG | Light |
|-------|-----|-----|--------|
| O eu, o outro e o nós | `--campo-eu` `#ec4899` | `#fdf2f8` | `#fce7f3` |
| Corpo, gestos e movimentos | `--campo-corpo` `#f97316` | `#fff7ed` | `#ffedd5` |
| Traços, sons, cores e formas | `--campo-tracos` `#8b5cf6` | `#f5f3ff` | `#ede9fe` |
| Escuta, fala, pensamento… | `--campo-escuta` `#0ea5e9` | `#f0f9ff` | `#e0f2fe` |
| Espaços, tempos, quantidades… | `--campo-espacos` `#10b981` | `#ecfdf5` | `#d1fae5` |

---

## 8. Frequência (attendance)

WCAG AA no código:

| Status | Hex |
|--------|-----|
| present | `#22C55E` |
| absent | `#EF4444` |
| late | `#F59E0B` |
| justified | `#3B82F6` |

**Fases de aula (utilitários):** planning blue · chamada green · finalizada orange · bloqueada red.

---

## 9. Layout & espaçamento

| Token | Valor |
|-------|--------|
| `--sidebar-width` | 260px · `w-sidebar` / spacing `sidebar` |
| `--header-height` | 70px · spacing `header` |
| `--content-max-width` | 1400px |
| `--space-1` … `--space-12` | 4px → 48px (0.25rem … 3rem) |
| form-section | 2rem |
| field-group | 1.5rem |
| form-field | 1rem |
| Touch target | min 44×44px (WCAG) · `.touch-target-large` |
| Breakpoint tablet | `768px` (`tablet:`) |

---

## 10. Login / shell “hero” (referência visual do app)

Painel esquerdo da login (não token CSS nomeado; classes Tailwind):

- Gradiente: `from-green-600 to-blue-500` (~`#059669` → sky/blue)
- Texto: white / `white/85` / `white/90`
- Ícones em chips `bg-white/20` `rounded-lg`

Alinha com o gradiente do logo e com a **variante A** do marketing (`bg-educa-hero`: `#059669` → `#0ea5e9`).

---

## 11. Como consumir

```tsx
// Semantic shadcn
<button className="bg-primary text-primary-foreground rounded-md" />

// Escala marca
<span className="text-educa-green-600 bg-educa-blue-50" />

// Display type
<h1 className="font-display text-h1" />

// Logo
import { EducaLogo } from '@/components/identity'
<EducaLogo size="md" />
```

**Marketing (`educa-site`):** copiar/alinhar a este doc; não inventar paleta.  
**TODO(educa-t12):** manter parity após fold da home.

---

## 12. Fontes no repositório

| Artefato | Path |
|----------|------|
| CSS tokens | `app/app/globals.css` |
| Tailwind extend | `app/tailwind.config.js` |
| Fonts load | `app/app/layout.tsx` |
| Logo | `app/components/identity/educa-logo-v2.tsx` |
| Brasão | `app/public/logo_pref.png` |
| Fronteiras repo | `docs/ADR-002-repo-boundaries.md` |

---

*Gerado a partir do código em 2026-07-09. Regenerar/atualizar quando o DS mudar.*
