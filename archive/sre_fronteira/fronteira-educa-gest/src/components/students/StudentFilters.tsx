
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter } from 'lucide-react';
import { StudentFilters as FiltersType } from '@/lib/types';
import { useSchools, useClasses } from '@/hooks/useSchools';

interface StudentFiltersProps {
  filters: FiltersType & {
    guardianSearch?: string;
    enrollmentDateStart?: string;
    enrollmentDateEnd?: string;
  };
  onFiltersChange: (filters: StudentFiltersProps['filters']) => void;
}

export const StudentFilters = ({ filters, onFiltersChange }: StudentFiltersProps) => {
  const { schools } = useSchools();
  const { classes } = useClasses(filters.schoolId);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };

    // Reset class filter when school changes
    if (key === 'schoolId') {
      newFilters.classId = 'all';
    }

    onFiltersChange(newFilters);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Busca por nome */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Buscar por nome..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Busca por responsável */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Buscar por responsável (nome ou telefone)..."
              value={filters.guardianSearch || ''}
              onChange={(e) => handleFilterChange('guardianSearch', e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro por escola */}
          <Select value={filters.schoolId} onValueChange={(value) => handleFilterChange('schoolId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a escola" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as escolas</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por turma */}
          <Select value={filters.classId} onValueChange={(value) => handleFilterChange('classId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} - {cls.grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por status */}
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="transferido">Transferido</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="graduado">Graduado</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por data de matrícula (início) */}
          <Input
            type="date"
            value={filters.enrollmentDateStart || ''}
            onChange={e => handleFilterChange('enrollmentDateStart', e.target.value)}
            placeholder="Data matrícula (início)"
          />

          {/* Filtro por data de matrícula (fim) */}
          <Input
            type="date"
            value={filters.enrollmentDateEnd || ''}
            onChange={e => handleFilterChange('enrollmentDateEnd', e.target.value)}
            placeholder="Data matrícula (fim)"
          />
        </div>
      </CardContent>
    </Card>
  );
};
