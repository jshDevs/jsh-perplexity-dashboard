import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { dashboardsApi } from '@/api/dashboards'
import { useDashboardStore } from '@/store/dashboardStore'
import FilterPanel   from '@/components/FilterPanel'
import DynamicChart  from '@/components/DynamicChart'
import KPICard       from '@/components/KPICard'
import DataTable     from '@/components/DataTable'
import type { ChartRecommendation } from '@/types/dashboard'

export default function DashboardViewPage() {
  const { slug } = useParams<{ slug: string }>()
  const { getActiveFilters } = useDashboardStore()
  const filters = getActiveFilters()

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey:  ['dashboard', slug],
    queryFn:   () => dashboardsApi.get(slug!),
    enabled:   !!slug,
  })

  const { data: result, isLoading: dataLoading } = useQuery({
    queryKey:  ['dashboard-data', slug, filters],
    queryFn:   () => dashboardsApi.query(slug!, filters),
    enabled:   !!slug && !!config,
    staleTime: 1000 * 60 * 2,
  })

  if (configLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!config) {
    return <div className="text-rose-400">Dashboard no encontrado: {slug}</div>
  }

  const data = result?.data ?? []

  // Auto-derive KPIs from numeric fields
  const kpis = config.measures?.slice(0, 4) ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{config.title}</h1>
        {config.description && <p className="text-sm text-slate-400 mt-1">{config.description}</p>}
      </div>

      {/* Filter bar */}
      <FilterPanel config={config} />

      {/* KPI cards */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((m) => {
            const total = data.reduce((s, r) => s + (parseFloat(String(r[m.name])) || 0), 0)
            return (
              <KPICard
                key={m.name}
                label={m.label}
                value={total}
                format={m.format === 'currency' ? 'currency' : 'number'}
              />
            )
          })}
        </div>
      )}

      {/* Charts */}
      {dataLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {config.charts?.map((chart, i) => (
            chart.chart_type === 'table' ? null : (
              <DynamicChart
                key={i}
                recommendation={chart as ChartRecommendation}
                data={data}
                title={`Vista ${i + 1}`}
              />
            )
          ))}

          {/* Auto table at the bottom */}
          {data.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Datos Crudos</h3>
              <DataTable data={data} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
