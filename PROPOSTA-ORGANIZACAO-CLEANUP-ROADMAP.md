# 📋 Proposta: Organização, Cleanup e Roadmap MVP

**Data:** 2025-12-09
**Status do Projeto:** ~90% Produção-Ready (com ressalvas técnicas)
**Analisado por:** Claude AI Agent

---

## 📊 Resumo Executivo

Após análise detalhada do repositório EDUCA, identificamos três áreas principais para ação:
1. **716 erros de TypeScript** que comprometem a qualidade do código
2. **Código morto/não utilizado** espalhado em várias pastas
3. **Oportunidades de melhoria no frontend** para a experiência do professor

Este documento propõe um plano de ação organizado em três seções, conforme solicitado.

---

## 1. 🗑️ Organização e Cleanup de Código Morto/Não Utilizado

### 1.1 Arquivos e Pastas Candidatos à Remoção

#### Alta Prioridade (Código definitivamente não utilizado)

| Arquivo/Pasta | Motivo | Ação Recomendada |
|---------------|--------|------------------|
| `app/api/aulas/abrir/route.ts` | Marcado como `@deprecated` desde 2025-10-05 | Remover após verificar que nenhum código chama este endpoint |
| `app/showcase/page.tsx` | Página de testes de componentes - não pertence ao produto | Mover para `/tmp` ou pasta `__dev__` |
| `app/platform-names/page.tsx` | Página de preview de nomes - desenvolvimento apenas | Mover para pasta de desenvolvimento |
| `lib/services/planned/mockup-scan-service.ts` | Ferramenta de análise interna, não parte do produto | Manter apenas se usado em CI/CD |
| `lib/services/planned/` | Pasta inteira contém serviços "planejados" mas não integrados | Avaliar integração ou remoção |

#### Média Prioridade (Documentação duplicada ou obsoleta)

| Arquivo | Motivo | Ação Recomendada |
|---------|--------|------------------|
| `gestao_fronteira/HOURS-LOG.md` | Duplicado com `apontamento/*.md` | Consolidar em `apontamento/` |
| `gestao_fronteira/CHANGELOG.md` | Duplicado com `/CHANGELOG.md` raiz | Manter apenas um |
| `Modernização da Gestão Educacional Municipal.md` | Nome com acentos e espaços | Renomear para `docs/modernizacao-gestao-educacional.md` |
| `documentacao_acessivel_sme.md` | Arquivo na raiz sem organização | Mover para `docs/` |
| `docs/archive/` | Documentos históricos | Revisar se ainda relevantes |

#### Baixa Prioridade (Limpeza de código)

| Item | Motivo | Ação Recomendada |
|------|--------|------------------|
| Console.log/error restantes | 19 instâncias já convertidas para logger, verificar se há mais | Executar script de cleanup |
| TODOs não resolvidos | 5+ TODOs no código principal | Converter em issues do GitHub |
| Arquivos CSS duplicados | `globals.css` e `globals-touch-enhanced.css` | Consolidar se possível |

### 1.2 Erros de TypeScript (716 erros)

**Problema Crítico:** O código possui 716 erros de TypeScript, concentrados principalmente em:

| Arquivo | Erros | Causa Principal |
|---------|-------|-----------------|
| `app/api/sessions/[id]/attendance/route.ts` | 48 | Schema Supabase desatualizado |
| `app/api/sessions/[id]/route.ts` | 30 | Schema Supabase desatualizado |
| `lib/validation/index.ts` | 29 | Tipos de validação incorretos |
| `components/students/enhanced-student-registration-form.tsx` | 27 | Props não tipadas |
| `app/api/sessions/dashboard/route.ts` | 25 | Schema Supabase desatualizado |

**Causa Raiz:** O arquivo `lib/database.types.ts` está desatualizado em relação ao schema real do Supabase. Os erros como `'aula_sessions' is not assignable to parameter of type...` indicam que a tabela não existe ou tem nome diferente.

**Ação Recomendada:**
1. Regenerar tipos do Supabase usando Supabase MCP: `mcp__supabase__generate_typescript_types` ou via CLI: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts`
2. Corrigir inconsistências entre nome de tabelas (ex: `aula_sessions` vs `sessoes_aula`)
3. Atualizar todos os arquivos que referenciam schemas antigos

### 1.3 Scripts de Manutenção Não Utilizados

```
gestao_fronteira/scripts/
├── cleanup-console-logs.ts    # ✅ Útil - manter
├── remove-commented-console.sh # ⚠️ Revisar necessidade
├── remove-console-logs.sh      # ⚠️ Duplicado do .ts?
├── setup-municipal-domain.bat  # ⚠️ Windows-only, revisar
├── setup-municipal-domain.sh   # ⚠️ Revisar se usado
├── setup-vercel-env.sh         # ⚠️ Continha secrets expostos
├── validate-implementation.ts  # ✅ Útil - manter
└── seed-*.ts/sql               # ✅ Útil - manter
```

### 1.4 Estimativa de Tempo para Cleanup

| Tarefa | Horas | Prioridade |
|--------|-------|------------|
| Regenerar e sincronizar tipos Supabase | 4h | 🔴 CRÍTICO |
| Remover endpoints deprecated | 2h | 🟡 ALTA |
| Consolidar documentação duplicada | 2h | 🟡 MÉDIA |
| Limpar páginas de desenvolvimento | 1h | 🟢 BAIXA |
| Revisar e organizar scripts | 2h | 🟢 BAIXA |
| **TOTAL** | **11h** | - |

---

## 2. 🗺️ Roadmap MVP da Plataforma

### 2.1 Estado Atual vs. Necessidade

**Meta:** Pronto para ano letivo 2025 (Fevereiro 2025)

| Funcionalidade | Status Atual | Necessário para MVP |
|----------------|--------------|---------------------|
| Gestão de Usuários | ✅ 100% | ✅ OK |
| Cadastro de Alunos | ✅ 100% | ✅ OK |
| Administração de Escolas | ✅ 100% | ✅ OK |
| Wizard de Onboarding | ✅ 100% | ✅ OK |
| **Frequência Digital** | 🟡 85% | ⚠️ Falta travamento 18:00 |
| **Registro de Conteúdo** | 🟡 80% | ⚠️ Falta integração completa |
| **Lançamento de Notas** | 🔴 60% | ❌ Falta bimestral |
| **Relatórios** | 🟡 85% | ⚠️ Falta INEP export |

### 2.2 Roadmap Proposto (8 Semanas até Fevereiro 2025)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ROADMAP MVP - EDUCA 2025                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ SEMANA 1-2: Estabilização Técnica                                           │
│ ├── [ ] Corrigir 716 erros de TypeScript (regenerar types)                 │
│ ├── [ ] Remover código deprecated (endpoints /api/aulas/abrir)             │
│ ├── [ ] Consolidar documentação duplicada                                   │
│ └── [ ] Atualizar dependências com vulnerabilidades                        │
│                                                                             │
│ SEMANA 3-4: Core do Diário de Classe                                        │
│ ├── [ ] Workflow "Abrir Aula" completo (3 fases)                           │
│ ├── [ ] Travamento automático às 18:00                                     │
│ ├── [ ] Registro de conteúdo ministrado integrado                          │
│ └── [ ] Testes E2E para fluxo do professor                                 │
│                                                                             │
│ SEMANA 5-6: Sistema de Notas                                                │
│ ├── [ ] Lançamento de notas bimestral                                      │
│ ├── [ ] Cálculo de médias automático                                       │
│ ├── [ ] Observações por aluno                                              │
│ └── [ ] Integração com frequência (alertas <80%)                           │
│                                                                             │
│ SEMANA 7: Conformidade e Relatórios                                         │
│ ├── [ ] Exportação INEP/Educacenso                                         │
│ ├── [ ] Alertas Bolsa Família funcionais                                   │
│ ├── [ ] Validação NIS completa                                             │
│ └── [ ] Relatórios de frequência por período                               │
│                                                                             │
│ SEMANA 8: Piloto e Refinamento                                              │
│ ├── [ ] Deploy em 1 escola piloto                                          │
│ ├── [ ] Treinamento professores                                            │
│ ├── [ ] Coleta de feedback                                                 │
│ └── [ ] Ajustes finais de UX                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Critérios de Sucesso do MVP

1. **Professor consegue em < 5 minutos:**
   - Abrir a aula
   - Marcar frequência de 30 alunos
   - Registrar conteúdo ministrado
   - Finalizar sessão

2. **Sistema automaticamente:**
   - Trava frequência às 18:00
   - Alerta alunos < 80% presença
   - Calcula médias bimestrais
   - Gera relatórios Educacenso

3. **Secretaria consegue:**
   - Ver frequência em tempo real
   - Exportar dados para INEP
   - Identificar alunos em risco

### 2.4 Features Adiadas (Pós-MVP)

| Feature | Motivo do Adiamento | Timeline |
|---------|---------------------|----------|
| Gestão Multi-Responsável | Complexidade alta, não crítico | Março 2025 |
| Portal do Responsável | Valor agregado, não core | Abril 2025 |
| App Mobile Nativo | Alto investimento | Q3 2025 |
| Modo Offline Completo | Service Worker complexo | Q2 2025 |
| Predição com IA | Nice-to-have | Q4 2025 |

---

## 3. 🎨 Propostas de Melhoria do Frontend

### 3.1 Problemas Identificados

#### UX/UI
| Problema | Impacto | Onde |
|----------|---------|------|
| 716 erros TS afetam DX e podem causar bugs | 🔴 Alto | Todo o projeto |
| Páginas de desenvolvimento expostas | 🟡 Médio | `/showcase`, `/platform-names` |
| Touch targets < 48px em alguns botões | 🟡 Médio | Forms, tables |
| Feedback visual inconsistente | 🟡 Médio | Botões de ação |
| Loading states ausentes em algumas telas | 🟡 Médio | Páginas de listagem |

#### Performance
| Problema | Impacto | Onde |
|----------|---------|------|
| Skeletons já implementados ✅ | - | - |
| React Query com cache ✅ | - | - |
| Índices de BD para frequência ✅ | - | - |
| Bundle size não otimizado | 🟡 Médio | Build analysis necessária |

### 3.2 Melhorias Propostas

#### Alta Prioridade (Semana 1-2)

**1. Corrigir Erros de TypeScript**
```typescript
// Ação: Regenerar types do Supabase
// Comando: mcp__supabase__generate_typescript_types
// Resultado: Eliminar ~600 dos 716 erros
```

**2. Remover Rotas de Desenvolvimento**
```typescript
// Mover para middleware de proteção ou remover
// /showcase → mover para __dev__/showcase
// /platform-names → mover para __dev__/platform-names
```

**3. Padronizar Touch Targets**
```css
/* Em globals.css, adicionar: */
.touch-target {
  min-height: 48px;
  min-width: 48px;
  touch-action: manipulation;
}

/* Aplicar em todos os botões de ação */
```

#### Média Prioridade (Semana 3-4)

**4. Melhorar Feedback Visual para Professor**
```tsx
// Componente de confirmação de frequência
// Antes: botão muda de cor silenciosamente
// Depois: animação + som sutil + badge de confirmação

<Button 
  onClick={markPresent}
  className="transition-all duration-200 active:scale-95"
>
  <motion.span
    animate={{ scale: isMarked ? [1, 1.2, 1] : 1 }}
  >
    ✓ Presente
  </motion.span>
</Button>
```

**5. Loading States Consistentes**
```tsx
// Criar componente reutilizável
import { PageSkeleton } from '@/components/ui/loading-states'

// Usar em todas as páginas de listagem
export default function AlunosPage() {
  if (isLoading) return <PageSkeleton rows={10} />
  // ...
}
```

**6. Navegação Mobile Otimizada**
```tsx
// MobileNav já existe - garantir uso em todas as páginas
// Verificar bottom navigation em todas as rotas do professor
```

#### Baixa Prioridade (Semana 5-8)

**7. Temas Dark/Light**
```tsx
// next-themes já instalado
// Adicionar toggle no header
// Testar contraste WCAG em ambos os temas
```

**8. Acessibilidade (WCAG 2.1 AA)**
- Todos os inputs com labels associados ✅
- Navegação por teclado (Tab order) - revisar
- ARIA labels em botões de ícone - implementar
- Contrast ratio > 4.5:1 - verificar badges

**9. Internacionalização (i18n)**
- Projeto 100% em português ✅
- Adicionar estrutura para futuro suporte multi-idioma se necessário

### 3.3 Componentes a Criar/Melhorar

| Componente | Status | Ação |
|------------|--------|------|
| `AttendanceButton` | Existe, melhorar | Adicionar animação, sound feedback |
| `StudentCard` | Existe | Adicionar badges de status |
| `QuickStats` | Existe | Adicionar tooltips explicativos |
| `SessionTimer` | Não existe | Criar para mostrar tempo restante até 18:00 |
| `AlertaBolsaFamilia` | Existe | Melhorar visibilidade |
| `FormProgress` | Não existe | Criar para forms longos (cadastro aluno) |

### 3.4 Estimativa de Tempo para Melhorias Frontend

| Tarefa | Horas | Prioridade |
|--------|-------|------------|
| Corrigir erros TS (frontend) | 8h | 🔴 CRÍTICO |
| Padronizar touch targets | 4h | 🟡 ALTA |
| Melhorar feedback visual | 6h | 🟡 ALTA |
| Loading states consistentes | 4h | 🟡 MÉDIA |
| Componente SessionTimer | 3h | 🟡 MÉDIA |
| Revisão de acessibilidade | 4h | 🟢 BAIXA |
| **TOTAL** | **29h** | - |

---

## 4. 📊 Resumo de Estimativas

| Área | Horas | Semanas (40h/sem) |
|------|-------|-------------------|
| Cleanup de Código | 11h | 0.3 |
| Correção TypeScript | 8h | 0.2 |
| Melhorias Frontend | 29h | 0.7 |
| MVP Features (Diário) | 40h | 1.0 |
| Sistema de Notas | 32h | 0.8 |
| Conformidade/Relatórios | 24h | 0.6 |
| Piloto + Refinamento | 16h | 0.4 |
| **TOTAL** | **160h** | **4 semanas** |

**Nota:** Este resumo representa o trabalho de desenvolvimento puro. O roadmap de 8 semanas (Seção 2.2) inclui margens para testes, refinamentos, piloto e imprevistos. Com 1 desenvolvedor full-time focado exclusivamente no desenvolvimento, as 160h são alcançáveis em 4 semanas; com margem realista para piloto e ajustes, planeje 8 semanas totais.

---

## 5. 📋 Próximos Passos Imediatos

### Esta Semana
- [ ] Regenerar `lib/database.types.ts` do Supabase
- [ ] Executar `npm run typecheck` e categorizar erros restantes
- [ ] Mover `/showcase` e `/platform-names` para pasta `__dev__`
- [ ] Consolidar `gestao_fronteira/CHANGELOG.md` com `/CHANGELOG.md`

### Próxima Semana
- [ ] Começar correção sistemática de erros TypeScript
- [ ] Criar issue no GitHub para cada TODO encontrado
- [ ] Revisar e testar workflow "Abrir Aula" end-to-end
- [ ] Implementar travamento às 18:00

---

## 6. 🚨 Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| TypeScript errors causam bugs em prod | Alta | Alto | Priorizar correção antes de features |
| Schema Supabase desatualizado | Confirmado | Alto | Regenerar types imediatamente |
| Dependências com vulnerabilidades | Média | Médio | Rodar `npm audit fix` |
| Deadline Fevereiro apertado | Média | Alto | Focar apenas no MVP, adiar extras |

---

**Documento gerado em:** 2025-12-09
**Próxima revisão:** Após implementação da Semana 1
