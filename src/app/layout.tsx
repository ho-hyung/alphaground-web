import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AlphaGround — 부동산 경매 AI 분석 대시보드',
  description: 'AI 권리분석과 수익성 예측으로 초과 수익을 찾아내는 부동산 경매 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen`}>
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                α
              </div>
              <div>
                <span className="font-bold text-white text-lg tracking-tight">AlphaGround</span>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2 font-normal">
                  부동산 경매 AI 분석
                </span>
              </div>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/" className="text-slate-300 hover:text-white transition-colors">
                매물 목록
              </a>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="실시간 분석 중" />
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-800 mt-16 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs text-slate-500 text-center">
              © 2024 AlphaGround. AI 분석 결과는 투자 참고용이며 투자 결정의 최종 책임은 투자자에게 있습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
