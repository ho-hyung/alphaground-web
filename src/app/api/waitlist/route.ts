import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { z } from 'zod'

const WaitlistSchema = z.object({
  email: z.string().email(),
})

const DATA_PATH = path.join(process.cwd(), 'data', 'waitlist.json')

async function loadWaitlist(): Promise<string[]> {
  try {
    const raw = await readFile(DATA_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function saveWaitlist(emails: string[]): Promise<void> {
  await mkdir(path.dirname(DATA_PATH), { recursive: true })
  await writeFile(DATA_PATH, JSON.stringify(emails, null, 2), 'utf-8')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = WaitlistSchema.parse(body)

    const emails = await loadWaitlist()

    if (emails.includes(email)) {
      return NextResponse.json({ success: true, alreadyRegistered: true })
    }

    await saveWaitlist([...emails, email])

    return NextResponse.json({ success: true, alreadyRegistered: false })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '유효하지 않은 이메일 형식입니다.' }, { status: 400 })
    }
    console.error('Waitlist error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function GET() {
  const emails = await loadWaitlist()
  return NextResponse.json({ count: emails.length })
}
