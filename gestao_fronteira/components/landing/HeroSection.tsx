import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users,
  UserCheck,
  School,
  GraduationCap,
  BookOpen
} from 'lucide-react'

const stats = [
  { icon: School, label: 'Escolas Municipais', value: '15+', color: 'text-blue-600' },
  { icon: Users, label: 'Alunos Atendidos', value: '3.200+', color: 'text-green-600' },
  { icon: GraduationCap, label: 'Professores', value: '180+', color: 'text-purple-600' },
  { icon: BookOpen, label: 'Turmas Ativas', value: '120+', color: 'text-orange-600' }
]

export function HeroSection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto text-center">
        <Badge variant="outline" className="mb-4 border-blue-200 text-blue-700">
          Secretaria Municipal de Educação
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Transformação Digital da
          <span className="block text-blue-600">Educação em Fronteira/MG</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
          Sistema completo para gestão da rede municipal de ensino, com foco na
          excelência educacional e conformidade com a legislação brasileira.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center mb-12">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-6 sm:px-8">
              <Users className="mr-2 h-5 w-5" />
              Acessar como Gestor
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-blue-200 text-blue-700 hover:bg-blue-50 px-6 sm:px-8">
              <UserCheck className="mr-2 h-5 w-5" />
              Acessar como Professor
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="text-center border-none shadow-sm bg-white/60">
                <CardContent className="pt-6">
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-700">{stat.label}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
