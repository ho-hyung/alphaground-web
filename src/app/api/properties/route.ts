import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import type { Property } from '@/types/property'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region') || 'all'
    const minRoi = parseFloat(searchParams.get('minRoi') || '0')
    const judgment = searchParams.get('judgment') || 'all'

    const dataPath = path.join(process.cwd(), 'data', 'properties.json')
    const raw = await readFile(dataPath, 'utf-8')
    let properties: Property[] = JSON.parse(raw)

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
