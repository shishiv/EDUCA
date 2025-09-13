import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;
import { DiaryInsert, PaginationOptions } from '@/lib/types';

import { toast } from '@/hooks/use-toast';

// Tipo simplificado para evitar recursão profunda
export type DiaryEntryLite = {
  id: string;
  content: string;
  date: string;
  class_id: string;
  student_id?: string;
  student?: { id: string; name: string } | undefined;
  class?: { id: string; name: string } | undefined;
};

interface DiaryFilters {
  classId?: string;
  date?: string;
  studentId?: string;
}

export const useDiary = (filters?: DiaryFilters, pagination?: PaginationOptions) => {
  const queryClient = useQueryClient();

  // Função auxiliar para parse seguro dos dados do Supabase
  function parseDiaryEntries(data: unknown[]): DiaryEntryLite[] {
    type DiaryEntryRaw = Omit<DiaryEntryLite, 'student' | 'class'> & {
      student?: unknown;
      class?: unknown;
    };
    return data.map((rec) => {
      const r = rec as DiaryEntryRaw;
      return {
        id: r.id,
        content: r.content,
        date: r.date,
        class_id: r.class_id,
        student_id: r.student_id,
        student:
          typeof r.student === 'object' && r.student !== null && !(r.student as { error?: boolean }).error
            ? (r.student as { id: string; name: string })
            : undefined,
        class:
          typeof r.class === 'object' && r.class !== null && !(r.class as { error?: boolean }).error
            ? (r.class as { id: string; name: string })
            : undefined,
      };
    });
  }

  async function fetchDiaryEntries(
    filters?: DiaryFilters,
    pagination?: PaginationOptions
  ): Promise<{ entries: DiaryEntryLite[]; totalCount: number }> {
    let query = supabase
      .from('diary_entries')
      .select(
        `
        *,
        student:students(id, name),
        class:classes(id, name)
      `,
        { count: 'exact' }
      );

    if (filters?.classId) {
      query = query.eq('class_id', filters.classId);
    }
    if (filters?.date) {
      query = query.eq('date', filters.date);
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

    const result = (await query) as unknown as { data: unknown[]; error: unknown; count: number };
    if (result.error) throw result.error;

    const entries = parseDiaryEntries(result.data);

    return { entries, totalCount: result.count ?? 0 };
  }

  const diaryQuery = useQuery<{ entries: DiaryEntryLite[]; totalCount: number }, unknown>({
    queryKey: ['diary', filters, pagination],
    queryFn: () => fetchDiaryEntries(filters, pagination),
  });

  const createDiaryMutation = useMutation({
    mutationFn: async (entry: DiaryInsert) => {
      const { data, error } = await supabase
        .from('diary_entries')
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      toast({
        title: "Observação registrada",
        description: "A observação foi registrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar observação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDiaryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DiaryInsert> }) => {
      const { data: result, error } = await supabase
        .from('diary_entries')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      toast({
        title: "Observação atualizada",
        description: "O registro de observação foi atualizado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar observação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    entries: Array.isArray(diaryQuery.data?.entries)
      ? (diaryQuery.data?.entries as DiaryEntryLite[])
      : [],
    totalCount: typeof diaryQuery.data?.totalCount === 'number'
      ? diaryQuery.data?.totalCount
      : 0,
    isLoading: diaryQuery.isLoading,
    error: diaryQuery.error,
    createDiary: createDiaryMutation.mutate,
    updateDiary: updateDiaryMutation.mutate,
    isCreating: createDiaryMutation.isPending,
    isUpdating: updateDiaryMutation.isPending,
  } as {
    entries: DiaryEntryLite[];
    totalCount: number;
    isLoading: boolean;
    error: unknown;
    createDiary: typeof createDiaryMutation.mutate;
    updateDiary: typeof updateDiaryMutation.mutate;
    isCreating: boolean;
    isUpdating: boolean;
  };
};
