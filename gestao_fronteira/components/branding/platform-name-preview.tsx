'use client'

import { useState } from 'react'
import { MunicipalBrasao, MunicipalLogo } from '@/components/identity/municipal-assets'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PlatformName {
  id: string
  name: string
  slogan: string
  url: string
  category: string
  style: 'modern' | 'institutional' | 'tech' | 'inspirational'
  recommended: boolean
}

const platformNames: PlatformName[] = [
  {
    id: 'edufronteira',
    name: 'EduFronteira',
    slogan: 'A educação na fronteira do futuro',
    url: 'edufronteira.mg.gov.br',
    category: 'Municipal & Regional',
    style: 'modern',
    recommended: true
  },
  {
    id: 'sme-digital',
    name: 'SME Fronteira Digital',
    slogan: 'Educação municipal digitalizada',
    url: 'sme.fronteira.mg.gov.br',
    category: 'Municipal & Regional',
    style: 'institutional',
    recommended: true
  },
  {
    id: 'educonecta',
    name: 'EduConecta Fronteira',
    slogan: 'Conectando educação e tecnologia',
    url: 'educonecta.fronteira.mg.gov.br',
    category: 'Educacional Moderno',
    style: 'tech',
    recommended: true
  },
  {
    id: 'portal-educacao',
    name: 'Portal Fronteira Educação',
    slogan: 'Portal da educação municipal',
    url: 'educacao.fronteira.mg.gov.br',
    category: 'Municipal & Regional',
    style: 'institutional',
    recommended: false
  },
  {
    id: 'rede-fronteira',
    name: 'Rede Fronteira',
    slogan: 'Conectando toda a rede municipal',
    url: 'rede.fronteira.mg.gov.br',
    category: 'Municipal & Regional',
    style: 'modern',
    recommended: true
  },
  {
    id: 'edutech',
    name: 'EduTech Fronteira',
    slogan: 'Tecnologia a serviço da educação',
    url: 'edutech.fronteira.mg.gov.br',
    category: 'Tecnológico & Inovador',
    style: 'tech',
    recommended: false
  },
  {
    id: 'smartedu',
    name: 'Smart Edu Fronteira',
    slogan: 'Educação inteligente para todos',
    url: 'smartedu.fronteira.mg.gov.br',
    category: 'Tecnológico & Inovador',
    style: 'tech',
    recommended: false
  },
  {
    id: 'educar',
    name: 'Educar Fronteira',
    slogan: 'Educar é nossa missão',
    url: 'educar.fronteira.mg.gov.br',
    category: 'Inspiracional',
    style: 'inspirational',
    recommended: false
  }
]

const styleColors = {
  modern: 'bg-fronteira-primary text-fronteira-primary-foreground',
  institutional: 'bg-fronteira-secondary text-fronteira-secondary-foreground',
  tech: 'bg-fronteira-blue text-white',
  inspirational: 'bg-fronteira-green text-white'
}

export function PlatformNamePreview() {
  const [selectedName, setSelectedName] = useState<PlatformName>(platformNames[0])

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <Card className="border-fronteira-primary/20">
        <CardHeader className="text-center bg-gradient-to-r from-fronteira-primary/5 to-transparent">
          <CardTitle className="text-fronteira-primary">
            Preview da Plataforma
          </CardTitle>
          <p className="text-fronteira-gray-500">
            Veja como cada nome ficaria na interface
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Mock Interface */}
          <div className="border border-fronteira-gray-200 rounded-lg overflow-hidden">
            {/* Mock Header */}
            <div className="bg-white border-b border-fronteira-gray-100 p-4">
              <div className="flex items-center space-x-4">
                <MunicipalBrasao size="sm" />
                <div>
                  <h1 className={cn(
                    "text-xl font-bold",
                    selectedName.style === 'modern' && "text-fronteira-primary",
                    selectedName.style === 'institutional' && "text-fronteira-secondary",
                    selectedName.style === 'tech' && "text-fronteira-blue",
                    selectedName.style === 'inspirational' && "text-fronteira-green"
                  )}>
                    {selectedName.name}
                  </h1>
                  <p className="text-sm text-fronteira-gray-500">
                    {selectedName.slogan}
                  </p>
                </div>
              </div>
            </div>

            {/* Mock URL Bar */}
            <div className="bg-fronteira-gray-50 px-4 py-2 border-b">
              <div className="flex items-center space-x-2 text-sm text-fronteira-gray-600">
                <span>🌐</span>
                <span className="font-mono">https://{selectedName.url}</span>
              </div>
            </div>

            {/* Mock Content */}
            <div className="p-6 bg-gradient-to-br from-white to-fronteira-gray-50">
              <div className="text-center space-y-4">
                <MunicipalLogo size="md" />
                <div>
                  <h2 className="text-2xl font-bold text-fronteira-primary mb-2">
                    Bem-vindo ao {selectedName.name}
                  </h2>
                  <p className="text-fronteira-gray-600">
                    {selectedName.slogan}
                  </p>
                </div>
                <Button className={styleColors[selectedName.style]}>
                  Acessar Sistema
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name Options */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {platformNames.map((platform) => (
          <Card
            key={platform.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedName.id === platform.id
                ? "ring-2 ring-fronteira-primary border-fronteira-primary"
                : "border-fronteira-gray-200 hover:border-fronteira-primary/50"
            )}
            onClick={() => setSelectedName(platform)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{platform.name}</CardTitle>
                  <p className="text-sm text-fronteira-gray-500">
                    {platform.slogan}
                  </p>
                </div>
                {platform.recommended && (
                  <Badge variant="secondary" className="bg-fronteira-green/10 text-fronteira-green border-fronteira-green/20">
                    Top 5
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-xs text-fronteira-gray-500">
                  {platform.category}
                </div>
                <div className="text-xs font-mono bg-fronteira-gray-50 p-2 rounded">
                  {platform.url}
                </div>
                <div className="flex justify-between items-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      styleColors[platform.style],
                      "border-current"
                    )}
                  >
                    {platform.style}
                  </Badge>
                  {selectedName.id === platform.id && (
                    <span className="text-xs text-fronteira-primary font-medium">
                      ✓ Selecionado
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Name Details */}
      <Card className="border-fronteira-primary/20">
        <CardHeader>
          <CardTitle className="text-fronteira-primary">
            Detalhes: {selectedName.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-fronteira-gray-900 mb-2">Informações</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Nome:</strong> {selectedName.name}</div>
                <div><strong>Slogan:</strong> {selectedName.slogan}</div>
                <div><strong>Categoria:</strong> {selectedName.category}</div>
                <div><strong>Estilo:</strong> {selectedName.style}</div>
                <div><strong>URL:</strong> {selectedName.url}</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-fronteira-gray-900 mb-2">Aplicações</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Login:</strong> "Acesse o {selectedName.name}"</div>
                <div><strong>Email:</strong> suporte@{selectedName.url}</div>
                <div><strong>Documentos:</strong> "{selectedName.name} - Relatório"</div>
                <div><strong>App Mobile:</strong> "{selectedName.name} Mobile"</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}