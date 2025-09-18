'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission, canAccessSchool } from '@/lib/auth'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel')[]
  requiredSchoolId?: string
  fallbackPath?: string
}

export function AuthGuard({
  children,
  allowedRoles,
  requiredSchoolId,
  fallbackPath = '/unauthorized'
}: AuthGuardProps) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Development mode bypass
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        const devBypass = localStorage.getItem('dev_auth_bypass')
        if (devBypass === 'true') {
          // console.log('Development auth bypass active')
          return
        }
      }

      // Check if user is authenticated
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user profile is loaded
      if (!userProfile) {
        // console.warn('User authenticated but profile not loaded')
        return
      }

      // Check role-based access
      if (allowedRoles && !hasPermission(userProfile.tipo_usuario, allowedRoles)) {
        //         // console.warn('User does not have required role:', {
        //           userRole: userProfile.tipo_usuario,
        //           requiredRoles: allowedRoles
        //         })
        router.push(fallbackPath)
        return
      }

      // Check school-based access
      if (requiredSchoolId && !canAccessSchool(userProfile, requiredSchoolId)) {
        //         // console.warn('User cannot access required school:', {
        //           userSchool: userProfile.escola_id,
        //           requiredSchool: requiredSchoolId
        //         })
        router.push(fallbackPath)
        return
      }
    }
  }, [user, userProfile, loading, router, allowedRoles, requiredSchoolId, fallbackPath])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // Development mode bypass check
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const devBypass = localStorage.getItem('dev_auth_bypass')
    if (devBypass === 'true') {
      return <>{children}</>
    }
  }

  // User not authenticated
  if (!user) {
    return null
  }

  // User profile not loaded
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar perfil do usuário. Tente fazer login novamente.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Role-based access check
  if (allowedRoles && !hasPermission(userProfile.tipo_usuario, allowedRoles)) {
    return null
  }

  // School-based access check
  if (requiredSchoolId && !canAccessSchool(userProfile, requiredSchoolId)) {
    return null
  }

  return <>{children}</>
}