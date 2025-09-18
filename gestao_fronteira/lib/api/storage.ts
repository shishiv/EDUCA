'use client'

import { supabase } from '@/lib/supabase'

export class StorageApiService {
  constructor(private bucketName: string = 'student-photos') {}

  // Upload student photo
  async uploadStudentPhoto(studentId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${studentId}/profile.${fileExt}`

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true // Replace existing file
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      // console.error('Error uploading photo:', error)
      throw error
    }
  }

  // Delete student photo
  async deleteStudentPhoto(studentId: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([`${studentId}/profile.jpg`, `${studentId}/profile.png`, `${studentId}/profile.webp`])

      if (error) throw error
    } catch (error) {
      // console.error('Error deleting photo:', error)
      throw error
    }
  }

  // Get student photo URL
  getStudentPhotoUrl(studentId: string, fileExt: string = 'jpg'): string {
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(`${studentId}/profile.${fileExt}`)

    return data.publicUrl
  }

  // Upload document (birth certificate, etc.)
  async uploadDocument(studentId: string, file: File, documentType: string): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${studentId}/documents/${documentType}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('student-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('student-documents')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      // console.error('Error uploading document:', error)
      throw error
    }
  }
}

export const storageApi = new StorageApiService()