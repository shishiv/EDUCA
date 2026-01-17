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
      // Educational design system
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui'],
        cursive: ['var(--font-cursive)', 'cursive'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      },
      fontSize: {
        '2xs': '0.625rem', // For compact mobile interfaces
        // EDUCA Design System typography scale
        'display': ['var(--text-display)', { lineHeight: '1.1', fontWeight: '700' }],
        'h1': ['var(--text-h1)', { lineHeight: '1.2', fontWeight: '600' }],
        'h2': ['var(--text-h2)', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['var(--text-h3)', { lineHeight: '1.4', fontWeight: '500' }],
        // Educational typography scales (legacy)
        'attendance-status': '0.875rem',  // 14px - Attendance marking buttons
        'student-name': '1rem',           // 16px - Student names in lists
        'student-id': '0.75rem',          // 12px - Student ID numbers
        'grade-display': '1.125rem',      // 18px - Grade/score display
        'official-doc': '0.875rem',       // 14px - Official document text
        'form-label': '0.875rem',         // 14px - Form field labels
        'mobile-touch': '1rem',           // 16px - Mobile touch targets minimum
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
        // EDUCA Layout spacing (from CSS variables)
        'sidebar': 'var(--sidebar-width)',
        'header': 'var(--header-height)',
        // Educational form spacing
        'form-section': '2rem',   // 32px - Between major form sections
        'field-group': '1.5rem',  // 24px - Between related field groups
        'form-field': '1rem',     // 16px - Between individual form fields
      },
      colors: {
        // ===========================================
        // EDUCA Design System - Nova Identidade Visual
        // "A educação não é quadrada"
        // ===========================================

        // EDUCA Primary Colors (derived from Fronteira coat of arms)
        educa: {
          blue: {
            50: '#EEF2FF',
            100: '#E0E7FF',
            200: '#C7D2FE',
            300: '#A5B4FC',
            400: '#818CF8',
            500: '#4361EE',  // Primary action color
            600: '#3730A3',
            700: '#312E81',
            800: '#1E1B4B',
            900: '#0F0D29',
          },
          green: {
            50: '#ECFDF5',
            100: '#D1FAE5',
            200: '#A7F3D0',
            300: '#6EE7B7',
            400: '#34D399',
            500: '#10B981',  // Success color
            600: '#059669',
            700: '#047857',
            800: '#065F46',
            900: '#064E3B',
          },
          gold: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F59E0B',  // Highlight/warning
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
          },
          coral: {
            50: '#FEF2F2',
            100: '#FEE2E2',
            200: '#FECACA',
            300: '#FCA5A5',
            400: '#F87171',
            500: '#EF6351',  // Alert/danger
            600: '#DC2626',
            700: '#B91C1C',
            800: '#991B1B',
            900: '#7F1D1D',
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

        // BNCC Campos de Experiencia (Early Childhood Education)
        campo: {
          eu: 'var(--campo-eu)',
          'eu-bg': 'var(--campo-eu-bg)',
          'eu-light': 'var(--campo-eu-light)',
          corpo: 'var(--campo-corpo)',
          'corpo-bg': 'var(--campo-corpo-bg)',
          'corpo-light': 'var(--campo-corpo-light)',
          tracos: 'var(--campo-tracos)',
          'tracos-bg': 'var(--campo-tracos-bg)',
          'tracos-light': 'var(--campo-tracos-light)',
          escuta: 'var(--campo-escuta)',
          'escuta-bg': 'var(--campo-escuta-bg)',
          'escuta-light': 'var(--campo-escuta-light)',
          espacos: 'var(--campo-espacos)',
          'espacos-bg': 'var(--campo-espacos-bg)',
          'espacos-light': 'var(--campo-espacos-light)',
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
        // EDUCA custom radii - "educação não é quadrada"
        'educa-sm': '6px',
        'educa': '8px',
        'educa-md': '12px',
        'educa-lg': '16px',
        'educa-xl': '24px',
      },
      boxShadow: {
        // EDUCA shadows - softer, more organic
        'educa-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'educa': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'educa-md': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'educa-lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'educa-hover': '0 4px 12px rgba(67, 97, 238, 0.15)',
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