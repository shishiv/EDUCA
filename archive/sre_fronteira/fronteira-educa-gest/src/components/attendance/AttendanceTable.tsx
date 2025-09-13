import React, { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { useSchools } from '@/hooks/useSchools';
import { AttendanceStatus, AttendanceRecord } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

const statusOptions: { value: AttendanceStatus; label: string }[] = [
  { value: 'presente', label: 'Presente' },
  { value: 'falta', label: 'Falta' },
  { value: 'justificada', label: 'Justificada' },
  { value: 'atestado', label: 'Atestado' },
];

export const AttendanceTable = () => {
  const { schools } = useSchools();
  const [schoolId, setSchoolId] = useState<string>('all');
  const [classId, setClassId] = useState<string>('all');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Filtros para o hook
  const filters = {
    classId: classId !== 'all' ? classId : undefined,
    date,
  };

  const { records, isLoading, error, updateAttendance, isUpdating } = useAttendance(filters);

  // Agrupar por aluno
  const students = Array.from(
    new Map(records.map(r => [r.student?.id, r.student])).values()
  ).filter(Boolean);

  // Map de presenças por aluno
  const attendanceMap: Record<string, AttendanceRecord> = {};
  records.forEach(r => {
    if (r.student_id) attendanceMap[r.student_id] = r;
  });

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    const record = attendanceMap[studentId];
    if (record) {
      updateAttendance({ id: record.id, data: { status } });
    }
  };

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
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        {isLoading ? (
          <div className="text-center py-8">Carregando presença...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">Erro ao carregar presença.</div>
        ) : (
          <table className="min-w-full border mt-2">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Aluno</th>
                <th className="border px-2 py-1 text-left">Status</th>
                <th className="border px-2 py-1 text-left">Ação</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td className="border px-2 py-1">{student.name}</td>
                  <td className="border px-2 py-1">
                    <span className="capitalize">{attendanceMap[student.id]?.status || '—'}</span>
                  </td>
                  <td className="border px-2 py-1">
                    <Select
                      value={attendanceMap[student.id]?.status || ''}
                      onValueChange={status => handleStatusChange(student.id, status as AttendanceStatus)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};
