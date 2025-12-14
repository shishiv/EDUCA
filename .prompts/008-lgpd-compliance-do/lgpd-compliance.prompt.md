<objective>
Implementar compliance LGPD mínimo viável para o sistema EDUCA.

Propósito: Legalizar coleta de dados de menores antes do ano letivo 2026
Deadline: 28/dezembro/2025
Output: Política de Privacidade + Termo de Consentimento funcionais
</objective>

<context>
Research: @.prompts/006-educa-roadmap-research/educa-roadmap-research.md
Plan: @.prompts/007-educa-implementation-plan/educa-implementation-plan.md
Codebase: @gestao_fronteira/

Estado atual:
- Campo lgpd_consentimento EXISTS em tabela responsaveis
- Campo lgpd_data_consentimento EXISTS em tabela responsaveis
- NÃO existe: página de política, UI de aceite, fluxo de consentimento

Referência legal:
- LGPD Art. 14: Tratamento de dados de crianças/adolescentes
- Requer consentimento específico de pelo menos um responsável
</context>

<requirements>
Feature F011 - Política de Privacidade:
- Página pública /politica-privacidade (sem auth)
- Texto em português claro e acessível
- Seções: dados coletados, finalidade, compartilhamento, direitos, contato DPO
- Referência à LGPD e tratamento de dados de menores

Feature F013 - Termo de Consentimento:
- Checkbox obrigatório no formulário de responsável
- Link para política de privacidade no checkbox
- Registro automático de data/hora do aceite
- Bloquear cadastro sem aceite
- (Opcional) Fluxo de revogação

Requisitos técnicos:
- Next.js App Router
- Componentes shadcn/ui
- Supabase para persistência
- Português brasileiro
</requirements>

<implementation>
Arquivos a criar/modificar:

1. Página de Política (nova):
   - `app/politica-privacidade/page.tsx`
   - Layout simples, sem sidebar, público

2. Componente de Consentimento (novo):
   - `components/lgpd/consent-checkbox.tsx`
   - Checkbox + label com link para política
   - Validação required

3. Formulário de Responsável (modificar):
   - `components/guardians/guardian-form.tsx` ou similar
   - Adicionar ConsentCheckbox antes do submit
   - Enviar lgpd_consentimento=true e lgpd_data_consentimento=now()

4. API de Responsável (verificar):
   - Garantir que campos LGPD são salvos na criação
   - Bloquear criação se lgpd_consentimento=false

Padrões a seguir:
- Usar shadcn/ui Checkbox component
- Seguir padrão de formulários existentes (react-hook-form + zod)
- Mensagens de erro em português

Evitar:
- Modificar schema do banco (campos já existem)
- Criar rotas de API desnecessárias
- Texto jurídico complexo demais
</implementation>

<output>
Arquivos a criar:
- `app/politica-privacidade/page.tsx` - Página pública
- `components/lgpd/consent-checkbox.tsx` - Componente reutilizável

Arquivos a modificar:
- Formulário de cadastro de responsável (adicionar checkbox)
- (Se necessário) API route de responsável

Texto da política (template):
```markdown
# Política de Privacidade - EDUCA

## 1. Introdução
O sistema EDUCA, operado pela Secretaria Municipal de Educação de Fronteira/MG,
coleta e processa dados pessoais de alunos, responsáveis e profissionais da educação.

## 2. Dados Coletados
- Dados de identificação (nome, CPF, RG, data de nascimento)
- Dados de contato (endereço, telefone, email)
- Dados educacionais (matrícula, frequência, notas)
- Dados de benefícios (NIS para Bolsa Família)

## 3. Finalidade
Os dados são utilizados exclusivamente para:
- Gestão educacional e administrativa
- Acompanhamento de frequência e desempenho
- Cumprimento de obrigações legais (Educacenso, Bolsa Família)

## 4. Compartilhamento
Dados podem ser compartilhados com:
- Ministério da Educação (Educacenso)
- Ministério do Desenvolvimento Social (Bolsa Família)
- Órgãos de controle quando legalmente exigido

## 5. Direitos do Titular
Você tem direito a:
- Acessar seus dados
- Corrigir dados incorretos
- Solicitar exclusão (quando aplicável)
- Revogar consentimento

## 6. Dados de Menores (Art. 14 LGPD)
O tratamento de dados de crianças e adolescentes é realizado com
consentimento específico do responsável legal, conforme Art. 14 da LGPD.

## 7. Contato
Encarregado de Dados (DPO): [Nome/Email da Secretaria]
Secretaria Municipal de Educação de Fronteira/MG
```
</output>

<verification>
Antes de declarar completo:

1. Página de Política
   - [ ] Acessível em /politica-privacidade sem login
   - [ ] Texto completo e legível
   - [ ] Responsivo (mobile)

2. Formulário de Responsável
   - [ ] Checkbox de consentimento visível
   - [ ] Link para política funciona
   - [ ] Não é possível submeter sem aceitar
   - [ ] Campos lgpd_consentimento e lgpd_data_consentimento salvos

3. Qualidade
   - [ ] pnpm typecheck passa
   - [ ] pnpm build passa
   - [ ] Sem erros no console

4. Teste manual
   - [ ] Criar novo responsável com aceite
   - [ ] Verificar no Supabase que campos foram salvos
   - [ ] Tentar criar sem aceite (deve bloquear)
</verification>

<summary_requirements>
Criar `.prompts/008-lgpd-compliance-do/SUMMARY.md` após implementação:

```markdown
# LGPD Compliance Implementation Summary

**{One-liner: ex: "Política + Consentimento implementados em 3 arquivos"}**

## Versão
v1

## Arquivos Criados/Modificados
- `path/to/file.ts` - Descrição

## Testes Realizados
- [ ] Política acessível publicamente
- [ ] Cadastro bloqueia sem aceite
- [ ] Campos salvos no banco

## Decisões Tomadas
{Decisões durante implementação}

## Bloqueios
{Ou "Nenhum"}

## Próximo Passo
Executar 009-calendario-escolar-do

---
*Confiança: Alta*
*Iterações: 1*
```
</summary_requirements>

<success_criteria>
- [ ] Página /politica-privacidade funcional e pública
- [ ] Checkbox de consentimento no formulário de responsável
- [ ] Campos LGPD salvos corretamente
- [ ] Cadastro bloqueado sem aceite
- [ ] Build passa
- [ ] SUMMARY.md criado
</success_criteria>
