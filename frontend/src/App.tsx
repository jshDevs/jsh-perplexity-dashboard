import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DemoPage from '@/pages/DemoPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/demo" element={<DemoPage />} />
        <Route path="*" element={
          <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">JSH Dashboard v2</h1>
              <p className="text-slate-400 mb-6">Sistema de dashboards auto-generados · Self-hosted · Offline-first</p>
              <div className="flex gap-3 justify-center">
                <a href="/demo?chart=bar"        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-fast">Demo Bar</a>
                <a href="/demo?chart=violin"     className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-fast">Demo Violin (Plotly)</a>
                <a href="/demo?chart=waffle"     className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-fast">Demo Waffle (Nivo)</a>
                <a href="/demo?chart=scatter3d"  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-fast">Demo 3D (ECharts-GL)</a>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}
