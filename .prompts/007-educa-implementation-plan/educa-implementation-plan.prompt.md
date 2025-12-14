<objective>
Criar plano de implementação faseado para o sistema EDUCA.

Propósito: Transformar research em fases executáveis
Input: Research findings de 006
Output: educa-implementation-plan.md com sprints/iterações
</objective>

<context>
Research: @.prompts/006-educa-roadmap-research/educa-roadmap-research.md

Sistema: Gestão educacional municipal
Stack: Next.js 15 + Supabase + shadcn/ui
Constraint: Sistema já em uso parcial (Fase 0 + parte da Fase 1)
</context>

<planning_requirements>
1. Respeitar dependências identificadas no research
2. Priorizar features críticas (LGPD) conforme necessário
3. Cada fase deve ser executável por um único prompt Do
4. Considerar ordem de deployment (não quebrar produção)
5. Incluir verificação em cada fase

Constraints:
- Não alterar features já em produção (Fase 0)
- Manter compatibilidade com dados existentes
- Compliance LGPD antes de coletar novos dados sensíveis
</planning_requirements>

<output_structure>
Salvar em: `.prompts/007-educa-implementation-plan/educa-implementation-plan.md`

```xml
<plan>
  <summary>
    {Overview do approach: quantas sprints, ordem de prioridades}
  </summary>

  <phases>
    <phase number="1" name="complete-core-academic">
      <objective>Completar features em andamento da Fase 1</objective>
      <features>
        <feature id="F005">Calendário Escolar</feature>
        <feature id="F006">Grade Curricular</feature>
      </features>
      <tasks>
        <task priority="high">Implementar CRUD de calendário</task>
        <task priority="high">Integrar calendário com frequência</task>
        <task priority="medium">Criar UI de grade curricular</task>
      </tasks>
      <deliverables>
        <deliverable>Calendário funcional integrado</deliverable>
        <deliverable>Grade curricular por turma</deliverable>
      </deliverables>
      <dependencies>Nenhuma (features independentes)</dependencies>
      <verification>
        - [ ] CRUD calendário funcionando
        - [ ] Frequência calcula dias letivos corretamente
        - [ ] Grade curricular salva e exibe
      </verification>
      <do_prompt>008-phase1-complete-do</do_prompt>
    </phase>

    <phase number="2" name="lgpd-compliance">
      <objective>Implementar requisitos LGPD críticos</objective>
      <features>
        <feature id="F011" critical="true">Política de Privacidade</feature>
        <feature id="F012" critical="true">Backup Automático</feature>
        <feature id="F013" critical="true">Termo de Consentimento</feature>
      </features>
      <!-- ... -->
      <do_prompt>009-lgpd-compliance-do</do_prompt>
    </phase>

    <!-- mais fases conforme necessário -->
  </phases>

  <do_prompts_to_create>
    <prompt number="008" name="phase1-complete-do">
      <description>Completar Fase 1 - Core Acadêmico</description>
      <features>F005, F006</features>
    </prompt>
    <prompt number="009" name="lgpd-compliance-do">
      <description>Implementar compliance LGPD</description>
      <features>F011, F012, F013, F014</features>
    </prompt>
    <!-- lista de prompts Do necessários -->
  </do_prompts_to_create>

  <risks>
    <risk severity="high">
      <description>{Risco}</description>
      <mitigation>{Como mitigar}</mitigation>
    </risk>
  </risks>

  <metadata>
    <confidence level="high">
      Baseado em research estruturado
    </confidence>
    <assumptions>
      - Equipe disponível para revisão
      - Acesso a Supabase para migrations
    </assumptions>
    <open_questions>
      - Prioridade entre WhatsApp e Educacenso?
    </open_questions>
  </metadata>
</plan>
```
</output_structure>

<summary_requirements>
Criar `.prompts/007-educa-implementation-plan/SUMMARY.md`:

```markdown
# EDUCA Implementation Plan Summary

**{One-liner: ex: "5 sprints, LGPD na sprint 2, dashboards por último"}**

## Versão
v1

## Fases Planejadas
1. {Fase 1 - objetivo}
2. {Fase 2 - objetivo}
3. ...

## Prompts Do a Criar
- 008-{nome}: {descrição}
- 009-{nome}: {descrição}
- ...

## Decisões Necessárias
{Decisões pendentes}

## Bloqueios
{Ou "Nenhum"}

## Próximo Passo
Criar e executar prompt 008-{primeiro-do}

---
*Confiança: {Alta|Média|Baixa}*
*Iterações: 1*
*Output completo: educa-implementation-plan.md*
```
</summary_requirements>

<success_criteria>
- [ ] Todas as features do roadmap cobertas
- [ ] Ordem respeita dependências
- [ ] Features LGPD priorizadas adequadamente
- [ ] Cada fase é executável por um prompt
- [ ] Lista de prompts Do gerada
- [ ] SUMMARY.md criado
- [ ] Pronto para criar prompts Do
</success_criteria>
