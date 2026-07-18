/**
 * Attendance Trends API
 * Returns historical attendance data for charting and analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

interface TrendDataPoint {
  date: string
  attendancePercentage: number
  classAverage?: number
  absences: number
  presents: number
  totalStudents: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Parse parameters
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')
    const turmaId = searchParams.get('turma_id')
    const days = parseInt(searchParams.get('days') || '30') // Default last 30 days
    const includeClassAverage = searchParams.get('class_average') === 'true'

    if (!studentId && !turmaId) {
      return NextResponse.json({
        error: 'student_id ou turma_id é obrigatório'
      }, { status: 400 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Fetch student attendance data
    if (studentId) {
      // First get the student's matricula_id(s)
      const { data: matriculas, error: matriculaError } = await supabase
        .from('matriculas')
        .select('id, turma_id')
        .eq('aluno_id', studentId)
        .eq('situacao', 'ativa')

      if (matriculaError) {
        logger.error('Error fetching student matriculas', matriculaError.message, { metadata: { studentId } })
        return NextResponse.json({ error: 'Erro ao buscar matrículas do aluno' }, { status: 500 })
      }

      if (!matriculas || matriculas.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          statistics: {
            overallPercentage: 0,
            totalDays: 0,
            totalPresent: 0,
            totalAbsent: 0,
            complianceStatus: {
              inep: false,
              bolsaFamilia: false
            }
          }
        })
      }

      const matriculaIds = matriculas.map(m => m.id)
      const studentTurmaId = matriculas[0].turma_id

      const { data: attendanceRecords, error } = await supabase
        .from('frequencia')
        .select(`
          data_aula,
          presente,
          matricula_id,
          sessao_id
        `)
        .in('matricula_id', matriculaIds)
        .gte('data_aula', startDateStr)
        .lte('data_aula', endDateStr)
        .order('data_aula', { ascending: true })

      if (error) {
        logger.error('Error fetching attendance trends', error.message, { metadata: { studentId } })
        return NextResponse.json({ error: 'Erro ao buscar dados de frequência' }, { status: 500 })
      }

      // Group by date and calculate daily percentages
      const dailyData: Record<string, { presente: number; total: number; turmaId?: string }> = {}

      attendanceRecords?.forEach(record => {
        const date = record.data_aula

        if (!dailyData[date]) {
          dailyData[date] = { presente: 0, total: 0, turmaId: studentTurmaId }
        }

        dailyData[date].total++
        if (record.presente) {
          dailyData[date].presente++
        }
      })

      // Calculate class averages if requested
      let classAverages: Record<string, number> = {}
      const effectiveTurmaId = turmaId || studentTurmaId
      if (includeClassAverage && effectiveTurmaId) {
        // Get all matriculas for the turma
        const { data: turmaMatriculas } = await supabase
          .from('matriculas')
          .select('id')
          .eq('turma_id', effectiveTurmaId)
          .eq('situacao', 'ativa')

        if (turmaMatriculas && turmaMatriculas.length > 0) {
          const turmaMatriculaIds = turmaMatriculas.map(m => m.id)

          const { data: classRecords } = await supabase
            .from('frequencia')
            .select('data_aula, presente')
            .in('matricula_id', turmaMatriculaIds)
            .gte('data_aula', startDateStr)
            .lte('data_aula', endDateStr)

          const classDaily: Record<string, { presente: number; total: number }> = {}
          classRecords?.forEach(record => {
            const date = record.data_aula
            if (!classDaily[date]) {
              classDaily[date] = { presente: 0, total: 0 }
            }
            classDaily[date].total++
            if (record.presente) {
              classDaily[date].presente++
            }
          })

          Object.entries(classDaily).forEach(([date, data]) => {
            classAverages[date] = Math.round((data.presente / data.total) * 100)
          })
        }
      }

      // Format response
      const trendData: TrendDataPoint[] = Object.entries(dailyData).map(([date, data]) => ({
        date,
        attendancePercentage: Math.round((data.presente / data.total) * 100),
        classAverage: classAverages[date],
        absences: data.total - data.presente,
        presents: data.presente,
        totalStudents: data.total
      }))

      // Calculate overall statistics
      const totalPresent = trendData.reduce((sum, d) => sum + d.presents, 0)
      const totalClasses = trendData.reduce((sum, d) => sum + d.totalStudents, 0)
      const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0

      return NextResponse.json({
        success: true,
        data: trendData,
        statistics: {
          overallPercentage,
          totalDays: trendData.length,
          totalPresent,
          totalAbsent: totalClasses - totalPresent,
          complianceStatus: {
            inep: overallPercentage >= 75, // INEP minimum
            bolsaFamilia: overallPercentage >= 80 // Bolsa Família threshold
          }
        }
      })
    }

    // Fetch class attendance data (aggregate for all students)
    if (turmaId) {
      // Get all matriculas for the turma to query frequencia
      const { data: turmaMatriculas, error: turmaMatriculaError } = await supabase
        .from('matriculas')
        .select('id, aluno_id')
        .eq('turma_id', turmaId)
        .eq('situacao', 'ativa')

      if (turmaMatriculaError) {
        logger.error('Error fetching turma matriculas', turmaMatriculaError.message, { metadata: { turmaId } })
        return NextResponse.json({ error: 'Erro ao buscar matrículas da turma' }, { status: 500 })
      }

      if (!turmaMatriculas || turmaMatriculas.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          statistics: {
            overallPercentage: 0,
            totalDays: 0,
            totalPresent: 0,
            totalAbsent: 0,
            averageStudentsPerDay: 0,
            complianceStatus: {
              inep: false,
              bolsaFamilia: false
            }
          }
        })
      }

      const turmaMatriculaIds = turmaMatriculas.map(m => m.id)
      // Create a map from matricula_id to aluno_id for counting unique students
      const matriculaToAlunoMap = new Map(turmaMatriculas.map(m => [m.id, m.aluno_id]))

      const { data: classRecords, error } = await supabase
        .from('frequencia')
        .select('data_aula, presente, matricula_id')
        .in('matricula_id', turmaMatriculaIds)
        .gte('data_aula', startDateStr)
        .lte('data_aula', endDateStr)
        .order('data_aula', { ascending: true })

      if (error) {
        logger.error('Error fetching class attendance trends', error.message, { metadata: { turmaId } })
        return NextResponse.json({ error: 'Erro ao buscar dados da turma' }, { status: 500 })
      }

      // Group by date
      const dailyData: Record<string, { presente: number; total: number; students: Set<string> }> = {}

      classRecords?.forEach(record => {
        const date = record.data_aula

        if (!dailyData[date]) {
          dailyData[date] = { presente: 0, total: 0, students: new Set() }
        }

        dailyData[date].total++
        // Use the aluno_id from the matricula for unique student count
        const alunoId = matriculaToAlunoMap.get(record.matricula_id)
        if (alunoId) {
          dailyData[date].students.add(alunoId)
        }
        if (record.presente) {
          dailyData[date].presente++
        }
      })

      const trendData: TrendDataPoint[] = Object.entries(dailyData).map(([date, data]) => ({
        date,
        attendancePercentage: Math.round((data.presente / data.total) * 100),
        absences: data.total - data.presente,
        presents: data.presente,
        totalStudents: data.students.size
      }))

      const totalPresent = trendData.reduce((sum, d) => sum + d.presents, 0)
      const totalClasses = trendData.reduce((sum, d) => sum + d.totalStudents, 0)
      const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0

      return NextResponse.json({
        success: true,
        data: trendData,
        statistics: {
          overallPercentage,
          totalDays: trendData.length,
          totalPresent,
          totalAbsent: totalClasses - totalPresent,
          averageStudentsPerDay: Math.round(totalClasses / trendData.length),
          complianceStatus: {
            inep: overallPercentage >= 75,
            bolsaFamilia: overallPercentage >= 80
          }
        }
      })
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error('Error in attendance trends API', errorMessage)
    return NextResponse.json({
      error: 'Erro ao processar solicitação'
    }, { status: 500 })
  }
}
