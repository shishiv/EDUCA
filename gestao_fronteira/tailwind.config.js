/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ===========================================
      // EDUCA Brand Guidelines v1.0 - Paleta Jardim
      // Dezembro 2024 - Secretaria de Educação Fronteira/MG
      // ===========================================
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui'],
        display: ['var(--font-lexend)', 'Lexend', 'ui-sans-serif', 'system-ui'],
        cursive: ['var(--font-caveat)', 'Caveat', 'cursive'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      },
      fontSize: {
        '2xs': '0.625rem',
        // EDUCA Type Scale (Brand Guidelines)
        'display': ['3rem', { lineHeight: '1.2', fontWeight: '700' }],      // 48px - Logo, destaque
        'h1': ['2rem', { lineHeight: '1.3', fontWeight: '700' }],           // 32px - Título principal
        'h2': ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],         // 24px - Subtítulo
        'h3': ['1.125rem', { lineHeight: '1.5', fontWeight: '600' }],       // 18px - Seção
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],         // 16px - Texto corrido
        'small': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],    // 14px - Legendas
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],   // 12px - Metadados
        // Legacy educational scales
        'attendance-status': '0.875rem',
        'student-name': '1rem',
        'student-id': '0.75rem',
        'grade-display': '1.125rem',
        'official-doc': '0.875rem',
        'form-label': '0.875rem',
        'mobile-touch': '1rem',
      },
      screens: {
        'tablet': '768px', // Teacher tablets
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      spacing: {
        '18': '4.5rem', // 72px
        '88': '22rem',   // 352px
        '128': '32rem',  // 512px
        // Educational form spacing
        'form-section': '2rem',   // 32px - Between major form sections
        'field-group': '1.5rem',  // 24px - Between related field groups
        'form-field': '1rem',     // 16px - Between individual form fields
      },
      colors: {
        // ===========================================
        // EDUCA Brand Guidelines v1.0 - Paleta Jardim
        // "Crescimento, acolhimento e tecnologia"
        // ===========================================

        // Paleta Jardim - Cores Principais
        jardim: {
          // Verde Principal (crescimento, educação, desenvolvimento)
          green: {
            50: '#ecfdf5',
            100: '#d1fae5',
            400: '#34d399',
            500: '#10b981',
            600: '#059669',  // PRIMARY - Logo gradient start
          },
          // Azul Principal (confiança, modernidade, tecnologia)
          blue: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            400: '#38bdf8',
            500: '#0ea5e9',  // PRIMARY - Logo gradient end
          },
          // Amarelo (destaque, alegria, underline do logo)
          yellow: {
            100: '#fef3c7',
            300: '#fde68a',
            400: '#fcd34d',  // Logo underline
          },
          // Rosa (acento, alertas especiais)
          pink: {
            100: '#fce7f3',
            400: '#fb7185',
          },
        },

        // Neutros (Brand Guidelines)
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },

        // Legacy EDUCA colors (mantido para compatibilidade)
        educa: {
          blue: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
          },
          green: {
            50: '#ecfdf5',
            100: '#d1fae5',
            400: '#34d399',
            500: '#10b981',
            600: '#059669',
          },
          gold: {
            100: '#fef3c7',
            300: '#fde68a',
            400: '#fcd34d',
            500: '#f59e0b',
          },
          coral: {
            50: '#fef2f2',
            100: '#fee2e2',
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
          },
        },

        // Module Colors (Google Classroom style - each area has its color)
        module: {
          alunos: '#7C3AED',      // Violet - Students
          turmas: '#0EA5E9',      // Sky - Classes
          frequencia: '#10B981',  // Emerald - Attendance
          notas: '#F97316',       // Orange - Grades
          relatorios: '#EC4899', // Pink - Reports
          escolas: '#6366F1',     // Indigo - Schools
          matriculas: '#14B8A6', // Teal - Enrollments
          config: '#6B7280',      // Gray - Settings
        },

        // Module Light Backgrounds
        'module-bg': {
          alunos: '#F5F3FF',
          turmas: '#F0F9FF',
          frequencia: '#ECFDF5',
          notas: '#FFF7ED',
          relatorios: '#FDF2F8',
          escolas: '#EEF2FF',
          matriculas: '#F0FDFA',
          config: '#F9FAFB',
        },

        // Legacy support - map old names to new
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4361EE',
          600: '#3730A3',
          700: '#312E81',
          800: '#1E1B4B',
          900: '#0F0D29',
          950: '#0A0818',
        },
        secondary: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#09090B',
        },
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          900: '#064E3B',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          900: '#78350F',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF6351',
          600: '#DC2626',
          900: '#7F1D1D',
        },

        // Attendance status colors (WCAG 2.1 AA compliant)
        attendance: {
          present: '#22C55E',
          absent: '#EF4444',
          late: '#F59E0B',
          justified: '#3B82F6',
        },

        // Performance indicators
        performance: {
          excellent: '#10B981',
          good: '#3B82F6',
          satisfactory: '#F59E0B',
          needs_improvement: '#EF4444',
        },

        // Educational levels
        educational_level: {
          creche: '#F97316',
          pre_escola: '#8B5CF6',
          fundamental: '#0EA5E9',
        },

        // Fronteira Municipal (legacy support + official use)
        fronteira: {
          red: 'hsl(var(--fronteira-red))',
          green: 'hsl(var(--fronteira-green))',
          blue: 'hsl(var(--fronteira-blue))',
          yellow: 'hsl(var(--fronteira-yellow))',
          primary: {
            DEFAULT: 'hsl(var(--fronteira-primary))',
            foreground: 'hsl(var(--fronteira-primary-foreground))',
          },
          secondary: {
            DEFAULT: 'hsl(var(--fronteira-secondary))',
            foreground: 'hsl(var(--fronteira-secondary-foreground))',
          },
          gray: {
            50: 'hsl(var(--fronteira-gray-50))',
            100: 'hsl(var(--fronteira-gray-100))',
            500: 'hsl(var(--fronteira-gray-500))',
            600: '#52525B',
            900: 'hsl(var(--fronteira-gray-900))',
          },
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // EDUCA Brand Guidelines radii
        'card': '16px',      // Cards
        'input': '12px',     // Inputs, buttons
        'button': '12px',    // Buttons
        'nav-item': '10px',  // Navigation items
        'badge': '10px',     // Badges
        'avatar': '10px',    // Avatars
        // Legacy EDUCA radii
        'educa-sm': '6px',
        'educa': '8px',
        'educa-md': '12px',
        'educa-lg': '16px',
        'educa-xl': '24px',
      },
      boxShadow: {
        // EDUCA Brand Guidelines shadows - softer, more organic
        'card': '0 4px 20px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 30px rgba(5, 150, 105, 0.12)',
        'button': '0 4px 14px rgba(5, 150, 105, 0.3)',
        'button-hover': '0 6px 20px rgba(5, 150, 105, 0.4)',
        'nav': '0 10px 40px rgba(0, 0, 0, 0.3)',
        // Legacy EDUCA shadows
        'educa-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'educa': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'educa-md': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'educa-lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'educa-hover': '0 4px 12px rgba(5, 150, 105, 0.15)',
        // Module-specific shadows on hover
        'module-alunos': '0 4px 12px rgba(124, 58, 237, 0.15)',
        'module-turmas': '0 4px 12px rgba(14, 165, 233, 0.15)',
        'module-frequencia': '0 4px 12px rgba(16, 185, 129, 0.15)',
        'module-notas': '0 4px 12px rgba(249, 115, 22, 0.15)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};