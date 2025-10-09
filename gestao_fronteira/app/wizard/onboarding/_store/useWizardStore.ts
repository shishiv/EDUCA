/**
 * Zustand Store: Wizard de Onboarding
 *
 * Gerencia estado global do wizard:
 * - Step atual
 * - Dados coletados em cada step
 * - Persistência no localStorage
 * - Validações de progresso
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================================
// TYPES
// ============================================================================

export interface NovoUsuario {
  nome: string
  email: string
  cpf: string
  telefone: string
  tipo_usuario: 'diretor' | 'coordenador_pedagogico' | 'secretario' | 'professor'
  escola_id?: string
  escolas_ids?: string[] // Para diretor/secretário que pode gerenciar múltiplas escolas
  professores_ids?: string[] // Para coordenador pedagógico
  turmas_ids?: string[] // Para professor
  senha_gerada?: string // Gerada automaticamente no formato Fronteira@2025
}

export interface WizardState {
  // Step atual (1-6)
  currentStep: number

  // Dados coletados
  diretores: NovoUsuario[]
  coordenadores: NovoUsuario[]
  secretarios: NovoUsuario[]
  professores: NovoUsuario[]

  // Flags de validação
  step2Valid: boolean // Mínimo 1 diretor
  step5Valid: boolean // Mínimo 2 professores

  // Ações
  setCurrentStep: (step: number) => void
  nextStep: () => void
  previousStep: () => void

  // Gerenciar diretores
  addDiretor: (diretor: NovoUsuario) => void
  updateDiretor: (index: number, diretor: NovoUsuario) => void
  removeDiretor: (index: number) => void

  // Gerenciar coordenadores
  addCoordenador: (coordenador: NovoUsuario) => void
  updateCoordenador: (index: number, coordenador: NovoUsuario) => void
  removeCoordenador: (index: number) => void

  // Gerenciar secretários
  addSecretario: (secretario: NovoUsuario) => void
  updateSecretario: (index: number, secretario: NovoUsuario) => void
  removeSecretario: (index: number) => void

  // Gerenciar professores
  addProfessor: (professor: NovoUsuario) => void
  updateProfessor: (index: number, professor: NovoUsuario) => void
  removeProfessor: (index: number) => void

  // Validações
  validateStep2: () => boolean
  validateStep5: () => boolean

  // Reset wizard
  resetWizard: () => void
}

// ============================================================================
// STORE
// ============================================================================

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      currentStep: 1,
      diretores: [],
      coordenadores: [],
      secretarios: [],
      professores: [],
      step2Valid: false,
      step5Valid: false,

      // Navegação
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 6),
        })),
      previousStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1),
        })),

      // Diretores
      addDiretor: (diretor) =>
        set((state) => {
          const diretores = [...state.diretores, diretor]
          return {
            diretores,
            step2Valid: diretores.length >= 1,
          }
        }),
      updateDiretor: (index, diretor) =>
        set((state) => {
          const diretores = [...state.diretores]
          diretores[index] = diretor
          return { diretores }
        }),
      removeDiretor: (index) =>
        set((state) => {
          const diretores = state.diretores.filter((_, i) => i !== index)
          return {
            diretores,
            step2Valid: diretores.length >= 1,
          }
        }),

      // Coordenadores
      addCoordenador: (coordenador) =>
        set((state) => ({
          coordenadores: [...state.coordenadores, coordenador],
        })),
      updateCoordenador: (index, coordenador) =>
        set((state) => {
          const coordenadores = [...state.coordenadores]
          coordenadores[index] = coordenador
          return { coordenadores }
        }),
      removeCoordenador: (index) =>
        set((state) => ({
          coordenadores: state.coordenadores.filter((_, i) => i !== index),
        })),

      // Secretários
      addSecretario: (secretario) =>
        set((state) => ({
          secretarios: [...state.secretarios, secretario],
        })),
      updateSecretario: (index, secretario) =>
        set((state) => {
          const secretarios = [...state.secretarios]
          secretarios[index] = secretario
          return { secretarios }
        }),
      removeSecretario: (index) =>
        set((state) => ({
          secretarios: state.secretarios.filter((_, i) => i !== index),
        })),

      // Professores
      addProfessor: (professor) =>
        set((state) => {
          const professores = [...state.professores, professor]
          return {
            professores,
            step5Valid: professores.length >= 2,
          }
        }),
      updateProfessor: (index, professor) =>
        set((state) => {
          const professores = [...state.professores]
          professores[index] = professor
          return { professores }
        }),
      removeProfessor: (index) =>
        set((state) => {
          const professores = state.professores.filter((_, i) => i !== index)
          return {
            professores,
            step5Valid: professores.length >= 2,
          }
        }),

      // Validações
      validateStep2: () => {
        const { diretores } = get()
        return diretores.length >= 1
      },
      validateStep5: () => {
        const { professores } = get()
        return professores.length >= 2
      },

      // Reset
      resetWizard: () =>
        set({
          currentStep: 1,
          diretores: [],
          coordenadores: [],
          secretarios: [],
          professores: [],
          step2Valid: false,
          step5Valid: false,
        }),
    }),
    {
      name: 'wizard-onboarding-storage', // Nome da key no localStorage
      partialize: (state) => ({
        // Apenas persistir dados essenciais
        diretores: state.diretores,
        coordenadores: state.coordenadores,
        secretarios: state.secretarios,
        professores: state.professores,
        currentStep: state.currentStep,
      }),
    }
  )
)
