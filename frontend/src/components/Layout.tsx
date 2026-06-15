import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Upload, Activity } from 'lucide-react'

export default function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-fast ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-indigo-400" size={22} />
          <span className="text-lg font-bold text-white tracking-tight">JSH Dashboard</span>
          <span className="text-xs text-slate-500 font-mono">v1.0</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/dashboards" className={navClass}>
            <LayoutDashboard size={16} /> Dashboards
          </NavLink>
          <NavLink to="/ingest" className={navClass}>
            <Upload size={16} /> Ingest
          </NavLink>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
