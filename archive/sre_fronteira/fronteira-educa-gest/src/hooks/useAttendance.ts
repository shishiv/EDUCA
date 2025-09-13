import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AttendanceRecord, AttendanceInsert, AttendanceStatus, PaginationOptions } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

interface AttendanceFilters {
  classId?: string;
  date?: string;
  status?: AttendanceStatus | 'all';
  studentId?: string;
}

export const useAttendance = (filters?: AttendanceFilters, pagination?: PaginationOptions) => {
  const queryClient = useQueryClient();

  const attendanceQuery = useQuery({
    queryKey: ['attendance', filters, pagination],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          student:students(*),
          class:classes(*),
          school:schools(*)
        `, { count: 'exact' });

      if (filters?.classId) {
        query = query.eq('class_id', filters.classId);
      }
      if (filters?.date) {
        query = query.eq('date', filters.date);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId);
      }

      // Paginação
      if (pagination) {
        const from = (pagination.page - 1) * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Corrigir possíveis erros de join (school/class/student)
      type AttendanceRecordRaw = Omit<AttendanceRecord, 'student' | 'class' | 'school'> & {
        student?: unknown;
        class?: unknown;
        school?: unknown;
      };
      const records = (data as AttendanceRecordRaw[]).map((rec) => ({
        ...rec,
        student:
          typeof rec.student === 'object' && rec.student !== null && !(rec.student as { error?: boolean }).error
            ? rec.student
            : undefined,
        class:
          typeof rec.class === 'object' && rec.class !== null && !(rec.class as { error?: boolean }).error
            ? rec.class
            : undefined,
        school:
          typeof rec.school === 'object' && rec.school !== null && !(rec.school as { error?: boolean }).error
            ? rec.school
            : undefined,
      })) as AttendanceRecord[];

      return { records, totalCount: count ?? 0 };
    },
  });

  const createAttendanceMutation = useMutation({
    mutationFn: async (attendance: AttendanceInsert) => {
      const { data, error } = await supabase
        .from('attendance')
        .insert(attendance)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({
        title: "Presença registrada",
        description: "A presença foi registrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AttendanceInsert> }) => {
      const { data: result, error } = await supabase
        .from('attendance')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({
        title: "Presença atualizada",
        description: "O registro de presença foi atualizado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar presença",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    records: attendanceQuery.data?.records || [],
    totalCount: attendanceQuery.data?.totalCount || 0,
    isLoading: attendanceQuery.isLoading,
    error: attendanceQuery.error,
    createAttendance: createAttendanceMutation.mutate,
    updateAttendance: updateAttendanceMutation.mutate,
    isCreating: createAttendanceMutation.isPending,
    isUpdating: updateAttendanceMutation.isPending,
  };
};
