'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  School,
  UserCheck,
  BarChart3,
  CheckCircle
} from 'lucide-react'

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

export function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(0)

  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Funcionalidades Completas
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
            Uma plataforma integrada que atende todas as necessidades da gestão educacional municipal.
          </p>
        </div>

        <div className="grid gap-12 items-start lg:grid-cols-2">
          <div className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all duration-300 transform ${
                    activeFeature === index
                      ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200 scale-[1.02]'
                      : 'hover:bg-gray-50 hover:scale-[1.01]'
                  }`}
                  onClick={() => setActiveFeature(index)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg transition-colors ${
                        activeFeature === index ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="h-5 w-5" />
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
              )
            })}
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
                  <p className="text-gray-700">
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
  )
}
