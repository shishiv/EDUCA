'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, UserWithSchool } from '@/lib/api/users'
import { queryKeys, invalidateQueries } from '@/lib/react-query'
import { useAppStore } from '@/lib/stores/app-store'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

// Get users with school information
export function useUsersWithSchool(options?: {
  searchTerm?: string
  roles?: string[]
  schools?: string[]
  activeOnly?: boolean
  limit?: number
  offset?: number
}) {
  const filters = useAppStore((state) => state.filters.users)

  const mergedOptions = {
    ...options,
    searchTerm: options?.searchTerm ?? filters.searchTerm,
    roles: options?.roles ?? (filters.roles.length > 0 ? filters.roles : undefined),
    schools: options?.schools ?? (filters.schools.length > 0 ? filters.schools : undefined),
    activeOnly: filters.status === 'active',
  }

  const query = useQuery({
    queryKey: queryKeys.users.list(mergedOptions),
    queryFn: () => usersApi.getUsersWithSchool(mergedOptions),
    staleTime: 2 * 60 * 1000, // 2 minutes for user list
  })

  return query
}

// Get single user
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes for user details
  })
}

// Get user statistics
export function useUserStats() {
  return useQuery({
    queryKey: queryKeys.users.stats(),
    queryFn: () => usersApi.getUserStats(),
    staleTime: 3 * 60 * 1000, // 3 minutes for stats
  })
}

// Create user mutation
export function useCreateUser() {
  const queryClient = useQueryClient()
  const addRecentActivity = useAppStore((state) => state.addRecentActivity)

  return useMutation({
    mutationFn: (userData: Parameters<typeof usersApi.createUser>[0]) =>
      usersApi.createUser(userData),
    onSuccess: (data) => {
      // Invalidate user queries
      invalidateQueries.users()
      invalidateQueries.userStats()

      // Add to recent activity
      addRecentActivity({
        type: 'user_created',
        title: 'Usuário criado',
        description: `${data.nome} foi criado como ${data.tipo_usuario}`,
        entityId: data.id,
        entityType: 'user',
      })

      toast.success('Usuário criado com sucesso!')
    },
    onError: (error: any) => {
      // console.error('Error creating user:', error)
      toast.error(error.message || 'Erro ao criar usuário')
    },
  })
}

// Update user mutation
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      usersApi.update(id, data),
    onSuccess: (data, variables) => {
      // Update cache optimistically
      queryClient.setQueryData(queryKeys.users.detail(variables.id), data)

      // Invalidate related queries
      invalidateQueries.usersList()
      invalidateQueries.userStats()

      toast.success('Usuário atualizado com sucesso!')
    },
    onError: (error: any) => {
      // console.error('Error updating user:', error)
      toast.error(error.message || 'Erro ao atualizar usuário')
    },
  })
}

// Update user status mutation
export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ativo, reason }: { id: string; ativo: boolean; reason?: string }) =>
      usersApi.updateUserStatus(id, ativo, reason),
    onSuccess: (data, variables) => {
      // Update cache optimistically
      queryClient.setQueryData(queryKeys.users.detail(variables.id), data)

      // Invalidate related queries
      invalidateQueries.usersList()
      invalidateQueries.userStats()

      const action = variables.ativo ? 'ativado' : 'desativado'
      toast.success(`Usuário ${action} com sucesso!`)
    },
    onError: (error: any) => {
      // console.error('Error updating user status:', error)
      toast.error(error.message || 'Erro ao atualizar status do usuário')
    },
  })
}

// Bulk update status mutation
export function useBulkUpdateUserStatus() {
  const queryClient = useQueryClient()
  const clearBulkSelection = useAppStore((state) => state.clearBulkSelection)

  return useMutation({
    mutationFn: ({ userIds, ativo, reason }: { userIds: string[]; ativo: boolean; reason?: string }) =>
      usersApi.bulkUpdateStatus(userIds, ativo, reason),
    onSuccess: (data, variables) => {
      // Invalidate queries
      invalidateQueries.users()
      invalidateQueries.userStats()

      // Clear bulk selection
      clearBulkSelection()

      const action = variables.ativo ? 'ativados' : 'desativados'
      toast.success(`${variables.userIds.length} usuários ${action} com sucesso!`)
    },
    onError: (error: any) => {
      // console.error('Error bulk updating user status:', error)
      toast.error(error.message || 'Erro ao atualizar status dos usuários')
    },
  })
}

// Bulk assign school mutation
export function useBulkAssignSchool() {
  const queryClient = useQueryClient()
  const clearBulkSelection = useAppStore((state) => state.clearBulkSelection)

  return useMutation({
    mutationFn: ({ userIds, escolaId }: { userIds: string[]; escolaId: string }) =>
      usersApi.bulkAssignSchool(userIds, escolaId),
    onSuccess: (data, variables) => {
      // Invalidate queries
      invalidateQueries.users()
      invalidateQueries.userStats()

      // Clear bulk selection
      clearBulkSelection()

      toast.success(`${variables.userIds.length} usuários atribuídos à escola com sucesso!`)
    },
    onError: (error: any) => {
      // console.error('Error bulk assigning school:', error)
      toast.error(error.message || 'Erro ao atribuir escola aos usuários')
    },
  })
}

// Real-time subscription hook
export function useUsersSubscription() {
  const queryClient = useQueryClient()
  const addNotification = useAppStore((state) => state.addNotification)

  useEffect(() => {
    const subscription = usersApi.subscribe((payload) => {
      // console.log('User change received:', payload)

      // Invalidate user queries on any change
      invalidateQueries.users()
      invalidateQueries.userStats()

      // Show notification for changes
      if (payload.eventType === 'INSERT') {
        addNotification({
          type: 'info',
          title: 'Novo usuário',
          message: `Um novo usuário foi adicionado ao sistema`,
        })
      } else if (payload.eventType === 'UPDATE') {
        addNotification({
          type: 'info',
          title: 'Usuário atualizado',
          message: `Um usuário foi atualizado`,
        })
      } else if (payload.eventType === 'DELETE') {
        addNotification({
          type: 'warning',
          title: 'Usuário removido',
          message: `Um usuário foi removido do sistema`,
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient, addNotification])
}

// Search users hook with debounce
export function useSearchUsers(searchTerm: string, debounceMs = 300) {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])

  return useUsersWithSchool({
    searchTerm: debouncedTerm,
    limit: 10, // Limit search results
  })
}

// Helper hook for user role management
export function useUserRoleHelpers() {
  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      diretor: 'Diretor(a)',
      secretario: 'Secretário(a)',
      professor: 'Professor(a)',
      responsavel: 'Responsável',
    }
    return labels[role as keyof typeof labels] || role
  }

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      diretor: 'bg-purple-100 text-purple-800 border-purple-200',
      secretario: 'bg-blue-100 text-blue-800 border-blue-200',
      professor: 'bg-green-100 text-green-800 border-green-200',
      responsavel: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const canUserManageRole = (userRole: string, targetRole: string) => {
    const hierarchy = {
      responsavel: 1,
      professor: 2,
      secretario: 3,
      diretor: 4,
      admin: 5,
    }

    const userLevel = hierarchy[userRole as keyof typeof hierarchy] || 0
    const targetLevel = hierarchy[targetRole as keyof typeof hierarchy] || 0

    return userLevel > targetLevel
  }

  return {
    getRoleLabel,
    getRoleColor,
    canUserManageRole,
  }
}

