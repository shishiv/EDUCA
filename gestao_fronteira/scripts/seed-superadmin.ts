#!/usr/bin/env tsx
/**
 * Seed script MINIMALISTA para Sistema Educacional Municipal
 *
 * Executar: bun run seed:superadmin
 *
 * Este script cria APENAS:
 * - 1 Superadmin com acesso completo ao sistema
 * - Escolas municipais de exemplo — substitua com dados reais
 *
 * IMPORTANTE:
 * - Após login, superadmin tem acesso completo ao sistema
 * - Escolas já estão cadastradas e prontas para receber equipe
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

// Configuração do Supabase com service role (bypass RLS)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Constantes
const SENHA_SUPERADMIN = 'Admin@Municipio2025'

interface Escola {
  id?: string
  nome: string
  codigo: string
  tipo: 'creche' | 'pre_escola' | 'fundamental'
  endereco: string
  telefone: string
  email: string
}

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('🎓 SEED: Sistema Educacional Municipal')
  console.log('='.repeat(70))

  try {
    // ========================================================================
    // PARTE 1: CRIAR SUPERADMIN
    // ========================================================================
    console.log('\n📌 PARTE 1: Criando Superadmin...')
    console.log('-'.repeat(70))

    const { data: authAdmin, error: authAdminError } = await supabase.auth.admin.createUser({
      email: 'admin@municipio.edu.br',
      password: SENHA_SUPERADMIN,
      email_confirm: true,
      user_metadata: {
        nome: 'Administrador do Sistema',
        tipo_usuario: 'admin'
      }
    })

    if (authAdminError) {
      if (authAdminError.message.includes('already registered')) {
        console.log('⚠️  Superadmin já existe, pulando criação...')
      } else {
        throw new Error(`Erro ao criar auth superadmin: ${authAdminError.message}`)
      }
    } else {
      // Criar perfil no database
      const { error: profileAdminError } = await supabase.from('users').insert({
        id: authAdmin.user.id,
        email: 'admin@municipio.edu.br',
        nome: 'Administrador do Sistema',
        tipo_usuario: 'admin',
        escola_id: null,  // Admin não pertence a escola específica
        ativo: true,
        primeiro_login: true,
        senha_padrao: false
      })

      if (profileAdminError && !profileAdminError.message.includes('duplicate key')) {
        throw new Error(`Erro ao criar perfil superadmin: ${profileAdminError.message}`)
      }

      console.log('✅ Superadmin criado com sucesso!')
      console.log(`   Email: admin@municipio.edu.br`)
      console.log(`   Senha: ${SENHA_SUPERADMIN}`)
    }

    // ========================================================================
    // PARTE 2: CRIAR ESCOLAS MUNICIPAIS
    // ========================================================================
    console.log('\n📌 PARTE 2: Criando Escolas Municipais...')
    console.log('-'.repeat(70))

    // Seed schools — replace with real school data for your municipality
    // INEP codes and addresses below are placeholders
    const escolasData: Escola[] = [
      {
        nome: 'EMEF Escola A',
        codigo: '00000001',
        tipo: 'fundamental',
        endereco: 'Rua das Flores, 100 - Centro - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.a@municipio.edu.br'
      },
      {
        nome: 'EMEF Escola B',
        codigo: '00000002',
        tipo: 'fundamental',
        endereco: 'Av. da Educação, 200 - Vila Nova - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.b@municipio.edu.br'
      },
      {
        nome: 'EMEF Escola C',
        codigo: '00000003',
        tipo: 'fundamental',
        endereco: 'Praça da Escola, 300 - Centro - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.c@municipio.edu.br'
      },
      {
        nome: 'PEM Escola D',
        codigo: '00000004',
        tipo: 'pre_escola',
        endereco: 'Rua A, 400 - Bairro I - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.d@municipio.edu.br'
      },
      {
        nome: 'EMEI Escola E',
        codigo: '00000005',
        tipo: 'pre_escola',
        endereco: 'Av. Principal, 500 - Bairro II - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.e@municipio.edu.br'
      },
      {
        nome: 'CEMEI Escola F',
        codigo: '00000006',
        tipo: 'creche',
        endereco: 'Rua B, 600 - Bairro III - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.f@municipio.edu.br'
      },
      {
        nome: 'CEMEI Escola G',
        codigo: '00000007',
        tipo: 'creche',
        endereco: 'Rua C, 700 - Bairro IV - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.g@municipio.edu.br'
      },
      {
        nome: 'CEMEI Escola H',
        codigo: '00000008',
        tipo: 'creche',
        endereco: 'Rua D, 800 - Bairro V - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.h@municipio.edu.br'
      },
      {
        nome: 'CEMEI Escola I',
        codigo: '00000009',
        tipo: 'creche',
        endereco: 'Rua E, 900 - Bairro VI - Cidade/UF',
        telefone: '(XX) XXXX-XXXX',
        email: 'escola.i@municipio.edu.br'
      }
    ]

    const escolasCriadas: Escola[] = []

    for (const escolaData of escolasData) {
      const { data: escola, error: escolaError } = await supabase
        .from('escolas')
        .insert({
          nome: escolaData.nome,
          codigo: escolaData.codigo,
          tipo: escolaData.tipo,
          endereco: escolaData.endereco,
          telefone: escolaData.telefone,
          email: escolaData.email,
          ativo: true,
          diretor_id: null  // Será atualizado depois
        })
        .select()
        .single()

      if (escolaError) {
        if (escolaError.message.includes('duplicate key')) {
          console.log(`⚠️  Escola "${escolaData.nome}" já existe, recuperando...`)
          const { data: existingEscola } = await supabase
            .from('escolas')
            .select('*')
            .eq('codigo', escolaData.codigo)
            .single()
          if (existingEscola) {
            escolasCriadas.push(existingEscola as Escola)
          }
        } else {
          throw new Error(`Erro ao criar escola ${escolaData.nome}: ${escolaError.message}`)
        }
      } else {
        escolasCriadas.push(escolaData as Escola & { id: string })
        console.log(`✅ Escola criada: ${escolaData.nome}`)
        console.log(`   Código INEP: ${escolaData.codigo}`)
        console.log(`   Tipo: ${escolaData.tipo}`)
      }
    }

    if (escolasCriadas.length === 0) {
      throw new Error('Nenhuma escola foi criada ou recuperada')
    }

    // ========================================================================
    // RESUMO FINAL
    // ========================================================================
    console.log('\n' + '='.repeat(70))
    console.log('🎉 SEED MINIMALISTA COMPLETO!')
    console.log('='.repeat(70))
    console.log('\n📊 Resumo:')
    console.log(`   ✅ Superadmin criado: 1`)
    console.log(`   ✅ Escolas criadas: ${escolasCriadas.length}`)
    console.log('\n📋 Credenciais de Acesso:')
    console.log('┌─────────────────────────────────────────────────────────────────┐')
    console.log('│ SUPERADMIN                                                      │')
    console.log('│ Email: admin@municipio.edu.br                                │')
    console.log('│ Senha: Admin@Municipio2025                                      │')
    console.log('│                                                                 │')
    console.log('│ ⚠️  ACESSO COMPLETO AO SISTEMA:                                  │')
    console.log('│ - Gerenciar escolas, usuários e configurações                 │')
    console.log('│ - Criar e gerenciar turmas e matrículas                       │')
    console.log('│ - Acessar todos os módulos administrativos                    │')
    console.log('└─────────────────────────────────────────────────────────────────┘')
    console.log('\n🏫 Escolas Cadastradas:')
    escolasCriadas.forEach((escola, idx) => {
      console.log(`   ${idx + 1}. ${escola.nome} (INEP: ${escola.codigo})`)
    })
    console.log('\n🚀 Próximos Passos:')
    console.log('   1. Acesse: http://localhost:3000/login')
    console.log('   2. Login: admin@municipio.edu.br / Admin@Municipio2025')
    console.log('   3. Gerencie usuários, escolas e configurações do sistema')
    console.log('\n')

  } catch (error: any) {
    console.error('\n💥 ERRO AO EXECUTAR SEED:')
    console.error(error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
    process.exit(1)
  }
}

// Executar script
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Falha fatal:', error)
    process.exit(1)
  })
}

export { main }
