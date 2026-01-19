'use client'

import { School } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface EscolaRequiredStateProps {
  title?: string
  description?: string
  onSelectEscola?: () => void
}

export function EscolaRequiredState({
  title = 'Selecione uma Escola',
  description = 'Para visualizar os dados, selecione uma escola no menu lateral.',
  onSelectEscola
}: EscolaRequiredStateProps) {
  return (
    <Card className="border-dashed border-2 border-yellow-200 bg-yellow-50/50">
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <School className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 max-w-md">{description}</p>
          {onSelectEscola && (
            <Button
              variant="outline"
              onClick={onSelectEscola}
              className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <School className="h-4 w-4 mr-2" />
              Selecionar Escola
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
