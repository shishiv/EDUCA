#!/usr/bin/env tsx
/**
 * Seed script MINIMALISTA para Sistema Educacional de Fronteira/MG
 *
 * Executar: bun run seed:superadmin
 *
 * Este script cria APENAS:
 * - 1 Superadmin (precisa completar perfil no primeiro login)
 * - 9 Escolas municipais com dados REAIS de Fronteira/MG
 *
 * IMPORTANTE:
 * - Superadmin precisa completar perfil no primeiro login
 * - Após login, superadmin é redirecionado para wizard de onboarding
 * - No wizard, superadmin cria toda hierarquia: diretores, coordenadores, secretários, professores
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
const SENHA_SUPERADMIN = 'Admin@Fronteira2025'

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
  console.log('🎓 SEED: Sistema Educacional de Fronteira/MG')
  console.log('='.repeat(70))

  try {
    // ========================================================================
    // PARTE 1: CRIAR SUPERADMIN
    // ========================================================================
    console.log('\n📌 PARTE 1: Criando Superadmin...')
    console.log('-'.repeat(70))

    const { data: authAdmin, error: authAdminError } = await supabase.auth.admin.createUser({
      email: 'admin@fronteira.mg.gov.br',
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
        email: 'admin@fronteira.mg.gov.br',
        nome: 'Administrador do Sistema',
        tipo_usuario: 'admin',
        escola_id: null,  // Admin não pertence a escola específica
        ativo: true,
        primeiro_login: true,   // ✅ Admin precisa completar perfil
        senha_padrao: false,
        wizard_completed: false  // ✅ Wizard de onboarding não completado
      })

      if (profileAdminError && !profileAdminError.message.includes('duplicate key')) {
        throw new Error(`Erro ao criar perfil superadmin: ${profileAdminError.message}`)
      }

      console.log('✅ Superadmin criado com sucesso!')
      console.log(`   Email: admin@fronteira.mg.gov.br`)
      console.log(`   Senha: ${SENHA_SUPERADMIN}`)
    }

    // ========================================================================
    // PARTE 2: CRIAR ESCOLAS MUNICIPAIS
    // ========================================================================
    console.log('\n📌 PARTE 2: Criando Escolas Municipais...')
    console.log('-'.repeat(70))

    const escolasData: Escola[] = [
      {
        nome: 'EM Marechal Castelo Branco',
        codigo: '31158810',
        tipo: 'fundamental',
        endereco: 'Rua Godofredo Antônio da Costa, Nº 238 - Vila Santo Antônio - Fronteira/MG',
        telefone: '(34) 3199-9856',
        email: 'contato.marechal@fronteira.mg.gov.br'
      },
      {
        nome: 'EM Poliana Ziza Ferreira',
        codigo: '31158828',
        tipo: 'fundamental',
        endereco: 'Avenida Aurélio Luiz Mistieri, Nº 370 - Centro - Fronteira/MG',
        telefone: '(34) 3199-9786',
        email: 'contato.poliana@fronteira.mg.gov.br'
      },
      {
        nome: 'EM José Maria Bastos',
        codigo: '31342920',
        tipo: 'fundamental',
        endereco: 'Avenida Abdo Jauíde Feres, Nº 370 - Centro - Fronteira/MG',
        telefone: '(34) 3199-9852',
        email: 'contato.jose@fronteira.mg.gov.br'
      },
      {
        nome: 'PEM Turma da Mônica',
        codigo: '31228621',
        tipo: 'pre_escola',
        endereco: 'Rua Hignio Florêncio de Souza, Nº 430 - Vila Residencial de Furnas - Fronteira/MG',
        telefone: '(34) 3199-9785',
        email: 'contato.monica@fronteira.mg.gov.br'
      },
      {
        nome: 'EMEI Maísa Ferreira Passuelo Vasconcelos',
        codigo: '31376027',
        tipo: 'pre_escola',
        endereco: 'Avenida Brasil, Nº 220 - Vila Residencial de Furnas - Fronteira/MG',
        telefone: '(34) 3199-9852',
        email: 'contato.maisa@fronteira.mg.gov.br'
      },
      {
        nome: 'CMEI Dona Alice',
        codigo: '31385018',
        tipo: 'creche',
        endereco: 'Rua Miguel José Miziara, Nº 241 - Cohab - Fronteira/MG',
        telefone: '(34) 3199-9852',
        email: 'contato.alice@fronteira.mg.gov.br'
      },
      {
        nome: 'CMEI Dona Belinha',
        codigo: '31357170',
        tipo: 'creche',
        endereco: 'Avenida Liberdade, Nº 1480 - Vila Reis - Fronteira/MG',
        telefone: '(34) 34282738',
        email: 'contato.belinha@fronteira.mg.gov.br'    
      },
      {
        nome: 'CMEI Santo Antônio',
        codigo: '31333051',
        tipo: 'creche',
        endereco: 'Rua Godofredo Antônio da Costa, Nº 62 - Vila Santo Antônio - Fronteira/MG',
        telefone: '(34) 3199-9855',
        email: 'contato.santoantonio@fronteira.mg.gov.br'
      },
      {
        nome: 'CMEI Dona Mençora',
        codigo: '31290459',
        tipo: 'creche',
        endereco: 'Rua Godofredo Antônio da Costa, Nº 62 - Vila Santo Antônio - Fronteira/MG',
        telefone: '(34) 3199-9853',
        email: 'contato.mencora@fronteira.mg.gov.br'
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
    console.log('│ Email: admin@fronteira.mg.gov.br                                │')
    console.log('│ Senha: Admin@Fronteira2025                                      │')
    console.log('│                                                                 │')
    console.log('│ ⚠️  PRIMEIRO LOGIN:                                              │')
    console.log('│ 1. Complete seu perfil (CPF, telefone, endereço)              │')
    console.log('│ 2. Sistema redireciona para Wizard de Onboarding              │')
    console.log('│ 3. No wizard, crie: diretores, coordenadores, secretários,    │')
    console.log('│    professores para as 9 escolas                              │')
    console.log('└─────────────────────────────────────────────────────────────────┘')
    console.log('\n🏫 Escolas Cadastradas:')
    escolasCriadas.forEach((escola, idx) => {
      console.log(`   ${idx + 1}. ${escola.nome} (INEP: ${escola.codigo})`)
    })
    console.log('\n🚀 Próximos Passos:')
    console.log('   1. Acesse: http://localhost:3000/login')
    console.log('   2. Login: admin@fronteira.mg.gov.br / Admin@Fronteira2025')
    console.log('   3. Complete perfil no primeiro login')
    console.log('   4. Use o Wizard para criar toda hierarquia educacional')
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
