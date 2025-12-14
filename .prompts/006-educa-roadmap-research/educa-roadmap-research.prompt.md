<objective>
Pesquisar e estruturar o roadmap EDUCA para informar o planejamento de implementação.

Propósito: Extrair, validar e priorizar todas as features do roadmap visual
Escopo: 6 fases, 32 features, compliance LGPD, integrações MEC
Output: educa-roadmap-research.md com findings estruturados
</objective>

<context>
Roadmap fonte: @educa-roadmap(1).html

Sistema: Gestão educacional para rede municipal de Fronteira, MG
Stack: Next.js 15 + Supabase
Codebase: @gestao_fronteira/

Perfis de usuário:
- Professor(a) - Chamada, diário, notas
- Diretor(a) - Visão da escola, aprovações
- Coordenador(a) - Acompanhamento pedagógico
- Gestor (Secretaria) - Todas as escolas
- Nutricionista - Cardápios, merenda
- Secretário(a) Escolar - Matrículas, documentos
</context>

<research_scope>
<include>
1. Extração de features
   - Todas as 32 features por fase
   - Status atual (done/progress/planned/critical)
   - Tags e categorias
   - Descrições detalhadas

2. Análise de dependências
   - Dependências entre features (o que bloqueia o quê)
   - Dependências técnicas (banco, API, auth)
   - Dependências de compliance (LGPD antes de dados sensíveis)

3. Gap analysis codebase
   - O que já existe em @gestao_fronteira/
   - O que está parcialmente implementado
   - O que falta completamente

4. Requisitos de compliance
   - LGPD: Art. 14 (dados de menores)
   - MEC/INEP: Educacenso
   - Bolsa Família: Acompanhamento de frequência

5. Integrações externas
   - WhatsApp (Evolution API)
   - Educacenso (formato INEP)
   - Bolsa Família (NIS)
</include>

<exclude>
- Estimativas de tempo (será feito no Plan)
- Decisões de arquitetura (será feito no Plan)
- Código de implementação (será feito no Do)
</exclude>
</research_scope>

<verification_checklist>
□ Todas as 32 features documentadas com ID único
□ 6 fases mapeadas com timeline do roadmap
□ 3 features críticas (LGPD) destacadas
□ Dependências entre features identificadas
□ Gap analysis: features vs codebase atual
□ Requisitos LGPD para dados de menores documentados
□ Formato Educacenso pesquisado (WebSearch se necessário)
</verification_checklist>

<output_structure>
Salvar em: `.prompts/006-educa-roadmap-research/educa-roadmap-research.md`

Usar formato XML:

```xml
<research>
  <summary>
    {Resumo executivo: status atual, prioridades, riscos}
  </summary>

  <features>
    <phase number="0" name="Fundação" status="done" period="Concluído">
      <feature id="F001" status="done">
        <title>Arquitetura do Sistema</title>
        <description>{descrição}</description>
        <tags>Core</tags>
        <codebase_status>Implementado em @gestao_fronteira/</codebase_status>
        <dependencies>Nenhuma</dependencies>
      </feature>
      <!-- mais features -->
    </phase>
    <!-- fases 1-5 -->
  </features>

  <dependency_graph>
    <dependency>
      <from>F015</from>
      <to>F012</to>
      <reason>LGPD requer consentimento antes de coletar dados sensíveis</reason>
    </dependency>
    <!-- mais dependências -->
  </dependency_graph>

  <compliance_requirements>
    <lgpd>
      <requirement>Art. 14 - Tratamento de dados de menores</requirement>
      <implication>{O que precisa ser implementado}</implication>
    </lgpd>
    <educacenso>
      <format>{Campos obrigatórios}</format>
      <deadline>{Prazo anual}</deadline>
    </educacenso>
    <bolsa_familia>
      <frequency_threshold>80%</frequency_threshold>
      <reporting>{Como reportar}</reporting>
    </bolsa_familia>
  </compliance_requirements>

  <gap_analysis>
    <implemented>
      {Features já no codebase}
    </implemented>
    <partial>
      {Features parcialmente implementadas}
    </partial>
    <missing>
      {Features que faltam}
    </missing>
  </gap_analysis>

  <recommendations>
    <recommendation priority="critical">
      <action>{Ação}</action>
      <rationale>{Por quê}</rationale>
    </recommendation>
  </recommendations>

  <metadata>
    <confidence level="high">
      Features extraídas diretamente do roadmap oficial
    </confidence>
    <sources_consulted>
      - educa-roadmap(1).html
      - Codebase @gestao_fronteira/
    </sources_consulted>
    <open_questions>
      {Dúvidas que precisam esclarecimento}
    </open_questions>
  </metadata>
</research>
```
</output_structure>

<summary_requirements>
Criar `.prompts/006-educa-roadmap-research/SUMMARY.md`:

```markdown
# EDUCA Roadmap Research Summary

**{One-liner substantivo: ex: "32 features em 6 fases, 3 críticas LGPD bloqueando Fase 2"}**

## Versão
v1

## Principais Descobertas
- {Descoberta 1}
- {Descoberta 2}
- {Descoberta 3}

## Decisões Necessárias
{Decisões que precisam de input do usuário}

## Bloqueios
{Impedimentos externos, ou "Nenhum"}

## Próximo Passo
Criar prompt 007-educa-implementation-plan

---
*Confiança: {Alta|Média|Baixa}*
*Iterações: 1*
*Output completo: educa-roadmap-research.md*
```
</summary_requirements>

<success_criteria>
- [ ] Todas 32 features extraídas e categorizadas
- [ ] Dependências entre features mapeadas
- [ ] Gap analysis codebase vs roadmap
- [ ] Requisitos LGPD documentados
- [ ] Features críticas destacadas
- [ ] SUMMARY.md criado
- [ ] Pronto para consumo pelo prompt 007 (Plan)
</success_criteria>
