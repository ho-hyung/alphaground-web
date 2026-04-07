import type { MapMarker } from '@/types/property'

interface Props {
  lat: number
  lng: number
  markers?: MapMarker[]
  address: string
}

const markerIcons: Record<string, string> = {
  property: '🏠',
  subway: '🚇',
  landmark: '🏛',
}

export function PropertyMap({ lat, lng, markers = [], address }: Props) {
  const delta = 0.012
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
  const externalUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-slate-700/50">
        <iframe
          src={mapUrl}
          width="100%"
          height="280"
          className="block"
          title={`지도 - ${address}`}
          loading="lazy"
        />
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 text-xs bg-slate-900/90 text-slate-300 border border-slate-600 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
        >
          더 큰 지도 보기 ↗
        </a>
      </div>

      {markers.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {markers.map((marker, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                marker.type === 'property'
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                  : marker.type === 'subway'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-slate-700/30 border-slate-600/30 text-slate-300'
              }`}
            >
              <span>{markerIcons[marker.type]}</span>
              <span>{marker.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
