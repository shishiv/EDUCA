'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FaixaEtariaIndicator } from './FaixaEtariaIndicator'
import { BookOpen, Percent } from 'lucide-react'

interface StudentProfileHeaderProps {
  student: {
    id: string
    nome_completo: string
    data_nascimento: string
    foto_url?: string | null
  }
  turma?: {
    nome: string
    turno?: string
  } | null
  stats?: {
    vivencias?: number
    frequencia?: number
  }
  className?: string
}

/**
 * Large avatar header with student name, age info, and optional stats.
 * Avatar is ~120px on desktop, responsive on mobile.
 */
export function StudentProfileHeader({
  student,
  stats,
  className,
}: StudentProfileHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--
    }

    return age
  }

  const age = calculateAge(student.data_nascimento)

  return (
    <div className={`flex items-start gap-6 ${className || ''}`}>
      {/* Large Avatar (~120px) */}
      <Avatar className="h-24 w-24 lg:h-[120px] lg:w-[120px] shrink-0">
        {student.foto_url && (
          <AvatarImage src={student.foto_url} alt={student.nome_completo} />
        )}
        <AvatarFallback className="text-2xl lg:text-3xl">
          {getInitials(student.nome_completo)}
        </AvatarFallback>
      </Avatar>

      {/* Name + Info Column */}
      <div className="flex flex-col gap-2 min-w-0">
        {/* Name */}
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 truncate">
          {student.nome_completo}
        </h1>

        {/* Age + Birth Date */}
        <div className="flex items-center gap-3 text-gray-600">
          <span className="text-base">
            {age} {age === 1 ? 'ano' : 'anos'}
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-sm">
            {new Date(student.data_nascimento).toLocaleDateString('pt-BR')}
          </span>
        </div>

        {/* Faixa Etaria Badge (for Infantil students) */}
        <FaixaEtariaIndicator birthDate={student.data_nascimento} />

        {/* Stats Row (if provided) */}
        {stats && (stats.vivencias !== undefined || stats.frequencia !== undefined) && (
          <div className="flex items-center gap-4 mt-2">
            {stats.vivencias !== undefined && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <BookOpen className="h-4 w-4 text-violet-500" />
                <span>
                  {stats.vivencias} {stats.vivencias === 1 ? 'vivencia' : 'vivencias'}
                </span>
              </div>
            )}
            {stats.frequencia !== undefined && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Percent className="h-4 w-4 text-emerald-500" />
                <span>{stats.frequencia}% frequencia</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
