# 📒 EduFronteira — Changelog

## 2025-06-03

- Criação da pasta `tasks/` na raiz do projeto.
- Adicionado `tasks.md` com roadmap técnico inicial.
- Adicionado `changelog.md` para registro contínuo de alterações.
- Iniciada refatoração e modularização completa do módulo `/students`:
  - Auditoria de componentes, hooks e tipagem.
  - Planejamento de melhorias de UX, acessibilidade e integração Supabase.

## 2025-06-03 (tarde)

- Implementada paginação e ordenação avançada na listagem de estudantes.
- Adicionados filtros por responsável (nome/telefone) e por data de matrícula (intervalo).
- Atualizados tipos em `/lib/types.ts` para suportar novos filtros.
- UI e hook `useStudents` adaptados para filtros avançados.

## 2025-06-03 (fim de tarde)

- Refatoração completa do módulo `/attendance`:
  - Criado hook `useAttendance` com integração Supabase, tipagem forte e tratamento de erros de join.
  - Criado componente `AttendanceTable` com filtros, exibição e edição de presença por turma/data.
  - Página `/attendance` integrada ao backend, removendo mocks e utilizando componentes reais.

- Refatoração completa do módulo `/diary`:
  - Tipos `DiaryEntry` e `DiaryInsert` definidos em `/lib/types.ts`.
  - Criado hook `useDiary` com integração Supabase e tipagem forte.
  - Criado componente `DiaryCalendar` com visualização semanal e filtros.
  - Página `/diary` integrada ao backend, removendo mocks e utilizando componentes reais.

## 2025-06-03 (noite)

- Correção de todos os avisos de `any` e problemas de tipagem no módulo `/students`:
  - Tipagem explícita em `handleFormSubmit` e filtros de ordenação.
  - Removido uso de `as any` em filtros e selects.
  - Garantia de tipagem forte em todos os componentes e hooks.
- Refatoração dos componentes de paginação:
  - Removidas props inválidas (`asChild`) de `PaginationPrevious` e `PaginationNext`.
  - Lógica de elipses reescrita para evitar warnings de truthiness.
- Students, StudentFilters e useDiary agora livres de warnings/lint e com tipagem robusta.

## 2025-06-03 (noite - autenticação)

- Revisão completa da autenticação Supabase:
  - Refatorado hook `useAuth` para buscar perfil real, exportar dados do usuário e remover mocks.
  - Login 100% funcional na página `/login`, sem simulação.
  - Logout real e exibição do perfil logado (nome, papel, email, avatar) no Header.
  - Menu de perfil com opção de logout e acesso futuro a "Meu Perfil".
  - Criada página `/setup` para configuração inicial do super admin (primeiro acesso).
  - Rota `/setup` registrada no sistema de rotas.
  - Toasts e feedbacks de erro/sucesso integrados ao fluxo real de autenticação.
