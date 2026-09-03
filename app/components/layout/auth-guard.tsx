'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { hasPermission, canAccessSchool } from '@/lib/auth'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslations } from 'next-intl'
import type { RouteRole } from '@/lib/route-policy'

export interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: RouteRole[]
  requiredSchoolId?: string
  fallbackPath?: string
}

export function AuthGuard({
  children,
  allowedRoles,
  requiredSchoolId,
  fallbackPath = '/unauthorized'
}: AuthGuardProps) {
  const t = useTranslations('layout.authGuard')
  const common = useTranslations('common.status')
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Check if user is authenticated
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user profile is loaded
      if (!userProfile) {
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
          <p className="text-gray-600">{common('loading')}</p>
        </div>
      </div>
    )
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
            {t('profileError')}
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
