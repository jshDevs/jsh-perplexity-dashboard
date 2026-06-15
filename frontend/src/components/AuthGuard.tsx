/**
 * AuthGuard — wrapper de ruta que redirige a /login si no autenticado.
 * Soporta rol mínimo opcional.
 *
 * Uso en App.tsx:
 *   <Route path="/builder" element={
 *     <AuthGuard minRole="editor"><DashboardBuilderPage /></AuthGuard>
 *   } />
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, type UserRole } from '@/store/authStore'

const RANK: Record<UserRole, number> = { viewer: 0, editor: 1, admin: 2 }

interface Props {
  children: React.ReactNode
  minRole?: UserRole
}

export default function AuthGuard({ children, minRole }: Props) {
  const { isAuth, user } = useAuthStore()
  const location = useLocation()

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (minRole && user && RANK[user.role] < RANK[minRole]) {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
