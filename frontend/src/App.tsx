import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DemoPage               from '@/pages/DemoPage'
import InferredDashboardPage  from '@/pages/InferredDashboardPage'
import DashboardBuilderPage   from '@/pages/DashboardBuilderPage'
import LoginPage              from '@/pages/LoginPage'
import AuthGuard              from '@/components/AuthGuard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/demo"  element={<DemoPage />} />

        {/* viewer: solo lectura */}
        <Route path="/infer" element={
          <AuthGuard minRole="viewer"><InferredDashboardPage /></AuthGuard>
        } />

        {/* editor: puede crear/editar dashboards */}
        <Route path="/builder" element={
          <AuthGuard minRole="editor"><DashboardBuilderPage /></AuthGuard>
        } />

        <Route path="/forbidden" element={
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl mb-3">🔒</p>
              <h1 className="text-xl font-bold text-white mb-1">Acceso denegado</h1>
              <p className="text-slate-400 text-sm">No tienes permisos para esta sección.</p>
              <a href="/infer" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">← Volver</a>
            </div>
          </div>
        } />

        <Route path="*" element={
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">JSH Dashboard v2</h1>
              <p className="text-slate-400 mb-6">Self-hosted · Offline-first · Sin LLM</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a href="/login"   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">Iniciar sesión</a>
                <a href="/infer"   className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Auto-Dashboard</a>
                <a href="/builder" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm">Builder</a>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}
