'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { JudgmentBadge } from '@/components/JudgmentBadge'
import { RoiBadge } from '@/components/RoiBadge'
import { formatCurrency, formatDate, formatArea } from '@/lib/format'
import type { Property } from '@/types/property'

interface Props {
  property: Property
}

export function PropertyCard({ property }: Props) {
  const discountRate = (
    ((property.estimatedValue - property.minimumBid) / property.estimatedValue) *
    100
  ).toFixed(1)

  return (
    <Link href={`/properties/${encodeURIComponent(property.caseNumber)}`}>
      <Card className="bg-slate-800/60 border-slate-700/50 hover:border-slate-500/70 hover:bg-slate-800/90 transition-all duration-200 cursor-pointer group h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-mono mb-1">{property.caseNumber}</p>
              <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white truncate">
                {property.district} {property.propertyType}
              </h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">{property.address}</p>
            </div>
            <JudgmentBadge judgment={property.legalJudgment} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">수익률</p>
              <RoiBadge roi={property.roi} judgment={property.legalJudgment} />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">최저입찰가</p>
              <p className="text-sm font-semibold text-slate-200">
                {formatCurrency(property.minimumBid)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">감정가 대비 </span>
              <span className="text-amber-400 font-medium">{discountRate}% 할인</span>
            </div>
            <div>
              <span className="text-slate-500">면적 </span>
              <span className="text-slate-300">{formatArea(property.area)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {property.summary}
          </p>

          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-wrap gap-1">
              {property.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs border-slate-600 text-slate-400 px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <span className="text-xs text-slate-500">{formatDate(property.auctionDate)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
