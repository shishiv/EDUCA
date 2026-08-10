import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { renderDescriptiveReportPdf } from '@/lib/export/descriptive-report-pdf'
import {
  DescriptiveReportEmissionError,
  loadDescriptiveReportEmissionData,
} from '@/lib/reports/descriptive-report-emission'
import { assertPilotDescriptiveReportDemoSafety } from '@/lib/pilot/descriptive-report-demo-safety'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'

export const runtime = 'nodejs'

const routeParamsSchema = z.object({ reportId: z.string().uuid() })

/** Emits one finalized descriptive report only during the explicit synthetic pilot rehearsal. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  try {
    assertPilotDescriptiveReportDemoSafety()
    await requirePilotActor(['admin', 'secretario', 'diretor', 'professor'])

    const { reportId } = routeParamsSchema.parse(await context.params)
    const supabase = await createClient()
    const emissionData = await loadDescriptiveReportEmissionData(supabase, reportId)
    const pdf = await renderDescriptiveReportPdf(emissionData)
    const filename = `relatorio_descritivo_${emissionData.report.anoLetivo}_${emissionData.report.semestre}_${emissionData.report.id}.pdf`

    return new NextResponse(pdf, {
      headers: {
        'cache-control': 'no-store',
        'content-disposition': `attachment; filename="${filename}"`,
        'content-type': 'application/pdf',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'DESCRIPTIVE_REPORT_REQUEST_INVALID' }, { status: 400 })
    }
    if (error instanceof DescriptiveReportEmissionError) {
      return NextResponse.json({ error: error.code }, { status: error.status })
    }
    if (
      error instanceof Error &&
      (error.message.startsWith('PILOT_SAFETY_GATE') || error.message.startsWith('PILOT_DESCRIPTIVE_REPORT_DEMO_DISABLED'))
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return pilotErrorResponse(error, {
      feature: 'pilot-descriptive-report-pdf',
      fallbackCode: 'DESCRIPTIVE_REPORT_EMISSION_FAILED',
    })
  }
}
