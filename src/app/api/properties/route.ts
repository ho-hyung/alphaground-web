import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import type { Property } from '@/types/property'

async function loadProperties(): Promise<Property[]> {
  // public/data/ 우선 (Vercel 정적 파일), 없으면 data/ 폴백
  const candidates = [
    path.join(process.cwd(), 'public', 'data', 'properties.json'),
    path.join(process.cwd(), 'data', 'properties.json'),
  ]
  for (const p of candidates) {
    try {
      return JSON.parse(await readFile(p, 'utf-8'))
    } catch {
      // 다음 경로 시도
    }
  }
  throw new Error('properties.json을 찾을 수 없습니다.')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region') || 'all'
    const minRoi = parseFloat(searchParams.get('minRoi') || '0')
    const judgment = searchParams.get('judgment') || 'all'

    let properties: Property[] = await loadProperties()

    if (region !== 'all') {
      properties = properties.filter((p) => p.region === region)
    }
    if (minRoi > 0) {
      properties = properties.filter((p) => p.roi >= minRoi)
    }
    if (judgment !== 'all') {
      properties = properties.filter((p) => p.legalJudgment === judgment)
    }

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Failed to load properties:', error)
    return NextResponse.json({ error: 'Failed to load properties' }, { status: 500 })
  }
}
