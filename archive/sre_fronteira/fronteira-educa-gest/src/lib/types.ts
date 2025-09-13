
import { Database } from "@/integrations/supabase/types";

// Tipos das tabelas do banco
export type School = Database['public']['Tables']['schools']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Class = Database['public']['Tables']['classes']['Row'];
export type Guardian = Database['public']['Tables']['guardians']['Row'];
export type Attendance = Database['public']['Tables']['attendance']['Row'];

// Tipos para frequência
export type AttendanceRecord = Attendance & {
  student?: Student;
  class?: Class;
  school?: School;
};

export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert'];

export type DiaryEntry = Database['public']['Tables']['diary_entries']['Row'];
export type DiaryInsert = Database['public']['Tables']['diary_entries']['Insert'];

// Tipos para inserção
export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type GuardianInsert = Database['public']['Tables']['guardians']['Insert'];

// Enums
export type StudentStatus = Database['public']['Enums']['student_status'];
export type UserRole = Database['public']['Enums']['user_role'];
export type AttendanceStatus = Database['public']['Enums']['attendance_status'];
export type GuardianRelationship = Database['public']['Enums']['guardian_relationship'];
export type SchoolType = Database['public']['Enums']['school_type'];

// Tipos estendidos para componentes
export interface StudentWithDetails extends Student {
  school?: School;
  class?: Class;
  guardians?: Guardian[];
}

export interface StudentFilters {
  search: string;
  schoolId: string;
  classId: string;
  status: StudentStatus | 'all';
  guardianSearch?: string;
  enrollmentDateStart?: string;
  enrollmentDateEnd?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
