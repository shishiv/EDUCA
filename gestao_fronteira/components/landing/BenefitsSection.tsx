import { Card } from '@/components/ui/card'
import {
  Shield,
  Smartphone,
  Clock,
  FileText
} from 'lucide-react'

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

export function BenefitsSection() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Por que Escolher Nossa Solução?
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
            Desenvolvido especificamente para atender as necessidades da educação municipal brasileira.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-700 text-sm">
                  {benefit.description}
                </p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
