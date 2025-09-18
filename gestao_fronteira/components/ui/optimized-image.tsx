'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  className?: string
  fallbackClassName?: string
  priority?: boolean
  quality?: number
  sizes?: string
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

export function OptimizedImage({
  src,
  alt,
  width = 128,
  height = 128,
  className,
  fallbackClassName,
  priority = false,
  quality = 85,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  placeholder = 'empty',
  blurDataURL,
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Generate a simple blur placeholder for better UX
  const generateBlurDataURL = (w: number, h: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, w, h)
    }
    return canvas.toDataURL()
  }

  if (!src || imageError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400 rounded-lg',
          fallbackClassName,
          className
        )}
        style={{ width, height }}
      >
        <User className="h-1/2 w-1/2" />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg"
          style={{ width, height }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        priority={priority}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={blurDataURL || generateBlurDataURL(width, height)}
        className={cn(
          'object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true)
          setIsLoading(false)
        }}
        {...props}
      />
    </div>
  )
}

// Specialized components for common use cases
export function StudentPhoto({
  src,
  studentName,
  size = 'md',
  className,
  ...props
}: {
  src: string | null | undefined
  studentName: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
} & Omit<OptimizedImageProps, 'width' | 'height' | 'alt'>) {
  const sizeMap = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 128, height: 128 }
  }

  const { width, height } = sizeMap[size]

  return (
    <OptimizedImage
      src={src}
      alt={`Foto de ${studentName}`}
      width={width}
      height={height}
      className={cn('rounded-full', className)}
      fallbackClassName="rounded-full"
      quality={90}
      priority={size === 'xl'}
      {...props}
    />
  )
}

export function SchoolLogo({
  src,
  schoolName,
  className,
  ...props
}: {
  src: string | null | undefined
  schoolName: string
  className?: string
} & Omit<OptimizedImageProps, 'width' | 'height' | 'alt'>) {
  return (
    <OptimizedImage
      src={src}
      alt={`Logo da ${schoolName}`}
      width={200}
      height={80}
      className={cn('object-contain', className)}
      quality={95}
      priority={true}
      {...props}
    />
  )
}

// Educational document image component
export function DocumentImage({
  src,
  documentType,
  className,
  ...props
}: {
  src: string | null | undefined
  documentType: string
  className?: string
} & Omit<OptimizedImageProps, 'width' | 'height' | 'alt'>) {
  return (
    <OptimizedImage
      src={src}
      alt={`Documento: ${documentType}`}
      width={300}
      height={400}
      className={cn('border border-gray-200', className)}
      quality={80}
      sizes="(max-width: 768px) 100vw, 300px"
      {...props}
    />
  )
}

// Responsive image gallery component
export function ImageGallery({
  images,
  className,
}: {
  images: Array<{
    src: string
    alt: string
    title?: string
  }>
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
      {images.map((image, index) => (
        <OptimizedImage
          key={index}
          src={image.src}
          alt={image.alt}
          width={200}
          height={150}
          className="rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
          quality={80}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
      ))}
    </div>
  )
}