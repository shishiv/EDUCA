'use client'

import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { User, School, FileText, Users, Calendar, BookOpen, Award } from 'lucide-react'

// Educational image alt text generator
export function generateEducationalAltText(
  type: 'student' | 'teacher' | 'school' | 'document' | 'chart' | 'activity',
  context: {
    name?: string
    role?: string
    schoolName?: string
    documentType?: string
    chartType?: string
    activityType?: string
    additionalInfo?: string
  }
): string {
  const { name, role, schoolName, documentType, chartType, activityType, additionalInfo } = context

  switch (type) {
    case 'student':
      return `Foto do aluno ${name || 'não identificado'}${schoolName ? ` da ${schoolName}` : ''}${additionalInfo ? `. ${additionalInfo}` : ''}`

    case 'teacher':
      return `Foto do professor ${name || 'não identificado'}${role ? ` (${role})` : ''}${schoolName ? ` da ${schoolName}` : ''}${additionalInfo ? `. ${additionalInfo}` : ''}`

    case 'school':
      return `Logo da ${schoolName || 'escola'}${additionalInfo ? `. ${additionalInfo}` : ''}`

    case 'document':
      return `Documento: ${documentType || 'documento educacional'}${name ? ` de ${name}` : ''}${additionalInfo ? `. ${additionalInfo}` : ''}`

    case 'chart':
      return `Gráfico ${chartType || 'de dados educacionais'}${additionalInfo ? `. ${additionalInfo}` : ''}`

    case 'activity':
      return `Atividade: ${activityType || 'atividade educacional'}${additionalInfo ? `. ${additionalInfo}` : ''}`

    default:
      return `Imagem educacional${additionalInfo ? `. ${additionalInfo}` : ''}`
  }
}

// Accessible student photo component
interface AccessibleStudentPhotoProps {
  src: string | null | undefined
  studentName: string
  studentClass?: string
  schoolName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showFallback?: boolean
  isProfileView?: boolean
}

export function AccessibleStudentPhoto({
  src,
  studentName,
  studentClass,
  schoolName,
  size = 'md',
  className,
  showFallback = true,
  isProfileView = false
}: AccessibleStudentPhotoProps) {
  const sizeMap = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 128, height: 128 }
  }

  const { width, height } = sizeMap[size]

  const altText = generateEducationalAltText('student', {
    name: studentName,
    schoolName,
    additionalInfo: studentClass ? `Turma: ${studentClass}` : undefined
  })

  const longDescription = isProfileView
    ? `Esta é a foto oficial do aluno ${studentName}${studentClass ? ` da turma ${studentClass}` : ''}${schoolName ? ` matriculado na ${schoolName}` : ''}. Foto utilizada para identificação no sistema educacional.`
    : undefined

  if (!src && showFallback) {
    return (
      <div
        className={cn(
          'student-photo-fallback',
          'flex items-center justify-center bg-muted text-muted-foreground rounded-full border-2 border-border',
          className
        )}
        style={{ width, height }}
        role="img"
        aria-label={`${altText} (foto não disponível)`}
        title={`Foto de ${studentName} não disponível`}
      >
        <User
          className={cn(
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-6 w-6',
            size === 'lg' && 'h-8 w-8',
            size === 'xl' && 'h-12 w-12'
          )}
          aria-hidden="true"
        />
        <span className="sr-only">Foto não disponível</span>
      </div>
    )
  }

  if (!src) {
    return null
  }

  return (
    <figure className={cn('student-photo-container', className)}>
      <Image
        src={src}
        alt={altText}
        width={width}
        height={height}
        className={cn(
          'student-photo',
          'object-cover rounded-full border-2 border-border',
          'transition-all duration-200 hover:border-primary'
        )}
        quality={90}
        priority={size === 'xl'}
        aria-describedby={longDescription ? `${studentName}-photo-desc` : undefined}
      />
      {longDescription && isProfileView && (
        <figcaption
          id={`${studentName}-photo-desc`}
          className="sr-only"
        >
          {longDescription}
        </figcaption>
      )}
    </figure>
  )
}

// Accessible school logo component
interface AccessibleSchoolLogoProps {
  src: string | null | undefined
  schoolName: string
  className?: string
  width?: number
  height?: number
}

export function AccessibleSchoolLogo({
  src,
  schoolName,
  className,
  width = 200,
  height = 80
}: AccessibleSchoolLogoProps) {
  const altText = generateEducationalAltText('school', { schoolName })

  if (!src) {
    return (
      <div
        className={cn(
          'school-logo-fallback',
          'flex items-center justify-center bg-muted text-muted-foreground border rounded-lg p-4',
          className
        )}
        style={{ width, height }}
        role="img"
        aria-label={`${altText} (logo não disponível)`}
      >
        <School className="h-8 w-8" aria-hidden="true" />
        <span className="ml-2 font-semibold">{schoolName}</span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={altText}
      width={width}
      height={height}
      className={cn('school-logo object-contain', className)}
      quality={95}
      priority={true}
    />
  )
}

// Educational icon with accessible labeling
interface AccessibleEducationalIconProps {
  type: 'students' | 'teachers' | 'classes' | 'attendance' | 'grades' | 'reports' | 'calendar' | 'documents'
  label: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  decorative?: boolean
}

export function AccessibleEducationalIcon({
  type,
  label,
  description,
  size = 'md',
  className,
  decorative = false
}: AccessibleEducationalIconProps) {
  const iconMap = {
    students: Users,
    teachers: User,
    classes: School,
    attendance: Calendar,
    grades: Award,
    reports: FileText,
    calendar: Calendar,
    documents: BookOpen
  }

  const Icon = iconMap[type]

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const iconId = React.useId()

  if (decorative) {
    return (
      <Icon
        className={cn(sizeClasses[size], className)}
        aria-hidden="true"
      />
    )
  }

  return (
    <span className="educational-icon-container">
      <Icon
        className={cn(sizeClasses[size], className)}
        role="img"
        aria-labelledby={description ? `${iconId}-label ${iconId}-desc` : `${iconId}-label`}
      />
      <span id={`${iconId}-label`} className="sr-only">
        {label}
      </span>
      {description && (
        <span id={`${iconId}-desc`} className="sr-only">
          {description}
        </span>
      )}
    </span>
  )
}

// Document preview with accessibility
interface AccessibleDocumentPreviewProps {
  src: string
  documentType: string
  studentName?: string
  documentTitle?: string
  className?: string
  width?: number
  height?: number
}

export function AccessibleDocumentPreview({
  src,
  documentType,
  studentName,
  documentTitle,
  className,
  width = 300,
  height = 400
}: AccessibleDocumentPreviewProps) {
  const altText = generateEducationalAltText('document', {
    documentType,
    name: studentName,
    additionalInfo: documentTitle
  })

  const longDescription = `Preview do documento ${documentType}${studentName ? ` do aluno ${studentName}` : ''}${documentTitle ? ` com o título "${documentTitle}"` : ''}. Clique para visualizar o documento completo.`

  return (
    <figure className={cn('document-preview-container', className)}>
      <Image
        src={src}
        alt={altText}
        width={width}
        height={height}
        className="document-preview object-cover border border-border rounded-lg"
        quality={80}
        aria-describedby="doc-preview-desc"
      />
      <figcaption id="doc-preview-desc" className="sr-only">
        {longDescription}
      </figcaption>
    </figure>
  )
}

// Chart/Graph accessibility wrapper
interface AccessibleChartProps {
  children: React.ReactNode
  chartType: string
  title: string
  dataDescription: string
  className?: string
}

export function AccessibleChart({
  children,
  chartType,
  title,
  dataDescription,
  className
}: AccessibleChartProps) {
  const chartId = React.useId()

  return (
    <figure className={cn('accessible-chart-container', className)}>
      <div
        role="img"
        aria-labelledby={`${chartId}-title`}
        aria-describedby={`${chartId}-desc`}
        className="chart-wrapper"
      >
        {children}
      </div>
      <figcaption>
        <h3 id={`${chartId}-title`} className="sr-only">
          {title}
        </h3>
        <p id={`${chartId}-desc`} className="sr-only">
          {generateEducationalAltText('chart', {
            chartType,
            additionalInfo: dataDescription
          })}
        </p>
      </figcaption>
    </figure>
  )
}

// Activity/Event image with context
interface AccessibleActivityImageProps {
  src: string
  activityType: string
  activityName: string
  participants?: string[]
  date?: string
  className?: string
  width?: number
  height?: number
}

export function AccessibleActivityImage({
  src,
  activityType,
  activityName,
  participants,
  date,
  className,
  width = 400,
  height = 300
}: AccessibleActivityImageProps) {
  const participantsText = participants?.length
    ? ` com participação de ${participants.slice(0, 3).join(', ')}${participants.length > 3 ? ' e outros' : ''}`
    : ''

  const altText = generateEducationalAltText('activity', {
    activityType,
    additionalInfo: `${activityName}${participantsText}${date ? ` realizada em ${date}` : ''}`
  })

  return (
    <figure className={cn('activity-image-container', className)}>
      <Image
        src={src}
        alt={altText}
        width={width}
        height={height}
        className="activity-image object-cover rounded-lg border border-border"
        quality={85}
      />
      <figcaption className="activity-caption text-sm text-muted-foreground mt-2">
        <strong>{activityName}</strong>
        {date && <span className="block">Data: {date}</span>}
        {participants?.length && (
          <span className="block">
            Participantes: {participants.slice(0, 2).join(', ')}
            {participants.length > 2 && ` e mais ${participants.length - 2}`}
          </span>
        )}
      </figcaption>
    </figure>
  )
}

// Image gallery with accessibility
interface AccessibleImageGalleryProps {
  images: Array<{
    src: string
    alt: string
    title?: string
    description?: string
  }>
  className?: string
  columns?: number
}

export function AccessibleImageGallery({
  images,
  className,
  columns = 3
}: AccessibleImageGalleryProps) {
  const galleryId = React.useId()

  return (
    <section
      className={cn('accessible-image-gallery', className)}
      role="region"
      aria-labelledby={`${galleryId}-title`}
    >
      <h3 id={`${galleryId}-title`} className="sr-only">
        Galeria de imagens educacionais
      </h3>
      <div
        className={cn(
          'gallery-grid grid gap-4',
          columns === 2 && 'grid-cols-1 md:grid-cols-2',
          columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
        )}
        role="list"
      >
        {images.map((image, index) => (
          <figure
            key={index}
            className="gallery-item"
            role="listitem"
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={200}
              height={150}
              className="gallery-image object-cover rounded-lg border border-border w-full h-auto"
              quality={80}
              aria-describedby={image.description ? `${galleryId}-desc-${index}` : undefined}
            />
            {(image.title || image.description) && (
              <figcaption className="gallery-caption mt-2">
                {image.title && (
                  <h4 className="font-medium text-sm">{image.title}</h4>
                )}
                {image.description && (
                  <p
                    id={`${galleryId}-desc-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    {image.description}
                  </p>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}