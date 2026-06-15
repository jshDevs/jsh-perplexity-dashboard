import { cn } from '@/lib/utils'

interface KPICardProps {
  label:     string
  value:     string | number
  format?:   'number' | 'currency' | 'percent'
  trend?:    number        // positive = up, negative = down
  className?: string
}

function formatValue(value: string | number, format: KPICardProps['format']): string {
  if (typeof value !== 'number') return String(value)
  switch (format) {
    case 'currency': return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(value)
    case 'percent':  return `${value.toFixed(1)}%`
    case 'number':
    default:         return new Intl.NumberFormat('es-SV').format(value)
  }
}

export default function KPICard({ label, value, format, trend, className }: KPICardProps) {
  const trendColor = trend == null ? '' : trend > 0 ? 'text-emerald-400' : 'text-rose-400'
  const trendArrow = trend == null ? '' : trend > 0 ? '▲' : '▼'

  return (
    <div className={cn(
      'bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-1 hover:border-indigo-500 transition-fast',
      className
    )}>
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-3xl font-bold text-white">{formatValue(value, format)}</span>
      {trend != null && (
        <span className={cn('text-sm font-medium', trendColor)}>
          {trendArrow} {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  )
}
