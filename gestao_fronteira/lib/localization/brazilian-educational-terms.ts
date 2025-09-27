/**
 * Brazilian Educational Localization System
 * Addresses High Priority UX Issue: Multi-language support incomplete (4h implementation)
 * Complete Brazilian Portuguese Implementation with Educational Context
 */

// Educational terminology standardization for Brazilian municipal education
export const brazilianEducationalTerms = {
  // Core educational concepts
  education: {
    'student': 'Aluno(a)',
    'students': 'Alunos',
    'teacher': 'Professor(a)',
    'teachers': 'Professores',
    'class': 'Turma',
    'classes': 'Turmas',
    'school': 'Escola',
    'schools': 'Escolas',
    'grade': 'Série/Ano',
    'grades': 'Séries/Anos',
    'subject': 'Disciplina',
    'subjects': 'Disciplinas',
    'attendance': 'Frequência',
    'enrollment': 'Matrícula',
    'guardian': 'Responsável',
    'guardians': 'Responsáveis',
    'principal': 'Diretor(a)',
    'secretary': 'Secretário(a)',
    'administrator': 'Administrador(a)'
  },

  // Brazilian educational levels (INEP classification)
  educationLevels: {
    'pre_school': 'Educação Infantil',
    'elementary_1': 'Ensino Fundamental I (1º ao 5º ano)',
    'elementary_2': 'Ensino Fundamental II (6º ao 9º ano)',
    'high_school': 'Ensino Médio',
    'eja': 'EJA - Educação de Jovens e Adultos',
    'special_education': 'Educação Especial',
    'rural_education': 'Educação do Campo'
  },

  // Attendance and frequency terms
  attendance: {
    'present': 'Presente',
    'absent': 'Ausente',
    'justified': 'Falta Justificada',
    'late': 'Atraso',
    'early_departure': 'Saída Antecipada',
    'attendance_rate': 'Taxa de Frequência',
    'minimum_attendance': 'Frequência Mínima (75%)',
    'critical_attendance': 'Frequência Crítica',
    'bolsa_familia_threshold': 'Limite Bolsa Família (85%)',
    'class_session': 'Aula',
    'open_class': 'Abrir Aula',
    'close_class': 'Fechar Aula',
    'lock_class': 'Travar Aula',
    'attendance_locked': 'Frequência Travada',
    'no_forgetting': 'Não existe o esquecer'
  },

  // Administrative terms
  administration: {
    'enrollment_period': 'Período de Matrícula',
    'transfer': 'Transferência',
    'withdrawal': 'Cancelamento de Matrícula',
    'academic_record': 'Histórico Escolar',
    'school_calendar': 'Calendário Escolar',
    'class_schedule': 'Horário de Aulas',
    'report_card': 'Boletim Escolar',
    'student_file': 'Pasta do Aluno',
    'enrollment_number': 'Número de Matrícula',
    'school_id': 'Código da Escola',
    'municipal_network': 'Rede Municipal'
  },

  // Brazilian compliance and regulations
  compliance: {
    'inep': 'INEP - Instituto Nacional de Estudos e Pesquisas Educacionais',
    'educacenso': 'Educacenso - Censo Escolar',
    'ldben': 'LDBEN - Lei de Diretrizes e Bases da Educação Nacional',
    'eca': 'ECA - Estatuto da Criança e do Adolescente',
    'lgpd': 'LGPD - Lei Geral de Proteção de Dados',
    'bolsa_familia': 'Bolsa Família',
    'auxilio_brasil': 'Auxílio Brasil',
    'peti': 'PETI - Programa de Erradicação do Trabalho Infantil',
    'bpc': 'BPC - Benefício de Prestação Continuada',
    'census_school': 'Censo Escolar',
    'school_feeding': 'Alimentação Escolar',
    'school_transport': 'Transporte Escolar'
  },

  // Geographic and demographic terms
  geographic: {
    'urban_zone': 'Zona Urbana',
    'rural_zone': 'Zona Rural',
    'state': 'Estado',
    'municipality': 'Município',
    'district': 'Distrito',
    'neighborhood': 'Bairro',
    'address': 'Endereço',
    'zip_code': 'CEP',
    'birth_place': 'Naturalidade',
    'nationality': 'Nacionalidade',
    'brazilian': 'Brasileiro(a)'
  },

  // Identity and documentation
  identity: {
    'full_name': 'Nome Completo',
    'social_name': 'Nome Social',
    'birth_certificate': 'Certidão de Nascimento',
    'cpf': 'CPF - Cadastro de Pessoa Física',
    'rg': 'RG - Registro Geral',
    'birth_date': 'Data de Nascimento',
    'gender': 'Gênero',
    'race_color': 'Cor/Raça (IBGE)',
    'white': 'Branca',
    'black': 'Preta',
    'brown': 'Parda',
    'yellow': 'Amarela',
    'indigenous': 'Indígena',
    'undeclared': 'Não Declarada'
  },

  // Family and social context
  family: {
    'father': 'Pai',
    'mother': 'Mãe',
    'stepfather': 'Padrasto',
    'stepmother': 'Madrasta',
    'grandfather': 'Avô',
    'grandmother': 'Avó',
    'uncle': 'Tio',
    'aunt': 'Tia',
    'legal_guardian': 'Responsável Legal',
    'family_income': 'Renda Familiar',
    'single_parent': 'Família Monoparental',
    'extended_family': 'Família Extensa',
    'foster_family': 'Família Acolhedora'
  },

  // Special needs and inclusion
  specialNeeds: {
    'special_needs': 'Necessidades Educacionais Especiais',
    'intellectual_disability': 'Deficiência Intelectual',
    'physical_disability': 'Deficiência Física',
    'visual_impairment': 'Deficiência Visual',
    'hearing_impairment': 'Deficiência Auditiva',
    'autism': 'Transtorno do Espectro Autista',
    'adhd': 'TDAH - Transtorno do Déficit de Atenção',
    'learning_disability': 'Dificuldade de Aprendizagem',
    'giftedness': 'Altas Habilidades/Superdotação',
    'inclusive_education': 'Educação Inclusiva',
    'aee': 'AEE - Atendimento Educacional Especializado'
  },

  // Health and nutrition
  health: {
    'health_condition': 'Condição de Saúde',
    'medication': 'Medicação',
    'food_allergy': 'Alergia Alimentar',
    'dietary_restriction': 'Restrição Alimentar',
    'vaccination_card': 'Cartão de Vacinação',
    'health_insurance': 'Plano de Saúde',
    'sus': 'SUS - Sistema Único de Saúde',
    'school_feeding_program': 'Programa de Alimentação Escolar',
    'nutritionist': 'Nutricionista',
    'school_nurse': 'Enfermeira Escolar'
  },

  // Technology and digital terms
  technology: {
    'digital_inclusion': 'Inclusão Digital',
    'distance_learning': 'Ensino Remoto',
    'hybrid_learning': 'Ensino Híbrido',
    'educational_platform': 'Plataforma Educacional',
    'student_portal': 'Portal do Aluno',
    'parent_portal': 'Portal dos Pais',
    'online_enrollment': 'Matrícula Online',
    'digital_diary': 'Diário Digital',
    'electronic_grade_book': 'Caderneta Eletrônica'
  }
} as const

// Date and time formatting for Brazilian context
export const brazilianDateFormats = {
  // Standard Brazilian date formats
  dateFormats: {
    short: 'dd/MM/yyyy',
    medium: 'dd/MM/yyyy',
    long: 'dd \'de\' MMMM \'de\' yyyy',
    full: 'EEEE, dd \'de\' MMMM \'de\' yyyy'
  },

  // Time formats
  timeFormats: {
    short: 'HH:mm',
    medium: 'HH:mm:ss',
    long: 'HH:mm:ss z',
    full: 'HH:mm:ss zzzz'
  },

  // Relative time expressions
  relativeTime: {
    now: 'agora',
    minute_ago: 'há 1 minuto',
    minutes_ago: 'há {n} minutos',
    hour_ago: 'há 1 hora',
    hours_ago: 'há {n} horas',
    day_ago: 'ontem',
    days_ago: 'há {n} dias',
    week_ago: 'há 1 semana',
    weeks_ago: 'há {n} semanas',
    month_ago: 'há 1 mês',
    months_ago: 'há {n} meses',
    year_ago: 'há 1 ano',
    years_ago: 'há {n} anos'
  }
}

// Number formatting for Brazilian context
export const brazilianNumberFormats = {
  // Currency formatting (Brazilian Real)
  currency: {
    symbol: 'R$',
    decimal: ',',
    thousands: '.',
    format: 'R$ {amount}'
  },

  // Percentage formatting
  percentage: {
    decimal: ',',
    format: '{value}%'
  },

  // Large numbers
  largeNumbers: {
    thousand: 'mil',
    million: 'milhão',
    billion: 'bilhão'
  }
}

// Educational calendar terms
export const brazilianEducationalCalendar = {
  // School year structure
  schoolYear: {
    'academic_year': 'Ano Letivo',
    'school_term': 'Período Letivo',
    'semester': 'Semestre',
    'trimester': 'Trimestre',
    'quarter': 'Bimestre',
    'school_days': 'Dias Letivos',
    'minimum_school_days': 'Mínimo de 200 Dias Letivos',
    'class_hours': 'Horas-aula',
    'minimum_class_hours': 'Mínimo de 800 Horas Anuais'
  },

  // School periods
  periods: {
    'morning': 'Manhã',
    'afternoon': 'Tarde',
    'evening': 'Noite',
    'full_time': 'Tempo Integral',
    'break': 'Recreio',
    'lunch_break': 'Intervalo do Almoço'
  },

  // Holidays and special dates
  holidays: {
    'school_holiday': 'Férias Escolares',
    'winter_break': 'Férias de Julho',
    'summer_break': 'Férias de Verão',
    'national_holiday': 'Feriado Nacional',
    'municipal_holiday': 'Feriado Municipal',
    'pedagogical_day': 'Dia Pedagógico',
    'teacher_training': 'Formação Continuada',
    'school_festival': 'Festa Junina',
    'independence_day': 'Dia da Independência',
    'children_day': 'Dia das Crianças',
    'teacher_day': 'Dia do Professor'
  }
}

// User interface terms
export const brazilianUITerms = {
  // Common actions
  actions: {
    'save': 'Salvar',
    'cancel': 'Cancelar',
    'edit': 'Editar',
    'delete': 'Excluir',
    'add': 'Adicionar',
    'create': 'Criar',
    'update': 'Atualizar',
    'view': 'Visualizar',
    'search': 'Buscar',
    'filter': 'Filtrar',
    'sort': 'Ordenar',
    'export': 'Exportar',
    'import': 'Importar',
    'print': 'Imprimir',
    'download': 'Baixar',
    'upload': 'Enviar',
    'confirm': 'Confirmar',
    'submit': 'Enviar',
    'next': 'Próximo',
    'previous': 'Anterior',
    'finish': 'Finalizar',
    'continue': 'Continuar',
    'back': 'Voltar',
    'close': 'Fechar',
    'open': 'Abrir',
    'select': 'Selecionar',
    'clear': 'Limpar',
    'reset': 'Redefinir',
    'refresh': 'Atualizar',
    'reload': 'Recarregar'
  },

  // Status messages
  status: {
    'loading': 'Carregando...',
    'saving': 'Salvando...',
    'saved': 'Salvo',
    'error': 'Erro',
    'success': 'Sucesso',
    'warning': 'Aviso',
    'info': 'Informação',
    'pending': 'Pendente',
    'completed': 'Concluído',
    'failed': 'Falhou',
    'active': 'Ativo',
    'inactive': 'Inativo',
    'enabled': 'Habilitado',
    'disabled': 'Desabilitado',
    'online': 'Online',
    'offline': 'Offline',
    'connected': 'Conectado',
    'disconnected': 'Desconectado'
  },

  // Form validation messages
  validation: {
    'required': 'Este campo é obrigatório',
    'invalid_email': 'Email inválido',
    'invalid_cpf': 'CPF inválido',
    'invalid_phone': 'Telefone inválido',
    'invalid_date': 'Data inválida',
    'password_too_short': 'Senha muito curta',
    'passwords_dont_match': 'Senhas não coincidem',
    'field_too_short': 'Campo muito curto',
    'field_too_long': 'Campo muito longo',
    'invalid_format': 'Formato inválido',
    'file_too_large': 'Arquivo muito grande',
    'unsupported_file_type': 'Tipo de arquivo não suportado'
  },

  // Time-related terms
  time: {
    'today': 'Hoje',
    'yesterday': 'Ontem',
    'tomorrow': 'Amanhã',
    'this_week': 'Esta Semana',
    'last_week': 'Semana Passada',
    'next_week': 'Próxima Semana',
    'this_month': 'Este Mês',
    'last_month': 'Mês Passado',
    'next_month': 'Próximo Mês',
    'this_year': 'Este Ano',
    'last_year': 'Ano Passado',
    'next_year': 'Próximo Ano'
  }
}

// Accessibility terms in Portuguese
export const brazilianAccessibilityTerms = {
  'skip_to_content': 'Pular para o conteúdo',
  'skip_to_navigation': 'Pular para a navegação',
  'menu': 'Menu',
  'submenu': 'Submenu',
  'close_menu': 'Fechar menu',
  'open_menu': 'Abrir menu',
  'search': 'Busca',
  'search_results': 'Resultados da busca',
  'no_results': 'Nenhum resultado encontrado',
  'loading': 'Carregando',
  'error': 'Erro',
  'success': 'Sucesso',
  'warning': 'Aviso',
  'information': 'Informação',
  'required_field': 'Campo obrigatório',
  'optional_field': 'Campo opcional',
  'current_page': 'Página atual',
  'page_of_total': 'Página {current} de {total}',
  'sort_ascending': 'Ordenar crescente',
  'sort_descending': 'Ordenar decrescente',
  'toggle': 'Alternar',
  'expand': 'Expandir',
  'collapse': 'Recolher',
  'select_all': 'Selecionar todos',
  'clear_selection': 'Limpar seleção'
}

// Complete localization object
export const brazilianLocalization = {
  ...brazilianEducationalTerms,
  dates: brazilianDateFormats,
  numbers: brazilianNumberFormats,
  calendar: brazilianEducationalCalendar,
  ui: brazilianUITerms,
  accessibility: brazilianAccessibilityTerms
}

// Helper functions for localization
export const formatBrazilianDate = (date: Date, format: 'short' | 'medium' | 'long' | 'full' = 'short'): string => {
  const options: Intl.DateTimeFormatOptions = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { day: '2-digit', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
  }[format]

  return new Intl.DateTimeFormat('pt-BR', options).format(date)
}

export const formatBrazilianCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}

export const formatBrazilianPercentage = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
}

export const getBrazilianWeekday = (date: Date): string => {
  const weekdays = [
    'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
    'quinta-feira', 'sexta-feira', 'sábado'
  ]
  return weekdays[date.getDay()]
}

export const getBrazilianMonth = (date: Date): string => {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ]
  return months[date.getMonth()]
}

export const formatBrazilianRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'agora'
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return minutes === 1 ? 'há 1 minuto' : `há ${minutes} minutos`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return hours === 1 ? 'há 1 hora' : `há ${hours} horas`
  }

  const days = Math.floor(diffInSeconds / 86400)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`

  const weeks = Math.floor(days / 7)
  if (weeks === 1) return 'há 1 semana'
  if (weeks < 4) return `há ${weeks} semanas`

  const months = Math.floor(days / 30)
  if (months === 1) return 'há 1 mês'
  if (months < 12) return `há ${months} meses`

  const years = Math.floor(days / 365)
  return years === 1 ? 'há 1 ano' : `há ${years} anos`
}

// Educational context translations
export const getEducationalLevelTranslation = (level: string): string => {
  return brazilianEducationalTerms.educationLevels[level as keyof typeof brazilianEducationalTerms.educationLevels] || level
}

export const getAttendanceStatusTranslation = (status: string): string => {
  return brazilianEducationalTerms.attendance[status as keyof typeof brazilianEducationalTerms.attendance] || status
}

export const getComplianceTermTranslation = (term: string): string => {
  return brazilianEducationalTerms.compliance[term as keyof typeof brazilianEducationalTerms.compliance] || term
}

export default brazilianLocalization