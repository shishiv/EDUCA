'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle, Clock } from 'lucide-react'
import type { TurmaWithDetails } from '@/app/api/turmas/minhas/route'

const turnoColors = {
  matutino: 'bg-jardim-green-500',
  vespertino: 'bg-jardim-blue-500',
  integral: 'bg-jardim-yellow-400',
}

const turnoLabels = {
  matutino: 'Manhã',
  vespertino: 'Tarde',
  integral: 'Integral',
}

export function MinhasTurmasCard() {
  const [turmas, setTurmas] = useState<TurmaWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTurmas = async () => {
      try {
        const res = await fetch('/api/turmas/minhas?limit=5')
        if (res.ok) {
          const data = await res.json()
          setTurmas(data.turmas || [])
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchTurmas()
  }, [])

  if (loading) {
    return (
      <Card className="bg-white rounded-card border border-gray-200 shadow-card">
        <CardHeader className="flex flex-row justify-between items-center border-b border-gray-100 px-6 py-5">
          <CardTitle className="font-display font-semibold text-gray-800">
            Minhas Turmas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white rounded-card border border-gray-200 shadow-card">
      <CardHeader className="flex flex-row justify-between items-center border-b border-gray-100 px-6 py-5">
        <CardTitle className="font-display font-semibold text-gray-800">
          Minhas Turmas
        </CardTitle>
        <Link href="/dashboard/turmas" className="text-sm text-jardim-green-600 font-medium hover:underline">
          Ver todas →
        </Link>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        {turmas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Nenhuma turma atribuída</p>
          </div>
        ) : (
          turmas.map((turma) => (
            <Link key={turma.id} href={`/dashboard/turmas/${turma.id}`}>
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-jardim-green-50 cursor-pointer transition-colors">
                <div className={`w-2 h-12 rounded ${turnoColors[turma.turno]}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{turma.nome}</p>
                    {turma.chamada_hoje ? (
                      <CheckCircle className="w-4 h-4 text-jardim-green-500" title="Chamada feita" />
                    ) : (
                      <Clock className="w-4 h-4 text-jardim-yellow-500" title="Chamada pendente" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {turnoLabels[turma.turno]} • {turma.escola?.nome || 'Sem escola'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-semibold text-gray-800">{turma.total_alunos}</p>
                  <p className="text-xs text-gray-500">alunos</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
