/**
 * Attendance Trend Chart Component
 * Visualizes student attendance over time with Brazilian compliance thresholds
 */

'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react'

export interface AttendanceTrendData {
  date: string // Format: 'YYYY-MM-DD'
  attendancePercentage: number
  classAverage?: number
  absences?: number
  presents?: number
}

interface AttendanceTrendChartProps {
  data: AttendanceTrendData[]
  title?: string
  description?: string
  studentName?: string
  showClassAverage?: boolean
  showThresholds?: boolean
  compactMode?: boolean
}

export function AttendanceTrendChart({
  data,
  title = 'Frequência ao longo do tempo',
  description,
  studentName,
  showClassAverage = true,
  showThresholds = true,
  compactMode = false
}: AttendanceTrendChartProps) {
  // Calculate current status
  const currentStatus = useMemo(() => {
    if (data.length === 0) return null

    const latest = data[data.length - 1]
    const percentage = latest.attendancePercentage

    // Determine status based on Brazilian compliance thresholds
    if (percentage < 75) {
      return {
        level: 'critical',
        label: 'Crítico - Abaixo do mínimo INEP (75%)',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: AlertTriangle,
        description: 'Risco de reprovação por falta'
      }
    } else if (percentage < 80) {
      return {
        level: 'warning',
        label: 'Atenção - Abaixo da meta Bolsa Família (80%)',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        icon: AlertTriangle,
        description: 'Requer acompanhamento'
      }
    } else {
      return {
        level: 'good',
        label: 'Adequado - Acima de 80%',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: CheckCircle2,
        description: 'Frequência dentro do esperado'
      }
    }
  }, [data])

  // Calculate trend (last 7 days vs previous 7 days)
  const trend = useMemo(() => {
    if (data.length < 14) return null

    const recentAvg = data.slice(-7).reduce((sum, d) => sum + d.attendancePercentage, 0) / 7
    const previousAvg = data.slice(-14, -7).reduce((sum, d) => sum + d.attendancePercentage, 0) / 7
    const change = recentAvg - previousAvg

    return {
      direction: change > 0 ? 'up' : 'down',
      change: Math.abs(change).toFixed(1),
      isPositive: change > 0
    }
  }, [data])

  // Format data for chart
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      dateFormatted: new Date(d.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      })
    }))
  }, [data])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium text-sm mb-1">{data.date}</p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-600">
            Frequência: <span className="font-semibold">{data.attendancePercentage}%</span>
          </p>
          {data.classAverage && (
            <p className="text-gray-600">
              Média da turma: <span className="font-semibold">{data.classAverage}%</span>
            </p>
          )}
          {data.presents !== undefined && (
            <p className="text-green-600">
              Presentes: <span className="font-semibold">{data.presents}</span>
            </p>
          )}
          {data.absences !== undefined && (
            <p className="text-red-600">
              Faltas: <span className="font-semibold">{data.absences}</span>
            </p>
          )}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>Nenhum dado de frequência disponível</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
            {studentName && (
              <p className="text-sm text-gray-600 mt-1">Aluno: {studentName}</p>
            )}
          </div>

          {currentStatus && !compactMode && (
            <Badge variant="outline" className={currentStatus.bgColor}>
              <currentStatus.icon className={`h-4 w-4 mr-1 ${currentStatus.color}`} />
              <span className={currentStatus.color}>{currentStatus.level.toUpperCase()}</span>
            </Badge>
          )}
        </div>

        {/* Status and trend indicators */}
        {!compactMode && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentStatus && (
              <div className={`p-3 rounded-lg ${currentStatus.bgColor}`}>
                <div className="flex items-center gap-2 mb-1">
                  <currentStatus.icon className={`h-5 w-5 ${currentStatus.color}`} />
                  <p className={`font-medium text-sm ${currentStatus.color}`}>
                    {currentStatus.label}
                  </p>
                </div>
                <p className="text-xs text-gray-600">{currentStatus.description}</p>
              </div>
            )}

            {trend && (
              <div className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  {trend.isPositive ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <p className="font-medium text-sm">
                    Tendência: {trend.isPositive ? 'Melhora' : 'Queda'} de {trend.change}%
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  Comparação últimos 7 dias vs 7 dias anteriores
                </p>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={compactMode ? 200 : 300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="dateFormatted"
              tick={{ fontSize: 12 }}
              stroke="#888"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              stroke="#888"
              label={{ value: 'Frequência (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {!compactMode && <Legend wrapperStyle={{ fontSize: '12px' }} />}

            {/* Brazilian compliance thresholds */}
            {showThresholds && (
              <>
                <ReferenceLine
                  y={75}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: 'INEP Mínimo (75%)', position: 'right', fontSize: 10 }}
                />
                <ReferenceLine
                  y={80}
                  stroke="#f97316"
                  strokeDasharray="3 3"
                  label={{ value: 'Bolsa Família (80%)', position: 'right', fontSize: 10 }}
                />
              </>
            )}

            {/* Student attendance line */}
            <Line
              type="monotone"
              dataKey="attendancePercentage"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
              name="Frequência do Aluno"
            />

            {/* Class average line (if available) */}
            {showClassAverage && chartData.some(d => d.classAverage !== undefined) && (
              <Line
                type="monotone"
                dataKey="classAverage"
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Média da Turma"
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Legend for thresholds (compact mode) */}
        {compactMode && showThresholds && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span>INEP 75%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-orange-500"></div>
              <span>Bolsa Família 80%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
