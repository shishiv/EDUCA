"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { InfoIcon } from "lucide-react";

const educationalLabelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-foreground",
        required: "text-foreground",
        optional: "text-muted-foreground",
        error: "text-red-600 dark:text-red-400",
        success: "text-green-600 dark:text-green-400",
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface EducationalLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof educationalLabelVariants> {
  /** Whether the field is required */
  required?: boolean;
  /** Tooltip text in Portuguese */
  tooltip?: string;
  /** Additional context or help text */
  description?: string;
  /** Show Brazilian educational context indicators */
  showEducationalContext?: boolean;
  /** Field type for educational context */
  fieldType?: 'cpf' | 'phone' | 'email' | 'name' | 'address' | 'academic' | 'attendance' | 'general';
}

/**
 * Educational Label Component with Brazilian educational context
 *
 * Features:
 * - Required field indicators with Brazilian Portuguese labels
 * - Contextual tooltips for educational terminology
 * - Educational field type indicators
 * - Accessibility support with proper ARIA labels
 * - Visual hierarchy with different variants
 * - Mobile-friendly touch targets
 *
 * @example
 * ```tsx
 * // Basic required field
 * <EducationalLabel
 *   required
 *   htmlFor="student-name"
 * >
 *   Nome do Aluno
 * </EducationalLabel>
 *
 * // With tooltip and context
 * <EducationalLabel
 *   required
 *   fieldType="cpf"
 *   tooltip="CPF é obrigatório para matrícula escolar no Brasil"
 *   htmlFor="student-cpf"
 * >
 *   CPF do Aluno
 * </EducationalLabel>
 *
 * // With description
 * <EducationalLabel
 *   fieldType="attendance"
 *   description="Frequência mínima de 75% é obrigatória"
 *   htmlFor="attendance-rate"
 * >
 *   Taxa de Frequência
 * </EducationalLabel>
 * ```
 */
export const EducationalLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  EducationalLabelProps
>(
  (
    {
      className,
      variant = "default",
      size = "default",
      required = false,
      tooltip,
      description,
      showEducationalContext = true,
      fieldType = "general",
      children,
      ...props
    },
    ref
  ) => {
    // Determine variant based on required state
    const computedVariant = required && variant === "default" ? "required" : variant;

    /**
     * Get educational context indicators based on field type
     */
    const getEducationalContext = (type: EducationalLabelProps['fieldType']) => {
      switch (type) {
        case 'cpf':
          return {
            indicator: "🆔",
            ariaLabel: "Campo de CPF - documento obrigatório",
            context: "Documento brasileiro obrigatório"
          };
        case 'phone':
          return {
            indicator: "📱",
            ariaLabel: "Campo de telefone - contato",
            context: "Contato para emergências"
          };
        case 'attendance':
          return {
            indicator: "📊",
            ariaLabel: "Campo de frequência - controle educacional",
            context: "Controle obrigatório de presença"
          };
        case 'academic':
          return {
            indicator: "🎓",
            ariaLabel: "Campo acadêmico - dados educacionais",
            context: "Informação educacional"
          };
        case 'address':
          return {
            indicator: "🏠",
            ariaLabel: "Campo de endereço - localização",
            context: "Endereço residencial"
          };
        default:
          return null;
      }
    };

    const educationalContext = showEducationalContext ? getEducationalContext(fieldType) : null;

    /**
     * Get Portuguese required text
     */
    const getRequiredText = () => {
      return required ? "obrigatório" : "opcional";
    };

    const labelContent = (
      <LabelPrimitive.Root
        ref={ref}
        className={cn(educationalLabelVariants({ variant: computedVariant, size }), className)}
        {...props}
      >
        <span className="flex items-center gap-2">
          {/* Educational context indicator */}
          {educationalContext && (
            <span
              className="text-sm"
              aria-label={educationalContext.ariaLabel}
              title={educationalContext.context}
            >
              {educationalContext.indicator}
            </span>
          )}

          {/* Label text */}
          <span>{children}</span>

          {/* Required indicator */}
          {required && (
            <span
              className="text-red-500 dark:text-red-400"
              aria-label="Campo obrigatório"
              title="Este campo é obrigatório"
            >
              *
            </span>
          )}

          {/* Tooltip trigger */}
          {tooltip && (
            <TooltipPrimitive.Provider delayDuration={300}>
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <InfoIcon
                    className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help transition-colors"
                    aria-label="Informações adicionais"
                  />
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content
                    className="z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-w-xs"
                    sideOffset={4}
                  >
                    {tooltip}
                    <TooltipPrimitive.Arrow className="fill-popover" />
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            </TooltipPrimitive.Provider>
          )}
        </span>

        {/* Screen reader only context */}
        <span className="sr-only">
          {required ? "Campo obrigatório" : "Campo opcional"}
          {educationalContext && ` - ${educationalContext.context}`}
        </span>
      </LabelPrimitive.Root>
    );

    // Wrap with description if provided
    if (description) {
      return (
        <div className="space-y-1">
          {labelContent}
          <p
            className="text-xs text-muted-foreground"
            id={`${props.htmlFor}-description`}
          >
            {description}
          </p>
        </div>
      );
    }

    return labelContent;
  }
);

EducationalLabel.displayName = "EducationalLabel";

export default EducationalLabel;