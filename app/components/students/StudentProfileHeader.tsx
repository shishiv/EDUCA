'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function parseLocalDate(date: string): Date {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = parseLocalDate(birthDate)
  const beforeBirthday = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  return today.getFullYear() - birth.getFullYear() - Number(beforeBirthday)
}

function StudentStats({ stats }: { stats?: StudentProfileHeaderProps['stats'] }) {
  if (!stats) return null
  return (
    <div className="flex items-center gap-4 mt-2">
      {stats.vivencias === undefined ? null : (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <BookOpen className="h-4 w-4 text-violet-500" />
          <span>{stats.vivencias} {stats.vivencias === 1 ? 'vivência' : 'vivências'}</span>
        </div>
      )}
      {stats.frequencia === undefined ? null : (
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Percent className="h-4 w-4 text-emerald-500" />
          <span>{stats.frequencia}% frequência</span>
        </div>
      )}
    </div>
  )
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
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)

  const age = calculateAge(student.data_nascimento)
  const birthDateLabel = parseLocalDate(student.data_nascimento).toLocaleDateString('pt-BR')
  const showStudentPhoto = Boolean(student.foto_url && failedImageUrl !== student.foto_url)

  return (
    <div className={`flex items-start gap-6 ${className || ''}`}>
      {/* Large Avatar (~120px) */}
      <Avatar className="h-24 w-24 lg:h-[120px] lg:w-[120px] shrink-0">
        {showStudentPhoto && student.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar URLs may be Supabase objects configured per municipality
          <img
            src={student.foto_url}
            alt={student.nome_completo}
            className="aspect-square h-full w-full object-cover"
            onError={() => setFailedImageUrl(student.foto_url || null)}
          />
        ) : (
          <AvatarFallback className="text-2xl lg:text-3xl">
            {getInitials(student.nome_completo)}
          </AvatarFallback>
        )}
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
            {birthDateLabel}
          </span>
        </div>

        {/* Faixa Etaria Badge (for Infantil students) */}
        <FaixaEtariaIndicator birthDate={student.data_nascimento} />

        {/* Stats Row (if provided) */}
        <StudentStats stats={stats} />
      </div>
    </div>
  )
}
