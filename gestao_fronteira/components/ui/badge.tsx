import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Existing base variants
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-gray-100 text-gray-700 border border-gray-200',
        destructive: 'bg-red-100 text-red-700 border border-red-200',
        outline: 'border border-gray-300 text-gray-700',

        // EDUCA semantic variants
        success: 'bg-green-100 text-green-700 border border-green-200',
        warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        info: 'bg-blue-100 text-blue-700 border border-blue-200',

        // Module badges
        alunos: 'bg-violet-100 text-violet-700 border border-violet-200',
        turmas: 'bg-sky-100 text-sky-700 border border-sky-200',
        frequencia: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        notas: 'bg-orange-100 text-orange-700 border border-orange-200',

        // BNCC Campos de Experiencia (Early Childhood Education)
        'campo-eu': 'bg-pink-100 text-pink-700 border border-pink-200',
        'campo-corpo': 'bg-orange-100 text-orange-700 border border-orange-200',
        'campo-tracos': 'bg-violet-100 text-violet-700 border border-violet-200',
        'campo-escuta': 'bg-sky-100 text-sky-700 border border-sky-200',
        'campo-espacos': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
