'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  GraduationCap,
  Users,
  BookOpen,
  BarChart3,
  Shield,
  Smartphone,
  Clock,
  FileText,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  School,
  UserCheck,
  Calendar,
  PieChart,
  CheckCircle,
  ArrowRight,
  Building,
  Heart
} from 'lucide-react'

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      icon: Users,
      title: 'Gestão de Alunos',
      description: 'Cadastro completo de estudantes com dados pessoais, responsáveis e necessidades especiais.',
      details: ['Matrícula digital', 'Histórico escolar', 'Dados familiares', 'Necessidades especiais']
    },
    {
      icon: School,
      title: 'Administração Escolar',
      description: 'Gerenciamento completo de escolas, turmas e professores da rede municipal.',
      details: ['Cadastro de escolas', 'Criação de turmas', 'Atribuição de professores', 'Capacidade e horários']
    },
    {
      icon: UserCheck,
      title: 'Frequência Digital',
      description: 'Sistema de chamada eletrônica com conformidade legal brasileira.',
      details: ['Chamada por tablet', 'Workflow "Abrir aula"', 'Registros imutáveis', 'Relatórios de frequência']
    },
    {
      icon: BarChart3,
      title: 'Relatórios e Analytics',
      description: 'Dashboards e relatórios para gestão educacional baseada em dados.',
      details: ['Dashboard executivo', 'Relatórios de frequência', 'Indicadores educacionais', 'Exportação PDF/Excel']
    }
  ]

  const stats = [
    { icon: School, label: 'Escolas Municipais', value: '15+', color: 'text-blue-600' },
    { icon: Users, label: 'Alunos Atendidos', value: '3.200+', color: 'text-green-600' },
    { icon: GraduationCap, label: 'Professores', value: '180+', color: 'text-purple-600' },
    { icon: BookOpen, label: 'Turmas Ativas', value: '120+', color: 'text-orange-600' }
  ]

  const benefits = [
    {
      icon: Shield,
      title: 'Conformidade Legal',
      description: 'Atende todas as exigências da legislação educacional brasileira'
    },
    {
      icon: Smartphone,
      title: 'Mobile-First',
      description: 'Interface otimizada para tablets e smartphones dos professores'
    },
    {
      icon: Clock,
      title: 'Tempo Real',
      description: 'Atualizações instantâneas e sincronização automática'
    },
    {
      icon: FileText,
      title: 'Relatórios Oficiais',
      description: 'Documentos prontos para auditorias e prestação de contas'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SME Fronteira</h1>
                <p className="text-sm text-gray-600">Sistema de Gestão Escolar</p>
              </div>
            </div>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Acessar Sistema
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="outline" className="mb-4 border-blue-200 text-blue-700">
            Secretaria Municipal de Educação
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transformação Digital da
            <span className="block text-blue-600">Educação em Fronteira/MG</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Sistema completo para gestão da rede municipal de ensino, com foco na
            excelência educacional e conformidade com a legislação brasileira.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                <Users className="mr-2 h-5 w-5" />
                Acessar como Gestor
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 px-8">
                <UserCheck className="mr-2 h-5 w-5" />
                Acessar como Professor
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-none shadow-sm bg-white/60">
                <CardContent className="pt-6">
                  <stat.icon className={`h-8 w-8 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Funcionalidades Completas
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Uma plataforma integrada que atende todas as necessidades da gestão educacional municipal.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all duration-300 ${
                    activeFeature === index
                      ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        activeFeature === index ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="lg:sticky lg:top-32">
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-blue-600 rounded-lg">
                    {React.createElement(features[activeFeature].icon, {
                      className: "h-6 w-6 text-white"
                    })}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {features[activeFeature].title}
                    </h3>
                    <p className="text-gray-600">
                      {features[activeFeature].description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {features[activeFeature].details.map((detail, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{detail}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que Escolher Nossa Solução?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Desenvolvido especificamente para atender as necessidades da educação municipal brasileira.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <benefit.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Municipal Info Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4 border-green-200 text-green-700">
                Município de Fronteira/MG
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Educação de Qualidade para Todos
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                A Secretaria Municipal de Educação de Fronteira está comprometida em oferecer
                educação de excelência para todas as crianças e jovens do município, utilizando
                tecnologia de ponta para modernizar a gestão educacional.
              </p>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Heart className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-gray-700">Educação Infantil (0-5 anos)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700">Ensino Fundamental (6-14 anos)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-gray-700">Educação Inclusiva</span>
                </div>
              </div>
            </div>

            <Card className="p-8">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <span>Secretaria Municipal de Educação</span>
                </CardTitle>
                <CardDescription>
                  Entre em contato para mais informações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">Fronteira, Minas Gerais</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">(34) 3000-0000</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">educacao@fronteira.mg.gov.br</span>
                </div>
                <Separator />
                <div className="pt-2">
                  <Link href="/login">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Acessar Sistema
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-600 rounded-lg p-2">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">SME Fronteira</h3>
                  <p className="text-gray-400 text-sm">Sistema de Gestão Escolar</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Modernizando a educação municipal através da tecnologia e inovação.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Funcionalidades</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Gestão de Alunos</li>
                <li>Administração Escolar</li>
                <li>Frequência Digital</li>
                <li>Relatórios e Analytics</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Documentação</li>
                <li>Treinamento</li>
                <li>Suporte Técnico</li>
                <li>Atualizações</li>
              </ul>
            </div>
          </div>

          <Separator className="my-8 bg-gray-800" />

          <div className="text-center text-sm text-gray-400">
            <p>&copy; 2024 Secretaria Municipal de Educação - Fronteira/MG. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}