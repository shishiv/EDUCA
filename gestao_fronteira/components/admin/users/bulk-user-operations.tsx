'use client'

import { useState } from 'react'
import { useBulkUpdateUserStatus, useBulkAssignSchool } from '@/hooks/use-users-query'
import { useAppStore } from '@/lib/stores/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LoadingButton } from '@/components/ui/loading-states'
import {
  CheckCircle,
  XCircle,
  School,
  Users,
  AlertCircle,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react'

export function BulkUserOperations() {
  const [activeOperation, setActiveOperation] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [selectedSchool, setSelectedSchool] = useState('')

  const { bulkSelection, clearBulkSelection } = useAppStore()
  const bulkUpdateStatus = useBulkUpdateUserStatus()
  const bulkAssignSchool = useBulkAssignSchool()

  const selectedCount = bulkSelection.selectedIds.length

  if (selectedCount === 0 || bulkSelection.entity !== 'users') {
    return null
  }

  const handleActivateUsers = async () => {
    try {
      await bulkUpdateStatus.mutateAsync({
        userIds: bulkSelection.selectedIds,
        ativo: true,
        reason: reason || 'Ativação em massa via interface'
      })
      setActiveOperation(null)
      setReason('')
    } catch (error) {
    }
  }

  const handleDeactivateUsers = async () => {
    try {
      await bulkUpdateStatus.mutateAsync({
        userIds: bulkSelection.selectedIds,
        ativo: false,
        reason: reason || 'Desativação em massa via interface'
      })
      setActiveOperation(null)
      setReason('')
    } catch (error) {
    }
  }

  const handleAssignSchool = async () => {
    if (!selectedSchool) return

    try {
      await bulkAssignSchool.mutateAsync({
        userIds: bulkSelection.selectedIds,
        escolaId: selectedSchool
      })
      setActiveOperation(null)
      setSelectedSchool('')
    } catch (error) {
    }
  }

  const isLoading = bulkUpdateStatus.isPending || bulkAssignSchool.isPending

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="font-medium text-blue-900">
              Operações em Massa
            </h3>
            <p className="text-sm text-blue-700">
              <Badge variant="outline" className="mr-2">
                {selectedCount}
              </Badge>
              usuários selecionados
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearBulkSelection}
          className="text-blue-600 hover:text-blue-700"
        >
          Cancelar Seleção
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Activate Users */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="bg-green-50 border-green-200 hover:bg-green-100"
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Ativar Usuários
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                Ativar Usuários
              </DialogTitle>
              <DialogDescription>
                Esta ação irá ativar {selectedCount} usuários selecionados.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Usuários ativados poderão fazer login e acessar o sistema conforme suas permissões.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="activate-reason">Motivo (opcional)</Label>
                <Textarea
                  id="activate-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo da ativação..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <LoadingButton
                  onClick={handleActivateUsers}
                  loading={bulkUpdateStatus.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ativar {selectedCount} Usuários
                </LoadingButton>

                <Button variant="outline" onClick={() => setReason('')}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Deactivate Users */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="bg-red-50 border-red-200 hover:bg-red-100"
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Desativar Usuários
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-600" />
                Desativar Usuários
              </DialogTitle>
              <DialogDescription>
                Esta ação irá desativar {selectedCount} usuários selecionados.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Atenção:</strong> Usuários desativados não poderão fazer login no sistema.
                  Esta ação pode ser revertida posteriormente.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="deactivate-reason">Motivo (recomendado)</Label>
                <Textarea
                  id="deactivate-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo da desativação..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <LoadingButton
                  onClick={handleDeactivateUsers}
                  loading={bulkUpdateStatus.isPending}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Desativar {selectedCount} Usuários
                </LoadingButton>

                <Button variant="outline" onClick={() => setReason('')}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign School */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="bg-blue-50 border-blue-200 hover:bg-blue-100"
              disabled={isLoading}
            >
              <School className="h-4 w-4 mr-2" />
              Atribuir Escola
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-blue-600" />
                Atribuir Escola
              </DialogTitle>
              <DialogDescription>
                Atribua uma escola específica para {selectedCount} usuários selecionados.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta ação irá limitar o acesso dos usuários apenas aos dados da escola selecionada.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="school-select">Escola *</Label>
                <Select
                  value={selectedSchool}
                  onValueChange={setSelectedSchool}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma escola" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escola-1">CEMEI Pequenos Passos</SelectItem>
                    <SelectItem value="escola-2">EMEI Jardim da Infância</SelectItem>
                    <SelectItem value="escola-3">EMEF Professor João Silva</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-1">
                  Usuários terão acesso limitado aos dados desta escola
                </p>
              </div>

              <div className="flex gap-2">
                <LoadingButton
                  onClick={handleAssignSchool}
                  loading={bulkAssignSchool.isPending}
                  disabled={!selectedSchool}
                >
                  <School className="h-4 w-4 mr-2" />
                  Atribuir para {selectedCount} Usuários
                </LoadingButton>

                <Button variant="outline" onClick={() => setSelectedSchool('')}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Users - Commented out for safety */}
        {/*
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="bg-red-50 border-red-200 hover:bg-red-100 text-red-700"
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Usuários
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Excluir Usuários
              </DialogTitle>
              <DialogDescription>
                Esta ação irá excluir permanentemente {selectedCount} usuários selecionados.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>ATENÇÃO:</strong> Esta ação é irreversível. Todos os dados dos usuários serão perdidos permanentemente.
                Considere desativar os usuários ao invés de excluí-los.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 pt-4">
              <Button variant="destructive" disabled>
                Excluir {selectedCount} Usuários (Desabilitado por Segurança)
              </Button>
              <Button variant="outline">Cancelar</Button>
            </div>
          </DialogContent>
        </Dialog>
        */}
      </div>

      {/* Operation Status */}
      {isLoading && (
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">
              Processando operação em massa...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}