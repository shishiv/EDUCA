/**
 * Brazilian Educational Field Help Configuration
 * Comprehensive help system for municipal school administration
 * Includes INEP compliance, LGPD requirements, and practical guidance
 */

import { FieldHelpConfig } from '@/components/ui/enhanced-form'

/**
 * Complete field help configuration for Brazilian educational system
 */
export const brazilianEducationalFieldHelp: Record<string, FieldHelpConfig> = {
  // Personal Identification
  cpf: {
    title: 'CPF (Cadastro de Pessoas Físicas)',
    description: 'Documento de identificação fiscal obrigatório para todos os cidadãos brasileiros.',
    examples: ['123.456.789-09', '987.654.321-00'],
    validation: 'O CPF deve conter 11 dígitos e passar na validação matemática oficial.',
    compliance: 'Obrigatório para Educacenso/INEP. Protegido pela LGPD - uso apenas para fins educacionais.'
  },

  rg: {
    title: 'RG (Registro Geral)',
    description: 'Documento de identidade civil emitido pelos órgãos estaduais de identificação.',
    examples: ['12.345.678-9', 'MG-12.345.678'],
    validation: 'Formato varia por estado. Aceita números e letras conforme órgão emissor.',
    compliance: 'Documento secundário para confirmação de identidade. Dados protegidos pela LGPD.'
  },

  // Contact Information
  phone: {
    title: 'Telefone de Contato',
    description: 'Número para contato direto com estudante ou responsável legal.',
    examples: ['(31) 99999-8888 (celular)', '(31) 3333-4444 (fixo)'],
    validation: 'Formato brasileiro: (XX) XXXXX-XXXX para celular ou (XX) XXXX-XXXX para fixo.',
    compliance: 'Essencial para comunicação escolar e emergências. Consentimento LGPD necessário.'
  },

  email: {
    title: 'E-mail Institucional/Pessoal',
    description: 'Endereço eletrônico para comunicações oficiais e notificações escolares.',
    examples: ['joao.silva@email.com', 'responsavel@gmail.com'],
    validation: 'Deve seguir formato padrão de e-mail com @ e domínio válido.',
    compliance: 'Usado para comunicação oficial. Consentimento para uso educacional obrigatório.'
  },

  // Address Information
  cep: {
    title: 'CEP (Código de Endereçamento Postal)',
    description: 'Código postal brasileiro que identifica a localização geográfica.',
    examples: ['38880-000', '01310-100'],
    validation: 'Formato: XXXXX-XXX. Sistema busca automaticamente o endereço.',
    compliance: 'Usado para estatísticas educacionais e planejamento de transporte escolar.'
  },

  endereco: {
    title: 'Endereço Residencial Completo',
    description: 'Endereço completo para correspondência e localização do estudante.',
    examples: ['Rua das Flores, 123, Centro', 'Av. Brasil, 456, Apt 12, Jardins'],
    validation: 'Deve incluir rua, número e bairro. Complemento opcional.',
    compliance: 'Necessário para zoneamento escolar e transporte. Dados sensíveis LGPD.'
  },

  // Family Information
  nome_mae: {
    title: 'Nome da Mãe/Responsável Maternal',
    description: 'Nome completo da mãe ou responsável legal feminino.',
    examples: ['Maria Silva Santos', 'Ana Paula Oliveira'],
    validation: 'Nome completo obrigatório. Mínimo 2 palavras.',
    compliance: 'Obrigatório para Educacenso. Usado para identificação e contato familiar.'
  },

  nome_pai: {
    title: 'Nome do Pai/Responsável Paternal',
    description: 'Nome completo do pai ou responsável legal masculino.',
    examples: ['João Carlos Silva', 'Pedro Santos Oliveira'],
    validation: 'Nome completo. Campo opcional conforme nova legislação.',
    compliance: 'Opcional desde 2021. Quando informado, usado para identificação familiar.'
  },

  responsavel_legal: {
    title: 'Responsável Legal Principal',
    description: 'Pessoa legalmente responsável pelo estudante menor de idade.',
    examples: ['Mãe', 'Pai', 'Avó', 'Tutor legal'],
    validation: 'Deve ter relação legal comprovada com o estudante.',
    compliance: 'Obrigatório para menores. Define quem pode tomar decisões educacionais.'
  },

  // Educational Information
  serie_ano: {
    title: 'Série/Ano Escolar',
    description: 'Nível educacional correspondente à idade e progressão do estudante.',
    examples: ['1º Ano EF', '5º Ano EF', '1º Ano EM'],
    validation: 'Deve corresponder ao sistema brasileiro de educação básica.',
    compliance: 'Obrigatório para Educacenso. Define recursos e currículo aplicável.'
  },

  turma: {
    title: 'Turma/Classe',
    description: 'Divisão específica dentro do ano escolar para organização pedagógica.',
    examples: ['1º A', '5º B - Manhã', '2º EM - Tarde'],
    validation: 'Código único na escola. Pode incluir turno.',
    compliance: 'Essencial para organização e relatórios de frequência.'
  },

  escola_origem: {
    title: 'Escola de Origem (Transferência)',
    description: 'Instituição educacional anterior em caso de transferência.',
    examples: ['E.M. João Silva', 'Colégio São José', 'Escola Rural do Campo'],
    validation: 'Nome oficial da instituição e cidade/estado.',
    compliance: 'Obrigatório para transferências. Facilita continuidade educacional.'
  },

  // Health and Special Needs
  necessidades_especiais: {
    title: 'Necessidades Educacionais Especiais',
    description: 'Condições que requerem adaptações curriculares ou de acessibilidade.',
    examples: ['Deficiência visual', 'Autismo', 'Dislexia', 'Cadeirante'],
    validation: 'Baseado em laudo médico ou psicopedagógico oficial.',
    compliance: 'Protegido por sigilo médico. Usado apenas para adaptações educacionais.'
  },

  medicamentos: {
    title: 'Medicamentos de Uso Contínuo',
    description: 'Medicações que o estudante deve tomar durante o período escolar.',
    examples: ['Ritalina 10mg - 2x dia', 'Insulina conforme glicemia'],
    validation: 'Deve incluir dosagem e frequência. Receita médica obrigatória.',
    compliance: 'Informação médica sigilosa. Acesso restrito à equipe autorizada.'
  },

  // Academic Information
  data_nascimento: {
    title: 'Data de Nascimento',
    description: 'Data oficial de nascimento conforme certidão civil.',
    examples: ['15/03/2010', '28/12/2008'],
    validation: 'Formato DD/MM/AAAA. Deve ser consistente com documentos oficiais.',
    compliance: 'Obrigatório para Educacenso. Usado para cálculo de idade/série adequada.'
  },

  sexo: {
    title: 'Sexo Biológico',
    description: 'Sexo biológico conforme registro civil oficial.',
    examples: ['Masculino', 'Feminino'],
    validation: 'Deve corresponder ao documento de identidade.',
    compliance: 'Campo obrigatório para estatísticas educacionais do INEP.'
  },

  cor_raca: {
    title: 'Cor/Raça (Autodeclaração)',
    description: 'Classificação étnico-racial conforme critérios do IBGE.',
    examples: ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena'],
    validation: 'Baseado em autodeclaração ou declaração do responsável.',
    compliance: 'Obrigatório para políticas afirmativas e estatísticas educacionais.'
  },

  // Financial Information
  bolsa_familia: {
    title: 'Beneficiário Bolsa Família',
    description: 'Participação em programas sociais de transferência de renda.',
    examples: ['Sim - NIS: 12345678901', 'Não'],
    validation: 'Se sim, deve informar NIS (Número de Identificação Social).',
    compliance: 'Obrigatório para controle de condicionalidades educacionais.'
  },

  renda_familiar: {
    title: 'Renda Familiar Mensal',
    description: 'Renda bruta mensal da família para programas sociais.',
    examples: ['Até 1 salário mínimo', '1 a 3 salários mínimos'],
    validation: 'Faixas padronizadas conforme programas sociais.',
    compliance: 'Usado para elegibilidade em programas assistenciais escolares.'
  },

  // Emergency Information
  contato_emergencia: {
    title: 'Contato de Emergência',
    description: 'Pessoa para contato em situações de emergência médica ou escolar.',
    examples: ['Avó: (31) 99999-7777', 'Tio: João - (31) 88888-6666'],
    validation: 'Nome, parentesco e telefone. Deve ser diferente do responsável principal.',
    compliance: 'Essencial para segurança do estudante. Consentimento LGPD necessário.'
  },

  autorizacao_imagem: {
    title: 'Autorização de Uso de Imagem',
    description: 'Consentimento para uso de imagem em atividades educacionais.',
    examples: ['Autorizado para atividades pedagógicas', 'Não autorizado'],
    validation: 'Termo de autorização assinado pelo responsável.',
    compliance: 'Obrigatório por LGPD. Revogável a qualquer momento.'
  },

  // Transportation
  transporte_escolar: {
    title: 'Transporte Escolar Público',
    description: 'Utilização do transporte escolar oferecido pelo município.',
    examples: ['Sim - Rota Centro/Rural', 'Não utiliza'],
    validation: 'Baseado em distância da residência e disponibilidade.',
    compliance: 'Direito constitucional. Registro obrigatório para planejamento.'
  },

  // Academic History
  reprovacoes: {
    title: 'Histórico de Reprovações',
    description: 'Registro de anos letivos em que o estudante foi reprovado.',
    examples: ['Nenhuma', '2019 - 3º Ano EF', '2020 - 5º Ano EF'],
    validation: 'Ano e série da reprovação. Motivo se relevante.',
    compliance: 'Confidencial. Usado apenas para planejamento pedagógico.'
  },

  // Additional Educational Needs
  reforco_escolar: {
    title: 'Necessidade de Reforço Escolar',
    description: 'Identificação de dificuldades de aprendizagem que requerem apoio.',
    examples: ['Matemática e Português', 'Leitura e escrita', 'Não necessita'],
    validation: 'Baseado em avaliação pedagógica da escola.',
    compliance: 'Informação pedagógica para melhoria do ensino.'
  }
}

/**
 * Help configuration by category for better organization
 */
export const helpByCategory = {
  personal: ['cpf', 'rg', 'data_nascimento', 'sexo', 'cor_raca'],
  contact: ['phone', 'email', 'cep', 'endereco'],
  family: ['nome_mae', 'nome_pai', 'responsavel_legal'],
  educational: ['serie_ano', 'turma', 'escola_origem'],
  health: ['necessidades_especiais', 'medicamentos'],
  financial: ['bolsa_familia', 'renda_familiar'],
  emergency: ['contato_emergencia', 'autorizacao_imagem'],
  transportation: ['transporte_escolar'],
  academic: ['reprovacoes', 'reforco_escolar']
}

/**
 * Priority levels for field validation
 */
export const fieldPriority = {
  critical: ['cpf', 'nome_completo', 'data_nascimento', 'nome_mae'],
  high: ['phone', 'endereco', 'serie_ano', 'turma'],
  medium: ['email', 'nome_pai', 'necessidades_especiais'],
  low: ['cor_raca', 'transporte_escolar', 'autorizacao_imagem']
}

/**
 * LGPD compliance levels for each field
 */
export const lgpdCompliance = {
  sensitive: ['cpf', 'necessidades_especiais', 'medicamentos', 'renda_familiar'],
  personal: ['nome_completo', 'data_nascimento', 'endereco', 'phone'],
  family: ['nome_mae', 'nome_pai', 'responsavel_legal'],
  public: ['serie_ano', 'turma', 'escola_origem']
}

/**
 * Get help configuration for specific field
 */
export function getFieldHelp(fieldName: string): FieldHelpConfig | undefined {
  return brazilianEducationalFieldHelp[fieldName]
}

/**
 * Get help configuration for multiple fields
 */
export function getFieldsHelp(fieldNames: string[]): Record<string, FieldHelpConfig> {
  const result: Record<string, FieldHelpConfig> = {}

  fieldNames.forEach(fieldName => {
    const help = getFieldHelp(fieldName)
    if (help) {
      result[fieldName] = help
    }
  })

  return result
}

/**
 * Get help for entire category
 */
export function getCategoryHelp(category: keyof typeof helpByCategory): Record<string, FieldHelpConfig> {
  const fieldNames = helpByCategory[category]
  return getFieldsHelp(fieldNames)
}