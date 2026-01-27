# Phase 20: Mock Data Cleanup, First Access Wizard & E2E Tests - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove mock data from production code, implement guided first-access wizard for all user profiles (professores, gestores), and create E2E tests for critical flows (atribuições, turmas, login). Focus on UX for users who have never used a school management system before.

</domain>

<decisions>
## Implementation Decisions

### First Access Wizard UX
- **Tutorial passo-a-passo detalhado** - Explica cada conceito ("Turma é onde seus alunos estão agrupados...")
- Mais longo mas educativo para usuários sem experiência
- Usar linguagem simples, evitar jargão técnico
- Indicador de progresso visual (step 1/5, etc.)

### Wizard Obrigatoriedade
- **Recomendado mas pulável** - Botão "Pular" visível
- Wizard reaparece até completar (mas pode ser dispensado)
- **Ícone de ajuda (?) persistente no header** após fechar wizard
- Ajuda fica disponível permanentemente para consulta posterior

### Ajuda Contextual
- **Dicas específicas por página** no ícone de ajuda (?)
- Em /turmas → dicas de turmas
- Em /chamada → dicas de frequência
- Em /alunos → dicas de alunos
- Implementar sistema de dicas contextuais baseado na rota atual

### Profile-Specific Onboarding
| Perfil | Primeiro Acesso | Situação Especial |
|--------|-----------------|-------------------|
| Admin | Visão geral do sistema, onde encontrar cada módulo | Nenhuma |
| Diretor | Verificar escola vinculada, visão das turmas | Se escola não vinculada → mensagem para admin |
| Secretario | Verificar escola vinculada, cadastros básicos | Se escola não vinculada → mensagem para admin |
| Professor | Verificar turmas atribuídas, como fazer chamada | Se sem turmas → "Fale com a direção da escola" |

### Professor Sem Turmas
- Mensagem clara: "Suas turmas ainda não foram atribuídas. Entre em contato com a direção da escola."
- Acesso ao sistema permitido (pode ver perfil, aguardar atribuição)
- Não bloquear acesso completo

### Mock Data Removal Strategy
- Identificar e remover todos os mock data de produção
- **Substituir por empty states com CTAs**
- Exemplo: "Nenhuma nota cadastrada. Adicione a primeira nota."
- Manter `seed-dev.ts` e `seed-superadmin.ts` (são para desenvolvimento)
- Manter Demo Mode (é feature, não mock)

### E2E Test Strategy
- **Seed database antes de cada teste** - Testes isolados, dados previsíveis
- Usar Playwright (já configurado no projeto)
- Fluxos prioritários:
  1. Login e autenticação (todos os perfis)
  2. Atribuições (diretor atribui professor a turma)
  3. Turmas (CRUD completo)
  4. Chamada/Frequência (fluxo completo de abrir aula → marcar → fechar)

### Claude's Discretion
- Design visual específico do wizard (seguir EDUCA design system)
- Texto exato das dicas de ajuda
- Estrutura técnica do sistema de ajuda contextual
- Ordem dos steps no wizard
- Animações/transições do wizard

</decisions>

<specifics>
## Specific Ideas

- Foco em **UX para pessoas que nunca usaram sistema de gestão**
- Linguagem deve ser acessível, não técnica
- Usar a flag `primeiro_login` já existente na tabela `users`
- Após completar wizard, marcar `primeiro_login = false`
- Ícone de ajuda (?) deve ser sempre visível no header
- Empty states devem ter CTAs claros guiando a ação seguinte

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-mock-data-wizard-e2e*
*Context gathered: 2026-01-27*
