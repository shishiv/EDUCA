
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { School, Class } from '@/lib/types';

export const useSchools = () => {
  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as School[];
    },
  });

  return {
    schools: schoolsQuery.data || [],
    isLoading: schoolsQuery.isLoading,
    error: schoolsQuery.error,
  };
};

export const useClasses = (schoolId?: string) => {
  const classesQuery = useQuery({
    queryKey: ['classes', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('classes')
        .select('*')
        .order('name');

      if (schoolId && schoolId !== 'all') {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Class[];
    },
    enabled: !!schoolId,
  });

  return {
    classes: classesQuery.data || [],
    isLoading: classesQuery.isLoading,
    error: classesQuery.error,
  };
};
