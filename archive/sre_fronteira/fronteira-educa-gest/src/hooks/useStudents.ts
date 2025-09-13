
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Student, StudentWithDetails, StudentInsert, StudentFilters, PaginationOptions } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export const useStudents = (filters?: StudentFilters, pagination?: PaginationOptions) => {
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({
    queryKey: ['students', filters, pagination],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select(`
          *,
          school:schools(*),
          class:classes(*),
          guardians(*)
        `, { count: 'exact' });

      // Aplicar filtros
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      if (filters?.schoolId && filters.schoolId !== 'all') {
        query = query.eq('school_id', filters.schoolId);
      }
      if (filters?.classId && filters.classId !== 'all') {
        query = query.eq('class_id', filters.classId);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Filtro por data de matrícula
      if (filters?.enrollmentDateStart) {
        query = query.gte('enrollment_date', filters.enrollmentDateStart);
      }
      if (filters?.enrollmentDateEnd) {
        query = query.lte('enrollment_date', filters.enrollmentDateEnd);
      }

      // Aplicar ordenação
      if (pagination?.sortBy) {
        query = query.order(pagination.sortBy, { ascending: pagination.sortOrder === 'asc' });
      } else {
        query = query.order('name', { ascending: true });
      }

      // Aplicar paginação
      if (pagination) {
        const from = (pagination.page - 1) * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Filtro por responsável (client-side)
      let filteredData = data as StudentWithDetails[];
      if (filters?.guardianSearch) {
        const search = filters.guardianSearch.toLowerCase();
        filteredData = filteredData.filter(student =>
          (student.guardians || []).some(
            g =>
              (g.name && g.name.toLowerCase().includes(search)) ||
              (g.phone && g.phone.replace(/\D/g, '').includes(search.replace(/\D/g, '')))
          )
        );
      }

      return { students: filteredData, totalCount: count ?? 0 };
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: async (studentData: StudentInsert) => {
      const { data, error } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Estudante criado",
        description: "O estudante foi criado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar estudante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentInsert> }) => {
      const { data: result, error } = await supabase
        .from('students')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Estudante atualizado",
        description: "Os dados do estudante foram atualizados com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar estudante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: "Estudante removido",
        description: "O estudante foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover estudante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    students: studentsQuery.data?.students || [],
    totalCount: studentsQuery.data?.totalCount || 0,
    isLoading: studentsQuery.isLoading,
    error: studentsQuery.error,
    createStudent: createStudentMutation.mutate,
    updateStudent: updateStudentMutation.mutate,
    deleteStudent: deleteStudentMutation.mutate,
    isCreating: createStudentMutation.isPending,
    isUpdating: updateStudentMutation.isPending,
    isDeleting: deleteStudentMutation.isPending,
  };
};
