/**
 * Zod schemas for Brazilian educational data validation
 */

import { z } from 'zod';
import { validateCPF } from './cpf';
import { validateBrazilianPhone } from './phone';

// CPF validation schema
export const cpfSchema = z
  .string()
  .min(1, 'CPF é obrigatório')
  .refine((value) => validateCPF(value), {
    message: 'CPF inválido'
  });

// Brazilian phone validation schema
export const brazilianPhoneSchema = z
  .string()
  .min(1, 'Telefone é obrigatório')
  .refine((value) => validateBrazilianPhone(value), {
    message: 'Número de telefone inválido'
  });

// Student data schema with Brazilian compliance
export const studentSchema = z.object({
  nome_completo: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres'),

  data_nascimento: z
    .string()
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      const age = now.getFullYear() - parsed.getFullYear();
      return age >= 0 && age <= 25; // Reasonable age range for students
    }, {
      message: 'Data de nascimento inválida'
    }),

  cpf: cpfSchema.optional(),

  rg: z
    .string()
    .optional()
    .refine((value) => {
      if (!value) return true;
      // Basic RG validation (7-9 digits)
      const cleaned = value.replace(/\D/g, '');
      return cleaned.length >= 7 && cleaned.length <= 9;
    }, {
      message: 'RG inválido'
    }),

  sexo: z.enum(['M', 'F'], {
    errorMap: () => ({ message: 'Sexo deve ser M ou F' })
  }),

  endereco: z.string().max(200, 'Endereço não pode exceder 200 caracteres').optional(),

  telefone: brazilianPhoneSchema.optional(),

  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),

  nome_mae: z.string().max(100, 'Nome da mãe não pode exceder 100 caracteres').optional(),

  nome_pai: z.string().max(100, 'Nome do pai não pode exceder 100 caracteres').optional(),

  necessidades_especiais: z
    .string()
    .max(500, 'Descrição de necessidades especiais não pode exceder 500 caracteres')
    .optional(),
});

// Guardian/Responsible person schema
export const responsavelSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres'),

  cpf: cpfSchema,

  telefone: brazilianPhoneSchema.optional(),

  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),

  parentesco: z
    .string()
    .min(1, 'Parentesco é obrigatório')
    .max(50, 'Parentesco não pode exceder 50 caracteres'),

  endereco: z.string().max(200, 'Endereço não pode exceder 200 caracteres').optional(),

  profissao: z.string().max(100, 'Profissão não pode exceder 100 caracteres').optional(),
});

// School schema
export const escolaSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome da escola deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da escola não pode exceder 100 caracteres'),

  codigo: z
    .string()
    .min(1, 'Código da escola é obrigatório')
    .max(20, 'Código da escola não pode exceder 20 caracteres'),

  endereco: z.string().max(200, 'Endereço não pode exceder 200 caracteres').optional(),

  telefone: brazilianPhoneSchema.optional(),

  tipo: z.enum(['creche', 'pre_escola', 'fundamental'], {
    errorMap: () => ({ message: 'Tipo de escola inválido' })
  }),
});

// Class (Turma) schema
export const turmaSchema = z.object({
  nome: z
    .string()
    .min(1, 'Nome da turma é obrigatório')
    .max(50, 'Nome da turma não pode exceder 50 caracteres'),

  ano_letivo: z
    .number()
    .int()
    .min(2020)
    .max(new Date().getFullYear() + 1, 'Ano letivo inválido'),

  serie: z
    .string()
    .min(1, 'Série é obrigatória')
    .max(20, 'Série não pode exceder 20 caracteres'),

  capacidade: z
    .number()
    .int()
    .min(1, 'Capacidade deve ser pelo menos 1')
    .max(50, 'Capacidade máxima é 50 alunos'),

  turno: z.enum(['matutino', 'vespertino', 'integral'], {
    errorMap: () => ({ message: 'Turno inválido' })
  }),
});

// User schema with Brazilian educational roles
export const userSchema = z.object({
  nome: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome não pode exceder 100 caracteres'),

  email: z
    .string()
    .email('Email inválido')
    .optional(),

  tipo_usuario: z.enum(['admin', 'diretor', 'secretario', 'professor', 'responsavel'], {
    errorMap: () => ({ message: 'Tipo de usuário inválido' })
  }),
});

// Attendance (Frequencia) schema
export const frequenciaSchema = z.object({
  data_aula: z
    .string()
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      // Allow up to 1 year in the past and 1 day in the future
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return parsed >= yearAgo && parsed <= tomorrow;
    }, {
      message: 'Data da aula inválida'
    }),

  presente: z.boolean(),

  justificativa: z
    .string()
    .max(200, 'Justificativa não pode exceder 200 caracteres')
    .optional(),
});

// Grade (Nota) schema
export const notaSchema = z.object({
  disciplina: z
    .string()
    .min(1, 'Disciplina é obrigatória')
    .max(50, 'Disciplina não pode exceder 50 caracteres'),

  bimestre: z
    .number()
    .int()
    .min(1, 'Bimestre deve ser entre 1 e 4')
    .max(4, 'Bimestre deve ser entre 1 e 4'),

  nota: z
    .number()
    .min(0, 'Nota deve ser entre 0 e 10')
    .max(10, 'Nota deve ser entre 0 e 10'),

  tipo_avaliacao: z
    .string()
    .min(1, 'Tipo de avaliação é obrigatório')
    .max(50, 'Tipo de avaliação não pode exceder 50 caracteres'),

  data_avaliacao: z.string(),

  observacoes: z
    .string()
    .max(500, 'Observações não podem exceder 500 caracteres')
    .optional(),
});

// Export all schemas
export type StudentData = z.infer<typeof studentSchema>;
export type StudentFormData = z.infer<typeof studentSchema>;
export type ResponsavelData = z.infer<typeof responsavelSchema>;
export type EscolaData = z.infer<typeof escolaSchema>;
export type TurmaData = z.infer<typeof turmaSchema>;
export type UserData = z.infer<typeof userSchema>;
export type FrequenciaData = z.infer<typeof frequenciaSchema>;
export type NotaData = z.infer<typeof notaSchema>;