// Script to capture all frontend pages screenshots
// Run with: node scripts/capture-all-screenshots.js

const pages = [
  // Autenticação (2)
  { path: '/login', name: '01-auth-login', needsLogout: true },
  { path: '/role-selection', name: '02-auth-role-selection', needsLogin: true },

  // Dashboard & Home (3)
  { path: '/', name: '03-home-landing' },
  { path: '/dashboard', name: '04-dashboard-main' },
  // Removed: /platform-names (dev-only page deleted in Phase 14-02)

  // Alunos (3)
  { path: '/dashboard/alunos', name: '06-alunos-list' },
  { path: '/dashboard/alunos/novo', name: '07-alunos-novo' },
  // { path: '/dashboard/alunos/[id]', name: '08-alunos-details', needsId: 'alunos' },

  // Escolas (4)
  { path: '/dashboard/escolas', name: '09-escolas-list' },
  { path: '/dashboard/escolas/nova', name: '10-escolas-nova' },
  { path: '/dashboard/escolas/613350e1-4290-426a-86a8-98b0680b04af', name: '11-escolas-details' },
  // { path: '/dashboard/escolas/[id]/editar', name: '12-escolas-editar', needsId: 'escolas' },

  // Turmas (3)
  { path: '/dashboard/turmas', name: '13-turmas-list' },
  { path: '/dashboard/turmas/nova', name: '14-turmas-nova' },
  // { path: '/dashboard/turmas/[id]', name: '15-turmas-details', needsId: 'turmas' },

  // Matrículas (3)
  { path: '/dashboard/matriculas', name: '16-matriculas-list' },
  { path: '/dashboard/matriculas/nova', name: '17-matriculas-nova' },
  // { path: '/dashboard/matriculas/[id]', name: '18-matriculas-details', needsId: 'matriculas' },

  // Responsáveis (3)
  { path: '/dashboard/responsaveis', name: '19-responsaveis-list' },
  { path: '/dashboard/responsaveis/novo', name: '20-responsaveis-novo' },
  { path: '/dashboard/responsaveis/02ac2846-0b45-4228-b123-2e36ef54ca51', name: '21-responsaveis-details' },

  // Usuários (3)
  { path: '/dashboard/usuarios', name: '22-usuarios-list' },
  { path: '/dashboard/usuarios/novo', name: '23-usuarios-novo' },
  // { path: '/dashboard/usuarios/[id]', name: '24-usuarios-details', needsId: 'users' },

  // Módulos Principais (7)
  { path: '/dashboard/frequencia', name: '25-frequencia' },
  { path: '/dashboard/diario', name: '26-diario' },
  { path: '/dashboard/notas', name: '27-notas' },
  { path: '/dashboard/relatorios', name: '28-relatorios' },
  { path: '/dashboard/configuracoes', name: '29-configuracoes' },
  { path: '/dashboard/sessoes', name: '30-sessoes' },
  { path: '/dashboard/atividades', name: '31-atividades' },

  // Perfil & Showcase (2)
  { path: '/dashboard/perfil', name: '32-perfil' },
  // Removed: /showcase (dev-only page deleted in Phase 14-02)
];

console.log('Total pages to capture:', pages.length);
console.log('Pages:', pages.map(p => p.name).join(', '));
