import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardsApi } from '@/api/dashboards'
import { LayoutDashboard, Clock, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardListPage() {
  const { data: dashboards, isLoading, isError, error } = useQuery({
    queryKey: ['dashboards'],
    queryFn:  dashboardsApi.list,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-rose-900/20 border border-rose-700 rounded-xl p-6 text-rose-300">
        Error cargando dashboards: {(error as Error).message}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboards</h1>
        <Link
          to="/ingest"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-fast"
        >
          + Nuevo Dataset
        </Link>
      </div>

      {!dashboards?.length && (
        <div className="text-center py-20 text-slate-500">
          <LayoutDashboard size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No hay dashboards aún.</p>
          <p className="text-sm mt-1">Sube un archivo en <Link to="/ingest" className="text-indigo-400 underline">Ingest</Link> para comenzar.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards?.map((dash) => (
          <Link
            key={dash.slug}
            to={`/dashboards/${dash.slug}`}
            className="group bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-xl p-5 flex flex-col gap-2 transition-fast"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-fast">{dash.title}</h2>
                {dash.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{dash.description}</p>
                )}
              </div>
              <ArrowRight size={16} className="text-slate-600 group-hover:text-indigo-400 mt-1 transition-fast" />
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-auto pt-2 border-t border-slate-700">
              <Clock size={11} />
              <span>
                {formatDistanceToNow(new Date(dash.updated_at), { addSuffix: true, locale: es })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
