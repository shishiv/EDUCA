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
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      },
      fontSize: {
        '2xs': '0.625rem', // For compact mobile interfaces
        // Educational typography scales
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
        // Educational form spacing
        'form-section': '2rem',   // 32px - Between major form sections
        'field-group': '1.5rem',  // 24px - Between related field groups
        'form-field': '1rem',     // 16px - Between individual form fields
      },
      colors: {
        // Brazilian educational system colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Main primary color
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        secondary: {
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
          950: '#020617',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e', // Brazilian green
          600: '#16a34a',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b', // Brazilian yellow
          600: '#d97706',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          900: '#7f1d1d',
        },
        // Educational attendance status colors (WCAG 2.1 AA compliant)
        attendance: {
          present: '#22c55e',      // Green for present (4.5:1 contrast)
          absent: '#ef4444',       // Red for absent (4.5:1 contrast)
          late: '#f59e0b',         // Yellow for late (4.5:1 contrast)
          justified: '#3b82f6',    // Blue for justified absence (4.5:1 contrast)
        },
        // Academic performance indicators
        performance: {
          excellent: '#059669',       // Emerald for 90-100%
          good: '#65a30d',           // Lime for 80-89%
          satisfactory: '#ca8a04',   // Yellow for 70-79%
          needs_improvement: '#dc2626', // Red for below 70%
        },
        // Brazilian educational level identification
        educational_level: {
          creche: '#f97316',      // Orange for daycare (0-3 years)
          pre_escola: '#8b5cf6',  // Purple for pre-school (4-5 years)
          fundamental: '#0ea5e9', // Blue for elementary (6-14 years)
        },
        // Fronteira Municipal Colors
        fronteira: {
          red: 'hsl(var(--fronteira-red))',           // #DC2626 - Brasão red
          green: 'hsl(var(--fronteira-green))',       // #059669 - Brasão green
          blue: 'hsl(var(--fronteira-blue))',         // #1D4ED8 - Brasão blue
          yellow: 'hsl(var(--fronteira-yellow))',     // #FBBF24 - Brasão yellow
          primary: {
            DEFAULT: 'hsl(var(--fronteira-primary))',         // rgb(0, 115, 172) - Municipal blue
            foreground: 'hsl(var(--fronteira-primary-foreground))',
          },
          secondary: {
            DEFAULT: 'hsl(var(--fronteira-secondary))',       // #1E3A8A - Deep institutional blue
            foreground: 'hsl(var(--fronteira-secondary-foreground))',
          },
          gray: {
            50: 'hsl(var(--fronteira-gray-50))',      // #F8FAFC
            100: 'hsl(var(--fronteira-gray-100))',    // #F1F5F9
            500: 'hsl(var(--fronteira-gray-500))',    // #64748B
            900: 'hsl(var(--fronteira-gray-900))',    // #0F172A
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
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};