import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyze } from '@/lib/legal-filter'

const RightRecordSchema = z.object({
  rightType: z.string(),
  registeredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식: YYYY-MM-DD'),
  creditor: z.string(),
  amount: z.number().optional(),
  note: z.string().optional(),
})

const TenantRecordSchema = z.object({
  unit: z.string(),
  moveInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confirmedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  deposit: z.number().int().min(0),
  isOccupying: z.boolean().optional(),
})

const AnalyzeRequestSchema = z.object({
  caseNumber: z.string().min(1),
  appraisedValue: z.number().int().min(1),
  rights: z.array(RightRecordSchema).default([]),
  tenants: z.array(TenantRecordSchema).default([]),
  specialNotesText: z.string().optional(),
  lienReported: z.boolean().optional(),
  lienOccupying: z.boolean().optional(),
  lienAmount: z.number().int().min(0).optional(),
  statutorySuperficiesRisk: z.boolean().optional(),
  unpaidMaintenanceFee: z.number().int().min(0).optional(),
  propertyType: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const input = AnalyzeRequestSchema.parse(body)
    const result = analyze(input)
    return NextResponse.json({ success: true, caseNumber: input.caseNumber, ...result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '입력 데이터 형식 오류', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
