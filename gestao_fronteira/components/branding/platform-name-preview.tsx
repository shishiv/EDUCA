'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette } from 'lucide-react'

export function PlatformNamePreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Visualização de Identidade
        </CardTitle>
        <CardDescription>
          Configuração da identidade visual do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Configuração de identidade em desenvolvimento...
        </p>
      </CardContent>
    </Card>
  )
}
