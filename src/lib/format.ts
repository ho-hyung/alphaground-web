export function formatCurrency(amount: number): string {
  if (amount >= 100000000) {
    const eok = amount / 100000000
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`
  }
  if (amount >= 10000) {
    const man = amount / 10000
    return man % 1 === 0 ? `${man}만` : `${man.toFixed(0)}만`
  }
  return amount.toLocaleString('ko-KR')
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatArea(area: number): string {
  return `${area}㎡ (${(area * 0.3025).toFixed(1)}평)`
}
