import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from '@/components/Layout'
import DashboardListPage  from '@/pages/DashboardListPage'
import DashboardViewPage  from '@/pages/DashboardViewPage'
import DataIngestionPage  from '@/pages/DataIngestionPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboards" replace />} />
          <Route path="/dashboards"        element={<DashboardListPage />} />
          <Route path="/dashboards/:slug"  element={<DashboardViewPage />} />
          <Route path="/ingest"            element={<DataIngestionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
