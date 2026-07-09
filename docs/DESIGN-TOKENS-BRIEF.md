# EDUCA — Brand brief (para gerar assets)

Use este texto como **brief único** para favicon, app icons, OG image, skeletons, stickers, UI empty-states e brand kit.  
Produto: **gestão escolar municipal open source (Brasil)**. Tom: confiante, institucional sem ser frio, educação pública moderna.

---

## Essência

| | |
|--|--|
| **Nome** | EDUCA |
| **Tagline** | Gestão escolar municipal, open source. |
| **Posicionamento** | Software para secretarias de educação; conformidade BR (LGPD, frequência imutável, Bolsa Família); código aberto MIT. |
| **Mantra visual** | “A educação não é quadrada” — cantos suaves, gradiente vivo, underline lúdico no logo. |
| **ICP visual** | Secretária, diretor, professor em rede municipal — não edtech infantil cartoon. |

---

## Logo (regra de ouro)

- **Wordmark:** texto **EDUCA** em **Lexend Bold** (nunca serif, nunca outline fino).
- **Gradiente do texto:** horizontal `#059669` → `#0ea5e9` (verde esmeralda → sky blue).
- **Acento:** underline **curvo** (squiggle) amarelo `#fcd34d` sob o wordmark, caps arredondados.
- **Em fundo escuro/verde:** gradiente mais claro `#34d399` → `#38bdf8`.
- **Mono:** verde `#059669` · dark `#1e293b` · white `#ffffff`.
- **Ícone/app:** círculo com gradiente verde→azul + letra **E** branca Lexend Bold + opcional ponto amarelo `#fcd34d` (canto).
- **Não fazer:** mascote escola clichê, quadro-negro vintage, brasão heráldico como logo principal, hex soltos fora da paleta.

---

## Paleta (exportar como swatches)

### Core brand
| Nome | Hex | Uso |
|------|-----|-----|
| Green brand | `#059669` | Logo start, trust, success escuro |
| Sky brand | `#0ea5e9` | Logo end, digital, turmas |
| Gold underline | `#fcd34d` | Acento lúdico, highlight |
| Amber accent | `#F59E0B` | Warning / CTA secundário quente |
| Primary action | `#4361EE` / HSL `220 90% 56%` | Botões, links, focus (UI) |
| Coral alert | `#EF6351` | Erro / alerta |

### Neutros
| Nome | Hex |
|------|-----|
| White | `#FFFFFF` |
| Muted bg | `#F1F5F9` / `#F8FAFC` |
| Text | ~`#020817` / slate-950 |
| Muted text | `#64748B` |
| Border | ~`#E2E8F0` |

### Escala rápida (preencher UI)
- **Green:** `#ECFDF5` … `#10B981` … `#059669` … `#064E3B`
- **Blue:** `#EEF2FF` … `#4361EE` … `#1E1B4B`
- **Gold:** `#FFFBEB` … `#FCD34D` … `#F59E0B` … `#78350F`

### Semânticos attendance (ícones de status)
| Presente | Falta | Atraso | Justificada |
|----------|-------|--------|-------------|
| `#22C55E` | `#EF4444` | `#F59E0B` | `#3B82F6` |

### Módulos (cores de área — opcional em ícones)
| Alunos | Turmas | Frequência | Notas | Relatórios | Escolas |
|--------|--------|------------|-------|------------|---------|
| `#7C3AED` | `#0EA5E9` | `#10B981` | `#F97316` | `#EC4899` | `#6366F1` |

---

## Tipografia

| Papel | Fonte | Peso |
|-------|--------|------|
| Display / logo / H1 | **Lexend** | 600–800 |
| Body / UI | **Inter** | 400–600 |
| Decor (raro) | Caveat | 400–700 |

Escala: display 48 · h1 32 · h2 24 · h3 18 · body 16 · small 14 · caption 12.  
Radius UI: **8px** (`0.5rem`). Touch targets **≥ 44px**.

---

## Assets a gerar (pedido padrão)

1. **Favicon** 16 / 32 / 48 — ícone “E” em círculo gradiente + dot gold opcional; legível em 16px.  
2. **App icon** 512 / 1024 — mesmo ícone, safe zone 10%, fundo gradiente ou sólido white.  
3. **OG / social** 1200×630 — wordmark + tagline + fundo limpo (gradiente sutil ou painel split verde/azul); sem stock photo genérica.  
4. **Logo pack** — wordmark light/dark/mono; com e sem underline; horizontal + stacked.  
5. **Icon set (line, 24px)** — chamada/presença, aluno, turma, boletim, escola, escudo LGPD, WhatsApp (roadmap), open-source/git. Traço 1.5–2px, corners rounded, cor `currentColor` + exemplos primary/green.  
6. **Skeleton / empty states** — cards dashboard (sidebar 260px, header 70px), lista de alunos, grid de chamada; cinzas muted + shimmer accent green/sky suave.  
7. **Hero pattern** (opcional) — formas orgânicas / círculos translúcidos como no login (`bg white/10` em gradiente green→blue).  
8. **Brand board** — 1 slide: logo + 6 cores + 2 samples de botão + tipografia Lexend/Inter.

---

## Referências de composição

- **Login app:** split 50/50 — esquerda gradiente green→blue com features em branco; direita form limpo white, inputs arredondados 12px, CTA verde.  
- **Marketing (vencedor):** dual panel app-native + prova (demo); CTA primário único; sem “feature soup”.  
- **Estilo:** flat moderno, pouco shadow, muito whitespace, acessível (contraste AA).

---

## Prompt-seed (copiar/colar)

```
Brand system for EDUCA: Brazilian municipal school management SaaS, open source.
Logo: wordmark "EDUCA" Lexend Bold, horizontal gradient #059669 to #0ea5e9, curved yellow underline #fcd34d.
Icon: circular badge, same gradient, white bold letter E, optional small gold #fcd34d dot.
Palette: emerald #059669, sky #0ea5e9, gold #fcd34d, action blue #4361EE, coral #EF6351, neutrals slate/white.
Fonts: Lexend (display), Inter (UI). Radius 8px. Soft modern public-sector product UI, not cartoon, not corporate navy-only.
Generate: favicon, app icon 1024, OG 1200x630, logo pack light/dark, 8 line icons (attendance, student, class, report, school, shield, chat, code), dashboard skeleton frames.
```

---

## O que evitar

- Paleta “startup roxo genérico” fora da escala.  
- Mascote criança / lápis 3D stock.  
- Logo com serifa ou all-caps Inter.  
- Substituir o underline curvo por barra reta.  
- Métricas fake (“10.000 escolas”) em mock de marketing.

---

*Fonte completa: `docs/DESIGN-TOKENS.md` · código: `app/app/globals.css`, `app/components/identity/`*
