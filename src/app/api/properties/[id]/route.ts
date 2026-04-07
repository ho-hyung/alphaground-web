import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import type { Property, PropertyReport } from '@/types/property'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const caseNumber = decodeURIComponent(id)

    // public/data/ 우선 (Vercel 정적 파일), 없으면 data/ 폴백
    const candidates = [
      path.join(process.cwd(), 'public', 'data', 'properties.json'),
      path.join(process.cwd(), 'data', 'properties.json'),
    ]
    let listRaw = ''
    for (const p of candidates) {
      try {
        listRaw = await readFile(p, 'utf-8')
        break
      } catch { /* 다음 경로 시도 */ }
    }
    if (!listRaw) {
      return NextResponse.json({ error: 'Properties data not found' }, { status: 500 })
    }
    const properties: Property[] = JSON.parse(listRaw)
    const property = properties.find((p) => p.caseNumber === caseNumber)

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const reportPath = path.join(process.cwd(), 'data', 'reports', property.reportFile)
    let report: PropertyReport | null = null

    try {
      const reportRaw = await readFile(reportPath, 'utf-8')
      report = JSON.parse(reportRaw)
    } catch {
      report = null
    }

    return NextResponse.json({ property, report })
  } catch (error) {
    console.error('Failed to load property detail:', error)
    return NextResponse.json({ error: 'Failed to load property detail' }, { status: 500 })
  }
}
