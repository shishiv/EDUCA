import React, { useState } from 'react';
import { useDiary } from '@/hooks/useDiary';
import { useSchools } from '@/hooks/useSchools';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, addDays } from 'date-fns';

export const DiaryCalendar = () => {
  const { schools } = useSchools();
  const [schoolId, setSchoolId] = useState<string>('all');
  const [classId, setClassId] = useState<string>('all');
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Filtros para o hook
  const filters = {
    classId: classId !== 'all' ? classId : undefined,
  };

  // Buscar observações para a semana
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [selectedDay, setSelectedDay] = useState<Date>(days[0]);
  const { entries, isLoading, error } = useDiary({
    ...filters,
    date: format(selectedDay, 'yyyy-MM-dd'),
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <Select value={schoolId} onValueChange={setSchoolId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a escola" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as escolas</SelectItem>
              {schools.map(school => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* TODO: Select de turma baseado na escola */}
          <div className="flex space-x-2">
            {days.map(day => (
              <button
                key={day.toISOString()}
                className={`px-3 py-1 rounded ${format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd') ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setSelectedDay(day)}
              >
                {format(day, 'EEE dd/MM')}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="text-center py-8">Carregando observações...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">Erro ao carregar observações.</div>
        ) : (
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Nenhuma observação para este dia.</div>
            ) : (
              entries.map(entry => (
                <Card key={entry.id} className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="font-medium text-gray-900">Observação</div>
                    <div className="text-gray-700 mt-1">{entry.content}</div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
