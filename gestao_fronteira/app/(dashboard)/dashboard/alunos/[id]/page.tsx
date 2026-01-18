'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Edit,
  User,
  GraduationCap,
  BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'

// New student profile components
import {
  StudentProfileHeader,
  StudentTags,
  StudentInfoGrid,
} from '@/components/students'
import { isInfantilAge } from '@/lib/utils/faixa-etaria'

interface AlunoDetalhado {
  id: string
  nome_completo: string
  data_nascimento: string
  cpf?: string
  sexo: 'M' | 'F'
  endereco?: string
  telefone?: string
  nome_mae?: string
  nome_pai?: string
  necessidades_especiais?: string
  ativo: boolean
  created_at: string
  responsavel: {
    nome: string
    telefone: string
    email?: string
    parentesco: string
  }
  matriculas: {
    id: string
    ano_letivo: number
    situacao: string
    turma: {
      nome: string
      serie: string
      turno?: string
      escola: {
        nome: string
      }
    }
    data_matricula: string
  }[]
  frequencia: {
    percentual: number
    total_aulas: number
    presencas: number
    faltas: number
    faltas_justificadas: number
  }
  notas: {
    disciplina: string
    bimestre1?: number
    bimestre2?: number
    bimestre3?: number
    bimestre4?: number
    media: number
    situacao: string
  }[]
  // Optional fields for Infantil
  bolsa_familia?: boolean
  vivencias_count?: number
}

// Mock data with young student for Infantil demo
const mockAlunoDetalhado: AlunoDetalhado = {
  id: '1',
  nome_completo: 'Lucas Santos Pereira',
  data_nascimento: '2015-11-08',
  cpf: '12345678904',
  sexo: 'M',
  endereco: 'Rua das Flores, 456 - Centro - Fronteira/MG',
  telefone: '(34) 99999-0003',
  nome_mae: 'Carmen Santos',
  nome_pai: 'Carlos Pereira',
  necessidades_especiais: 'Dislexia - acompanhamento pedagogico especializado',
  ativo: true,
  created_at: '2024-01-15T08:00:00Z',
  responsavel: {
    nome: 'Carlos Santos Pereira',
    telefone: '(34) 99999-0003',
    email: 'carlos.santos@email.com',
    parentesco: 'Pai'
  },
  matriculas: [
    {
      id: '1',
      ano_letivo: 2024,
      situacao: 'ativa',
      turma: {
        nome: '5o Ano A',
        serie: '5o Ano',
        turno: 'Matutino',
        escola: {
          nome: 'EMEF Professor Joao Silva'
        }
      },
      data_matricula: '2024-02-01'
    },
    {
      id: '2',
      ano_letivo: 2023,
      situacao: 'concluida',
      turma: {
        nome: '4o Ano B',
        serie: '4o Ano',
        turno: 'Matutino',
        escola: {
          nome: 'EMEF Professor Joao Silva'
        }
      },
      data_matricula: '2023-02-01'
    }
  ],
  frequencia: {
    percentual: 92.5,
    total_aulas: 120,
    presencas: 111,
    faltas: 9,
    faltas_justificadas: 6
  },
  notas: [
    {
      disciplina: 'Portugues',
      bimestre1: 8.0,
      bimestre2: 7.5,
      bimestre3: 8.5,
      media: 8.0,
      situacao: 'cursando'
    },
    {
      disciplina: 'Matematica',
      bimestre1: 9.0,
      bimestre2: 8.5,
      bimestre3: 9.5,
      media: 9.0,
      situacao: 'cursando'
    },
    {
      disciplina: 'Historia',
      bimestre1: 7.5,
      bimestre2: 8.0,
      bimestre3: 7.0,
      media: 7.5,
      situacao: 'cursando'
    },
    {
      disciplina: 'Geografia',
      bimestre1: 8.5,
      bimestre2: 8.0,
      bimestre3: 8.5,
      media: 8.33,
      situacao: 'cursando'
    },
    {
      disciplina: 'Ciencias',
      bimestre1: 9.5,
      bimestre2: 9.0,
      bimestre3: 9.5,
      media: 9.33,
      situacao: 'cursando'
    },
    {
      disciplina: 'Educacao Fisica',
      bimestre1: 10.0,
      bimestre2: 10.0,
      bimestre3: 10.0,
      media: 10.0,
      situacao: 'cursando'
    },
    {
      disciplina: 'Artes',
      bimestre1: 8.0,
      bimestre2: 8.5,
      bimestre3: 8.0,
      media: 8.17,
      situacao: 'cursando'
    }
  ],
  bolsa_familia: false,
  vivencias_count: 0
}

export default function AlunoDetalhesPage() {
  const params = useParams()
  const [aluno, setAluno] = useState<AlunoDetalhado | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAluno()
  }, [params.id])

  const loadAluno = async () => {
    try {
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 500))
      setAluno(mockAlunoDetalhado)
    } catch {
      toast.error('Erro ao carregar dados do aluno')
    } finally {
      setLoading(false)
    }
  }

  const getNotaColor = (nota: number) => {
    if (nota >= 8) return 'text-green-600 font-semibold'
    if (nota >= 6) return 'text-blue-600'
    if (nota >= 4) return 'text-orange-600'
    return 'text-red-600 font-semibold'
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="flex items-start gap-6 mb-6">
            <div className="h-24 w-24 lg:h-[120px] lg:w-[120px] bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-6 bg-gray-200 rounded w-1/6" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (!aluno) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Aluno nao encontrado</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/dashboard/alunos">Voltar para lista</Link>
        </Button>
      </div>
    )
  }

  // Get current matricula info for tags
  const currentMatricula = aluno.matriculas.find(m => m.situacao === 'ativa')
  const isInfantil = isInfantilAge(aluno.data_nascimento)

  return (
    <div className="space-y-6">
      {/* Back button + Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/alunos">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {/* Diario Infantil button for young students */}
          {isInfantil && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/alunos/${aluno.id}/diario`}>
                <BookOpen className="h-4 w-4 mr-2" />
                Ver Diario Infantil
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/dashboard/alunos/${aluno.id}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile Header: Large Avatar + Name + Stats */}
      <StudentProfileHeader
        student={{
          id: aluno.id,
          nome_completo: aluno.nome_completo,
          data_nascimento: aluno.data_nascimento,
          foto_url: null,
        }}
        turma={currentMatricula?.turma ? {
          nome: currentMatricula.turma.nome,
          turno: currentMatricula.turma.turno,
        } : null}
        stats={{
          frequencia: aluno.frequencia.percentual,
          vivencias: aluno.vivencias_count,
        }}
      />

      {/* Tags: Turma, Turno, Bolsa Familia */}
      <StudentTags
        turma={currentMatricula?.turma.nome}
        turno={currentMatricula?.turma.turno}
        bolsaFamilia={aluno.bolsa_familia}
        showBolsaFamilia={true} // TODO: Check user role (gestores only)
        ativo={aluno.ativo}
      />

      {/* Two-Column Info Grid + Tabs */}
      <div className="space-y-6">
        {/* Personal Data + History Grid */}
        <StudentInfoGrid
          student={{
            nome_completo: aluno.nome_completo,
            data_nascimento: aluno.data_nascimento,
            cpf: aluno.cpf,
            sexo: aluno.sexo,
            endereco: aluno.endereco,
            telefone: aluno.telefone,
            nome_mae: aluno.nome_mae,
            nome_pai: aluno.nome_pai,
            necessidades_especiais: aluno.necessidades_especiais,
            created_at: aluno.created_at,
          }}
          responsavel={aluno.responsavel}
          matriculas={aluno.matriculas}
          frequencia={aluno.frequencia}
        />

        {/* Academic Performance (only for Fundamental) */}
        {!isInfantil && aluno.notas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Desempenho Academico - 2024
              </CardTitle>
              <CardDescription>
                Notas por disciplina e bimestre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disciplina</TableHead>
                      <TableHead className="text-center">1o Bim</TableHead>
                      <TableHead className="text-center">2o Bim</TableHead>
                      <TableHead className="text-center">3o Bim</TableHead>
                      <TableHead className="text-center">4o Bim</TableHead>
                      <TableHead className="text-center">Media</TableHead>
                      <TableHead className="text-center">Situacao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aluno.notas.map((nota) => (
                      <TableRow key={nota.disciplina}>
                        <TableCell className="font-medium">{nota.disciplina}</TableCell>
                        <TableCell className={`text-center ${nota.bimestre1 ? getNotaColor(nota.bimestre1) : 'text-gray-400'}`}>
                          {nota.bimestre1?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className={`text-center ${nota.bimestre2 ? getNotaColor(nota.bimestre2) : 'text-gray-400'}`}>
                          {nota.bimestre2?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className={`text-center ${nota.bimestre3 ? getNotaColor(nota.bimestre3) : 'text-gray-400'}`}>
                          {nota.bimestre3?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className={`text-center ${nota.bimestre4 ? getNotaColor(nota.bimestre4) : 'text-gray-400'}`}>
                          {nota.bimestre4?.toFixed(1) || '-'}
                        </TableCell>
                        <TableCell className={`text-center font-semibold ${getNotaColor(nota.media)}`}>
                          {nota.media.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">Cursando</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
