"use client";

import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CPFInput } from "../ui/educational/cpf-input";
import { PhoneInput } from "../ui/educational/phone-input";
import { EducationalLabel } from "../ui/educational/educational-label";
import { studentSchema, type StudentFormData } from "@/lib/validators/brazilian";
import { cn } from "@/lib/utils";
import { CalendarDays, User, Phone, MapPin, Users, AlertCircle, Save, X } from "lucide-react";

export interface EnhancedStudentFormProps {
  /** Initial form data for editing */
  initialData?: Partial<StudentFormData>;
  /** Callback when form is submitted successfully */
  onSubmit?: (data: StudentFormData) => void | Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Loading state during submission */
  loading?: boolean;
  /** Form mode - determines which sections are shown */
  mode?: "create" | "edit" | "view";
  /** Additional CSS classes */
  className?: string;
  /** Enable progressive disclosure for mobile */
  progressiveDisclosure?: boolean;
}

/**
 * Enhanced Student Registration Form Component
 *
 * Features:
 * - Multi-section progressive disclosure for mobile
 * - Brazilian CPF and phone validation
 * - Educational compliance requirements
 * - Responsive design for tablets
 * - Accessibility support
 */
export function EnhancedStudentForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
  mode = "create",
  className,
  progressiveDisclosure = true,
}: EnhancedStudentFormProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const isReadOnly = mode === "view";

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      nome_completo: "",
      data_nascimento: "",
      cpf: "",
      rg: "",
      sexo: "",
      endereco: "",
      telefone: "",
      email: "",
      nome_mae: "",
      nome_pai: "",
      necessidades_especiais: "",
      ...initialData,
    },
  });

  const sections = [
    {
      id: "personal",
      title: "Dados Pessoais",
      description: "Informações básicas do estudante",
      icon: User,
      fields: ["nome_completo", "data_nascimento", "cpf", "rg", "sexo"]
    },
    {
      id: "contact",
      title: "Contato e Endereço",
      description: "Informações de contato e localização",
      icon: MapPin,
      fields: ["endereco", "telefone", "email"]
    },
    {
      id: "family",
      title: "Informações Familiares",
      description: "Dados dos pais ou responsáveis",
      icon: Users,
      fields: ["nome_mae", "nome_pai"]
    },
    {
      id: "special",
      title: "Necessidades Especiais",
      description: "Informações sobre necessidades educacionais especiais",
      icon: AlertCircle,
      fields: ["necessidades_especiais"]
    }
  ];

  const handleSubmit = useCallback(async (data: StudentFormData) => {
    if (onSubmit) {
      await onSubmit(data);
    }
  }, [onSubmit]);

  const nextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const previousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const canProceed = () => {
    const sectionFields = sections[currentSection].fields;
    const values = form.getValues();

    // Check if required fields in current section are filled
    const requiredFields = ["nome_completo", "data_nascimento", "sexo"];
    return sectionFields.every(field => {
      if (requiredFields.includes(field)) {
        return values[field as keyof StudentFormData];
      }
      return true;
    });
  };

  const SectionIcon = sections[currentSection].icon;

  if (!progressiveDisclosure) {
    // Show all sections at once for desktop
    return (
      <Card className={cn("w-full max-w-4xl", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === "create" ? "Novo Estudante" : mode === "edit" ? "Editar Estudante" : "Dados do Estudante"}
          </CardTitle>
          <CardDescription>
            Preencha as informações do estudante conforme a documentação oficial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {sections.map((section, index) => (
                <div key={section.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <section.icon className="h-4 w-4" />
                    <h3 className="text-lg font-medium">{section.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map((fieldName) => (
                      <FormField
                        key={fieldName}
                        control={form.control}
                        name={fieldName as keyof StudentFormData}
                        render={({ field }) => (
                          <FormItem>
                            <EducationalLabel
                              variant={["nome_completo", "data_nascimento", "sexo"].includes(fieldName) ? "required" : "optional"}
                              tooltip={getFieldTooltip(fieldName)}
                            >
                              {getFieldLabel(fieldName)}
                            </EducationalLabel>
                            <FormControl>
                              {renderField(fieldName, field, isReadOnly)}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  {index < sections.length - 1 && <Separator className="my-6" />}
                </div>
              ))}

              {!isReadOnly && (
                <div className="flex justify-end space-x-2 pt-6">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Salvando..." : mode === "create" ? "Cadastrar" : "Salvar Alterações"}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  // Progressive disclosure for mobile
  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SectionIcon className="h-5 w-5" />
            <CardTitle>{sections[currentSection].title}</CardTitle>
          </div>
          <Badge variant="outline">
            {currentSection + 1} de {sections.length}
          </Badge>
        </div>
        <CardDescription>
          {sections[currentSection].description}
        </CardDescription>

        {/* Progress indicator */}
        <div className="flex space-x-1">
          {sections.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-2 flex-1 rounded-full",
                index <= currentSection ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-4">
              {sections[currentSection].fields.map((fieldName) => (
                <FormField
                  key={fieldName}
                  control={form.control}
                  name={fieldName as keyof StudentFormData}
                  render={({ field }) => (
                    <FormItem>
                      <EducationalLabel
                        variant={["nome_completo", "data_nascimento", "sexo"].includes(fieldName) ? "required" : "optional"}
                        tooltip={getFieldTooltip(fieldName)}
                      >
                        {getFieldLabel(fieldName)}
                      </EducationalLabel>
                      <FormControl>
                        {renderField(fieldName, field, isReadOnly)}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {!isReadOnly && (
              <div className="flex justify-between space-x-2 pt-6">
                <div className="flex space-x-2">
                  {currentSection > 0 && (
                    <Button type="button" variant="outline" onClick={previousSection}>
                      Anterior
                    </Button>
                  )}
                  {onCancel && currentSection === 0 && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                </div>

                <div>
                  {currentSection < sections.length - 1 ? (
                    <Button
                      type="button"
                      onClick={nextSection}
                      disabled={!canProceed()}
                    >
                      Próximo
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading || !canProceed()}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Salvando..." : mode === "create" ? "Cadastrar" : "Salvar"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function renderField(fieldName: string, field: any, isReadOnly: boolean) {
  if (isReadOnly) {
    return <Input {...field} readOnly className="bg-muted" />;
  }

  switch (fieldName) {
    case "cpf":
      return (
        <CPFInput
          value={field.value}
          onChange={(value, isValid) => field.onChange(value)}
          showValidation
        />
      );

    case "telefone":
      return (
        <PhoneInput
          value={field.value}
          onChange={(value, isValid) => field.onChange(value)}
          showValidation
          showTypeBadge
        />
      );

    case "sexo":
      return (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o sexo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="M">Masculino</SelectItem>
            <SelectItem value="F">Feminino</SelectItem>
          </SelectContent>
        </Select>
      );

    case "data_nascimento":
      return (
        <Input
          {...field}
          type="date"
          max={new Date().toISOString().split('T')[0]}
        />
      );

    case "necessidades_especiais":
      return (
        <Textarea
          {...field}
          placeholder="Descreva as necessidades educacionais especiais, se houver..."
          rows={3}
        />
      );

    default:
      return <Input {...field} />;
  }
}

function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    nome_completo: "Nome Completo",
    data_nascimento: "Data de Nascimento",
    cpf: "CPF",
    rg: "RG",
    sexo: "Sexo",
    endereco: "Endereço",
    telefone: "Telefone",
    email: "E-mail",
    nome_mae: "Nome da Mãe",
    nome_pai: "Nome do Pai",
    necessidades_especiais: "Necessidades Especiais",
  };
  return labels[fieldName] || fieldName;
}

function getFieldTooltip(fieldName: string): string {
  const tooltips: Record<string, string> = {
    nome_completo: "Nome completo do estudante conforme certidão de nascimento",
    cpf: "Número do CPF (se disponível). Obrigatório para estudantes acima de 16 anos",
    rg: "Número do RG ou certidão de nascimento",
    telefone: "Número de telefone para contato (celular ou fixo)",
    necessidades_especiais: "Descreva qualquer necessidade educacional especial que requeira adaptação pedagógica",
  };
  return tooltips[fieldName] || "";
}