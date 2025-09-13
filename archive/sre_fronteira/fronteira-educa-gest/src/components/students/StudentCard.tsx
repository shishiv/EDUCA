
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StudentWithDetails } from '@/lib/types';
import { Edit, Trash2, User, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentCardProps {
  student: StudentWithDetails;
  onEdit: (student: StudentWithDetails) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
}

export const StudentCard = ({ student, onEdit, onDelete, canEdit = true }: StudentCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'transferido': return 'bg-blue-100 text-blue-800';
      case 'inativo': return 'bg-gray-100 text-gray-800';
      case 'graduado': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo': return 'Ativo';
      case 'transferido': return 'Transferido';
      case 'inativo': return 'Inativo';
      case 'graduado': return 'Graduado';
      default: return status;
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const primaryGuardian = student.guardians?.find(g => g.is_primary) || student.guardians?.[0];

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{student.name}</h3>
              <p className="text-sm text-gray-600">
                {calculateAge(student.birth_date)} anos • {student.enrollment_number || 'Sem matrícula'}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(student.status)}>
            {getStatusLabel(student.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {student.school?.name} {student.class?.name && `• ${student.class.name}`}
            </span>
          </div>
          
          {primaryGuardian && (
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                {primaryGuardian.name} • {primaryGuardian.phone || 'Sem telefone'}
              </span>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Nascimento: {format(new Date(student.birth_date), 'dd/MM/yyyy', { locale: ptBR })}
          </div>
        </div>

        {canEdit && (
          <div className="flex space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(student)}
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(student.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
