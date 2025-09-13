# 🗂️ EduFronteira — Roadmap Técnico

## ✅ Done
- Estrutura inicial do módulo /students com autenticação, filtros e CRUD.
- Integração com Supabase para listagem, criação, edição e remoção de estudantes.
- Componentes: StudentCard, StudentFilters, StudentForm.
- Tipagem forte centralizada em /lib/types.ts.
- Refatoração e modularização completa do módulo /students.
- Criação da pasta tasks/ com tasks.md e changelog.md.
- Melhoria de UX, feedback visual e acessibilidade nos componentes de estudantes.
- Paginação e ordenação avançada na listagem de estudantes.
- Filtros expandidos: por responsável (nome/telefone) e por data de matrícula.
- Refatoração completa do módulo /attendance (hook, componente, integração real Supabase).
- Eliminação de todos os avisos de `any`, problemas de tipagem e warnings/lint no módulo `/students` (Students, StudentFilters, useDiary).
- Revisão completa da autenticação Supabase:
  - Hook `useAuth` robusto, login/logout real, exibição do perfil logado no Header.
  - Página `/login` funcional, sem mockup.
  - Página `/setup` para super admin criada e rota registrada.

## 🧠 In Progress

## 🚧 Next Steps
- Criar página de perfil do usuário (`/profile`) para edição de dados básicos.
- Proteger rotas por autenticação e papel do usuário (HOC ou ProtectedRoute).
- Implementar RLS (Row Level Security) no Supabase para roles.
- Melhorar feedback de erros de autenticação e UX de sessão expirada.
- Explorar integração de IA para sugestões automáticas de presença.
- Implementar testes unitários para hooks e componentes do módulo /students (ao final do processo).
- Refatorar e expandir módulos /schools, /reports e /settings seguindo o padrão de arquitetura limpa, hooks e integração Supabase.
