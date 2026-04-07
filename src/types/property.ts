export type LegalJudgment = 'PASS' | 'FAIL'
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type Region = '서울' | '경기' | '인천' | '기타'

export interface Property {
  id: string
  caseNumber: string
  region: Region
  district: string
  address: string
  propertyType: string
  area: number
  minimumBid: number
  estimatedValue: number
  roi: number
  legalJudgment: LegalJudgment
  riskLevel: RiskLevel
  auctionDate: string
  status: string
  score: number
  summary: string
  tags: string[]
  reportFile: string
  lat?: number
  lng?: number
}

export interface LegalCheck {
  category: string
  result: 'PASS' | 'FAIL'
  description: string
  riskLevel: RiskLevel
}

export interface RiskFactor {
  type: string
  amount?: number
  description: string
  severity: RiskLevel
}

export interface LegalAnalysis {
  judgment: LegalJudgment
  score: number
  summary: string
  checks: LegalCheck[]
  riskFactors: RiskFactor[]
  sourceDocuments?: SourceDocument[]
}

export interface LocationAnalysis {
  score: number
  summary: string
  positiveFactors: string[]
  negativeFactors: string[]
  rentalYield: number
  appreciationForecast: string
  mapMarkers?: MapMarker[]
}

export interface ProfitAnalysis {
  minimumBid: number
  estimatedAcquisitionCost: number
  marketValue: number
  projectedProfit: number
  roi: number
  breakEvenMonths: number
  exitStrategy: string
  costBreakdown?: CostItem[]
}

export interface PropertyReport {
  caseNumber: string
  analyzedAt: string
  legalAnalysis: LegalAnalysis
  locationAnalysis: LocationAnalysis
  profitAnalysis: ProfitAnalysis
}

export interface SourceDocument {
  docType: string
  docDate: string
  excerpt: string
  highlight: string
  relevance: string
}

export interface MapMarker {
  label: string
  lat: number
  lng: number
  type: 'property' | 'subway' | 'landmark'
}

export interface CostItem {
  item: string
  amount: number
  note: string
}

export interface PropertyFilters {
  region: string
  minRoi: number
  judgment: string
}
