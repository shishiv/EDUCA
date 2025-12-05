# EDUCA - Roadmap do Produto

## Meta Principal

**Pronto para o ano letivo 2025 (Fevereiro 2025)**

O professor deve conseguir:
1. Abrir a aula
2. Marcar frequência
3. Registrar conteúdo ministrado
4. Lançar notas

---

## Estado Atual (~90% Pronto)

### Completo
- [x] Gestão de Usuários (100%) - 5 papéis com RBAC e RLS
- [x] Cadastro de Alunos (100%) - INEP-compliant, validação CPF/telefone
- [x] Administração de Escolas (100%) - Multi-escola com isolamento de dados
- [x] Wizard de Onboarding (100%) - Inicialização de escola em 6 passos
- [x] Todos os bugs críticos resolvidos

### Parcialmente Completo
- [x] Frequência Digital (85%) - Workflow "Abrir aula" funcional
- [x] Relatórios & Analytics (85%) - Dashboard e exports básicos

---

## Fase 1: MVP para Fevereiro 2025

**Foco:** O que o professor precisa no dia 1 de aula

### Crítico (Bloqueante)
1. [ ] **Workflow "Abrir Aula" Completo** - Três fases (Preparar → Registrar → Finalizar) com transições de estado e validação `L`

2. [ ] **Registro de Conteúdo da Aula** - Professor registra o que ensinou em cada aula `M`

3. [ ] **Lançamento de Notas Bimestral** - Sistema de notas por bimestre com observações `M`

4. [ ] **Travamento de Frequência às 18:00** - Bloqueio automático diário para conformidade legal `S`

### Importante (Para lançamento)
5. [ ] **Alertas Bolsa Família** - Monitoramento do limiar de 80% com notificações `M`

6. [ ] **Exportação INEP/Educacenso** - Formato compatível com Educacenso 2025 `M`

7. [ ] **Validação Brasileira Completa** - NIS (Módulo 11), códigos INEP, CEP `XS`

---

## Fase 2: Estabilização (Março-Abril 2025)

**Foco:** Conformidade completa e estabilidade

8. [ ] **Sistema de Auditoria LGPD** - Trilha de auditoria, direitos do titular `S`

9. [ ] **Políticas RLS Reforçadas** - Isolamento municipal, proteção de auditoria `S`

10. [ ] **Gestão Multi-Responsável** - Múltiplos responsáveis por aluno `L`

11. [ ] **Otimização de Performance** - Dashboard < 3s, frequência < 1s/aluno `M`

---

## Fase 3: Expansão (Maio+ 2025)

**Foco:** Funcionalidades avançadas

12. [ ] **Frequência Offline-First** - Service worker + IndexedDB, sync automático `L`

13. [ ] **Portal do Responsável** - Interface para pais verem frequência e notas `L`

14. [ ] **Dashboard Avançado** - Análise de tendências, métricas comparativas `M`

---

## Fase 4: Futuro

15. [ ] **App Mobile** - React Native para iOS/Android com push notifications `XL`

16. [ ] **Predição de Frequência com IA** - ML para identificar alunos em risco `XL`

---

## Legenda de Tamanho

- `XS` = 2-4 horas
- `S` = 4-8 horas
- `M` = 1-2 dias
- `L` = 3-5 dias
- `XL` = 1-2 semanas

---

## Notas

- Fase 1 é **bloqueante** para o lançamento em Fevereiro
- Ordem reflete dependências técnicas
- Cada item deve ter cobertura de testes (unit + E2E)
- Professor é o usuário principal - priorizar sua experiência
