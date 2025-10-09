/**
 * Server Action: Finalizar Wizard de Onboarding
 *
 * Cria todos os usuários do wizard em batch:
 * 1. Cria usuários no auth.users (Supabase Auth)
 * 2. Cria perfis no public.users
 * 3. Marca wizard_completed = true para o superadmin
 * 4. Retorna sucesso ou erro
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { NovoUsuario } from '../_store/useWizardStore'

export interface FinalizeWizardParams {
  diretores: NovoUsuario[]
  coordenadores: NovoUsuario[]
  secretarios: NovoUsuario[]
  professores: NovoUsuario[]
}

export interface FinalizeWizardResult {
  success: boolean
  message: string
  createdCount?: number
  errors?: string[]
}

export async function finalizeWizard(
  params: FinalizeWizardParams
): Promise<FinalizeWizardResult> {
  try {
    const supabase = await createClient()

    // Verificar se usuário atual é admin
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return {
        success: false,
        message: 'Não autenticado',
      }
    }

    // Verificar se é admin
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('tipo_usuario')
      .eq('id', currentUser.id)
      .single()

    if (profileError || profile?.tipo_usuario !== 'admin') {
      return {
        success: false,
        message: 'Apenas administradores podem executar esta ação',
      }
    }

    // Consolidar todos os usuários
    const allUsers: NovoUsuario[] = [
      ...params.diretores,
      ...params.coordenadores,
      ...params.secretarios,
      ...params.professores,
    ]

    if (allUsers.length === 0) {
      return {
        success: false,
        message: 'Nenhum usuário para criar',
      }
    }

    const errors: string[] = []
    let createdCount = 0

    // Criar cada usuário
    for (const usuario of allUsers) {
      try {
        // 1. Criar no auth.users (Supabase Auth)
        const { data: authData, error: createAuthError } =
          await supabase.auth.admin.createUser({
            email: usuario.email,
            password: usuario.senha_gerada || 'Fronteira@2025',
            email_confirm: true, // Email já confirmado
          })

        if (createAuthError || !authData.user) {
          errors.push(
            `Erro ao criar usuário ${usuario.nome}: ${createAuthError?.message || 'Erro desconhecido'}`
          )
          continue
        }

        // 2. Criar perfil no public.users
        const { error: profileCreateError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: usuario.email,
            nome: usuario.nome,
            tipo_usuario: usuario.tipo_usuario,
            escola_id: usuario.escola_id || null,
            ativo: true,
            primeiro_login: true, // Forçar troca de senha no primeiro login
            senha_padrao: true,
          })

        if (profileCreateError) {
          errors.push(
            `Erro ao criar perfil de ${usuario.nome}: ${profileCreateError.message}`
          )
          // Tentar deletar o usuário de auth se criação do perfil falhar
          await supabase.auth.admin.deleteUser(authData.user.id)
          continue
        }

        createdCount++
      } catch (err) {
        errors.push(
          `Erro inesperado ao criar ${usuario.nome}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`
        )
      }
    }

    // 3. Marcar wizard como completo para o superadmin
    const { error: updateWizardError } = await supabase
      .from('users')
      .update({ wizard_completed: true })
      .eq('id', currentUser.id)

    if (updateWizardError) {
      errors.push(
        `Erro ao atualizar wizard_completed: ${updateWizardError.message}`
      )
    }

    // 4. Retornar resultado
    if (createdCount === allUsers.length && errors.length === 0) {
      return {
        success: true,
        message: `${createdCount} usuário(s) criado(s) com sucesso!`,
        createdCount,
      }
    } else if (createdCount > 0) {
      return {
        success: true,
        message: `${createdCount}/${allUsers.length} usuário(s) criado(s). Alguns erros ocorreram.`,
        createdCount,
        errors,
      }
    } else {
      return {
        success: false,
        message: 'Nenhum usuário foi criado. Veja os erros abaixo.',
        errors,
      }
    }
  } catch (err) {
    console.error('Erro ao finalizar wizard:', err)
    return {
      success: false,
      message: `Erro fatal: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
    }
  }
}
