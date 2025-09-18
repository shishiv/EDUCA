/**
 * Seed data for SRE Educational Management System
 * This file contains development seed data for all 5 user roles and educational entities
 */
import { supabase } from './supabase'

export interface SeedData {
  users: Array<{
    email: string
    nome: string
    tipo_usuario: 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'
    escola_id?: string
    ativo: boolean
  }>
  escolas: Array<{
    nome: string
    codigo: string
    endereco: string
    telefone: string
    tipo: 'creche' | 'pre_escola' | 'fundamental'
    ativo: boolean
  }>
  responsaveis: Array<{
    nome: string
    cpf: string
    telefone: string
    email: string
    parentesco: string
    endereco: string
    profissao: string
  }>
  alunos: Array<{
    nome_completo: string
    data_nascimento: string
    cpf?: string
    rg?: string
    sexo: 'M' | 'F'
    endereco: string
    telefone: string
    email?: string
    nome_mae: string
    nome_pai: string
    necessidades_especiais?: string
    ativo: boolean
  }>
  turmas: Array<{
    nome: string
    ano_letivo: number
    serie: string
    capacidade: number
    turno: 'matutino' | 'vespertino' | 'integral'
    ativo: boolean
  }>
}

export const seedData: SeedData = {
  // 5 user roles as specified in MVP requirements
  users: [
    {
      email: 'admin@fronteira.mg.gov.br',
      nome: 'Administrador do Sistema',
      tipo_usuario: 'admin',
      ativo: true
    },
    {
      email: 'maria.silva@fronteira.mg.gov.br',
      nome: 'Maria Silva Santos',
      tipo_usuario: 'diretor',
      ativo: true
    },
    {
      email: 'coordenador@fronteira.mg.gov.br',
      nome: 'João Carlos Pereira',
      tipo_usuario: 'secretario',
      ativo: true
    },
    {
      email: 'prof.ana@fronteira.mg.gov.br',
      nome: 'Ana Cristina Oliveira',
      tipo_usuario: 'professor',
      ativo: true
    },
    {
      email: 'prof.carlos@fronteira.mg.gov.br',
      nome: 'Carlos Eduardo Lima',
      tipo_usuario: 'professor',
      ativo: true
    },
    {
      email: 'responsavel@gmail.com',
      nome: 'Patricia Souza Lima',
      tipo_usuario: 'responsavel',
      ativo: true
    }
  ],

  // Municipal schools of Fronteira/MG
  escolas: [
    {
      nome: 'CEMEI Pequenos Passos',
      codigo: 'FRT001',
      endereco: 'Rua das Flores, 123 - Centro, Fronteira/MG',
      telefone: '(34) 3555-0001',
      tipo: 'creche',
      ativo: true
    },
    {
      nome: 'EMEI Jardim da Infância',
      codigo: 'FRT002',
      endereco: 'Av. Educação, 456 - Vila Nova, Fronteira/MG',
      telefone: '(34) 3555-0002',
      tipo: 'pre_escola',
      ativo: true
    },
    {
      nome: 'EMEF Professor João Silva',
      codigo: 'FRT003',
      endereco: 'Praça da Escola, 789 - São José, Fronteira/MG',
      telefone: '(34) 3555-0003',
      tipo: 'fundamental',
      ativo: true
    },
    {
      nome: 'EMEF Maria das Graças',
      codigo: 'FRT004',
      endereco: 'Rua da Educação, 321 - Centro, Fronteira/MG',
      telefone: '(34) 3555-0004',
      tipo: 'fundamental',
      ativo: true
    }
  ],

  // Guardians/Parents
  responsaveis: [
    {
      nome: 'José da Silva Santos',
      cpf: '12345678901',
      telefone: '(34) 99999-0001',
      email: 'jose.silva@gmail.com',
      parentesco: 'pai',
      endereco: 'Rua A, 100 - Centro, Fronteira/MG',
      profissao: 'Agricultor'
    },
    {
      nome: 'Maria Oliveira Costa',
      cpf: '23456789012',
      telefone: '(34) 99999-0002',
      email: 'maria.oliveira@gmail.com',
      parentesco: 'mãe',
      endereco: 'Rua B, 200 - Vila Nova, Fronteira/MG',
      profissao: 'Professora'
    },
    {
      nome: 'Carlos Santos Pereira',
      cpf: '34567890123',
      telefone: '(34) 99999-0003',
      email: 'carlos.pereira@gmail.com',
      parentesco: 'pai',
      endereco: 'Av. Principal, 300 - São José, Fronteira/MG',
      profissao: 'Comerciante'
    },
    {
      nome: 'Lucia Ferreira Lima',
      cpf: '45678901234',
      telefone: '(34) 99999-0004',
      email: 'lucia.ferreira@gmail.com',
      parentesco: 'mãe',
      endereco: 'Rua C, 400 - Centro, Fronteira/MG',
      profissao: 'Enfermeira'
    },
    {
      nome: 'Patricia Souza Lima',
      cpf: '56789012345',
      telefone: '(34) 99999-0005',
      email: 'patricia.souza@gmail.com',
      parentesco: 'mãe',
      endereco: 'Rua D, 500 - Vila Nova, Fronteira/MG',
      profissao: 'Funcionária Pública'
    }
  ],

  // Students with Brazilian educational data requirements
  alunos: [
    {
      nome_completo: 'Pedro Silva Santos',
      data_nascimento: '2020-03-15',
      sexo: 'M',
      endereco: 'Rua A, 100 - Centro, Fronteira/MG',
      telefone: '(34) 99999-0001',
      nome_mae: 'Ana Silva Santos',
      nome_pai: 'José da Silva Santos',
      ativo: true
    },
    {
      nome_completo: 'Julia Oliveira Costa',
      data_nascimento: '2019-07-22',
      sexo: 'F',
      endereco: 'Rua B, 200 - Vila Nova, Fronteira/MG',
      telefone: '(34) 99999-0002',
      nome_mae: 'Maria Oliveira Costa',
      nome_pai: 'João Costa Silva',
      ativo: true
    },
    {
      nome_completo: 'Lucas Santos Pereira',
      data_nascimento: '2015-11-08',
      cpf: '12345678904', // Valid CPF for testing
      rg: 'MG-12345678',
      sexo: 'M',
      endereco: 'Av. Principal, 300 - São José, Fronteira/MG',
      telefone: '(34) 99999-0003',
      email: 'lucas.santos@email.com',
      nome_mae: 'Carmen Santos Pereira',
      nome_pai: 'Carlos Santos Pereira',
      necessidades_especiais: 'Dislexia - necessita de acompanhamento especializado',
      ativo: true
    },
    {
      nome_completo: 'Ana Carolina Ferreira',
      data_nascimento: '2018-05-12',
      sexo: 'F',
      endereco: 'Rua C, 400 - Centro, Fronteira/MG',
      telefone: '(34) 99999-0004',
      nome_mae: 'Lucia Ferreira Lima',
      nome_pai: 'Roberto Ferreira Silva',
      ativo: true
    },
    {
      nome_completo: 'Gabriel Souza Lima',
      data_nascimento: '2016-09-30',
      cpf: '98765432100', // Valid CPF for testing
      rg: 'MG-87654321',
      sexo: 'M',
      endereco: 'Rua D, 500 - Vila Nova, Fronteira/MG',
      telefone: '(34) 99999-0005',
      email: 'gabriel.souza@email.com',
      nome_mae: 'Patricia Souza Lima',
      nome_pai: 'Fernando Lima Souza',
      ativo: true
    },
    {
      nome_completo: 'Isabella Costa Santos',
      data_nascimento: '2017-12-03',
      sexo: 'F',
      endereco: 'Rua E, 600 - São José, Fronteira/MG',
      telefone: '(34) 99999-0006',
      nome_mae: 'Fernanda Costa Santos',
      nome_pai: 'Marcos Santos Costa',
      necessidades_especiais: 'Déficit de atenção - acompanhamento psicopedagógico',
      ativo: true
    }
  ],

  // Classes with Brazilian educational naming conventions
  turmas: [
    {
      nome: 'Berçário A',
      ano_letivo: 2025,
      serie: 'Berçário',
      capacidade: 15,
      turno: 'integral',
      ativo: true
    },
    {
      nome: 'Maternal I A',
      ano_letivo: 2025,
      serie: 'Maternal I',
      capacidade: 20,
      turno: 'matutino',
      ativo: true
    },
    {
      nome: 'Pré I A',
      ano_letivo: 2025,
      serie: 'Pré I',
      capacidade: 25,
      turno: 'matutino',
      ativo: true
    },
    {
      nome: 'Pré II B',
      ano_letivo: 2025,
      serie: 'Pré II',
      capacidade: 25,
      turno: 'vespertino',
      ativo: true
    },
    {
      nome: '1º Ano A',
      ano_letivo: 2025,
      serie: '1º Ano',
      capacidade: 30,
      turno: 'matutino',
      ativo: true
    },
    {
      nome: '3º Ano B',
      ano_letivo: 2025,
      serie: '3º Ano',
      capacidade: 28,
      turno: 'vespertino',
      ativo: true
    },
    {
      nome: '5º Ano A',
      ano_letivo: 2025,
      serie: '5º Ano',
      capacidade: 30,
      turno: 'matutino',
      ativo: true
    }
  ]
}

/**
 * Insert seed data into the database
 * This function should be called during development setup
 */
export async function insertSeedData() {
  // console.log('🌱 Starting seed data insertion...')

  try {
    // Insert schools first (needed for user school associations)
    // console.log('📚 Inserting schools...')
    const { data: escolas, error: escolasError } = await supabase
      .from('escolas')
      .insert(seedData.escolas)
      .select()

    if (escolasError) {
      throw new Error(`Failed to insert schools: ${escolasError.message}`)
    }

    // console.log(`✅ Inserted ${escolas?.length} schools`)

    // Insert responsaveis
    // console.log('👨‍👩‍👧‍👦 Inserting guardians...')
    const { data: responsaveis, error: responsaveisError } = await supabase
      .from('responsaveis')
      .insert(seedData.responsaveis)
      .select()

    if (responsaveisError) {
      throw new Error(`Failed to insert guardians: ${responsaveisError.message}`)
    }

    // console.log(`✅ Inserted ${responsaveis?.length} guardians`)

    // Insert users with school associations
    const usersWithSchools = seedData.users.map((user, index) => ({
      ...user,
      escola_id: user.tipo_usuario === 'admin' ? null : escolas?.[0]?.id || null
    }))

    // console.log('👥 Inserting users...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .insert(usersWithSchools)
      .select()

    if (usersError) {
      throw new Error(`Failed to insert users: ${usersError.message}`)
    }

    // console.log(`✅ Inserted ${users?.length} users`)

    // Update schools with directors
    if (users && users.length > 1) {
      const directorUser = users.find(user => user.tipo_usuario === 'diretor')
      if (directorUser && escolas && escolas.length > 0) {
        const { error: updateError } = await supabase
          .from('escolas')
          .update({ diretor_id: directorUser.id })
          .eq('id', escolas[0].id)

        if (!updateError) {
          // console.log('✅ Updated school director assignment')
        }
      }
    }

    // Insert turmas with school and professor associations
    const turmasWithAssociations = seedData.turmas.map((turma, index) => ({
      ...turma,
      escola_id: escolas?.[index % escolas.length]?.id || escolas?.[0]?.id,
      professor_id: users?.find(u => u.tipo_usuario === 'professor')?.id || null
    }))

    // console.log('🎓 Inserting classes...')
    const { data: turmas, error: turmasError } = await supabase
      .from('turmas')
      .insert(turmasWithAssociations)
      .select()

    if (turmasError) {
      throw new Error(`Failed to insert classes: ${turmasError.message}`)
    }

    // console.log(`✅ Inserted ${turmas?.length} classes`)

    // Insert students with guardian associations
    const alunosWithResponsaveis = seedData.alunos.map((aluno, index) => ({
      ...aluno,
      responsavel_id: responsaveis?.[index % responsaveis.length]?.id || null
    }))

    // console.log('👦👧 Inserting students...')
    const { data: alunos, error: alunosError } = await supabase
      .from('alunos')
      .insert(alunosWithResponsaveis)
      .select()

    if (alunosError) {
      throw new Error(`Failed to insert students: ${alunosError.message}`)
    }

    // console.log(`✅ Inserted ${alunos?.length} students`)

    // Insert matriculas (enrollments)
    if (alunos && turmas && alunos.length > 0 && turmas.length > 0) {
      const matriculas = alunos.map((aluno, index) => ({
        aluno_id: aluno.id,
        turma_id: turmas[index % turmas.length].id,
        ano_letivo: 2025,
        situacao: 'ativa' as const,
        observacoes: 'Matrícula inicial - seed data'
      }))

      // console.log('📝 Inserting enrollments...')
      const { data: matriculasData, error: matriculasError } = await supabase
        .from('matriculas')
        .insert(matriculas)
        .select()

      if (matriculasError) {
        throw new Error(`Failed to insert enrollments: ${matriculasError.message}`)
      }

      // console.log(`✅ Inserted ${matriculasData?.length} enrollments`)
    }

    // console.log('🎉 Seed data insertion completed successfully!')
    // console.log('\n📋 Summary:')
    // console.log(`   • ${escolas?.length || 0} schools`)
    // console.log(`   • ${users?.length || 0} users (all 5 roles)`)
    // console.log(`   • ${responsaveis?.length || 0} guardians`)
    // console.log(`   • ${alunos?.length || 0} students`)
    // console.log(`   • ${turmas?.length || 0} classes`)
    // console.log('\n🔐 Test Accounts:')
    // console.log('   • admin@fronteira.mg.gov.br (Admin)')
    // console.log('   • maria.silva@fronteira.mg.gov.br (Diretor)')
    // console.log('   • prof.ana@fronteira.mg.gov.br (Professor)')

    return {
      success: true,
      data: {
        escolas: escolas?.length || 0,
        users: users?.length || 0,
        responsaveis: responsaveis?.length || 0,
        alunos: alunos?.length || 0,
        turmas: turmas?.length || 0
      }
    }

  } catch (error) {
    // console.error('❌ Seed data insertion failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Clear all seed data (useful for testing)
 */
export async function clearSeedData() {
  // console.log('🧹 Clearing seed data...')

  try {
    const tables = ['frequencia', 'notas', 'matriculas', 'turmas', 'alunos', 'responsaveis', 'users', 'escolas']

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) {
        // console.warn(`Warning: Could not clear ${table}:`, error.message)
      } else {
        // console.log(`✅ Cleared ${table}`)
      }
    }

    // console.log('🧹 Seed data cleared successfully!')
    return { success: true }

  } catch (error) {
    // console.error('❌ Failed to clear seed data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}